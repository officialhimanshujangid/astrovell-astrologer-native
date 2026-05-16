import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Image, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { chatApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import useTranslation from '../hooks/useTranslation';

const BASE_IMG = 'https://astrology-i7c9.onrender.com/';

const ChatHistoryScreen = ({ onBack, isSubScreen = false }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const load = async () => {
    try {
      const res = await chatApi.getChatHistory({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setHistory(res.data?.recordList || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }) => {
    const isSuccess = item.chatStatus === 'Completed';
    const isFree = item.isFreeSession == 1;

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => setSelectedItem(item)}
        style={styles.orderCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.brandContainer}>
            <View style={styles.brandLogo}>
              <Text style={styles.logoEmoji}>💬</Text>
            </View>
            <View>
              <Text style={styles.brandName}>Astrovell</Text>
              <Text style={styles.orderId}>#{item.id || 'N/A'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isSuccess ? '#ECFDF5' : '#FEF2F2' }]}>
            <Text style={[styles.statusText, { color: isSuccess ? '#059669' : '#DC2626' }]}>
              {isFree ? t('free_session').toUpperCase() : (isSuccess ? t('success') : item.chatStatus)}
            </Text>
            {isSuccess && <Ionicons name="checkmark-circle" size={14} color="#059669" />}
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoGrid}>
             <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={16} color={colors.textLight} />
                <Text style={styles.infoLabel}>{item.userName || t('user')}</Text>
             </View>
             <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={16} color={colors.textLight} />
                <Text style={styles.infoLabel}>{item.totalMin || 0} {t('min')}</Text>
             </View>
             <View style={styles.infoItem}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textLight} />
                <Text style={styles.infoLabel}>{t('chat')}</Text>
             </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.dateText}>
                {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
              </Text>
              <Text style={styles.timeText}>
                {item.created_at ? new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </Text>
            </View>
            <View style={styles.earningsContainer}>
              <Text style={styles.earningsLabel}>{t('earnings')}</Text>
              <Text style={styles.earningsValue}>₹{parseFloat(item.deductionFromAstrologer || 0).toFixed(2)}</Text>
            </View>
          </View>
        </View>

      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {!isSubScreen && <ScreenHeader title={t('chat_history')} subtitle={t('chat_history_desc')} onBack={onBack} />}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.goldDark} size="large" />
          <Text style={styles.loadingText}>{t('fetching_records')}</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconCircle}>
                <Text style={styles.emptyIcon}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>{t('no_sessions')}</Text>
              <Text style={styles.emptyDesc}>{t('chat_history_desc')}</Text>
            </View>
          }
        />
      )}

      {/* Details Modal */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('session_details')}</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Ionicons name="close-circle" size={28} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailUserCard}>
                  <View style={styles.detailAvatarWrap}>
                    {selectedItem.userProfile ? (
                      <Image 
                        source={{ uri: selectedItem.userProfile.startsWith('http') ? selectedItem.userProfile : `${BASE_IMG}${selectedItem.userProfile}` }} 
                        style={styles.detailAvatar} 
                      />
                    ) : (
                      <View style={[styles.detailAvatar, styles.detailAvatarPlaceholder]}>
                        <Text style={styles.detailAvatarLetter}>{(selectedItem.userName || 'U')[0].toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.detailUserName}>{selectedItem.userName || t('anonymous')}</Text>
                  <View style={[styles.statusBadge, { marginTop: 8, alignSelf: 'center' }]}>
                    <Text style={styles.statusBadgeText}>{t('successful')} {t('consultations')}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <DetailRow label={t('transaction_id')} value={`#${selectedItem.id || 'N/A'}`} icon="finger-print-outline" />
                  <DetailRow label={t('dob')} value={selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'} icon="calendar-outline" />
                  <DetailRow label={t('tob')} value={selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'} icon="time-outline" />
                  <DetailRow label={t('duration')} value={`${selectedItem.totalMin || 0} ${t('minutes')}`} icon="hourglass-outline" />
                  <DetailRow label={t('net_earning')} value={`₹${parseFloat(selectedItem.deductionFromAstrologer || 0).toFixed(2)}`} icon="wallet-outline" color={colors.success} />
                </View>

                {selectedItem.review && (
                  <View style={[styles.detailSection, { marginTop: 16 }]}>
                    <Text style={styles.sectionLabel}>{t('user_review')}</Text>
                    <View style={styles.reviewBox}>
                      <Text style={styles.reviewText}>"{selectedItem.review}"</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.closeBtn} 
                  onPress={() => setSelectedItem(null)}
                >
                  <Text style={styles.closeBtnText}>{t('close_details')}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const DetailRow = ({ label, value, icon, color }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailRowLeft}>
      <Ionicons name={icon} size={20} color={colors.goldDark} style={{ marginRight: 12 }} />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={[styles.detailValue, color && { color }]}>{value}</Text>
  </View>
);

export default ChatHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  
  orderCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    marginBottom: 16,
    marginHorizontal: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandLogo: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  logoEmoji: { fontSize: 18 },
  brandName: { fontSize: 15, fontWeight: '800', color: colors.text },
  orderId: { fontSize: 12, color: colors.textLight, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  statusText: { fontSize: 12, fontWeight: '700' },

  cardBody: { padding: 16 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 13, color: colors.text, fontWeight: '600' },
  
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 13, color: colors.text, fontWeight: '700' },
  timeText: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  
  earningsContainer: { alignItems: 'flex-end' },
  earningsLabel: { fontSize: 11, color: colors.textLight, fontWeight: '700', textTransform: 'uppercase' },
  earningsValue: { fontSize: 18, fontWeight: '800', color: colors.goldDark },


  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyDesc: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  detailUserCard: { alignItems: 'center', marginBottom: 24 },
  detailAvatarWrap: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, borderColor: colors.gold,
    padding: 2, backgroundColor: colors.white, marginBottom: 12,
  },
  detailAvatar: { width: '100%', height: '100%', borderRadius: 40 },
  detailAvatarPlaceholder: {
    backgroundColor: colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
  },
  detailAvatarLetter: { color: colors.goldDark, fontSize: 32, fontWeight: '900' },
  detailUserName: { color: colors.text, fontSize: 22, fontWeight: '900' },

  detailSection: {
    backgroundColor: '#F8FAFC', borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center' },
  detailLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: '800' },

  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 },
  reviewBox: {
    backgroundColor: colors.goldBg,
    borderRadius: 16, padding: 14,
    borderLeftWidth: 4, borderLeftColor: colors.gold,
  },
  reviewText: { color: colors.text, fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

  closeBtn: {
    marginTop: 24, backgroundColor: colors.gold,
    borderRadius: 18, paddingVertical: 16, alignItems: 'center',
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  closeBtnText: { color: colors.text, fontSize: 16, fontWeight: '900' },
});
