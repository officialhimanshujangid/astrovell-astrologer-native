import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAlert } from '../context/AlertContext';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { playRingtone, stopRingtone } from '../utils/audioPlayer';

import { colors } from '../theme/colors';
import { chatApi, callApi } from '../api/services';
import { BASE_URI, SOCKET_BASE } from '../api/apiClient';
import {
  setChatRequests,
  setCallRequests,
  removeChatRequest,
  removeCallRequest,
} from '../store/slices/dashboardSlice';
import usePermissions from '../hooks/usePermissions';
import useTranslation from '../hooks/useTranslation';
import ScreenHeader from '../components/ScreenHeader';
import useActiveSession from '../hooks/useActiveSession';

const BASE_IMG = BASE_URI;

const WaitlistScreen = ({ onBack }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { astrologer, token } = useSelector((s) => s.auth);
  const { chatRequests, callRequests } = useSelector((s) => s.dashboard);
  const { can } = usePermissions();
  const { t } = useTranslation();
  const { showAlert } = useAlert();
  const activeSession = useActiveSession();

  const socketRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

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
  }, [astrologer?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
  };

  // ── Socket Connection ─────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    if (!token) return;
    const socket = io(SOCKET_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => console.log('[Waitlist Socket] connected'));

    socket.on('new-chat-request', (data) => {
      if (data.astrologerId === astrologer?.id) {
        playRingtone('chat');
        fetchRequests();
        showAlert({
          title: '💬 New Chat Request',
          message: `${data.request?.userName || 'A customer'} wants to chat!`,
          showCancelButton: false,
          confirmText: 'OK',
          onConfirmPressed: stopRingtone
        });
      }
    });
    socket.on('new-call-request', (data) => {
      if (data.astrologerId === astrologer?.id) {
        playRingtone('call');
        fetchRequests();
        const callType = data.call_type == 11 ? 'Video' : 'Audio';
        showAlert({
          title: `📞 New ${callType} Call`,
          message: 'A customer wants to connect with you!',
          showCancelButton: false,
          confirmText: 'OK',
          onConfirmPressed: stopRingtone
        });
      }
    });
    // Customer cancelled the pending call → stop ringing + drop it from the list.
    socket.on('call-cancelled', (data) => {
      if (data.astrologerId === astrologer?.id) {
        stopRingtone();
        fetchRequests();
      }
    });

    socketRef.current = socket;
  }, [token, astrologer?.id, fetchRequests]);

  useEffect(() => {
    setLoading(true);
    fetchRequests().finally(() => setLoading(false));
    connectSocket();

    const interval = setInterval(fetchRequests, 6000);

    return () => {
      clearInterval(interval);
      socketRef.current?.disconnect();
    };
  }, [fetchRequests, connectSocket]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleAcceptChat = async (req) => {
    stopRingtone();
    try {
      if (!can('chat_accept')) return Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'You do not have permission to accept chats.' });
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-chat', { chatRequestId: req.id });
        socketRef.current.emit('accept-chat', { chatRequestId: req.id });
      } else {
        await chatApi.acceptRequest({ chatId: req.id });
      }
      dispatch(removeChatRequest(req.id));
      navigation.navigate('ChatRoom', { chatId: req.id });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to accept chat' });
    }
  };

  const handleRejectChat = async (req) => {
    stopRingtone();
    if (!can('chat_reject')) return Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'You do not have permission to reject chats.' });
    showAlert({
      title: 'Reject Chat',
      message: 'Are you sure you want to reject this chat request?',
      cancelText: 'Cancel',
      confirmText: 'Reject',
      onConfirmPressed: async () => {
        try {
          if (socketRef.current?.connected) {
            socketRef.current.emit('reject-chat', { chatRequestId: req.id });
          } else {
            await chatApi.rejectRequest({ chatId: req.id });
          }
          dispatch(removeChatRequest(req.id));
        } catch (_) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to reject chat' });
        }
      }
    });
  };

  const handleAcceptCall = async (req) => {
    stopRingtone();
    try {
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-call', { callId: req.id });
        socketRef.current.emit('accept-call', { callId: req.id });
      } else {
        await callApi.acceptRequest({ callId: req.id });
      }
      dispatch(removeCallRequest(req.id));
      navigation.navigate('CallRoom', {
        callId: req.id,
        isAccepted: true,
        initialData: req,
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to accept call' });
    }
  };

  const handleRejectCall = async (req) => {
    stopRingtone();
    if (!can('call_reject')) return Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'You do not have permission to reject calls.' });
    showAlert({
      title: 'Reject Call',
      message: 'Are you sure you want to reject this call request?',
      cancelText: 'Cancel',
      confirmText: 'Reject',
      onConfirmPressed: async () => {
        try {
          if (socketRef.current?.connected) {
            socketRef.current.emit('reject-call', { callId: req.id });
          } else {
            await callApi.rejectRequest({ callId: req.id });
          }
          dispatch(removeCallRequest(req.id));
        } catch (_) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to reject call' });
        }
      }
    });
  };

  const getProfileImageUri = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `${BASE_IMG}${path}`;
  };

  // ── Render Item Cards ─────────────────────────────────────────────────────
  const ChatRequestCard = ({ item }) => (
    <TouchableOpacity
      style={styles.requestCard}
      activeOpacity={0.9}
      onPress={() => {
        if (can('chat_intake_details')) setSelectedRequest({ ...item, type: 'Chat' });
      }}
    >
      <View style={styles.requestCardLeft}>
        <View style={styles.avatarWrap}>
          {item.userProfile ? (
            <Image source={{ uri: getProfileImageUri(item.userProfile) }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>{(item.userName || 'U')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.typeMiniIcon, { backgroundColor: colors.success }]}>
            <Ionicons name="chatbubble-ellipses" size={10} color={colors.white} />
          </View>
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.requestName}>{item.userName || item.intakeName || 'User'}</Text>
          <Text style={styles.requestTopic} numberOfLines={1}>
            {item.intakeTopicOfConcern ? `📌 ${item.intakeTopicOfConcern}` : 'Viewing Intake Form...'}
          </Text>
          <Text style={styles.requestTime}>
            {item.created_at
              ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
              : ''}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptChat(item)} activeOpacity={0.8}>
          <Text style={styles.acceptBtnText}>{t('accept')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectChat(item)} activeOpacity={0.8}>
          <Text style={styles.rejectBtnText}>{t('reject')}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const CallRequestCard = ({ item }) => {
    const isVideo = item.call_type == 11;
    return (
      <TouchableOpacity
        style={[styles.requestCard, { borderLeftColor: isVideo ? colors.accentTeal : '#3b82f6', borderLeftWidth: 5 }]}
        activeOpacity={0.9}
        onPress={() => {
          if (can('call_intake_details')) setSelectedRequest({ ...item, type: 'Call' });
        }}
      >
        <View style={styles.requestCardLeft}>
          <View style={styles.avatarWrap}>
            {item.userProfile ? (
              <Image source={{ uri: getProfileImageUri(item.userProfile) }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.goldBg }]}>
                <Text style={[styles.avatarLetter, { color: colors.goldDark }]}>
                  {(item.userName || 'U')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.typeMiniIcon, { backgroundColor: isVideo ? colors.accentTeal : '#3b82f6' }]}>
              <Ionicons name={isVideo ? 'videocam' : 'call'} size={10} color={colors.white} />
            </View>
          </View>
          <View style={styles.requestInfo}>
            <View style={styles.callNameRow}>
              <Text style={styles.requestName}>{item.userName || 'User'}</Text>
              <View style={[styles.callTypeBadge, isVideo && { backgroundColor: colors.goldBg }]}>
                <Text style={styles.callTypeText}>{isVideo ? '📹 Video' : '📞 Audio'}</Text>
              </View>
            </View>
            <Text style={styles.requestTopic} numberOfLines={1}>
              {item.intakeTopicOfConcern ? `📌 ${item.intakeTopicOfConcern}` : 'Viewing Intake Form...'}
            </Text>
            <Text style={styles.requestTime}>
              {item.created_at
                ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                : ''}
            </Text>
          </View>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptCall(item)} activeOpacity={0.8}>
            <Text style={styles.acceptBtnText}>{t('accept')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectCall(item)} activeOpacity={0.8}>
            <Text style={styles.rejectBtnText}>{t('reject')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const totalRequestsCount = chatRequests.length + callRequests.length;

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('waitlist')} subtitle={`${totalRequestsCount} Waiting`} onBack={onBack} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.goldDark} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Active Session ────────────────────────────────────────── */}
          {can('dashboard_active_session') && activeSession && (
            <View style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionTitle}>⚡ {t('active')} {activeSession.type === 'chat' ? t('chat') : t('call')}</Text>
                <View style={[styles.badge, { backgroundColor: colors.success }]}>
                  <Text style={styles.badgeText}>{activeSession.status}</Text>
                </View>
              </View>
              <View style={styles.sessionContent}>
                <View style={styles.avatarWrap}>
                  {activeSession.profile ? (
                    <Image source={{ uri: getProfileImageUri(activeSession.profile) }} style={styles.sessionAvatar} />
                  ) : (
                    <View style={[styles.sessionAvatar, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ fontWeight: 'bold', color: colors.textSecondary }}>{activeSession.name?.[0]}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionName}>{activeSession.name}</Text>
                  <Text style={styles.sessionSpent}>{t('time_spent')}: {activeSession.spentTime || '00:00'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.sessionBtn}
                  onPress={() => {
                    if (activeSession.type === 'chat') {
                      navigation.navigate('ChatRoom', { chatId: activeSession.id });
                    } else {
                      navigation.navigate('CallRoom', { callId: activeSession.id, isAccepted: true });
                    }
                  }}
                >
                  <Text style={styles.sessionBtnText}>{t('resume')}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.success} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {chatRequests.length === 0 && callRequests.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.iconCircle}>
                <Text style={styles.emoji}>⏳</Text>
              </View>
              <Text style={styles.emptyTitle}>Your Waitlist is Empty</Text>
              <Text style={styles.emptySub}>When customers request a chat or call consultation with you, they will appear here in real-time.</Text>
            </View>
          ) : (
            <>
              {chatRequests.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.goldDark} />
                    <Text style={styles.sectionTitle}>Chat Waitlist ({chatRequests.length})</Text>
                  </View>
                  {chatRequests.map((req, i) => (
                    <ChatRequestCard key={`chat-${i}`} item={req} />
                  ))}
                </View>
              )}

              {callRequests.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="call-outline" size={18} color={colors.goldDark} />
                    <Text style={styles.sectionTitle}>Call Waitlist ({callRequests.length})</Text>
                  </View>
                  {callRequests.map((req, i) => (
                    <CallRequestCard key={`call-${i}`} item={req} />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Intake Details Modal */}
      <Modal visible={!!selectedRequest} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.requestDetailBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedRequest?.type} {t('intake_form')}
              </Text>
              <TouchableOpacity onPress={() => setSelectedRequest(null)}>
                <Ionicons name="close-circle" size={30} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailAvatarSection}>
                  {selectedRequest.userProfile ? (
                    <Image source={{ uri: getProfileImageUri(selectedRequest.userProfile) }} style={styles.bigAvatar} />
                  ) : (
                    <View style={styles.bigAvatarPlaceholder}>
                      <Text style={styles.bigAvatarLetter}>{(selectedRequest.userName || 'U')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={styles.bigName}>{selectedRequest.userName || 'Anonymous User'}</Text>
                  <View style={styles.timerBadge}>
                    <Ionicons name="time-outline" size={14} color={colors.goldDark} style={{ marginRight: 4 }} />
                    <Text style={styles.timerText}>{t('incoming')}</Text>
                  </View>
                </View>

                <View style={styles.intakeSection}>
                  <IntakeRow
                    label={t('topic_concern')}
                    value={selectedRequest.intakeTopicOfConcern || t('not_specified')}
                    icon="help-circle-outline"
                  />
                  <IntakeRow
                    label={t('name')}
                    value={selectedRequest.intakeName || selectedRequest.userName || t('user')}
                    icon="person-outline"
                  />
                  <IntakeRow label={t('gender')} value={selectedRequest.intakeGender || 'N/A'} icon="transgender-outline" />
                  <IntakeRow label={t('dob')} value={selectedRequest.intakeBirthDate || 'N/A'} icon="calendar-outline" />
                  <IntakeRow label={t('tob')} value={selectedRequest.intakeBirthTime || 'N/A'} icon="time-outline" />
                  <IntakeRow label={t('pob')} value={selectedRequest.intakeBirthPlace || 'N/A'} icon="location-outline" />
                </View>

                <View style={styles.detailActionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.success }]}
                    onPress={() => {
                      const req = selectedRequest;
                      setSelectedRequest(null);
                      req.type === 'Chat' ? handleAcceptChat(req) : handleAcceptCall(req);
                    }}
                  >
                    <Text style={styles.actionBtnText}>{t('accept')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.error }]}
                    onPress={() => {
                      const req = selectedRequest;
                      setSelectedRequest(null);
                      req.type === 'Chat' ? handleRejectChat(req) : handleRejectCall(req);
                    }}
                  >
                    <Text style={styles.actionBtnText}>{t('reject')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const IntakeRow = ({ label, value, icon }) => (
  <View style={styles.intakeRow}>
    <View style={styles.intakeRowLeft}>
      <Ionicons name={icon} size={20} color={colors.goldDark} style={{ marginRight: 12 }} />
      <Text style={styles.intakeLabel}>{label}</Text>
    </View>
    <Text style={styles.intakeValue}>{value}</Text>
  </View>
);

export default WaitlistScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.secondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 40 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, marginTop: 60 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  emoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  section: { marginTop: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase' },

  sessionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  sessionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary,
    padding: 12,
    borderRadius: 16,
  },
  sessionAvatar: { width: 44, height: 44, borderRadius: 22 },
  sessionInfo: { flex: 1, marginLeft: 12 },
  sessionName: { fontSize: 14, fontWeight: '700', color: colors.text },
  sessionSpent: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  sessionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 6, backgroundColor: colors.white },
  sessionBtnText: { fontSize: 13, fontWeight: '700', color: colors.success },

  requestCard: {
    backgroundColor: colors.surface,
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
  avatarWrap: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: colors.goldDark, fontSize: 20, fontWeight: '800' },
  typeMiniIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  requestInfo: { flex: 1 },
  requestName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  requestTopic: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  requestTime: { color: colors.goldDark, fontSize: 11, fontWeight: '700', marginTop: 4 },
  callNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  callTypeBadge: { backgroundColor: '#EBF8FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  callTypeText: { fontSize: 9, fontWeight: '700', color: '#2b6cb0' },

  requestActions: { gap: 8 },
  acceptBtn: { backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  acceptBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  rejectBtn: {
    backgroundColor: colors.errorBg,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  rejectBtnText: { color: colors.error, fontSize: 12, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  requestDetailBox: {
    backgroundColor: colors.white,
    borderRadius: 30,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  detailAvatarSection: { alignItems: 'center', marginBottom: 24 },
  bigAvatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 12, borderWidth: 3, borderColor: colors.gold },
  bigAvatarPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: colors.gold,
  },
  bigAvatarLetter: { color: colors.goldDark, fontSize: 36, fontWeight: '900' },
  bigName: { color: colors.text, fontSize: 20, fontWeight: '900' },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  timerText: { color: colors.goldDark, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  intakeSection: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  intakeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  intakeRowLeft: { flexDirection: 'row', alignItems: 'center' },
  intakeLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  intakeValue: { color: colors.text, fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'right', marginLeft: 10 },
  detailActionsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: 'center', shadowOpacity: 0.2, elevation: 4 },
  actionBtnText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  badge: { backgroundColor: colors.error, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
});
