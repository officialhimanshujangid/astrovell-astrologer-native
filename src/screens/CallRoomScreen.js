/**
 * CallRoomScreen — Astrologer Native
 *
 * State machine:
 *   'incoming'   → show Accept / Reject (call is Pending)
 *   'accepting'  → API call in-flight
 *   'connecting' → accepted, fetching Zego token
 *   'active'     → voice live with timer
 *   'completed'  → call ended
 *   'rejected'   → astrologer rejected
 *
 * Props:
 *   callId       — ID of the call
 *   isAccepted   — true when navigated here AFTER accepting in Dashboard
 *                  (skips the Incoming screen entirely)
 *   initialData  — call request object from the Dashboard card
 *   onBack       — go back callback
 *
 * Voice: Zegocloud Web SDK in an invisible WebView (audio-only).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import Ionicons from '@expo/vector-icons/Ionicons';
import { callApi } from '../api/services';
import { colors } from '../theme/colors';
import { ZEGO_SDK } from '../utils/ZegoSDK';
import { SOCKET_BASE } from '../api/apiClient';

const fmt = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

// ─── Zegocloud audio-only WebView HTML ───────────────────────────────────────
const buildZegoHtml = ({ appID, roomID, userID, token, serverUrl, userName }) => `
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>*{margin:0;padding:0}body{width:0;height:0;overflow:hidden;background:transparent}</style>
<script>${ZEGO_SDK}</script>
</head><body>
<audio id="ra" autoplay playsinline></audio>
<script>
function post(t,d){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:t,data:d}));}catch(e){}}

async function init(){
  try{
    if(typeof ZegoExpressEngine === 'undefined') throw new Error("Zego class not loaded");
    var zg=new ZegoExpressEngine(Number(${appID}),'${serverUrl||'wss://webliveroom-api.zegocloud.com/ws'}');
    zg.on('roomStateChanged',function(r,reason){post('room_state',reason);});
    zg.on('roomStreamUpdate',async function(r,uType,list){
      if(uType==='ADD'){
        for(var s of list){
          var rs=await zg.startPlayingStream(s.streamID);
          var el=document.getElementById('ra');
          if(el){el.srcObject=rs;el.play().catch(function(){});}
        }
        post('peer_connected',null);
      } else { post('peer_left',null); }
    });
    await zg.loginRoom('${roomID}','${token}',{userID:String('${userID}'),userName:'${userName||'Astrologer'}'});
    var ls=await zg.createStream({camera:{audio:true,video:false}});
    await zg.startPublishingStream('stream_${userID}',ls);
    post('ready',null);
  }catch(e){post('error',e.message||String(e));}
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
</script></body></html>`;

// ─── Invisible Voice WebView ──────────────────────────────────────────────────
const ZegoVoice = ({ config, onReady, onPeerConnected, onPeerLeft, onError }) => {
  if (!config) return null;
  return (
    <WebView
      originWhitelist={['*']}
      mixedContentMode="always"
      source={{ html: buildZegoHtml(config), baseUrl: 'https://astrology-i7c9.onrender.com/' }}
      style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      javaScriptEnabled
      domStorageEnabled
      onPermissionRequest={(e) => e.nativeEvent.grant(e.nativeEvent.resources)}
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === 'ready') onReady?.();
          if (msg.type === 'peer_connected') onPeerConnected?.();
          if (msg.type === 'peer_left') onPeerLeft?.();
          if (msg.type === 'error') onError?.(msg.data);
        } catch (_) {}
      }}
    />
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const CallRoomScreen = ({ callId, isAccepted = false, initialData = null, onBack }) => {
  const { astrologer, token } = useSelector((s) => s.auth);

  // If isAccepted=true → we came from Dashboard right after accepting → skip Incoming screen
  const [phase, setPhase] = useState(isAccepted ? 'connecting' : 'incoming');
  const [callData, setCallData] = useState(initialData || null);
  const [timer, setTimer]     = useState(0);
  const [zegoConfig, setZegoConfig] = useState(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const socketRef = useRef(null);
  const timerRef  = useRef(null);
  const voiceStarted = useRef(false);  // prevent double Zego init

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((p) => p + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Connect Zego voice
  const connectVoice = useCallback(async () => {
    if (voiceStarted.current) return;
    voiceStarted.current = true;
    try {
      const res = await callApi.getZegoToken({
        callId: parseInt(callId),
        userId: astrologer?.id || astrologer?.userId,
        isAstrologer: true,
      });
      if (res.data?.status === 200) {
        setZegoConfig({ ...res.data, userName: astrologer?.name || 'Astrologer' });
        setPhase('active');
        startTimer();
      } else {
        // Voice failed, but still show active
        setPhase('active');
        startTimer();
        Alert.alert('Voice Error', 'Could not connect voice channel. Call UI is active.');
      }
    } catch (_) {
      setPhase('active');
      startTimer();
    }
  }, [callId, astrologer]);

  // ── If isAccepted, start voice fetch immediately ───────────────────────────
  useEffect(() => {
    if (isAccepted) {
      connectVoice();
    }
  }, [isAccepted]);

  // ── Socket ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!callId || !astrologer) return;

    const socket = io(SOCKET_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-call', { callId: parseInt(callId) });
      console.log('[AstroCallRoom] connected, joined call', callId);
    });

    // Only fetch call details when NOT isAccepted (to check current status)
    if (!isAccepted) {
      callApi.getCallById({ callId }).then((res) => {
        const d = res.data?.recordList ?? res.data?.data ?? res.data;
        const c = Array.isArray(d) ? d[0] : d;
        if (!c) return;
        setCallData(c);
        if (c.callStatus === 'Accepted') {
          setPhase('connecting');
          connectVoice();
        } else if (c.callStatus === 'Completed') {
          setPhase('completed');
        } else if (c.callStatus === 'Pending') {
          setPhase('incoming');
        }
      }).catch(() => {});
    } else {
      // Fetch just for call data display (name, type) without changing phase
      callApi.getCallById({ callId }).then((res) => {
        const d = res.data?.recordList ?? res.data?.data ?? res.data;
        const c = Array.isArray(d) ? d[0] : d;
        if (c && !callData) setCallData(c);
      }).catch(() => {});
    }

    // Astrologer self confirmation event (server echoes accept back)
    socket.on('call-accepted', (data) => {
      console.log('[AstroCallRoom] call-accepted echo', data);
      if (phase !== 'active' && phase !== 'connecting') {
        setCallData((prev) => ({ ...prev, ...data }));
        setPhase('connecting');
        connectVoice();
      }
    });

    socket.on('call-ended', () => {
      console.log('[AstroCallRoom] call-ended');
      setPhase('completed');
      stopTimer();
    });

    socket.on('call-error', (data) => {
      Alert.alert('Call Error', data.message || 'An error occurred.');
    });

    socket.on('connect_error', (e) => console.warn('[AstroCallRoom] socket error:', e.message));

    return () => { socket.disconnect(); stopTimer(); };
  }, [callId, astrologer]);

  // ── Accept ───────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    setAccepting(true);
    try {
      // Emit via socket first (faster), fall back to REST
      if (socketRef.current?.connected) {
        socketRef.current.emit('accept-call', { callId: parseInt(callId) });
      } else {
        await callApi.acceptRequest({ callId: parseInt(callId) });
      }
      // Immediately transition — don't wait for server echo
      setPhase('connecting');
      connectVoice();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept call.');
    }
    setAccepting(false);
  };

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleReject = () => {
    Alert.alert('Reject Call', 'Reject this call request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setRejecting(true);
          try {
            if (socketRef.current?.connected) {
              socketRef.current.emit('reject-call', { callId: parseInt(callId) });
            } else {
              await callApi.rejectRequest({ callId: parseInt(callId) });
            }
            setPhase('rejected');
            setTimeout(() => onBack?.(), 1800);
          } catch (_) {
            setRejecting(false);
          }
        },
      },
    ]);
  };

  // ── End Call ─────────────────────────────────────────────────────────────
  const handleEndCall = () => {
    Alert.alert('End Call', 'End this call session?', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'End Call', style: 'destructive',
        onPress: () => {
          socketRef.current?.emit('end-call', { callId: parseInt(callId) });
          stopTimer();
        },
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const customerLetter = (callData?.userName || 'U')[0].toUpperCase();
  const isVideo = callData?.call_type == 11 || callData?.call_type === 'Video';

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor="#110022" />

      {/* Invisible audio bridge */}
      <ZegoVoice
        config={zegoConfig}
        onReady={() => { console.log('[Zego] ready'); setVoiceReady(true); }}
        onPeerConnected={() => { console.log('[Zego] peer connected'); setPeerConnected(true); }}
        onPeerLeft={() => setPeerConnected(false)}
        onError={(msg) => console.warn('[Zego] error:', msg)}
      />

      {/* ── INCOMING ─────────────────────────────────────────────────── */}
      {phase === 'incoming' && (
        <View style={st.center}>
          <View style={st.rippleContainer}>
            <View style={[st.ripple, st.ripple3]} />
            <View style={[st.ripple, st.ripple2]} />
            <View style={[st.ripple, st.ripple1]} />
            <View style={st.avatar}><Text style={st.avatarLetter}>{customerLetter}</Text></View>
          </View>
          <Text style={st.name}>{callData?.userName || 'Customer'}</Text>
          <Text style={st.subLabel}>{isVideo ? '📹 Video' : '📞 Audio'} Call</Text>
          <Text style={st.waiting}>Incoming call request</Text>
          <View style={st.actionRow}>
            <TouchableOpacity
              style={st.rejectBtn}
              onPress={handleReject}
              disabled={rejecting || accepting}
              activeOpacity={0.85}
            >
              {rejecting
                ? <ActivityIndicator color="#FFF" size="small" />
                : <><Ionicons name="close" size={22} color="#FFF" /><Text style={st.actionTxt}>Reject</Text></>}
            </TouchableOpacity>
            <TouchableOpacity
              style={st.acceptBtn}
              onPress={handleAccept}
              disabled={accepting || rejecting}
              activeOpacity={0.85}
            >
              {accepting
                ? <ActivityIndicator color="#FFF" size="small" />
                : <><Ionicons name="call" size={22} color="#FFF" /><Text style={st.actionTxt}>Accept</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── CONNECTING ───────────────────────────────────────────────── */}
      {phase === 'connecting' && (
        <View style={st.center}>
          <View style={st.avatar}><Text style={st.avatarLetter}>{customerLetter}</Text></View>
          <Text style={st.name}>{callData?.userName || 'Customer'}</Text>
          <View style={st.connectingRow}>
            <ActivityIndicator color="#a78bfa" size="small" />
            <Text style={st.connectingTxt}>Setting up voice channel...</Text>
          </View>
        </View>
      )}

      {/* ── ACTIVE ───────────────────────────────────────────────────── */}
      {phase === 'active' && (
        <View style={st.center}>
          <View style={[st.avatarWrap, peerConnected && st.avatarGlow]}>
            <View style={[st.avatar, st.avatarActive]}>
              <Text style={st.avatarLetter}>{customerLetter}</Text>
            </View>
          </View>
          <View style={st.liveBadge}>
            <View style={st.liveDot} />
            <Text style={st.liveTxt}>LIVE</Text>
          </View>
          <Text style={st.name}>{callData?.userName || 'Customer'}</Text>
          <Text style={st.voiceStatus}>
            {!voiceReady
              ? '⏳ Connecting voice...'
              : peerConnected
              ? '🔊 Voice connected'
              : '🔇 Waiting for customer...'}
          </Text>
          <View style={st.timerChip}>
            <Ionicons name="time-outline" size={16} color={colors.secondary} />
            <Text style={st.timerTxt}>{fmt(timer)}</Text>
          </View>
          <TouchableOpacity style={st.endBtn} onPress={handleEndCall} activeOpacity={0.85}>
            <Ionicons name="call" size={22} color="#FFF" />
            <Text style={st.endTxt}>End Call</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── COMPLETED ────────────────────────────────────────────────── */}
      {phase === 'completed' && (
        <View style={st.center}>
          <View style={[st.avatar, { backgroundColor: '#10b981', borderColor: '#10b981' }]}>
            <Ionicons name="checkmark" size={38} color="#FFF" />
          </View>
          <Text style={st.name}>Call Ended</Text>
          <Text style={st.timerBig}>{fmt(timer)}</Text>
          <Text style={st.waiting}>Duration</Text>
          <TouchableOpacity style={st.purpleBtn} onPress={onBack} activeOpacity={0.85}>
            <Text style={st.purpleBtnTxt}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── REJECTED ─────────────────────────────────────────────────── */}
      {phase === 'rejected' && (
        <View style={st.center}>
          <View style={[st.avatar, { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}>
            <Ionicons name="close" size={38} color="#FFF" />
          </View>
          <Text style={st.name}>Call Rejected</Text>
          <Text style={st.waiting}>You rejected this call.</Text>
        </View>
      )}
    </View>
  );
};

export default CallRoomScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const PURPLE = '#7c3aed';
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#110022' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  rippleContainer: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ripple: { position: 'absolute', borderRadius: 999 },
  ripple1: { width: 110, height: 110, backgroundColor: 'rgba(124,58,237,0.2)' },
  ripple2: { width: 135, height: 135, backgroundColor: 'rgba(124,58,237,0.12)' },
  ripple3: { width: 160, height: 160, backgroundColor: 'rgba(124,58,237,0.07)' },

  avatarWrap: { marginBottom: 12 },
  avatarGlow: {
    shadowColor: '#a78bfa', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9, shadowRadius: 24, elevation: 16,
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.secondary,
  },
  avatarActive: {
    width: 110, height: 110, borderRadius: 55,
    shadowColor: colors.secondary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 20, elevation: 12,
  },
  avatarLetter: { color: '#FFF', fontSize: 40, fontWeight: '900' },

  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginVertical: 10,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' },
  liveTxt: { color: '#ef4444', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  name: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subLabel: { color: '#a78bfa', fontSize: 15, marginBottom: 12 },
  waiting: { color: '#c4b5d8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  voiceStatus: { color: '#a78bfa', fontSize: 13, marginBottom: 20 },
  timerBig: { color: colors.secondary, fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'], marginBottom: 4 },

  connectingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  connectingTxt: { color: '#a78bfa', fontSize: 14 },

  actionRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ef4444', borderRadius: 16, paddingVertical: 18,
  },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 18,
  },
  actionTxt: { color: '#FFF', fontWeight: '800', fontSize: 16 },

  timerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(124,58,237,0.2)', borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10, marginBottom: 32,
  },
  timerTxt: { color: colors.secondary, fontWeight: '900', fontSize: 22, fontVariant: ['tabular-nums'] },

  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ef4444', borderRadius: 50,
    paddingHorizontal: 44, paddingVertical: 18,
  },
  endTxt: { color: '#FFF', fontWeight: '800', fontSize: 17 },

  purpleBtn: {
    backgroundColor: PURPLE, borderRadius: 14,
    paddingHorizontal: 36, paddingVertical: 14, marginTop: 12,
  },
  purpleBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
