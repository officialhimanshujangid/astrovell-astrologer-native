import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { chatApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import useTranslation from '../hooks/useTranslation';
import { BASE_URI } from '../api/apiClient';
import RemedyModal from '../components/RemedyModal';

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getProfileImageUri = (path) => {
  if (!path) return null;
  return path.startsWith('http') ? path : `${BASE_URI}${path}`;
};

// ─── Chat History Item Accordion ───
const HistoryItem = ({ item, isOpen, onToggle, t, onViewChat, openKundali, onSuggestRemedy }) => {
  const avatarUri = getProfileImageUri(item.userProfile);
  const isCompleted = item.chatStatus === 'Completed';
  const isFree = item.isFreeSession == 1;
  const statusColor = isCompleted ? colors.success : colors.error;

  return (
    <TouchableOpacity
      style={styles.historyCard}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeaderRow}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="person" size={26} color={colors.gold} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.userName}>
            {item.userName || t('user')}
          </Text>
          <Text style={styles.topic} numberOfLines={1}>
            {item.lastMessage || item.intakeTopicOfConcern || 'General Consultation'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.date}>{fmtDate(item.created_at || item.date)}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.earningsText}>Earnings: ₹{parseFloat(item.deductionFromAstrologer || 0).toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + '15', borderColor: statusColor },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isFree ? t('free_session').toUpperCase() : (isCompleted ? t('success') : item.chatStatus)}
            </Text>
          </View>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textMuted}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>

      {isOpen && (
        <View style={styles.expandedSection}>
          <View style={styles.detailGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>{t('session_details')}</Text>
              <Text style={styles.detailVal}>{t('duration')}: {item.totalMin || 0} mins</Text>
              <Text style={styles.detailVal}>Rate: ₹{item.chatRate || 0}/min</Text>
              <Text style={styles.detailVal}>{t('net_earning')}: ₹{parseFloat(item.deductionFromAstrologer || 0).toFixed(2)}</Text>
              {(item.endedBy || item.endReason) && (
                <Text style={styles.detailVal}>Ended By: {item.endedBy || 'N/A'} ({item.endReason || 'manual'})</Text>
              )}
            </View>
            {(item.intakeName || item.intakeGender || item.intakeBirthDate) ? (
              <View style={styles.detailCol}>
                <Text style={styles.detailLabel}>{t('intake_form')}</Text>
                <Text style={styles.detailVal}>{t('name')}: {item.intakeName || item.userName}</Text>
                <Text style={styles.detailVal}>{t('gender')}: {item.intakeGender || 'N/A'}</Text>
                <Text style={styles.detailVal}>{t('dob')}: {item.intakeBirthDate || 'N/A'}</Text>
                <Text style={styles.detailVal}>{t('tob')}: {item.intakeBirthTime || 'N/A'}</Text>
                <Text style={styles.detailVal}>{t('pob')}: {item.intakeBirthPlace || 'N/A'}</Text>
                <Text style={styles.detailVal} numberOfLines={2}>{t('topic_concern')}: {item.intakeTopicOfConcern || 'General'}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onViewChat(item.id)}>
              <Text style={styles.actionBtnText}>{t('view_chat') || 'View Chat'}</Text>
            </TouchableOpacity>
            {(item.intakeBirthDate) ? (
              <TouchableOpacity style={styles.actionBtnOutline} onPress={() => openKundali(item)}>
                <Text style={styles.actionBtnOutlineText}>{t('open_kundli') || 'Open Kundali'}</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.actionBtnOutline} onPress={() => onSuggestRemedy(item)}>
              <Text style={styles.actionBtnOutlineText}>{t('suggest_remedy') || 'Suggest Remedy'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Screen ───
const ChatHistoryScreen = ({ onBack, isSubScreen = false, onOpenSubScreen }) => {
  const { astrologer } = useSelector((s) => s.auth);
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState({});
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [remedyTarget, setRemedyTarget] = useState(null);

  const fetchMessages = async (id) => {
    setSelectedChatId(id);
    setLoadingMessages(true);
    setChatMessages([]);
    try {
      const res = await chatApi.getMessages({ chatRequestId: id });
      const msgs = res.data?.recordList || res.data?.data || [];
      setChatMessages(Array.isArray(msgs) ? msgs : []);
    } catch (_) {}
    setLoadingMessages(false);
  };

  const handleOpenKundali = (item) => {
    if (onOpenSubScreen) {
      onOpenSubScreen('Kundali', {
        name: item.intakeName || item.userName,
        gender: item.intakeGender || 'Male',
        birthDate: item.intakeBirthDate,
        birthTime: item.intakeBirthTime || '12:00:00',
        birthPlace: item.intakeBirthPlace || 'New Delhi',
        latitude: String(item.intakeLat || item.lat || item.latitude || '28.6139'),
        longitude: String(item.intakeLon || item.lon || item.longitude || '77.2090'),
        autoSubmit: true,
      });
    }
  };

  const handleSuggestRemedy = (item) => {
    setRemedyTarget({
      chatRequestId: item.id,
      userId: item.userId,
      name: item.intakeName || item.userName,
    });
  };

  const load = async () => {
    try {
      const res = await chatApi.getChatHistory({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      const list = res.data?.recordList || res.data?.chatList || res.data?.data || [];
      setHistory(Array.isArray(list) ? list : []);
    } catch (_) { }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {!isSubScreen && (
        <ScreenHeader title={t('chat_history')} subtitle={t('chat_history_desc')} onBack={onBack} />
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.goldDark} />
          <Text style={styles.loadingText}>{t('fetching_records')}</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, i) => String(item.id || i)}
          renderItem={({ item }) => (
            <HistoryItem
              item={item}
              isOpen={!collapsedIds[item.id]}
              onToggle={() => setCollapsedIds(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              t={t}
              onViewChat={fetchMessages}
              openKundali={handleOpenKundali}
              onSuggestRemedy={handleSuggestRemedy}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldDark} />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centered}>
              <MaterialCommunityIcons
                name="chat-remove-outline"
                size={56}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>{t('no_sessions')}</Text>
              <Text style={styles.emptySubText}>{t('chat_history_desc')}</Text>
            </View>
          }
        />
      )}

      <Modal visible={!!selectedChatId} transparent={false} animationType="slide" onRequestClose={() => setSelectedChatId(null)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedChatId(null)} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{t('chat_history') || 'Chat History'}</Text>
            <View style={{ width: 24 }} />
          </View>
          {loadingMessages ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <FlatList
              data={chatMessages}
              keyExtractor={(item, i) => String(item.id || i)}
              renderItem={({ item }) => {
                const isSent = item.senderType === 'astrologer';
                return (
                  <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
                    <Text style={[styles.bubbleText, !isSent && styles.bubbleTextReceived]}>{item.message}</Text>
                    <Text style={[styles.bubbleTime, !isSent && { color: colors.textMuted }]}>{new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                );
              }}
              contentContainerStyle={styles.messagesList}
              ListEmptyComponent={<Text style={styles.emptySubText}>{t('no_messages') || 'No messages found.'}</Text>}
            />
          )}
        </SafeAreaView>
      </Modal>

      <RemedyModal
        visible={!!remedyTarget}
        target={remedyTarget}
        onClose={() => setRemedyTarget(null)}
      />
    </View>
  );
};

export default ChatHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  list: { padding: 14, gap: 10 },
  historyCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  cardInfo: { flex: 1 },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  topic: { fontSize: 12, color: colors.textMuted, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 11, color: colors.textSecondary },
  metaDot: { fontSize: 11, color: colors.textMuted },
  earningsText: { fontSize: 11, color: colors.goldDark, fontWeight: '700' },

  cardRight: { alignItems: 'flex-end' },
  statusBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailCol: {
    flex: 1,
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  detailVal: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: colors.gold,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnOutline: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.gold,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    color: colors.goldDark,
    fontWeight: '700',
    fontSize: 13,
  },
  modalContainer: { flex: 1, backgroundColor: '#F7F7F7' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    backgroundColor: colors.white,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalCloseBtn: { padding: 4 },
  messagesList: { padding: 14, paddingBottom: 20 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  bubbleSent: {
    backgroundColor: colors.gold,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: colors.white,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  bubbleText: { color: colors.white, fontSize: 14, lineHeight: 20 },
  bubbleTextReceived: { color: colors.text },
  bubbleTime: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
