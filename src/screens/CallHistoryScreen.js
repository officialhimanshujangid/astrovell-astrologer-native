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
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { callApi } from '../api/services';
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

const STATUS_COLORS = {
  Completed: colors.success,
  completed: colors.success,
  Cancelled: colors.error,
  cancelled: colors.error,
  Missed: colors.warning,
  missed: colors.warning,
};

// ─── Call History Item Accordion ───
const CallItem = ({ item, isOpen, onToggle, t, openKundali, onSuggestRemedy }) => {
  const avatarUri = getProfileImageUri(item.userProfile);
  const isVideo = item.call_type == 11;
  const statusColor = STATUS_COLORS[item.callStatus] || colors.textMuted;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onToggle}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeaderRow}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Ionicons name="call" size={22} color={colors.gold} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.userName || t('user')}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{item.totalMin || 0} min</Text>
            <Text style={styles.metaDot}>·</Text>
            <Ionicons name={isVideo ? "videocam-outline" : "call-outline"} size={12} color={colors.textMuted} />
            <Text style={styles.metaText}>{isVideo ? t('video') : t('voice')}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.earningsText}>Earnings: ₹{parseFloat(item.deductionFromAstrologer || 0).toFixed(2)}</Text>
          </View>
          {item.created_at ? <Text style={styles.date}>{fmtDate(item.created_at)}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.callStatus || 'Completed'}
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
              <Text style={styles.detailVal}>{t('call_type')}: {isVideo ? t('video_call') : t('voice_call')}</Text>
              <Text style={styles.detailVal}>{t('duration')}: {item.totalMin || 0} mins</Text>
              <Text style={styles.detailVal}>Rate: ₹{item.callRate || 0}/min</Text>
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
const CallHistoryScreen = ({ onBack, isSubScreen = false, onOpenSubScreen }) => {
  const { astrologer } = useSelector((s) => s.auth);
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState({});
  const [remedyTarget, setRemedyTarget] = useState(null);

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
      callId: item.id,
      userId: item.userId,
      name: item.intakeName || item.userName,
    });
  };

  const load = async () => {
    try {
      const res = await callApi.getCallHistory({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      const list = res.data?.recordList || res.data?.data || [];
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
        <ScreenHeader title={t('call_history')} subtitle={t('call_history_desc')} onBack={onBack} />
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
            <CallItem
              item={item}
              isOpen={!collapsedIds[item.id]}
              onToggle={() => setCollapsedIds(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
              t={t}
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
                name="phone-off"
                size={56}
                color={colors.textMuted}
              />
              <Text style={styles.emptyText}>{t('no_calls')}</Text>
              <Text style={styles.emptySubText}>{t('call_history_desc')}</Text>
            </View>
          }
        />
      )}

      <RemedyModal
        visible={!!remedyTarget}
        target={remedyTarget}
        onClose={() => setRemedyTarget(null)}
      />
    </View>
  );
};

export default CallHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  list: { padding: 14, gap: 10 },
  card: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    padding: 12,
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
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  cardInfo: { flex: 1 },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  metaText: { fontSize: 12, color: colors.textMuted },
  metaDot: { fontSize: 12, color: colors.textMuted },
  earningsText: { fontSize: 11, color: colors.goldDark, fontWeight: '700' },
  date: { fontSize: 11, color: colors.textSecondary },

  statusBadge: {
    borderRadius: 8,
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
  actionBtnOutline: {
    flex: 1,
    minWidth: '40%',
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
});
