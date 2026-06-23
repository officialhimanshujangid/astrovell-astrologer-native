/**
 * CallRoomScreen — Astrologer Native (thin shell)
 *
 * The live call (Agora engine / Zego WebView, socket, timers) now lives in the
 * app-level CallProvider so it survives navigation and screen lock. This screen
 * only starts the call for `callId` (if it isn't already active) and tells the
 * provider it is focused, so the provider renders the full-screen active-call
 * surface on top. Pressing back keeps the call running; the global pill resumes.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCall } from '../context/CallContext';

const CallRoomScreen = ({ route }) => {
  const { callId, isAccepted = false, initialData = null } = route?.params || {};
  const { startCall, setOnCallScreen } = useCall();

  useEffect(() => {
    if (callId) startCall(callId, { isAccepted, initialData });
  }, [callId, isAccepted, initialData, startCall]);

  useFocusEffect(
    React.useCallback(() => {
      setOnCallScreen(true);
      return () => setOnCallScreen(false);
    }, [setOnCallScreen])
  );

  return <View style={styles.root} />;
};

export default CallRoomScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#110022' },
});
