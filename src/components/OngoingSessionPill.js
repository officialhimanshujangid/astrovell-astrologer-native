/**
 * OngoingSessionPill — Astrologer Native
 *
 * Compact floating "Resume" pill shown on EVERY screen whenever a call or chat
 * is in progress. Mounted once at the app root (sibling of the navigator) so it
 * floats above the overlay-based MainTabNavigator. Hidden while already on the
 * CallRoom / ChatRoom screen.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useCall } from '../context/CallContext';
import useActiveSession from '../hooks/useActiveSession';
import { navigationRef, getCurrentRouteName, navigate } from '../navigation/navigationRef';

const fmt = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

const OngoingSessionPill = () => {
  const insets = useSafeAreaInsets();
  const call = useCall();
  const activeSession = useActiveSession();
  const [routeName, setRouteName] = useState(getCurrentRouteName());

  useEffect(() => {
    let unsub;
    let cancelled = false;
    let timer;
    const update = () => setRouteName(getCurrentRouteName());
    const attach = () => {
      if (cancelled) return;
      if (navigationRef.isReady && navigationRef.isReady()) {
        update();
        unsub = navigationRef.addListener('state', update);
      } else {
        timer = setTimeout(attach, 300);
      }
    };
    attach();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Only surface the pill once the call has been accepted (connecting/active).
  // Hide it while still 'incoming' — the astrologer hasn't accepted yet.
  const liveCall =
    call?.activeCallId &&
    ['connecting', 'active'].includes(call.phase);

  // A server-reported session counts only once accepted/ongoing.
  const isAccepted = (s) => s === 'Accepted' || s === 'Ongoing' || s === 'Active';

  let target = null;
  if (liveCall) {
    target = {
      route: 'CallRoom',
      params: { callId: call.activeCallId, isAccepted: true },
      label: call.callData?.userName || 'Customer',
      sub: call.phase === 'active' ? fmt(call.timer) : 'Connecting…',
      icon: 'call',
    };
  } else if (activeSession?.type === 'call' && isAccepted(activeSession.status)) {
    target = {
      route: 'CallRoom',
      params: { callId: activeSession.id, isAccepted: true },
      label: activeSession.name || 'Customer',
      sub: 'Tap to resume',
      icon: 'call',
    };
  } else if (activeSession?.type === 'chat' && isAccepted(activeSession.status)) {
    target = {
      route: 'ChatRoom',
      params: { chatId: activeSession.id },
      label: activeSession.name || 'Customer',
      sub: 'Chat in progress',
      icon: 'chatbubble-ellipses',
    };
  }

  if (!target) return null;
  if (routeName === 'CallRoom' || routeName === 'ChatRoom') return null;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigate(target.route, target.params)}
      style={[styles.pill, { bottom: (insets.bottom || 0) + 78 }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={target.icon} size={16} color="#FFF" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>{target.label}</Text>
        <Text style={styles.sub} numberOfLines={1}>{target.sub}</Text>
      </View>
      <View style={styles.resumeBadge}>
        <Text style={styles.resumeText}>Resume</Text>
        <Ionicons name="arrow-forward" size={13} color="#FFF" />
      </View>
    </TouchableOpacity>
  );
};

export default OngoingSessionPill;

const styles = StyleSheet.create({
  pill: {
    position: 'absolute', right: 12, left: 12, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12,
    zIndex: 9999, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  textWrap: { flex: 1 },
  title: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  resumeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginLeft: 8,
  },
  resumeText: { color: '#FFF', fontSize: 11, fontWeight: '800', marginRight: 2 },
});
