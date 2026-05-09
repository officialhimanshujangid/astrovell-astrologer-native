import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, gradients } from '../theme/colors';
import { walletApi } from '../api/services';
import { fetchWalletData } from '../store/slices/walletSlice';
import ScreenHeader from '../components/ScreenHeader';
import WithdrawModal from '../components/WithdrawModal';

const WalletScreen = () => {
  const dispatch   = useDispatch();
  const insets     = useSafeAreaInsets();
  const { astrologer } = useSelector(s => s.auth);
  const { balance, totalEarning, totalPending, totalWithdrawn, transactions, withdrawals, loading } = useSelector(s => s.wallet);

  const [refreshing,    setRefreshing]    = useState(false);
  const [showWithdraw,  setShowWithdraw]  = useState(false);
  const [showAllWithdrawals, setShowAllWithdrawals] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const load = () => dispatch(fetchWalletData(astrologer?.id));

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved': case 'completed': return colors.success;
      case 'rejected': return colors.error;
      default: return colors.warning;
    }
  };

  const renderWithdrawItem = ({ item }) => (
    <View style={styles.withdrawItem}>
      <View style={styles.itemIconWrap}>
        <Ionicons name="receipt" size={20} color={colors.goldDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.withdrawAmount}>₹{parseFloat(item.withdrawAmount || item.amount || 0).toFixed(2)}</Text>
        <Text style={styles.withdrawMethod}>{item.paymentMethod || 'Bank Transfer'}</Text>
      </View>
      <View style={styles.itemRight}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>{item.status || 'Pending'}</Text>
        </View>
        <Text style={styles.itemDate}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="My Wallet" subtitle="Manage your earnings" />

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.goldDark} size="large" />
          <Text style={styles.loadingText}>Loading your wallet...</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Card */}
          <LinearGradient
            colors={['#FFD700', '#FFB700', '#FFA000']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <View>
                <Text style={styles.balanceLabel}>Total Balance</Text>
                <Text style={styles.balanceAmount}>₹{parseFloat(balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.walletIconCircle}>
                <Ionicons name="wallet" size={30} color={colors.goldDark} />
              </View>
            </View>
            
            <View style={styles.balanceFooter}>
              <TouchableOpacity
                style={styles.withdrawBtn}
                onPress={() => setShowWithdraw(true)}
                activeOpacity={0.9}
              >
                <Text style={styles.withdrawBtnText}>Withdraw Funds</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Earned', value: totalEarning, color: colors.success, icon: 'trending-up', bg: colors.successBg },
              { label: 'Withdrawn', value: totalWithdrawn, color: '#3b82f6', icon: 'cash', bg: 'rgba(59,130,246,0.1)' },
              { label: 'Pending', value: totalPending, color: colors.warning, icon: 'time', bg: 'rgba(255,149,0,0.1)' },
            ].map(s => (
              <View key={s.label} style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={18} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>₹{parseFloat(s.value || 0).toFixed(0)}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Withdrawal Requests */}
          {withdrawals.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Withdrawals</Text>
                <TouchableOpacity onPress={() => setShowAllWithdrawals(true)}>
                  <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
              </View>
              {withdrawals.slice(0, 3).map((w, i) => (
                <View key={i}>
                  {renderWithdrawItem({ item: w })}
                </View>
              ))}
            </View>
          )}

          {/* Transactions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
            </View>
            {transactions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={40} color={colors.textLight} />
                <Text style={styles.emptyText}>No transactions recorded yet</Text>
              </View>
            ) : (
              transactions.map((tx, i) => (
                <TouchableOpacity key={i} style={styles.txItem} onPress={() => setSelectedTx(tx)} activeOpacity={0.7}>
                  <View style={[styles.txIconWrap, { backgroundColor: tx.isCredit == 1 ? colors.successBg : colors.errorBg }]}>
                    <Ionicons 
                      name={tx.isCredit == 1 ? "arrow-down-circle" : "arrow-up-circle"} 
                      size={24} 
                      color={tx.isCredit == 1 ? colors.success : colors.error} 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txType}>{tx.transactionType || 'Wallet Credit'}</Text>
                    <Text style={styles.txDate}>
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: tx.isCredit == 1 ? colors.success : colors.error }]}>
                    {tx.isCredit == 1 ? '+' : '-'}₹{parseFloat(tx.amount || 0).toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* View All Withdrawals Modal */}
      <Modal visible={showAllWithdrawals} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdrawal History</Text>
              <TouchableOpacity onPress={() => setShowAllWithdrawals(false)}>
                <Ionicons name="close-circle" size={32} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={withdrawals}
              keyExtractor={(item, i) => String(item.id ?? i)}
              renderItem={renderWithdrawItem}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Transaction Details Modal */}
      <Modal visible={!!selectedTx} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.txDetailBox}>
             <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Transaction Detail</Text>
                <TouchableOpacity onPress={() => setSelectedTx(null)}>
                  <Ionicons name="close-circle" size={30} color={colors.textLight} />
                </TouchableOpacity>
              </View>
              {selectedTx && (
                <View>
                  <View style={styles.txDetailHeader}>
                     <View style={[styles.txBigIconWrap, { backgroundColor: selectedTx.isCredit == 1 ? colors.successBg : colors.errorBg }]}>
                        <Ionicons 
                          name={selectedTx.isCredit == 1 ? "add-circle" : "remove-circle"} 
                          size={40} 
                          color={selectedTx.isCredit == 1 ? colors.success : colors.error} 
                        />
                     </View>
                     <Text style={[styles.txBigAmount, { color: selectedTx.isCredit == 1 ? colors.success : colors.error }]}>
                        {selectedTx.isCredit == 1 ? '+' : '-'}₹{parseFloat(selectedTx.amount || 0).toFixed(2)}
                     </Text>
                     <Text style={styles.txBigType}>{selectedTx.transactionType || 'Wallet Adjustment'}</Text>
                  </View>

                  <View style={styles.detailSection}>
                     <TxDetailRow label="Transaction ID" value={`#${selectedTx.id || 'N/A'}`} icon="finger-print-outline" />
                     <TxDetailRow label="Date" value={selectedTx.created_at ? new Date(selectedTx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'} icon="calendar-outline" />
                     <TxDetailRow label="Time" value={selectedTx.created_at ? new Date(selectedTx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'} icon="time-outline" />
                     <TxDetailRow label="Status" value="Successful" icon="checkmark-circle-outline" color={colors.success} />
                  </View>

                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedTx(null)}>
                     <Text style={styles.modalCloseBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
          </View>
        </View>
      </Modal>

      <WithdrawModal
        visible={showWithdraw}
        balance={balance}
        astrologerId={astrologer?.id}
        onClose={() => setShowWithdraw(false)}
        onSuccess={() => { setShowWithdraw(false); load(); }}
      />
    </View>
  );
};

const TxDetailRow = ({ label, value, icon, color }) => (
  <View style={styles.txDetailRow}>
    <View style={styles.txDetailRowLeft}>
      <Ionicons name={icon} size={20} color={colors.goldDark} style={{ marginRight: 12 }} />
      <Text style={styles.txDetailLabel}>{label}</Text>
    </View>
    <Text style={[styles.txDetailValue, color && { color }]}>{value}</Text>
  </View>
);

export default WalletScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  balanceCard: {
    borderRadius: 24, padding: 24, marginBottom: 20,
    shadowColor: '#FFB700', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10,
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  balanceLabel:  { color: 'rgba(26,26,26,0.6)', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  balanceAmount: { color: colors.text, fontSize: 34, fontWeight: '900' },
  walletIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' },
  balanceFooter: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 16 },
  withdrawBtn: {
    backgroundColor: colors.text, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'flex-start',
  },
  withdrawBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  viewAll: { color: colors.goldDark, fontSize: 13, fontWeight: '700' },

  withdrawItem: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  itemIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  withdrawAmount: { color: colors.text, fontSize: 16, fontWeight: '800' },
  withdrawMethod: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  itemRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  itemDate: { color: colors.textLight, fontSize: 11 },

  txItem: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  txIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txType: { color: colors.text, fontSize: 14, fontWeight: '700' },
  txDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },

  emptyCard: {
    backgroundColor: colors.surface, borderRadius: 20, padding: 40, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed',
  },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: '600', marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContentBox: {
    backgroundColor: colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, height: '70%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },

  // TX Detail Specifics
  txDetailBox: {
    backgroundColor: colors.white, borderRadius: 30, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  txDetailHeader: { alignItems: 'center', marginBottom: 24 },
  txBigIconWrap: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  txBigAmount: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  txBigType: { color: colors.textSecondary, fontSize: 16, fontWeight: '700' },
  detailSection: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  txDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  txDetailRowLeft: { flexDirection: 'row', alignItems: 'center' },
  txDetailLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  txDetailValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  modalCloseBtn: { marginTop: 24, backgroundColor: colors.gold, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  modalCloseBtnText: { color: colors.text, fontSize: 15, fontWeight: '900' },
});
