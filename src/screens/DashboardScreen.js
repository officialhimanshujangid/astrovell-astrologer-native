import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, ScrollView, Switch,
  Image, ActivityIndicator, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

// ── Translations ─────────────────────────────────────────────────────────────
const translations = {
  en: {
    greet: 'Hello',
    welcome: 'Welcome 🙏',
    dashboard: 'Astrologer Dashboard',
    chat: 'Chat',
    call: 'Call',
    boostTitle: 'Boost Your Profile',
    boostSub: 'Appear on top of the list',
    boostActive: 'Profile Boosted!',
    boostActiveSub: 'You appear on top for 24 hours',
    boostBtn: 'Boost',
    chats: 'Chats',
    calls: 'Calls',
    reviews: 'Reviews',
    schedule: 'Schedule',
    chatRequests: 'Chat Requests',
    callRequests: 'Call Requests',
    noRequests: 'No pending requests',
    accept: 'Accept',
    reject: 'Reject',
  },
  hi: {
    greet: 'नमस्ते',
    welcome: 'स्वागत है 🙏',
    dashboard: 'ज्योतिषी डैशबोर्ड',
    chat: 'चैट',
    call: 'कॉल',
    boostTitle: 'अपनी प्रोफाइल बूस्ट करें',
    boostSub: 'लिस्ट में सबसे ऊपर दिखें',
    boostActive: 'प्रोफ़ाइल बूस्ट हो गई!',
    boostActiveSub: 'आप 24 घंटे तक सबसे ऊपर दिखेंगे',
    boostBtn: 'बूस्ट',
    chats: 'चैट्स',
    calls: 'कॉल्स',
    reviews: 'समीक्षाएं',
    schedule: 'अनुसूची',
    chatRequests: 'चैट अनुरोध',
    callRequests: 'कॉल अनुरोध',
    noRequests: 'कोई लंबित अनुरोध नहीं',
    accept: 'स्वीकार करें',
    reject: 'अस्वीकार करें',
  }
};

const DashboardScreen = ({ onOpenSubScreen }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { astrologer, token, chatStatus, callStatus, globalLang } = useSelector(s => s.auth);
  const { chatRequests, callRequests, boostInfo, loading } = useSelector(s => s.dashboard);
  const { can } = usePermissions();

  const t = translations[globalLang || 'en'];

  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [boosting, setBoosting] = useState(false);
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
      if (socketRef.current?.connected) {
        socketRef.current.emit('join-call', { callId: req.id });
        socketRef.current.emit('accept-call', { callId: req.id });
      } else {
        await callApi.acceptRequest({ callId: req.id });
      }
      dispatch(removeCallRequest(req.id));
      Alert.alert('✅ Call Accepted', 'Call session started!');
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
    <TouchableOpacity 
      style={styles.requestCard} 
      activeOpacity={0.9}
      onPress={() => setSelectedRequest({ ...item, type: 'Chat' })}
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
            {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptChat(item)} activeOpacity={0.8}>
          <Text style={styles.acceptBtnText}>{t.accept}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectChat(item)} activeOpacity={0.8}>
          <Text style={styles.rejectBtnText}>{t.reject}</Text>
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
        onPress={() => setSelectedRequest({ ...item, type: 'Call' })}
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
              <Ionicons name={isVideo ? "videocam" : "call"} size={10} color={colors.white} />
            </View>
          </View>
          <View style={styles.requestInfo}>
            <View style={styles.callNameRow}>
              <Text style={styles.requestName}>{item.userName || 'User'}</Text>
              <View style={[styles.callTypeBadge, isVideo && { backgroundColor: colors.goldBg }]}>
                <Text style={styles.callTypeText}>
                  {isVideo ? '📹 Video' : '📞 Audio'}
                </Text>
              </View>
            </View>
            <Text style={styles.requestTopic} numberOfLines={1}>
              {item.intakeTopicOfConcern ? `📌 ${item.intakeTopicOfConcern}` : 'Viewing Intake Form...'}
            </Text>
            <Text style={styles.requestTime}>
              {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
        </View>
        <View style={styles.requestActions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptCall(item)} activeOpacity={0.8}>
            <Text style={styles.acceptBtnText}>{t.accept}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectCall(item)} activeOpacity={0.8}>
            <Text style={styles.rejectBtnText}>{t.reject}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreet}>
            {astrologer?.name ? `${t.greet}, ${astrologer.name.split(' ')[0]} 🙏` : t.welcome}
          </Text>
          <Text style={styles.headerSub}>{t.dashboard}</Text>
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
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
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
                  <Text style={styles.statusLabel}>{t.chat}</Text>
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
                  <Text style={styles.statusLabel}>{t.call}</Text>
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
                {boostInfo.isBoosted ? t.boostActive : t.boostTitle}
              </Text>
              <Text style={styles.boostSub}>
                {boostInfo.isBoosted
                  ? t.boostActiveSub
                  : `${t.boostSub} (${boostInfo.remainingBoosts ?? '?'} left)`}
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
                  ? <ActivityIndicator color={colors.goldDark} size="small" />
                  : <Text style={styles.boostBtnText}>{t.boostBtn}</Text>}
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
              <Text style={styles.quickStatLabel}>{t.chats}</Text>
            </TouchableOpacity>
          )}
          {can('dashboard_quick_stats') && can('call') && (
            <TouchableOpacity style={styles.quickStat} onPress={() => onOpenSubScreen?.('CallHistory')}>
              <Text style={styles.quickStatEmoji}>📞</Text>
              <Text style={styles.quickStatLabel}>{t.calls}</Text>
            </TouchableOpacity>
          )}
          {can('dashboard_quick_stats') && can('reviews') && (
            <TouchableOpacity style={styles.quickStat} onPress={() => onOpenSubScreen?.('Reviews')}>
              <Text style={styles.quickStatEmoji}>⭐</Text>
              <Text style={styles.quickStatLabel}>{t.reviews}</Text>
            </TouchableOpacity>
          )}
          {can('dashboard_quick_stats') && can('appointments') && (
            <TouchableOpacity style={styles.quickStat} onPress={() => onOpenSubScreen?.('Appointments')}>
              <Text style={styles.quickStatEmoji}>📅</Text>
              <Text style={styles.quickStatLabel}>{t.schedule}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Chat Requests ─────────────────────────────────────────────── */}
        {can('chat') && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>💬 {t.chatRequests}</Text>
              {chatRequests.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{chatRequests.length}</Text>
                </View>
              )}
            </View>
            {loading ? (
              <ActivityIndicator color={colors.goldDark} style={{ margin: 20 }} />
            ) : chatRequests.length === 0 ? (
              <Text style={styles.noRequests}>{t.noRequests}</Text>
            ) : (
              chatRequests.map((req, i) => <ChatRequestCard key={i} item={req} />)
            )}
          </>
        )}

        {/* ── Call Requests ─────────────────────────────────────────────── */}
        {can('call') && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📞 {t.callRequests}</Text>
              {callRequests.length > 0 && (
                <View style={[styles.badge, { backgroundColor: '#3b82f6' }]}>
                  <Text style={styles.badgeText}>{callRequests.length}</Text>
                </View>
              )}
            </View>
            {loading ? (
              <ActivityIndicator color={colors.goldDark} style={{ margin: 20 }} />
            ) : callRequests.length === 0 ? (
              <Text style={styles.noRequests}>{t.noRequests}</Text>
            ) : (
              callRequests.map((req, i) => <CallRequestCard key={i} item={req} />)
            )}
          </>
        )}
      </ScrollView>

      {/* Intake Details Modal */}
      <Modal visible={!!selectedRequest} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.requestDetailBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRequest?.type} Request Form</Text>
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
                       <Text style={styles.timerText}>Incoming...</Text>
                    </View>
                </View>

                <View style={styles.intakeSection}>
                   <IntakeRow label="Topic of Concern" value={selectedRequest.intakeTopicOfConcern || 'Not Specified'} icon="help-circle-outline" />
                   <IntakeRow label="Name" value={selectedRequest.intakeName || selectedRequest.userName || 'User'} icon="person-outline" />
                   <IntakeRow label="Gender" value={selectedRequest.intakeGender || 'N/A'} icon="transgender-outline" />
                   <IntakeRow label="Birth Date" value={selectedRequest.intakeBirthDate || 'N/A'} icon="calendar-outline" />
                   <IntakeRow label="Birth Time" value={selectedRequest.intakeBirthTime || 'N/A'} icon="time-outline" />
                   <IntakeRow label="Birth Place" value={selectedRequest.intakeBirthPlace || 'N/A'} icon="location-outline" />
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
                     <Text style={styles.actionBtnText}>{t.accept}</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: colors.error }]}
                    onPress={() => {
                      const req = selectedRequest;
                      setSelectedRequest(null);
                      req.type === 'Chat' ? handleRejectChat(req) : handleRejectCall(req);
                    }}
                   >
                     <Text style={styles.actionBtnText}>{t.reject}</Text>
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

export default DashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  headerGreet: { color: colors.text, fontSize: 18, fontWeight: '900' },
  headerSub: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLangBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  headerLangIcon: { fontSize: 14, marginRight: 4 },
  headerLangText: { color: colors.goldDark, fontSize: 12, fontWeight: '800' },
  notifBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },

  statusRow: { flexDirection: 'row', gap: 12, padding: 16 },
  statusCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  statusValue: { fontSize: 13, fontWeight: '800' },

  boostCard: {
    margin: 16, marginTop: 0,
    backgroundColor: colors.gold,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  boostTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  boostSub: { color: colors.textSecondary, fontSize: 12 },
  boostBtn: {
    backgroundColor: colors.white, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.goldDark,
  },
  boostBtnText: { color: colors.goldDark, fontWeight: '800', fontSize: 13 },
  boostActiveBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  boostActiveBadgeText: { color: colors.white, fontWeight: '700', fontSize: 13 },

  quickStats: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, gap: 10 },
  quickStat: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, gap: 4,
  },
  quickStatEmoji: { fontSize: 22 },
  quickStatLabel: { color: colors.textSecondary, fontSize: 10, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 10, marginTop: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  badge: { backgroundColor: colors.error, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },

  requestCard: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  requestCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.goldDark, fontSize: 20, fontWeight: '800' },
  requestInfo: { flex: 1 },
  requestName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  requestTopic: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  requestMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  requestTime: { color: colors.goldDark, fontSize: 11, fontWeight: '700', marginTop: 4 },
  requestActions: { gap: 8 },
  acceptBtn: { backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  acceptBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  rejectBtn: { backgroundColor: colors.errorBg, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  rejectBtnText: { color: colors.error, fontSize: 12, fontWeight: '800' },
  noRequests: { color: colors.textMuted, textAlign: 'center', marginTop: 10, fontSize: 13, fontStyle: 'italic' },
  callNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  callTypeBadge: { backgroundColor: colors.secondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  callTypeText: { fontSize: 9, fontWeight: '800', color: colors.textSecondary },

  // New styles
  avatarWrap: { position: 'relative' },
  typeMiniIcon: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.white,
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  requestDetailBox: {
    backgroundColor: colors.white, borderRadius: 30, padding: 24, maxHeight: '85%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  detailAvatarSection: { alignItems: 'center', marginBottom: 24 },
  bigAvatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 12, borderWidth: 3, borderColor: colors.gold },
  bigAvatarPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: colors.gold },
  bigAvatarLetter: { color: colors.goldDark, fontSize: 36, fontWeight: '900' },
  bigName: { color: colors.text, fontSize: 20, fontWeight: '900' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.goldBg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
  timerText: { color: colors.goldDark, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  intakeSection: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  intakeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  intakeRowLeft: { flexDirection: 'row', alignItems: 'center' },
  intakeLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  intakeValue: { color: colors.text, fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'right', marginLeft: 10 },
  detailActionsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, paddingVertical: 15, borderRadius: 16, alignItems: 'center', shadowOpacity: 0.2, elevation: 4 },
  actionBtnText: { color: colors.white, fontSize: 15, fontWeight: '900' },
});
