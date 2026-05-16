/**
 * CallRoomScreen — Astrologer Native
 *
 * State machine:
 *   'incoming'   → show Accept / Reject (call is Pending)
 *   'accepting'  → API call in-flight
 *   'connecting' → accepted, fetching Zego token
 *   'active'     → voice/video live with timer
 *   'completed'  → call ended
 *   'rejected'   → astrologer rejected
 *
 * This version implements robust heartbeats, metrics, and token refresh
 * to match the web implementation, using the Zego Web SDK inside a WebView.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Alert, Dimensions, Platform, PermissionsAndroid,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import Ionicons from '@expo/vector-icons/Ionicons';
import { callApi } from '../api/services';
import { colors } from '../theme/colors';
import { ZEGO_SDK } from '../utils/ZegoSDK';
import { SOCKET_BASE } from '../api/apiClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const fmt = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

// ─── Zegocloud WebView HTML ──────────────────────────────────────────────────
const buildZegoHtml = ({ appID, roomID, userID, token, serverUrl, userName, isVideo }) => `
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{width:100vw;height:100vh;overflow:hidden;background:#000;font-family:sans-serif;}
  #remote-video { width: 100%; height: 100%; object-fit: cover; background: #111; }
  #local-video { 
    position: absolute; bottom: 20px; right: 20px; 
    width: 100px; height: 150px; border-radius: 12px; 
    border: 2px solid rgba(255,255,255,0.3); object-fit: cover; 
    background: #222; z-index: 10;
  }
  .status-msg {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    color: #fff; font-size: 14px; text-align: center; pointer-events: none;
    opacity: 0.7; z-index: 5;
  }
  #ra { display: none; }
</style>
<script>
// PRE-GRANT MIC/CAM in WebView before Zego SDK loads
// Expo Go WebView does not show a permission dialog — getUserMedia must succeed
// before ZegoExpressEngine calls it internally.
(function() {
  var _realGUM = navigator.mediaDevices && navigator.mediaDevices.getUserMedia
    ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    : null;
  if (!_realGUM) return;
  _realGUM({ audio: true, video: false })
    .then(function(s) {
      s.getTracks().forEach(function(t) { t.stop(); });
    })
    .catch(function(e) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', data: 'Pre-grant GUM failed: ' + e.message }));
      }
    });
})();
</script>
<script>${ZEGO_SDK}</script>
</head><body>
<audio id="ra" autoplay playsinline></audio>
${isVideo ? `
  <video id="remote-video" autoplay playsinline></video>
  <video id="local-video" autoplay playsinline muted></video>
` : '<div class="status-msg" id="status">Audio Only Session</div>'}
<script>
function post(t,d){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:t,data:d}));}catch(e){}}

var zg, localStream;

async function init(){
  try{
    post('log', 'Init started');
    if(typeof ZegoExpressEngine === 'undefined') {
      post('log', 'Zego SDK not found, waiting...');
      setTimeout(init, 1000);
      return;
    }
    
    var appID = Number(${JSON.stringify(appID || 0)});
    var roomID = ${JSON.stringify(roomID || '')};
    var token = ${JSON.stringify(token || '')};
    var userID = String(${JSON.stringify(userID || '')});
    var userName = ${JSON.stringify(userName || 'User')};
    var serverUrl = ${JSON.stringify(serverUrl || 'wss://webliveroom-api.zegocloud.com/ws')};
    var isVideo = ${!!isVideo};

    post('log', 'Init step 1: appID=' + appID + ' server=' + serverUrl);
    zg = new ZegoExpressEngine(appID, serverUrl);
    
    zg.on('roomStateChanged', function(r, reason, errorCode){
      post('log', 'Room state: ' + reason + ' ' + errorCode);
      post('room_state', { reason: reason, code: errorCode });
    });

    zg.on('roomStreamUpdate', async function(r, uType, list){
      post('log', 'Stream update: ' + uType + ' count=' + list.length);
      if(uType === 'ADD'){
        for(var s of list){
          post('log', 'Playing stream: ' + s.streamID);
          var rs = await zg.startPlayingStream(s.streamID);
          if(isVideo) {
            var rv = document.getElementById('remote-video');
            if(rv) rv.srcObject = rs;
          } else {
            var ra = document.getElementById('ra');
            if(ra) { ra.srcObject = rs; ra.play().catch(function(e){ post('log', 'Play error: ' + e.message); }); }
          }
        }
        post('peer_connected', null);
      } else { 
        post('peer_left', null); 
      }
    });

    post('log', 'Init step 2: LoginRoom ' + roomID + ' user=' + userID);
    await zg.loginRoom(roomID, token, { userID: userID, userName: userName });
    post('log', 'Init step 3: Login successful');
    
    // --- Diagnostic: confirm getUserMedia is reachable before calling createStream ---
    post('log', 'GUM check: mediaDevices=' + (!!navigator.mediaDevices) + ' getUserMedia=' + (!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)));
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      post('error', 'getUserMedia unavailable — WebView is not in a secure context or mic access is blocked at the OS level.');
      return;
    }
    
    post('log', 'Init step 4: CreateStream isVideo=' + isVideo);
    // Race createStream against a 15s timeout — getUserMedia hangs forever if mic permission is blocked
    localStream = await Promise.race([
      zg.createStream({ camera: { audio: true, video: isVideo } }),
      new Promise(function(_, rej) {
        setTimeout(function() { rej(new Error('createStream timed out (15s) — mic permission likely denied in WebView')); }, 15000);
      })
    ]);
    post('log', 'Init step 5: Stream created');

    if(isVideo) {
      var lv = document.getElementById('local-video');
      if(lv) lv.srcObject = localStream;
    }

    post('log', 'Init step 6: Publishing...');
    await zg.startPublishingStream('stream_' + userID, localStream);
    post('log', 'Init step 7: Published');
    post('ready', null);
  }catch(e){
    post('log', 'Init ERROR: ' + (e.message || String(e)));
    post('error', e.message || String(e));
  }
}

function updateToken(newToken) {
  if(zg) zg.renewToken(newToken);
}

if(document.readyState === 'loading'){document.addEventListener('DOMContentLoaded', init);}else{init();}
</script></body></html>`;

// ─── Voice/Video Bridge ──────────────────────────────────────────────────────
const ZegoBridge = React.forwardRef(({ config, onMessage }, ref) => {
  if (!config) return null;
  const isVideo = config.isVideo;

  return (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={{ html: buildZegoHtml(config), baseUrl: 'https://astrology-i7c9.onrender.com/' }}
      style={isVideo ? st.videoWebView : st.hiddenWebView}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback={true}
      mixedContentMode="always"
      allowFileAccess={true}
      mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
      onPermissionRequest={(event) => {
        const { resources } = event.nativeEvent;
        console.log('[ZegoBridge] WebView granting resources:', resources);
        // Correct API: grant() lives on nativeEvent, not event.request
        if (typeof event.nativeEvent.grant === 'function') {
          event.nativeEvent.grant(resources);
        } else if (event.nativeEvent.onPermissionRequest) {
          event.nativeEvent.onPermissionRequest.grant(resources);
        }
      }}
      onMessage={onMessage}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
});

// ─── Main ─────────────────────────────────────────────────────────────────────
const CallRoomScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { callId, isAccepted = false, initialData = null } = route?.params || {};
  const onBack = () => navigation.goBack();
  const { astrologer, token: authToken } = useSelector((s) => s.auth);

  const [phase, setPhase] = useState(isAccepted ? 'connecting' : 'incoming');
  const [callData, setCallData] = useState(initialData || null);
  const [timer, setTimer]     = useState(0);
  const [zegoConfig, setZegoConfig] = useState(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [connStatus, setConnStatus] = useState('connecting');

  const socketRef = useRef(null);
  const timerRef  = useRef(null);
  const hbRef     = useRef(null);
  const wvRef     = useRef(null);
  const metricsBufferRef = useRef([]);
  const metricsFlushRef = useRef(null);
  const voiceStarted = useRef(false);
  const timerValRef = useRef(0);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer((p) => {
        const next = p + 1;
        timerValRef.current = next;
        return next;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startHeartbeat = useCallback(() => {
    clearInterval(hbRef.current);
    hbRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call-heartbeat', {
          callId: parseInt(callId),
          duration: timerValRef.current,
          metrics: metricsBufferRef.current
        });
      }
    }, 10000);
  }, [callId]);

  const stopHeartbeat = useCallback(() => {
    clearInterval(hbRef.current);
    hbRef.current = null;
  }, []);

  const startMetricsFlush = useCallback(() => {
    clearInterval(metricsFlushRef.current);
    metricsFlushRef.current = setInterval(() => {
      const buf = metricsBufferRef.current;
      if (!buf.length) return;
      const events = buf.splice(0, buf.length);
      callApi.postMetrics({ callId: parseInt(callId), events }).catch(() => {});
    }, 30000);
  }, [callId]);

  const stopMetricsFlush = useCallback(() => {
    clearInterval(metricsFlushRef.current);
    metricsFlushRef.current = null;
    // Final flush
    const buf = metricsBufferRef.current;
    if (buf.length) {
      const events = buf.splice(0, buf.length);
      callApi.postMetrics({ callId: parseInt(callId), events }).catch(() => {});
    }
  }, [callId]);

  const refreshToken = useCallback(async () => {
    try {
      const res = await callApi.getZegoToken({
        callId: parseInt(callId),
        userId: astrologer?.id || astrologer?.userId,
        isAstrologer: true,
      });
      if (res.data?.status === 200 && res.data.token) {
        wvRef.current?.injectJavaScript(`updateToken('${res.data.token}')`);
      }
    } catch (e) {
      console.warn('[AstroCall] Token refresh failed:', e);
    }
  }, [callId, astrologer]);

  useEffect(() => {
    if (phase === 'active' && timer > 0 && timer % 3000 === 0) {
      refreshToken();
    }
  }, [timer, phase, refreshToken]);

  // Permissions check (Android)
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      console.log('[AstroCall] Requesting Native Permissions...');
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
      const ok = granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;
      console.log('[AstroCall] Native Permissions result:', ok);
      return ok;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const connectVoice = useCallback(async (isVideoCall) => {
    if (voiceStarted.current) return;
    voiceStarted.current = true;

    const hasPerms = await requestPermissions();
    if (!hasPerms) {
      Alert.alert('Permission Error', 'Microphone permission is required for calls.');
    }

    try {
      console.log('[AstroCall] Fetching Zego Token for CID:', callId);
      const res = await callApi.getZegoToken({
        callId: parseInt(callId),
        userId: astrologer?.id || astrologer?.userId,
        isAstrologer: true,
      });
      console.log('[AstroCall] Zego Token Response:', res.data);
      if (res.data?.status === 200) {
        setZegoConfig({ 
          ...res.data, 
          userID: res.data.userID || res.data.userId || String(astrologer?.id || astrologer?.userId || 'astro_' + Date.now()),
          roomID: res.data.roomID || res.data.roomId || String(callId),
          userName: astrologer?.name || 'Astrologer',
          isVideo: isVideoCall
        });
        setPhase('active');
        startTimer();
        startHeartbeat();
        startMetricsFlush();
      } else {
        setPhase('active');
        startTimer();
        Alert.alert('Voice Error', 'Server failed to provide voice token.');
      }
    } catch (e) {
      setPhase('active');
      startTimer();
      console.error('[AstroCall] connectVoice error:', e);
    }
  }, [callId, astrologer, startTimer, startHeartbeat, startMetricsFlush]);

  useEffect(() => {
    if (isAccepted && callData) {
      const isVideoCall = callData.call_type == 11 || callData.call_type === 'Video';
      connectVoice(isVideoCall);
    }
  }, [isAccepted, callData, connectVoice]);

  useEffect(() => {
    if (!callId || !astrologer) return;

    const socket = io(SOCKET_BASE, {
      auth: { token: authToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-call', { callId: parseInt(callId) });
      setConnStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnStatus('reconnecting');
    });

    if (!isAccepted) {
      callApi.getCallById({ callId }).then((res) => {
        const d = res.data?.recordList ?? res.data?.data ?? res.data;
        const c = Array.isArray(d) ? d[0] : d;
        if (!c) return;
        setCallData(c);
        const isVideoCall = c.call_type == 11 || c.call_type === 'Video';
        if (c.callStatus === 'Accepted') {
          setPhase('connecting');
          connectVoice(isVideoCall);
        } else if (c.callStatus === 'Completed') {
          setPhase('completed');
        } else if (c.callStatus === 'Pending') {
          setPhase('incoming');
        }
      }).catch(() => {});
    } else {
      callApi.getCallById({ callId }).then((res) => {
        const d = res.data?.recordList ?? res.data?.data ?? res.data;
        const c = Array.isArray(d) ? d[0] : d;
        if (c && !callData) setCallData(c);
      }).catch(() => {});
    }

    socket.on('call-accepted', (data) => {
      if (phase !== 'active' && phase !== 'connecting') {
        setCallData((prev) => ({ ...prev, ...data }));
        setPhase('connecting');
        const isVideoCall = data.call_type == 11 || data.call_type === 'Video';
        connectVoice(isVideoCall);
      }
    });

    socket.on('call-ended', () => {
      setPhase('completed');
      stopTimer();
      stopHeartbeat();
      stopMetricsFlush();
    });

    socket.on('call-error', (data) => {
      Alert.alert('Call Error', data.message || 'An error occurred.');
    });

    return () => { 
      socket.disconnect(); 
      stopTimer(); 
      stopHeartbeat(); 
      stopMetricsFlush();
    };
  }, [callId, astrologer, authToken, connectVoice, stopTimer, stopHeartbeat, startMetricsFlush, stopMetricsFlush]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAccept = async () => {
    setAccepting(true);
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-call', { callId: parseInt(callId) });
        socketRef.current.emit('accept-call', { callId: parseInt(callId) });
      } else {
        await callApi.acceptRequest({ callId: parseInt(callId) });
      }
      setPhase('connecting');
      const isVideoCall = callData?.call_type == 11 || callData?.call_type === 'Video';
      connectVoice(isVideoCall);
      startMetricsFlush();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to accept call.');
    }
    setAccepting(false);
  };

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

  const handleEndCall = () => {
    Alert.alert('End Call', 'End this call session?', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'End Call', style: 'destructive',
        onPress: () => {
          socketRef.current?.emit('end-call', { callId: parseInt(callId) });
          stopTimer();
          stopHeartbeat();
          stopMetricsFlush();
          setPhase('completed');
        },
      },
    ]);
  };

  const handleWebViewMessage = (e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      switch(msg.type) {
        case 'ready': setVoiceReady(true); break;
        case 'peer_connected': setPeerConnected(true); break;
        case 'peer_left': setPeerConnected(false); break;
        case 'log': console.log('[ZegoBridge JS]', msg.data); break;
        case 'room_state':
          if (msg.data.reason === 'RECONNECTING') setConnStatus('reconnecting');
          else if (msg.data.reason === 'CONNECTED') setConnStatus('connected');
          else if (msg.data.reason === 'DISCONNECTED') setConnStatus('disconnected');
          break;
        case 'publish_quality': metricsBufferRef.current.push({ type: 'publish', stats: msg.data, ts: Date.now() }); break;
        case 'play_quality': metricsBufferRef.current.push({ type: 'play', stats: msg.data, ts: Date.now() }); break;
        case 'error':
          console.warn('[Zego Bridge Error]', msg.data);
          Alert.alert('Voice Error', msg.data);
          break;
      }
    } catch (_) {}
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const customerLetter = (callData?.userName || 'U')[0].toUpperCase();
  const isVideo = callData?.call_type == 11 || callData?.call_type === 'Video';

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor="#110022" />

      {/* Back Button */}
      <TouchableOpacity 
        style={[st.topBackBtn, { top: insets.top + 10 }]} 
        onPress={onBack}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={26} color="#FFF" />
      </TouchableOpacity>

      {/* Zego Bridge (WebView) */}
      <ZegoBridge
        ref={wvRef}
        config={zegoConfig}
        onMessage={handleWebViewMessage}
      />

      {/* Connection Overlays */}
      {connStatus === 'reconnecting' && phase === 'active' && (
        <View style={st.statusOverlay}>
          <ActivityIndicator color={colors.secondary} />
          <Text style={st.statusOverlayTxt}>Reconnecting...</Text>
        </View>
      )}

      {/* ── INCOMING ── */}
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

      {/* ── CONNECTING ── */}
      {phase === 'connecting' && (
        <View style={st.center}>
          <View style={st.avatar}><Text style={st.avatarLetter}>{customerLetter}</Text></View>
          <Text style={st.name}>{callData?.userName || 'Customer'}</Text>
          <View style={st.connectingRow}>
            <ActivityIndicator color="#a78bfa" size="small" />
            <Text style={st.connectingTxt}>Setting up channel...</Text>
          </View>
        </View>
      )}

      {/* ── ACTIVE ── */}
      {phase === 'active' && (
        <View style={st.activeRoot}>
          {!isVideo ? (
            <View style={st.audioCenter}>
              <View style={[st.avatarWrap, peerConnected && st.avatarGlow]}>
                <View style={[st.avatar, st.avatarActive]}>
                  <Text style={st.avatarLetter}>{customerLetter}</Text>
                </View>
              </View>
              <Text style={st.name}>{callData?.userName || 'Customer'}</Text>
              <Text style={st.voiceStatus}>
                {!voiceReady ? '⏳ Connecting...' : peerConnected ? '🔊 Live' : '🔇 Waiting for customer...'}
              </Text>
            </View>
          ) : (
            <View style={st.videoOverlay}>
              <View style={st.videoHeader}>
                 <Text style={st.videoName}>{callData?.userName}</Text>
                 <View style={st.liveBadge}>
                    <View style={st.liveDot} />
                    <Text style={st.liveTxt}>LIVE</Text>
                 </View>
              </View>
              {!peerConnected && (
                <View style={st.videoWaiting}>
                  <ActivityIndicator color="#FFF" />
                  <Text style={st.videoWaitingTxt}>Waiting for customer video...</Text>
                </View>
              )}
            </View>
          )}

          <View style={st.controlsWrap}>
             <View style={st.timerChip}>
                <Ionicons name="time-outline" size={16} color={colors.secondary} />
                <Text style={st.timerTxt}>{fmt(timer)}</Text>
              </View>

              <TouchableOpacity style={st.endBtn} onPress={handleEndCall} activeOpacity={0.85}>
                <Ionicons name="call" size={24} color="#FFF" />
                <Text style={st.endTxt}>End Call</Text>
              </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── COMPLETED ── */}
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

      {/* ── REJECTED ── */}
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

const PURPLE = '#7c3aed';
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#110022' },
  topBackBtn: {
    position: 'absolute', left: 16, zIndex: 110,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  hiddenWebView: { 
    width: 100, height: 100, 
    position: 'absolute', top: 0, left: 0, 
    opacity: 0.01, zIndex: -1 
  },
  videoWebView: { flex: 1, backgroundColor: '#000' },

  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOverlayTxt: { color: '#FFF', marginTop: 10, fontWeight: '700' },

  activeRoot: { flex: 1 },
  audioCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  videoOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 5, padding: 20 },
  videoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  videoName: { color: '#FFF', fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  videoWaiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  videoWaitingTxt: { color: '#FFF', opacity: 0.8 },

  controlsWrap: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    alignItems: 'center', zIndex: 20,
  },

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
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.4)', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 10, marginBottom: 20,
  },
  timerTxt: { color: colors.secondary, fontWeight: '900', fontSize: 22, fontVariant: ['tabular-nums'] },

  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ef4444', borderRadius: 50,
    paddingHorizontal: 40, paddingVertical: 18,
    shadowColor: '#ef4444', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  endTxt: { color: '#FFF', fontWeight: '800', fontSize: 18 },

  purpleBtn: {
    backgroundColor: PURPLE, borderRadius: 14,
    paddingHorizontal: 36, paddingVertical: 14, marginTop: 12,
  },
  purpleBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
