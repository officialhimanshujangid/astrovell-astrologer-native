import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Image, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { chatApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const BASE_IMG = 'https://astrology-i7c9.onrender.com/';

const ChatHistoryScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
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
    const profileImg = item.userProfile ? (item.userProfile.startsWith('http') ? item.userProfile : `${BASE_IMG}${item.userProfile}`) : null;

    return (
      <TouchableOpacity 
        style={styles.item} 
        activeOpacity={0.7}
        onPress={() => setSelectedItem(item)}
      >
        <View style={styles.itemLeft}>
          {profileImg ? (
            <Image source={{ uri: profileImg }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarLetter}>{(item.userName || 'U')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.itemMain}>
            <Text style={styles.userName} numberOfLines={1}>{item.userName || 'Unknown User'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.itemMeta}>💬 {item.totalMin || 0} min</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.itemMeta}>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</Text>
            </View>
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={styles.earnings}>+₹{parseFloat(item.deduction || 0).toFixed(0)}</Text>
          <Text style={styles.statusBadge}>Completed</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Chat History" subtitle="Your past consultations" onBack={onBack} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.goldDark} size="large" />
          <Text style={styles.loadingText}>Fetching your records...</Text>
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
              <Text style={styles.emptyTitle}>No Sessions Yet</Text>
              <Text style={styles.emptyDesc}>Your completed chat consultations will appear here.</Text>
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
              <Text style={styles.modalTitle}>Session Details</Text>
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
                  <Text style={styles.detailUserName}>{selectedItem.userName || 'Unknown User'}</Text>
                  <View style={[styles.statusBadge, { marginTop: 8, alignSelf: 'center' }]}>
                    <Text style={styles.statusBadgeText}>Completed Consultation</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <DetailRow label="Session ID" value={`#${selectedItem.id || 'N/A'}`} icon="finger-print-outline" />
                  <DetailRow label="Date" value={selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'} icon="calendar-outline" />
                  <DetailRow label="Time" value={selectedItem.created_at ? new Date(selectedItem.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'} icon="time-outline" />
                  <DetailRow label="Duration" value={`${selectedItem.totalMin || 0} Minutes`} icon="hourglass-outline" />
                  <DetailRow label="Total Earnings" value={`₹${parseFloat(selectedItem.deduction || 0).toFixed(2)}`} icon="wallet-outline" color={colors.success} />
                </View>

                {selectedItem.review && (
                  <View style={[styles.detailSection, { marginTop: 16 }]}>
                    <Text style={styles.sectionLabel}>User Review</Text>
                    <View style={styles.reviewBox}>
                      <Text style={styles.reviewText}>"{selectedItem.review}"</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity 
                  style={styles.closeBtn} 
                  onPress={() => setSelectedItem(null)}
                >
                  <Text style={styles.closeBtnText}>Close Details</Text>
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
  container: { flex: 1, backgroundColor: colors.primary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  
  item: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.border },
  avatarPlaceholder: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderGold,
  },
  avatarLetter: { color: colors.goldDark, fontSize: 20, fontWeight: '800' },
  itemMain: { flex: 1 },
  userName: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemMeta: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  dot: { color: colors.textLight, fontSize: 12 },
  
  itemRight: { alignItems: 'flex-end', gap: 4 },
  earnings: { color: colors.success, fontSize: 16, fontWeight: '800' },
  statusBadge: {
    fontSize: 9, fontWeight: '700',
    color: colors.success,
    backgroundColor: colors.successBg,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, textTransform: 'uppercase',
  },

  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyDesc: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 30,
    padding: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
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
  detailUserCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  detailAvatarWrap: {
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.gold,
    padding: 2,
    backgroundColor: colors.white,
    marginBottom: 12,
  },
  detailAvatar: { width: '100%', height: '100%', borderRadius: 40 },
  detailAvatarPlaceholder: {
    backgroundColor: colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
  },
  detailAvatarLetter: { color: colors.goldDark, fontSize: 32, fontWeight: '900' },
  detailUserName: { color: colors.text, fontSize: 19, fontWeight: '900' },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', color: colors.success },

  detailSection: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRowLeft: { flexDirection: 'row', alignItems: 'center' },
  detailLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  detailValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 },
  reviewBox: {
    backgroundColor: colors.goldBg,
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
  },
  reviewText: { color: colors.text, fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

  closeBtn: {
    marginTop: 24,
    backgroundColor: colors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  closeBtnText: { color: colors.text, fontSize: 15, fontWeight: '900' },
});
