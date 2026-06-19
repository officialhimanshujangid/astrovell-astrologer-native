/**
 * CallRoomScreen — Astrologer Native
 *
 * State machine:
 *   'incoming'   → show Accept / Reject (call is Pending)
 *   'accepting'  → API call in-flight
 *   'connecting' → accepted, fetching token
 *   'active'     → voice/video live with timer
 *   'completed'  → call ended
 *   'rejected'   → astrologer rejected
 *
 * Provider strategy:
 *   - 'agora' → react-native-agora native SDK (works in dev builds & Expo Go)
 *   - 'zego'  → Zego Web SDK inside a WebView
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, ActivityIndicator, Dimensions, Platform, PermissionsAndroid,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAlert } from '../context/AlertContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
// Agora native SDK — optional, only available in dev builds (not Expo Go)
let createAgoraRtcEngine, ClientRoleType, ChannelProfileType, RtcSurfaceView;
let AGORA_AVAILABLE = false;
try {
  const agora = require('react-native-agora');
  createAgoraRtcEngine = agora.createAgoraRtcEngine;
  ClientRoleType = agora.ClientRoleType;
  ChannelProfileType = agora.ChannelProfileType;
  RtcSurfaceView = agora.RtcSurfaceView;
  AGORA_AVAILABLE = true;
} catch (e) {
  console.warn('[AstroCall] react-native-agora not available (Expo Go). Using Zego WebView only.');
  RtcSurfaceView = View; // fallback stub
}
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import Ionicons from '@expo/vector-icons/Ionicons';
import { callApi } from '../api/services';
import { colors } from '../theme/colors';
import { ZEGO_SDK } from '../utils/ZegoSDK';
import { BASE_URI, SOCKET_BASE } from '../api/apiClient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const fmt = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

// ─── Zego WebView HTML (Zego provider only) ───────────────────────────────────
const buildZegoHtml = ({ appID, roomID, userID, token, serverUrl, userName, isVideo }) => `
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{width:100vw;height:100vh;overflow:hidden;background:#000;font-family:sans-serif;}
  #remote-video-container { width: 100%; height: 100%; background: #111; }
  #remote-video { width: 100%; height: 100%; object-fit: cover; display: none; }
  #local-video-container {
    position: absolute; bottom: 20px; right: 20px;
    width: 100px; height: 150px; border-radius: 12px;
    border: 2px solid rgba(255,255,255,0.3); overflow: hidden;
    background: #222; z-index: 10;
  }
  #local-video { width: 100%; height: 100%; object-fit: cover; display: none; }
  .status-msg {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    color: #fff; font-size: 14px; text-align: center; pointer-events: none;
    opacity: 0.7; z-index: 5;
  }
  #ra { display: none; }
</style>
<script>
window._preGrantStream = null;
(function() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(function(s) { window._preGrantStream = s; })
    .catch(function() {});
})();
</script>
<script>${ZEGO_SDK}</script>
</head><body>
<audio id="ra" autoplay playsinline></audio>
<div id="remote-video-container">
  <video id="remote-video" autoplay playsinline></video>
</div>
<div id="local-video-container">
  <video id="local-video" autoplay playsinline muted></video>
</div>
${isVideo ? '' : '<div class="status-msg">Audio Only Session</div>'}
<script>
function post(t,d){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:t,data:d}));}catch(e){}}

var appID = Number(${JSON.stringify(appID || 0)});
var roomID = ${JSON.stringify(roomID || '')};
var token = ${JSON.stringify(token || '')};
var userID = String(${JSON.stringify(userID || '')});
var userName = ${JSON.stringify(userName || 'User')};
var serverUrl = ${JSON.stringify(serverUrl || 'wss://webliveroom-api.zegocloud.com/ws')};
var isVideo = ${!!isVideo};
var zg, localStream;

async function init(){
  try{
    post('log', 'Zego Init: appID=' + appID);
    if(typeof ZegoExpressEngine === 'undefined') {
      setTimeout(init, 800);
      return;
    }
    if (isVideo) {
      document.getElementById('remote-video').style.display = 'block';
      document.getElementById('local-video').style.display = 'block';
    }
    zg = new ZegoExpressEngine(appID, serverUrl);
    zg.on('roomStateChanged', function(r, reason, code){
      post('room_state', { reason: reason, code: code });
    });
    zg.on('roomStreamUpdate', async function(r, uType, list){
      if(uType === 'ADD'){
        for(var s of list){
          var rs = await zg.startPlayingStream(s.streamID);
          if(isVideo) {
            var rv = document.getElementById('remote-video');
            if(rv) rv.srcObject = rs;
          } else {
            var ra = document.getElementById('ra');
            if(ra) { ra.srcObject = rs; ra.play().catch(function(){}); }
          }
        }
        post('peer_connected', null);
      } else {
        post('peer_left', null);
      }
    });
    await zg.loginRoom(roomID, token, { userID: userID, userName: userName });
    post('log', 'Zego Login OK');
    localStream = await Promise.race([
      zg.createStream({ camera: { audio: true, video: isVideo } }),
      new Promise(function(_, rej){ setTimeout(function(){ rej(new Error('timeout')); }, 15000); })
    ]);
    if(isVideo) { var lv = document.getElementById('local-video'); if(lv) lv.srcObject = localStream; }
    await zg.startPublishingStream('stream_' + userID, localStream);
    post('ready', null);
  }catch(e){
    post('log', 'Zego ERROR: ' + (e.message || String(e)));
    post('error', e.message || String(e));
  }
}

function updateToken(t){ if(zg) zg.renewToken(t); }
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
</script></body></html>`;

// ─── Zego WebView Bridge ──────────────────────────────────────────────────────
const ZegoBridge = React.forwardRef(({ config, onMessage }, ref) => {
  if (!config) return null;
  return (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={{ html: buildZegoHtml(config), baseUrl: BASE_URI }}
      style={config.isVideo ? st.videoWebView : st.hiddenWebView}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback={true}
      mixedContentMode="always"
      allowFileAccess={true}
      mediaCapturePermissionGrantType="grant"
      onPermissionRequest={(event) => {
        const { resources } = event.nativeEvent;
        if (typeof event.nativeEvent.grant === 'function') {
          event.nativeEvent.grant(resources);
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
  const { showAlert } = useAlert();
  const { callId, isAccepted = false, initialData = null } = route?.params || {};
  const onBack = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack();
    }
  };
  const { astrologer, token: authToken } = useSelector((s) => s.auth);

  const [phase, setPhase] = useState(isAccepted ? 'connecting' : 'incoming');
  const [callData, setCallData] = useState(initialData || null);
  const [timer, setTimer] = useState(0);
  const [callConfig, setCallConfig] = useState(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [connStatus, setConnStatus] = useState('connecting');
  // Call controls
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCameraFlipped, setIsCameraFlipped] = useState(false);
  // Agora-specific
  const [agoraRemoteUid, setAgoraRemoteUid] = useState(null);

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const hbRef = useRef(null);
  const wvRef = useRef(null);
  const agoraEngRef = useRef(null);
  const metricsBufferRef = useRef([]);
  const metricsFlushRef = useRef(null);
  const voiceStarted = useRef(false);
  const timerValRef = useRef(0);

  // ── Timer ───────────────────────────────────────────────────────────────
  const startTimer = useCallback(async () => {
    clearInterval(timerRef.current);
    const storedStartTimeStr = await AsyncStorage.getItem(`call_start_${callId}`);
    let startTime = Date.now();
    if (storedStartTimeStr) {
      startTime = parseInt(storedStartTimeStr, 10);
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setTimer(elapsed);
      timerValRef.current = elapsed;
    } else {
      await AsyncStorage.setItem(`call_start_${callId}`, startTime.toString());
      setTimer(0);
      timerValRef.current = 0;
    }

    timerRef.current = setInterval(() => {
      setTimer(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timerValRef.current = elapsed;
        return elapsed;
      });
    }, 1000);
  }, [callId]);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // ── Heartbeat ────────────────────────────────────────────────────────────
  const startHeartbeat = useCallback(() => {
    clearInterval(hbRef.current);
    hbRef.current = setInterval(() => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('call-heartbeat', {
          callId: parseInt(callId),
          duration: timerValRef.current,
          metrics: metricsBufferRef.current,
        });
      }
    }, 10000);
  }, [callId]);

  const stopHeartbeat = useCallback(() => {
    clearInterval(hbRef.current);
    hbRef.current = null;
  }, []);

  // ── Metrics ──────────────────────────────────────────────────────────────
  const startMetricsFlush = useCallback(() => {
    clearInterval(metricsFlushRef.current);
    metricsFlushRef.current = setInterval(() => {
      const buf = metricsBufferRef.current;
      if (!buf.length) return;
      const events = buf.splice(0, buf.length);
      callApi.postMetrics({ callId: parseInt(callId), events }).catch(() => { });
    }, 30000);
  }, [callId]);

  const stopMetricsFlush = useCallback(() => {
    clearInterval(metricsFlushRef.current);
    metricsFlushRef.current = null;
    const buf = metricsBufferRef.current;
    if (buf.length) {
      const events = buf.splice(0, buf.length);
      callApi.postMetrics({ callId: parseInt(callId), events }).catch(() => { });
    }
  }, [callId]);

  // ── Agora cleanup ─────────────────────────────────────────────────────────
  const releaseAgora = useCallback(() => {
    try {
      if (agoraEngRef.current) {
        agoraEngRef.current.leaveChannel();
        agoraEngRef.current.release();
        agoraEngRef.current = null;
      }
    } catch (_) { }
  }, []);

  // ── Token refresh ─────────────────────────────────────────────────────────
  const refreshToken = useCallback(async () => {
    try {
      const res = await callApi.getZegoToken({
        callId: parseInt(callId),
        userId: astrologer?.id || astrologer?.userId,
        isAstrologer: true,
      });
      if (res.data?.status === 200 && res.data.token) {
        if (callConfig?.provider === 'agora' && agoraEngRef.current) {
          agoraEngRef.current.renewToken(res.data.token);
        } else {
          wvRef.current?.injectJavaScript(`updateToken('${res.data.token}')`);
        }
      }
    } catch (e) {
      console.warn('[AstroCall] Token refresh failed:', e);
    }
  }, [callId, astrologer, callConfig]);

  // ── Call Controls ─────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    if (callConfig?.provider === 'agora' && agoraEngRef.current) {
      agoraEngRef.current.muteLocalAudioStream(next);
    } else if (wvRef.current) {
      wvRef.current.injectJavaScript(`
        if(localStream) {
          var tracks = localStream.getAudioTracks();
          tracks.forEach(function(t){ t.enabled = ${!next}; });
        } true;
      `);
    }
  }, [isMuted, callConfig]);

  const toggleSpeaker = useCallback(() => {
    const next = !isSpeaker;
    setIsSpeaker(next);
    if (callConfig?.provider === 'agora' && agoraEngRef.current) {
      agoraEngRef.current.setEnableSpeakerphone(next);
    }
  }, [isSpeaker, callConfig]);

  const toggleVideo = useCallback(() => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    if (callConfig?.provider === 'agora' && agoraEngRef.current) {
      agoraEngRef.current.muteLocalVideoStream(next);
    } else if (wvRef.current) {
      wvRef.current.injectJavaScript(`
        if(localStream) {
          var tracks = localStream.getVideoTracks();
          tracks.forEach(function(t){ t.enabled = ${!next}; });
        } true;
      `);
    }
  }, [isVideoOff, callConfig]);

  const flipCamera = useCallback(() => {
    setIsCameraFlipped((p) => !p);
    if (callConfig?.provider === 'agora' && agoraEngRef.current) {
      agoraEngRef.current.switchCamera();
    }
  }, [callConfig]);

  useEffect(() => {
    if (phase === 'active' && timer > 0 && timer % 3000 === 0) refreshToken();
  }, [timer, phase, refreshToken]);

  // ── Permissions ───────────────────────────────────────────────────────────
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
      return granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED;
    } catch (_) {
      return false;
    }
  };

  // ── Connect Voice/Video ───────────────────────────────────────────────────
  const connectVoice = useCallback(async (isVideoCall) => {
    if (voiceStarted.current) return;
    voiceStarted.current = true;

    await requestPermissions();

    try {
      console.log('[AstroCall] Fetching token for CID:', callId);
      const res = await callApi.getZegoToken({
        callId: parseInt(callId),
        userId: astrologer?.id || astrologer?.userId,
        isAstrologer: true,
      });
      console.log('[AstroCall] Token Response:', res.data);
      if (res.data?.status === 200) {
        const config = {
          ...res.data,
          userID: res.data.userID || res.data.userId || String(astrologer?.id || astrologer?.userId || 'astro_' + Date.now()),
          roomID: res.data.roomID || res.data.roomId || String(callId),
          userName: astrologer?.name || 'Astrologer',
          isVideo: isVideoCall,
        };
        setCallConfig(config);
        setPhase('active');
        startTimer();
        startHeartbeat();
        startMetricsFlush();
      } else {
        setPhase('active');
        startTimer();
        Toast.show({ type: 'error', text1: 'Voice Error', text2: 'Server failed to provide voice token.' });
      }
    } catch (e) {
      setPhase('active');
      startTimer();
      console.error('[AstroCall] connectVoice error:', e);
    }
  }, [callId, astrologer, startTimer, startHeartbeat, startMetricsFlush]);

  // ── Agora Native Engine ────────────────────────────────────────────────────
  useEffect(() => {
    if (!callConfig || callConfig.provider !== 'agora') return;

    console.log('[Agora Native] Initialising engine. AppID:', callConfig.appID);
    let engine;
    try {
      engine = createAgoraRtcEngine();
      agoraEngRef.current = engine;

      engine.initialize({
        appId: callConfig.appID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      engine.registerEventHandler({
        onJoinChannelSuccess: (connection, elapsed) => {
          console.log('[Agora Native] Joined. Elapsed:', elapsed);
          setVoiceReady(true);
        },
        onUserJoined: (connection, remoteUid, elapsed) => {
          console.log('[Agora Native] Remote joined:', remoteUid);
          setAgoraRemoteUid(remoteUid);
          setPeerConnected(true);
        },
        onUserOffline: (connection, remoteUid, reason) => {
          console.log('[Agora Native] Remote left:', remoteUid, reason);
          setAgoraRemoteUid(null);
          setPeerConnected(false);
        },
        onError: (err, msg) => {
          console.warn('[Agora Native] Error:', err, msg);
          Toast.show({ type: 'error', text1: 'Call Error', text2: msg || String(err) });
        },
        onTokenPrivilegeWillExpire: () => refreshToken(),
        onConnectionStateChanged: (connection, state, reason) => {
          // Agora states: 1=Disconnected, 2=Connecting, 3=Connected, 4=Reconnecting, 5=Failed
          if (state === 3) setConnStatus('connected');
          else if (state === 4) setConnStatus('reconnecting');
          else if (state === 5) setConnStatus('failed');
        },
      });

      engine.enableAudio();
      if (callConfig.isVideo) {
        engine.enableVideo();
        engine.startPreview();
      }

      const uid = parseInt(callConfig.userID) || 0;
      console.log('[Agora Native] Joining:', callConfig.roomID, 'uid:', uid);
      engine.joinChannel(callConfig.token, callConfig.roomID, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: !!callConfig.isVideo,
        autoSubscribeAudio: true,
        autoSubscribeVideo: !!callConfig.isVideo,
      });

    } catch (e) {
      console.error('[Agora Native] Init error:', e);
      Toast.show({ type: 'error', text1: 'Agora Error', text2: e.message || String(e) });
    }

    return () => {
      console.log('[Agora Native] Releasing engine');
      releaseAgora();
    };
  }, [callConfig, refreshToken, releaseAgora]);

  // ── auto-connect if already accepted ─────────────────────────────────────
  useEffect(() => {
    if (isAccepted && callData) {
      const isVideoCall = callData.call_type == 11 || callData.call_type === 'Video';
      connectVoice(isVideoCall);
    }
  }, [isAccepted, callData, connectVoice]);

  // ── Socket ────────────────────────────────────────────────────────────────
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
    socket.on('disconnect', () => console.log('[AstroCall] Socket disconnected (voice channel unaffected)'));

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
      }).catch(() => { });
    } else {
      callApi.getCallById({ callId }).then((res) => {
        const d = res.data?.recordList ?? res.data?.data ?? res.data;
        const c = Array.isArray(d) ? d[0] : d;
        if (c && !callData) setCallData(c);
      }).catch(() => { });
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
      releaseAgora();
      setPhase('completed');
      stopTimer();
      stopHeartbeat();
      stopMetricsFlush();
      AsyncStorage.removeItem(`call_start_${callId}`).catch(() => {});
    });

    socket.on('call-error', (data) => {
      Toast.show({ type: 'error', text1: 'Call Error', text2: data.message || 'An error occurred.' });
    });

    return () => {
      socket.disconnect();
      stopTimer();
      stopHeartbeat();
      stopMetricsFlush();
      releaseAgora();
    };
  }, [callId, astrologer, authToken, connectVoice, stopTimer, stopHeartbeat, startMetricsFlush, stopMetricsFlush, releaseAgora]);

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
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to accept call.' });
    }
    setAccepting(false);
  };

  const handleReject = () => {
    showAlert({
      title: 'Reject Call',
      message: 'Reject this call request?',
      cancelText: 'Cancel',
      confirmText: 'Reject',
      onConfirmPressed: async () => {
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
      }
    });
  };

  const handleEndCall = () => {
    showAlert({
      title: 'End Call',
      message: 'End this call session?',
      cancelText: 'Keep Going',
      confirmText: 'End Call',
      onConfirmPressed: () => {
        socketRef.current?.emit('end-call', { callId: parseInt(callId) });
        releaseAgora();
        stopTimer();
        stopHeartbeat();
        stopMetricsFlush();
        AsyncStorage.removeItem(`call_start_${callId}`).catch(() => {});
        setPhase('completed');
      }
    });
  };

  const handleWebViewMessage = (e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      switch (msg.type) {
        case 'ready': setVoiceReady(true); break;
        case 'peer_connected': setPeerConnected(true); break;
        case 'peer_left': setPeerConnected(false); break;
        case 'log': console.log('[ZegoBridge JS]', msg.data); break;
        case 'room_state':
          if (msg.data?.reason === 'RECONNECTING') setConnStatus('reconnecting');
          else if (msg.data?.reason === 'CONNECTED') setConnStatus('connected');
          break;
        case 'error':
          console.warn('[ZegoBridge Error]', msg.data);
          Toast.show({ type: 'error', text1: 'Voice Error', text2: msg.data });
          break;
      }
    } catch (_) { }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isVideo = callData?.call_type == 11 || callData?.call_type === 'Video';
  const isAgora = callConfig?.provider === 'agora';
  const customerLetter = (callData?.userName || 'U')[0].toUpperCase();

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

      {/* ── Zego WebView (Zego provider only) ── */}
      {callConfig && !isAgora && (
        <ZegoBridge
          ref={wvRef}
          config={callConfig}
          onMessage={handleWebViewMessage}
        />
      )}

      {/* ── Agora Native Video (Agora provider, video calls) ── */}
      {isAgora && isVideo && phase === 'active' && (
        <View style={StyleSheet.absoluteFill}>
          {agoraRemoteUid != null ? (
            <RtcSurfaceView
              canvas={{ uid: agoraRemoteUid }}
              style={st.videoWebView}
            />
          ) : (
            <View style={[st.videoWebView, { alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator color="#FFF" />
              <Text style={{ color: '#FFF', marginTop: 8, opacity: 0.7 }}>Waiting for customer video...</Text>
            </View>
          )}
          <View style={st.localPip}>
            <RtcSurfaceView canvas={{ uid: 0 }} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {/* Reconnecting overlay */}
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
          {/* Audio-only or Zego video UI */}
          {(!isVideo || (!isAgora && isVideo)) && (
            <View style={st.audioCenter}>
              <View style={[st.avatarWrap, peerConnected && st.avatarGlow]}>
                <View style={[st.avatar, st.avatarActive]}>
                  <Text style={st.avatarLetter}>{customerLetter}</Text>
                </View>
              </View>
              <Text style={st.name}>{callData?.userName || 'Customer'}</Text>
              <Text style={st.voiceStatus}>
                {!voiceReady ? '⏳ Joining channel...' : peerConnected ? '🔊 Connected' : '🔇 Waiting for customer...'}
              </Text>
              <View style={st.timerChip}>
                <Ionicons name="time-outline" size={16} color={colors.secondary} />
                <Text style={st.timerTxt}>{fmt(timer)}</Text>
              </View>
            </View>
          )}

          {/* Agora video overlay */}
          {isAgora && isVideo && (
            <View style={st.videoOverlay}>
              <View style={st.videoHeader}>
                <Text style={st.videoName}>{callData?.userName}</Text>
                <View style={st.liveBadge}>
                  <View style={st.liveDot} />
                  <Text style={st.liveTxt}>LIVE</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Call Controls ── */}
          <View style={st.controlsWrap}>
            {/* Control buttons row */}
            <View style={st.controlBar}>
              <TouchableOpacity
                style={[st.controlBtn, isMuted && st.controlBtnActive]}
                onPress={toggleMute}
                activeOpacity={0.7}
              >
                <Ionicons name={isMuted ? 'mic-off' : 'mic'} size={24} color={isMuted ? '#ef4444' : '#FFF'} />
                <Text style={[st.controlLabel, isMuted && st.controlLabelActive]}>Mute</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[st.controlBtn, isSpeaker && st.controlBtnActive]}
                onPress={toggleSpeaker}
                activeOpacity={0.7}
              >
                <Ionicons name={isSpeaker ? 'volume-high' : 'ear'} size={24} color={isSpeaker ? colors.secondary : '#FFF'} />
                <Text style={[st.controlLabel, isSpeaker && st.controlLabelActive]}>Speaker</Text>
              </TouchableOpacity>

              {isVideo && (
                <TouchableOpacity
                  style={[st.controlBtn, isVideoOff && st.controlBtnActive]}
                  onPress={toggleVideo}
                  activeOpacity={0.7}
                >
                  <Ionicons name={isVideoOff ? 'videocam-off' : 'videocam'} size={24} color={isVideoOff ? '#ef4444' : '#FFF'} />
                  <Text style={[st.controlLabel, isVideoOff && st.controlLabelActive]}>Camera</Text>
                </TouchableOpacity>
              )}

              {isVideo && (
                <TouchableOpacity
                  style={st.controlBtn}
                  onPress={flipCamera}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera-reverse" size={24} color="#FFF" />
                  <Text style={st.controlLabel}>Flip</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* End Call button */}
            <TouchableOpacity style={st.endBtn} onPress={handleEndCall} activeOpacity={0.85}>
              <Ionicons name="call" size={24} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
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
    opacity: 0.01, zIndex: -1,
  },
  videoWebView: { flex: 1, backgroundColor: '#000' },
  localPip: {
    position: 'absolute', bottom: 120, right: 20,
    width: 100, height: 150, borderRadius: 12,
    overflow: 'hidden', borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)', zIndex: 15,
  },

  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 100, alignItems: 'center', justifyContent: 'center',
  },
  statusOverlayTxt: { color: '#FFF', marginTop: 10, fontWeight: '700' },

  activeRoot: { flex: 1 },
  audioCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  videoOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 5, padding: 20 },
  videoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  videoName: { color: '#FFF', fontSize: 18, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },

  controlsWrap: {
    position: 'absolute', bottom: 40, left: 0, right: 0,
    alignItems: 'center', zIndex: 20,
  },
  controlBar: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    marginBottom: 24, paddingHorizontal: 20,
  },
  controlBtn: {
    width: 64, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  controlBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  controlLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600' },
  controlLabelActive: { color: '#FFF' },

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

  timerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 9,
  },
  timerTxt: { color: '#FFF', fontWeight: '700', fontSize: 16, fontVariant: ['tabular-nums'] },

  actionRow: { flexDirection: 'row', gap: 20, marginTop: 16 },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#ef4444', borderRadius: 50,
    paddingVertical: 16,
    shadowColor: '#ef4444', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#10b981', borderRadius: 50,
    paddingVertical: 16,
    shadowColor: '#10b981', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  actionTxt: { color: '#FFF', fontWeight: '800', fontSize: 17 },

  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ef4444', borderRadius: 50,
    paddingHorizontal: 36, paddingVertical: 16,
    shadowColor: '#ef4444', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5,
  },
  endTxt: { color: '#FFF', fontWeight: '800', fontSize: 18 },

  purpleBtn: {
    backgroundColor: PURPLE, borderRadius: 14,
    paddingHorizontal: 36, paddingVertical: 14, marginTop: 12,
  },
  purpleBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
