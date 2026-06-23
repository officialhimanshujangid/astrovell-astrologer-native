import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ScrollView, Switch,
  Image, ActivityIndicator, Modal,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useAlert } from '../context/AlertContext';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { playRingtone, stopRingtone } from '../utils/audioPlayer';

import { colors } from '../theme/colors';
import { chatApi, callApi, boostApi, profileApi } from '../api/services';
import { BASE_URI, SOCKET_BASE } from '../api/apiClient';
import {
  setChatRequests, setCallRequests,
  removeChatRequest, removeCallRequest,
  setBoostInfo, setLoading,
} from '../store/slices/dashboardSlice';
import { setChatStatus, setCallStatus, setGlobalLang, fetchAstrologerProfile } from '../store/slices/authSlice';
import usePermissions from '../hooks/usePermissions';
import useActiveSession from '../hooks/useActiveSession';
import useTranslation from '../hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_IMG = BASE_URI;


const DashboardScreen = ({ onOpenSubScreen }) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { astrologer, token, chatStatus, callStatus, globalLang } = useSelector(s => s.auth);
  const { chatRequests, callRequests, boostInfo, loading } = useSelector(s => s.dashboard);
  const { showAlert } = useAlert();
  const { can } = usePermissions();
  const activeSession = useActiveSession();
  const { t } = useTranslation();
  const [bannerTimer, setBannerTimer] = useState(null);

  useEffect(() => {
    let interval;
    if (activeSession) {
      const updateTimer = async () => {
        const key = activeSession.type === 'chat' ? `chat_start_${activeSession.id}` : `call_start_${activeSession.id}`;
        const storedStartTimeStr = await AsyncStorage.getItem(key);
        if (storedStartTimeStr) {
          const startTime = parseInt(storedStartTimeStr, 10);
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          setBannerTimer(Math.max(0, elapsed));
        }
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setBannerTimer(null);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const formatBannerTimer = (sec) => {
    if (sec == null) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return ` • ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const socketRef = useRef(null);
  const pollRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showLangModal, setShowLangModal] = useState(false);
  const [trainingVideos, setTrainingVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

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

  const fetchTrainingVideos = useCallback(async () => {
    try {
      const res = await profileApi.getTrainingVideos({ type: 'astrologer' });
      console.log('[DashboardScreen] getTrainingVideos response count:', (res.data?.recordList || []).length);
      setTrainingVideos(res.data?.recordList || res.data?.data || []);
    } catch (err) {
      console.warn('[DashboardScreen] Failed to fetch training videos:', err);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.allSettled([
      dispatch(fetchAstrologerProfile(astrologer?.id)),
      fetchRequests(),
      fetchBoost(),
      fetchTrainingVideos(),
    ]);
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
        playRingtone();
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
        playRingtone();
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
    socketRef.current = socket;
  }, [token, astrologer?.id]);

  useEffect(() => {
    dispatch(setLoading(true));
    dispatch(fetchAstrologerProfile(astrologer?.id));
    fetchRequests();
    fetchBoost();
    fetchTrainingVideos();
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
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update chat status' });
    }
  };

  const toggleCallStatus = async () => {
    const newStatus = callStatus === 'Online' ? 'Offline' : 'Online';
    try {
      await chatApi.updateStatus({ astrologerId: astrologer?.id, status: newStatus });
      dispatch(setCallStatus(newStatus));
    } catch (_) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update call status' });
    }
  };

  // ── Accept / Reject ───────────────────────────────────────────────────────
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
      message: 'Are you sure you want to reject this chat?',
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
        } catch (_) { Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to reject chat' }); }
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
      // Navigate to CallRoom
      navigation.navigate('CallRoom', {
        callId: req.id,
        isAccepted: true,
        initialData: req
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
      message: 'Are you sure?',
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
        } catch (_) { }
      }
    });
  };

  const handleBoost = async () => {
    if (!can('dashboard_boost')) return;
    showAlert({
      title: 'Boost Profile',
      message: 'Boost your profile for 24 hours?',
      cancelText: 'Cancel',
      confirmText: 'Boost Now',
      onConfirmPressed: async () => {
        setBoosting(true);
        try {
          const res = await boostApi.boost({ astrologer_id: astrologer?.id });
          if (res.data?.status === 200) {
            Toast.show({ type: 'success', text1: '🚀 Boosted!', text2: 'Your profile is now boosted for 24 hours!' });
            fetchBoost();
          } else {
            Toast.show({ type: 'error', text1: 'Error', text2: res.data?.message || 'Failed to boost' });
          }
        } catch (e) {
          Toast.show({ type: 'error', text1: 'Error', text2: e.response?.data?.message || 'Failed to boost' });
        }
        setBoosting(false);
      }
    });
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
            {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
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
            <Text style={styles.acceptBtnText}>{t('accept')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectCall(item)} activeOpacity={0.8}>
            <Text style={styles.rejectBtnText}>{t('reject')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Sub-components ───────────────────────────────────────────────────────
  const ServiceItem = ({ label, icon, color, onPress, badge }) => (
    <TouchableOpacity style={styles.serviceItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.serviceIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={26} color={colors.text} />
        {badge > 0 && (
          <View style={[styles.badge, { position: 'absolute', top: -2, right: -2 }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.serviceLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarWrap}>
            {astrologer?.profileImage ? (
              <Image source={{ uri: getProfileImageUri(astrologer.profileImage) }} style={[styles.avatar, { width: 40, height: 40 }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { width: 40, height: 40 }]}>
                <Text style={[styles.avatarLetter, { fontSize: 16 }]}>{(astrologer?.name || 'A')[0]}</Text>
              </View>
            )}
            <View style={[styles.statusDot, { position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.white }]} />
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName}>{astrologer?.name || 'Astrologer'}</Text>
              <TouchableOpacity onPress={onRefresh}><Ionicons name="refresh" size={14} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            <Text style={styles.headerId}>ID: {astrologer?.id || '---'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.langDropdown}
            onPress={() => setShowLangModal(true)}
          >
            <View style={styles.langIconCircle}>
              <Ionicons name="language" size={14} color={colors.goldDark} />
            </View>
            <Text style={styles.langText}>{globalLang === 'en' ? 'EN' : 'HI'}</Text>
            <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
          </TouchableOpacity>
          {can('dashboard_header_notifications') && can('notifications') && (
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => onOpenSubScreen?.('Notifications')}>
              <Ionicons name="notifications-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Thin active-session banner removed — the global <OngoingSessionPill />
            now shows the ongoing call/chat on every screen. The richer
            dashboard_active_session card below is kept. */}

        {/* ── Availability Switches ───────────────────────────────────────── */}
        {can('dashboard_status_toggles') && (
          <View style={styles.availabilityCard}>
            {/* Chat Row */}
            {can('chat') && (
              <View style={[styles.availabilityRow, styles.availabilityBorder]}>
                <View style={styles.availabilityLabelCol}>
                  <Text style={styles.availabilityLabel}>{t('chat').toUpperCase()}</Text>
                </View>
                <View style={styles.availabilityRight}>
                  <Text style={styles.availabilityTime}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Switch
                    value={chatStatus === 'Online'}
                    onValueChange={toggleChatStatus}
                    trackColor={{ false: colors.border, true: colors.success + '80' }}
                    thumbColor={chatStatus === 'Online' ? colors.success : colors.textMuted}
                  />
                </View>
              </View>
            )}

            {/* Call Row */}
            {can('call') && (
              <View style={styles.availabilityRow}>
                <View style={styles.availabilityLabelCol}>
                  <Text style={styles.availabilityLabel}>{t('call').toUpperCase()}</Text>
                </View>
                <View style={styles.availabilityRight}>
                  <Text style={styles.availabilityTime}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                  <Switch
                    value={callStatus === 'Online'}
                    onValueChange={toggleCallStatus}
                    trackColor={{ false: colors.border, true: colors.success + '80' }}
                    thumbColor={callStatus === 'Online' ? colors.success : colors.textMuted}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Active Session Card ────────────────────────────────────────── */}
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

        {/* ── Profile Boost ──────────────────────────────────────────────── */}
        {boostInfo && (
          <View style={styles.boostBanner}>
            <LinearGradient
              colors={boostInfo.isBoosted ? ['#FFF7ED', '#FFFBEB'] : ['#F8FAFC', '#F1F5F9']}
              style={styles.boostContent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={[styles.boostIconBox, { backgroundColor: boostInfo.isBoosted ? '#FEF3C7' : '#E2E8F0' }]}>
                <Ionicons name="rocket" size={24} color={boostInfo.isBoosted ? '#D97706' : colors.textLight} />
              </View>
              <View style={styles.boostTextCol}>
                <Text style={styles.boostTitleText}>
                  {boostInfo.isBoosted ? t('boostActive') : t('boostTitle')}
                </Text>
                <Text style={styles.boostSubText}>
                  {boostInfo.isBoosted ? t('boostActiveSub') : t('boostSub')}
                </Text>
              </View>
              {!boostInfo.isBoosted ? (
                <TouchableOpacity style={styles.boostActionBtn} onPress={handleBoost} disabled={boosting}>
                  {boosting ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.boostBtnLabel}>{t('boostBtn')}</Text>}
                </TouchableOpacity>
              ) : (
                <View style={styles.boostActiveBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#059669" />
                  <Text style={styles.boostActiveText}>{t('active')}</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* ── Service Grid ───────────────────────────────────────────────── */}
        {can('dashboard_service_grid') && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>✨ {t('features_tools')}</Text>
            </View>
            <View style={styles.serviceGrid}>
              {can('call_history') && <ServiceItem label={t('call')} icon="call-outline" color={colors.iconGreen} onPress={() => onOpenSubScreen?.('CallHistory')} badge={callRequests.length} />}
              {can('chat_history') && <ServiceItem label={t('chat')} icon="chatbubble-ellipses-outline" color={colors.iconPink} onPress={() => onOpenSubScreen?.('ChatHistory')} badge={chatRequests.length} />}
              {can('waitlist') && <ServiceItem label={t('waitlist')} icon="hourglass-outline" color={colors.iconYellow} onPress={() => onOpenSubScreen?.('Waitlist')} />}
              {can('assistant_chat') && <ServiceItem label={t('assistant_chat')} icon="chatbubbles-outline" color={colors.iconBlue} onPress={() => onOpenSubScreen?.('AssistantChat')} />}
              {can('followers') && <ServiceItem label={t('my_followers')} icon="people-outline" color={colors.iconGreen} onPress={() => onOpenSubScreen?.('Followers')} />}
              {can('reviews') && <ServiceItem label={t('my_reviews')} icon="star-outline" color={colors.iconYellow} onPress={() => onOpenSubScreen?.('Reviews')} />}
              {can('wallet') && <ServiceItem label={t('wallet')} icon="wallet-outline" color={colors.iconTeal} onPress={() => onOpenSubScreen?.('Wallet')} />}
              {can('settings') && <ServiceItem label={t('settings')} icon="settings-outline" color={colors.iconPink} onPress={() => onOpenSubScreen?.('Settings')} />}
              {can('support') && <ServiceItem label={t('support')} icon="help-buoy-outline" color={colors.iconBlue} onPress={() => onOpenSubScreen?.('Support')} />}
              {can('profile') && <ServiceItem label={t('my_profile')} icon="person-outline" color={colors.iconOrange} onPress={() => onOpenSubScreen?.('Profile')} />}
            </View>
          </>
        )}

        {/* ── Feedback to CEO Section ─────────────────────────────────────── */}
        {can('feedback_ceo') && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📬 {t('feedback_ceo')}</Text>
            </View>
            <TouchableOpacity
              style={styles.feedbackCard}
              activeOpacity={0.85}
              onPress={() => onOpenSubScreen?.('FeedbackCeo')}
            >
              <LinearGradient
                colors={['#FFF5F5', '#FFF0F0']}
                style={styles.feedbackCardBg}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.feedbackLeft}>
                  <View style={styles.feedbackIconCircle}>
                    <Ionicons name="chatbubble-ellipses" size={24} color="#C53030" />
                  </View>
                  <View style={styles.feedbackTextWrap}>
                    <Text style={styles.feedbackTitle}>{t('feedback_ceo')}</Text>
                    <Text style={styles.feedbackSubtitle}>Direct message to the CEO's office</Text>
                  </View>
                </View>
                <View style={styles.feedbackActionBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#C53030" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        {/* ── Training Videos Section ─────────────────────────────────────── */}
        {trainingVideos.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🎥 {t('training_videos')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.videosScroll}
            >
              {trainingVideos.map((video) => {
                const coverUri = getProfileImageUri(video.cover_image);
                return (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoCard}
                    activeOpacity={0.85}
                    onPress={() => setSelectedVideo(video)}
                  >
                    <View style={styles.videoCoverWrap}>
                      {coverUri ? (
                        <Image source={{ uri: coverUri }} style={styles.videoCover} />
                      ) : (
                        <View style={styles.videoCoverPlaceholder}>
                          <Text style={{ fontSize: 24 }}>🎞️</Text>
                        </View>
                      )}
                      <View style={styles.playIconOverlay}>
                        <Ionicons name="play" size={20} color={colors.white} />
                      </View>
                    </View>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {video.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Active Requests ────────────────────────────────────────────── */}
        {can('dashboard_active_requests') && (
          <>
            {chatRequests.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>💬 {t('chatRequests')}</Text>
              </View>
            )}
            {chatRequests.map((req, i) => <ChatRequestCard key={`chat-${i}`} item={req} />)}

            {callRequests.length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📞 {t('callRequests')}</Text>
              </View>
            )}
            {callRequests.map((req, i) => <CallRequestCard key={`call-${i}`} item={req} />)}
          </>
        )}
      </ScrollView>

      {/* Intake Details Modal */}
      <Modal visible={!!selectedRequest} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.requestDetailBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedRequest?.type} {t('intake_form')}</Text>
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
                  <IntakeRow label={t('topic_concern')} value={selectedRequest.intakeTopicOfConcern || t('not_specified')} icon="help-circle-outline" />
                  <IntakeRow label={t('name')} value={selectedRequest.intakeName || selectedRequest.userName || t('user')} icon="person-outline" />
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

      {/* Language Selection Modal */}
      <Modal visible={showLangModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.langModalOverlay}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View style={styles.langModalContent}>
            <View style={styles.langModalHeader}>
              <Text style={styles.langModalTitle}>{t('preferred_language')}</Text>
            </View>
            <TouchableOpacity
              style={[styles.langOption, globalLang === 'en' && styles.langOptionActive]}
              onPress={() => { dispatch(setGlobalLang('en')); setShowLangModal(false); }}
            >
              <Text style={[styles.langOptionText, globalLang === 'en' && styles.langOptionTextActive]}>English</Text>
              {globalLang === 'en' && <Ionicons name="checkmark-circle" size={20} color={colors.goldDark} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langOption, globalLang === 'hi' && styles.langOptionActive]}
              onPress={() => { dispatch(setGlobalLang('hi')); setShowLangModal(false); }}
            >
              <Text style={[styles.langOptionText, globalLang === 'hi' && styles.langOptionTextActive]}>हिन्दी (Hindi)</Text>
              {globalLang === 'hi' && <Ionicons name="checkmark-circle" size={20} color={colors.goldDark} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Video Player WebView Modal */}
      <Modal visible={!!selectedVideo} transparent={false} animationType="slide" onRequestClose={() => setSelectedVideo(null)}>
        <View style={styles.videoPlayerOverlay}>
          <TouchableOpacity
            style={styles.videoPlayerCloseBtn}
            onPress={() => setSelectedVideo(null)}
          >
            <Ionicons name="close" size={24} color={colors.white} />
          </TouchableOpacity>
          {selectedVideo && (
            <View style={styles.webviewContainer}>
              <WebView
                source={{ uri: selectedVideo.video_link }}
                style={{ flex: 1 }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsFullscreenVideo={true}
              />
            </View>
          )}
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
  container: { flex: 1, backgroundColor: colors.secondary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerInfo: { justifyContent: 'center' },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  headerId: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIconBtn: { padding: 4 },
  langDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langIconCircle: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
  },
  langText: { fontSize: 12, fontWeight: '800', color: colors.text },

  statusGrid: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  statusCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 20,
    padding: 12, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statusIconWrap: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  statusInfo: { flex: 1, marginLeft: 10 },
  statusTitle: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  statusState: { fontSize: 13, fontWeight: '700', marginTop: 1 },

  boostBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 20, overflow: 'hidden' },
  boostContent: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  boostIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  boostTextCol: { flex: 1, marginLeft: 16 },
  boostTitleText: { fontSize: 13, fontWeight: '900', color: colors.text },
  boostSubText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  boostActionBtn: {
    backgroundColor: colors.goldDark, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    shadowColor: colors.goldDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  boostBtnLabel: { color: colors.white, fontSize: 12, fontWeight: '800' },
  boostActiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  boostActiveText: { fontSize: 11, fontWeight: '800', color: '#059669' },

  availabilityCard: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  availabilityBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  availabilityLabelCol: { flex: 1 },
  availabilityLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  availabilityPrice: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  availabilityRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  availabilityTime: { fontSize: 11, color: colors.textMuted },

  offerBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.iconYellow,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F6E05E',
  },
  offerHeader: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  offerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  offerTextCol: { flex: 1 },
  offerTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  offerDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },

  utilityCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  utilityLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  utilityIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' },
  utilityInfo: { flex: 1 },
  utilityTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  utilitySub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  earningCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  earningHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  earningTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  earningValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  checkDetailsBtn: { backgroundColor: colors.success, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  checkDetailsText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  invoiceNote: { fontSize: 11, color: colors.error, marginTop: 8 },

  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  serviceItem: {
    width: '33.33%',
    padding: 8,
    alignItems: 'center',
  },
  serviceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  serviceLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },

  progressCard: {
    margin: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressInfo: { flex: 1 },
  progressTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  progressSub: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  progressCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  progressTime: { fontSize: 14, fontWeight: '800', color: colors.error },
  progressUnit: { fontSize: 8, color: colors.textMuted },

  sessionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  sessionViewAll: { fontSize: 12, color: colors.info, fontWeight: '600' },
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
  sessionTimer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  sessionTimeText: { fontSize: 10, fontWeight: '700', color: colors.text, marginLeft: 4 },
  sessionActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  sessionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 6 },
  sessionBtnText: { fontSize: 13, fontWeight: '700', color: colors.success },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, marginTop: 8 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  badge: { backgroundColor: colors.error, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },

  requestCard: {
    backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border,
  },
  requestCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.border },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.goldDark, fontSize: 20, fontWeight: '800' },
  requestInfo: { flex: 1 },
  requestName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  requestTopic: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  requestTime: { color: colors.goldDark, fontSize: 11, fontWeight: '700', marginTop: 4 },
  requestActions: { gap: 8 },
  acceptBtn: { backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  acceptBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  rejectBtn: { backgroundColor: colors.errorBg, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  rejectBtnText: { color: colors.error, fontSize: 12, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  requestDetailBox: {
    backgroundColor: colors.white, borderRadius: 30, padding: 24, maxHeight: '85%',
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

  langModalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  langModalContent: {
    backgroundColor: colors.white, borderRadius: 24, padding: 20, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  langModalHeader: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  langModalTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center' },
  langOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  activeSessionBanner: {
    backgroundColor: colors.goldBg,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.gold,
    elevation: 3,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 8,
  },
  bannerText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  resumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gold,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  resumeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  langOptionActive: { backgroundColor: colors.goldBg, borderColor: colors.goldLight },
  langOptionText: { fontSize: 16, fontWeight: '700', color: colors.textSecondary },
  langOptionTextActive: { color: colors.text },
  feedbackCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFF0F0',
  },
  feedbackCardBg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  feedbackLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  feedbackIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackTextWrap: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  feedbackSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  feedbackActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videosScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 8,
  },
  videoCard: {
    width: 160,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 8,
  },
  videoCoverWrap: {
    width: '100%',
    height: 90,
    backgroundColor: colors.border,
    position: 'relative',
  },
  videoCover: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoCoverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    padding: 10,
    lineHeight: 16,
    height: 48,
  },
  videoPlayerOverlay: {
    flex: 1,
    backgroundColor: colors.black,
    justifyContent: 'center',
  },
  videoPlayerCloseBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 999,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  webviewContainer: {
    flex: 1,
    marginTop: 100,
  },
});
