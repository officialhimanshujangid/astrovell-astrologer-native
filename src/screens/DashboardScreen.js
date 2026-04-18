import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ScrollView, Switch,
  Image, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { chatApi, callApi, boostApi } from '../api/services';
import { SOCKET_BASE } from '../api/apiClient';
import {
  setChatRequests, setCallRequests,
  removeChatRequest, removeCallRequest,
  setBoostInfo, setLoading,
} from '../store/slices/dashboardSlice';
import { setChatStatus, setCallStatus, setGlobalLang } from '../store/slices/authSlice';
import usePermissions from '../hooks/usePermissions';

const BASE_IMG = 'https://astrology-i7c9.onrender.com/';

const DashboardScreen = ({ onOpenSubScreen, onOpenCallRoom }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { astrologer, token, chatStatus, callStatus, globalLang } = useSelector(s => s.auth);
  const { chatRequests, callRequests, boostInfo, loading } = useSelector(s => s.dashboard);
  const { can } = usePermissions();

  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [boosting, setBoosting] = useState(false);

  // ── Fetch requests ────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    try {
      const [chatRes, callRes] = await Promise.allSettled([
        chatApi.getRequests({ astrologerId: astrologer?.id }),
        callApi.getRequests({ astrologerId: astrologer?.id }),
      ]);
      if (chatRes.status === 'fulfilled') {
        const d = chatRes.value.data;
        dispatch(setChatRequests(d?.chatRequest || d?.recordList || []));
      }
      if (callRes.status === 'fulfilled') {
        const d = callRes.value.data;
        dispatch(setCallRequests(d?.callRequest || d?.recordList || []));
      }
    } catch (_) { }
    dispatch(setLoading(false));
  }, [astrologer?.id]);

  const fetchBoost = useCallback(async () => {
    try {
      const res = await boostApi.getInfo({ astrologer_id: astrologer?.id });
      dispatch(setBoostInfo(res.data));
    } catch (_) { }
  }, [astrologer?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    await fetchBoost();
    setRefreshing(false);
  };

  // ── Socket ────────────────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    if (!token) return;
    const socket = io(SOCKET_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => console.log('[Astrologer Socket] connected'));
    socket.on('new-chat-request', (data) => {
      if (data.astrologerId === astrologer?.id) {
        fetchRequests();
        Alert.alert('💬 New Chat Request', `${data.request?.userName || 'A customer'} wants to chat!`);
      }
    });
    socket.on('new-call-request', (data) => {
      if (data.astrologerId === astrologer?.id) {
        fetchRequests();
        const callType = data.call_type == 11 ? 'Video' : 'Audio';
        Alert.alert(`📞 New ${callType} Call`, 'A customer wants to connect with you!');
      }
    });
    socketRef.current = socket;
  }, [token, astrologer?.id]);

  useEffect(() => {
    dispatch(setLoading(true));
    fetchRequests();
    fetchBoost();
    connectSocket();
    pollRef.current = setInterval(fetchRequests, 6000);
    return () => {
      clearInterval(pollRef.current);
      socketRef.current?.disconnect();
    };
  }, []);

  // ── Status toggle ─────────────────────────────────────────────────────────
  const toggleChatStatus = async () => {
    const newStatus = chatStatus === 'Online' ? 'Offline' : 'Online';
    try {
      await chatApi.updateStatus({ astrologerId: astrologer?.id, status: newStatus });
      dispatch(setChatStatus(newStatus));
    } catch (_) {
      Alert.alert('Error', 'Failed to update chat status');
    }
  };

  const toggleCallStatus = async () => {
    const newStatus = callStatus === 'Online' ? 'Offline' : 'Online';
    try {
      await chatApi.updateStatus({ astrologerId: astrologer?.id, status: newStatus });
      dispatch(setCallStatus(newStatus));
    } catch (_) {
      Alert.alert('Error', 'Failed to update call status');
    }
  };

  // ── Accept / Reject ───────────────────────────────────────────────────────
  const handleAcceptChat = async (req) => {
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-chat', { chatRequestId: req.id });
        socketRef.current.emit('accept-chat', { chatRequestId: req.id });
      } else {
        await chatApi.acceptRequest({ chatId: req.id });
      }
      dispatch(removeChatRequest(req.id));
      navigation.navigate('ChatRoom', { chatId: req.id });
    } catch (_) {
      Alert.alert('Error', 'Failed to accept chat');
    }
  };

  const handleRejectChat = async (req) => {
    Alert.alert('Reject Chat', 'Are you sure you want to reject this chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
            if (socketRef.current?.connected) {
              socketRef.current.emit('reject-chat', { chatRequestId: req.id });
            } else {
              await chatApi.rejectRequest({ chatId: req.id });
            }
            dispatch(removeChatRequest(req.id));
          } catch (_) { Alert.alert('Error', 'Failed to reject chat'); }
        },
      },
    ]);
  };

  const handleAcceptCall = async (req) => {
    try {
      // Emit via socket first for speed
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-call', { callId: req.id });
        socketRef.current.emit('accept-call', { callId: req.id });
      } else {
        await callApi.acceptRequest({ callId: req.id });
      }
      dispatch(removeCallRequest(req.id));
      // Navigate to CallRoomScreen with isAccepted=true — this skips the race condition
      onOpenCallRoom?.(req.id, true, req);
    } catch (_) {
      Alert.alert('Error', 'Failed to accept call');
    }
  };

  const handleRejectCall = async (req) => {
    Alert.alert('Reject Call', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          try {
            if (socketRef.current?.connected) {
              socketRef.current.emit('reject-call', { callId: req.id });
            } else {
              await callApi.rejectRequest({ callId: req.id });
            }
            dispatch(removeCallRequest(req.id));
          } catch (_) { }
        },
      },
    ]);
  };

  const handleBoost = async () => {
    Alert.alert('Boost Profile', 'Boost your profile for 24 hours?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Boost Now', onPress: async () => {
          setBoosting(true);
          try {
            const res = await boostApi.boost({ astrologer_id: astrologer?.id });
            if (res.data?.status === 200) {
              Alert.alert('🚀 Boosted!', 'Your profile is now boosted for 24 hours!');
              fetchBoost();
            } else {
              Alert.alert('Error', res.data?.message || 'Failed to boost');
            }
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to boost');
          }
          setBoosting(false);
        },
      },
    ]);
  };

  const getProfileImageUri = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `${BASE_IMG}${path}`;
  };

  // ── Request Card ──────────────────────────────────────────────────────────
  const ChatRequestCard = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestCardLeft}>
        {item.userProfile ? (
          <Image source={{ uri: getProfileImageUri(item.userProfile) }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{(item.userName || 'U')[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.userName || item.intakeName || 'User'}</Text>
          {item.intakeTopicOfConcern && (
            <Text style={styles.requestTopic} numberOfLines={1}>📌 {item.intakeTopicOfConcern}</Text>
          )}
          {item.intakeBirthDate && (
            <Text style={styles.requestMeta}>DOB: {item.intakeBirthDate}</Text>
          )}
          <Text style={styles.requestTime}>
            {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptChat(item)} activeOpacity={0.8}>
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectChat(item)} activeOpacity={0.8}>
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const CallRequestCard = ({ item }) => (
    <View style={[styles.requestCard, { borderLeftColor: colors.info, borderLeftWidth: 4 }]}>
      <View style={styles.requestCardLeft}>
        {item.userProfile ? (
          <Image source={{ uri: getProfileImageUri(item.userProfile) }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: colors.info + '30' }]}>
            <Text style={[styles.avatarLetter, { color: colors.info }]}>
              {(item.userName || 'U')[0].toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.requestInfo}>
          <View style={styles.callNameRow}>
            <Text style={styles.requestName}>{item.userName || 'User'}</Text>
            <View style={[styles.callTypeBadge, item.call_type == 11 && { backgroundColor: colors.secondary + '30' }]}>
              <Text style={styles.callTypeText}>
                {item.call_type == 11 ? '📹 Video' : '📞 Audio'}
              </Text>
            </View>
          </View>
          {item.intakeTopicOfConcern && (
            <Text style={styles.requestTopic} numberOfLines={1}>📌 {item.intakeTopicOfConcern}</Text>
          )}
          <Text style={styles.requestTime}>
            {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptCall(item)} activeOpacity={0.8}>
          <Text style={styles.acceptBtnText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectCall(item)} activeOpacity={0.8}>
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const totalRequests = chatRequests.length + callRequests.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreet}>
            {astrologer?.name ? `Hello, ${astrologer.name.split(' ')[0]} 🙏` : 'Welcome 🙏'}
          </Text>
          <Text style={styles.headerSub}>Astrologer Dashboard</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerLangBtn} 
            onPress={() => dispatch(setGlobalLang(globalLang === 'en' ? 'hi' : 'en'))}
            activeOpacity={0.8}
          >
            <Text style={styles.headerLangIcon}>🌐</Text>
            <Text style={styles.headerLangText}>{globalLang === 'en' ? 'EN' : 'HI'}</Text>
          </TouchableOpacity>
          {can('dashboard_notifications') && can('notifications') && (
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => onOpenSubScreen?.('Notifications')}
            >
              <Text style={{ fontSize: 22 }}>🔔</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* ── Status Toggles ─────────────────────────────────────────────── */}
        <View style={styles.statusRow}>
          {can('dashboard_status_toggles') && can('chat') && (
            <View style={styles.statusCard}>
              <View style={styles.statusLeft}>
                <View style={[styles.statusDot, { backgroundColor: chatStatus === 'Online' ? colors.online : colors.offline }]} />
                <View>
                  <Text style={styles.statusLabel}>Chat</Text>
                  <Text style={[styles.statusValue, { color: chatStatus === 'Online' ? colors.online : colors.offline }]}>
                    {chatStatus}
                  </Text>
                </View>
              </View>
              <Switch
                value={chatStatus === 'Online'}
                onValueChange={toggleChatStatus}
                trackColor={{ false: colors.border, true: colors.success + '80' }}
                thumbColor={chatStatus === 'Online' ? colors.success : colors.textMuted}
              />
            </View>
          )}

          {can('dashboard_status_toggles') && can('call') && (
            <View style={styles.statusCard}>
              <View style={styles.statusLeft}>
                <View style={[styles.statusDot, { backgroundColor: callStatus === 'Online' ? colors.online : colors.offline }]} />
                <View>
                  <Text style={styles.statusLabel}>Call</Text>
                  <Text style={[styles.statusValue, { color: callStatus === 'Online' ? colors.online : colors.offline }]}>
                    {callStatus}
                  </Text>
                </View>
              </View>
              <Switch
                value={callStatus === 'Online'}
                onValueChange={toggleCallStatus}
                trackColor={{ false: colors.border, true: colors.success + '80' }}
                thumbColor={callStatus === 'Online' ? colors.success : colors.textMuted}
              />
            </View>
          )}
        </View>

        {/* ── Profile Boost ──────────────────────────────────────────────── */}
        {boostInfo && (
          <View style={styles.boostCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.boostTitle}>
                {boostInfo.isBoosted ? '🚀 Profile Boosted!' : '📈 Boost Your Profile'}
              </Text>
              <Text style={styles.boostSub}>
                {boostInfo.isBoosted
                  ? 'You appear on top for 24 hours'
                  : `Appear on top of the list (${boostInfo.remainingBoosts ?? '?'} boosts left this month)`}
              </Text>
            </View>
            {!boostInfo.isBoosted ? (
              <TouchableOpacity
                style={[styles.boostBtn, boosting && { opacity: 0.6 }]}
                onPress={handleBoost}
                disabled={boosting}
                activeOpacity={0.8}
              >
                {boosting
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : <Text style={styles.boostBtnText}>Boost</Text>}
              </TouchableOpacity>
            ) : (
              <View style={styles.boostActiveBadge}>
                <Text style={styles.boostActiveBadgeText}>Active</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Quick Stats ────────────────────────────────────────────────── */}
        <View style={styles.quickStats}>
          {can('dashboard_quick_stats') && can('chat') && (
            <TouchableOpacity style={styles.quickStat} onPress={() => onOpenSubScreen?.('ChatHistory')}>
              <Text style={styles.quickStatEmoji}>💬</Text>
              <Text style={styles.quickStatLabel}>Chats</Text>
            </TouchableOpacity>
          )}
          {can('dashboard_quick_stats') && can('call') && (
            <TouchableOpacity style={styles.quickStat} onPress={() => onOpenSubScreen?.('CallHistory')}>
              <Text style={styles.quickStatEmoji}>📞</Text>
              <Text style={styles.quickStatLabel}>Calls</Text>
            </TouchableOpacity>
          )}
          {can('dashboard_quick_stats') && can('reviews') && (
            <TouchableOpacity style={styles.quickStat} onPress={() => onOpenSubScreen?.('Reviews')}>
              <Text style={styles.quickStatEmoji}>⭐</Text>
              <Text style={styles.quickStatLabel}>Reviews</Text>
            </TouchableOpacity>
          )}
          {can('dashboard_quick_stats') && can('appointments') && (
            <TouchableOpacity style={styles.quickStat} onPress={() => onOpenSubScreen?.('Appointments')}>
              <Text style={styles.quickStatEmoji}>📅</Text>
              <Text style={styles.quickStatLabel}>Schedule</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Chat Requests ─────────────────────────────────────────────── */}
        {can('chat') && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💬 Chat Requests</Text>
              {chatRequests.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{chatRequests.length}</Text>
                </View>
              )}
            </View>
            {loading ? (
              <ActivityIndicator color={colors.secondary} style={{ margin: 20 }} />
            ) : chatRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyText}>No pending chat requests</Text>
                <Text style={styles.emptyHint}>Set Chat Status to Online to receive requests</Text>
              </View>
            ) : (
              chatRequests.map(item => <ChatRequestCard key={item.id} item={item} />)
            )}
          </>
        )}

        {/* ── Call Requests ─────────────────────────────────────────────── */}
        {can('call') && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📞 Call Requests</Text>
              {callRequests.length > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.info }]}>
                  <Text style={styles.badgeText}>{callRequests.length}</Text>
                </View>
              )}
            </View>
            {callRequests.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📞</Text>
                <Text style={styles.emptyText}>No pending call requests</Text>
                <Text style={styles.emptyHint}>Set Call Status to Online to receive requests</Text>
              </View>
            ) : (
              callRequests.map(item => <CallRequestCard key={item.id} item={item} />)
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerGreet: { color: colors.text, fontSize: 18, fontWeight: '800' },
  headerSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerLangBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.border },
  headerLangIcon: { fontSize: 13, marginRight: 4 },
  headerLangText: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  notifBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Status toggles
  statusRow: { flexDirection: 'row', gap: 12, margin: 16 },
  statusCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  statusValue: { fontSize: 13, fontWeight: '800' },

  // Boost card
  boostCard: {
    margin: 16, marginTop: 0,
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  boostTitle: { color: colors.white, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  boostSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12 },
  boostBtn: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  boostBtnText: { color: colors.secondary, fontWeight: '800', fontSize: 13 },
  boostActiveBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  boostActiveBadgeText: { color: colors.white, fontWeight: '700', fontSize: 13 },

  // Quick stats
  quickStats: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 10,
  },
  quickStat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  quickStatEmoji: { fontSize: 22 },
  quickStatLabel: { color: colors.textSub, fontSize: 10, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },

  // Request card
  requestCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.secondary + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.secondary, fontSize: 20, fontWeight: '800' },
  requestInfo: { flex: 1 },
  requestName: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 2 },
  requestTopic: { color: colors.textSub, fontSize: 11, marginBottom: 2 },
  requestMeta: { color: colors.textMuted, fontSize: 11 },
  requestTime: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  callNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  callTypeBadge: {
    backgroundColor: colors.info + '25',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  callTypeText: { color: colors.info, fontSize: 10, fontWeight: '700' },

  requestActions: { gap: 6 },
  acceptBtn: {
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
  },
  acceptBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  rejectBtn: {
    backgroundColor: colors.danger + '20',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger + '50',
  },
  rejectBtnText: { color: colors.danger, fontSize: 12, fontWeight: '700' },

  // Empty
  emptyCard: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: colors.textSub, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  emptyHint: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
});
