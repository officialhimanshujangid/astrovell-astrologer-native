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
import useTranslation from '../hooks/useTranslation';

const WalletScreen = ({ onBack }) => {
  const dispatch   = useDispatch();
  const insets     = useSafeAreaInsets();
  const { astrologer } = useSelector(s => s.auth);
  const { balance, totalEarning, totalPending, totalWithdrawn, transactions, withdrawals, loading } = useSelector(s => s.wallet);
  const { t } = useTranslation();

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

  // ── Stats Calculation ──────────────────────────────────────────────
  const todayEarnings = transactions
    .filter(tx => tx.isCredit == 1 && tx.created_at && new Date(tx.created_at).toDateString() === new Date().toDateString())
    .reduce((acc, tx) => acc + parseFloat(tx.amount || 0), 0);

  const weeklyEarnings = transactions
    .filter(tx => {
      if (tx.isCredit != 1 || !tx.created_at) return false;
      const txDate = new Date(tx.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return txDate >= sevenDaysAgo;
    })
    .reduce((acc, tx) => acc + parseFloat(tx.amount || 0), 0);

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
        <Text style={styles.withdrawMethod}>{item.paymentMethod || t('bank_transfer')}</Text>
      </View>
      <View style={styles.itemRight}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>{item.status || t('pending')}</Text>
        </View>
        <Text style={styles.itemDate}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('wallet')} subtitle={t('wallet_subtitle')} onBack={onBack} />

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.goldDark} size="large" />
          <Text style={styles.loadingText}>{t('loading_wallet')}</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Balance Card ────────────────────────────────────────────── */}
          <LinearGradient colors={['#FF8A8A', '#FF6B6B']} style={styles.mainBalanceCard}>
            <View style={styles.balanceInfo}>
               <View>
                 <Text style={styles.balanceLabel}>{t('available_balance')}</Text>
                 <Text style={styles.balanceValue}>₹{parseFloat(balance || 0).toLocaleString('en-IN')}</Text>
               </View>
               <TouchableOpacity style={styles.withdrawActionBtn} onPress={() => setShowWithdraw(true)}>
                 <Text style={styles.withdrawActionText}>{t('complete_setup')}</Text>
                 <Ionicons name="arrow-forward" size={16} color="#FF6B6B" />
               </TouchableOpacity>
            </View>
            <View style={styles.balanceFooter}>
               <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>{t('payable_amount')}</Text>
                  <Text style={styles.balanceStatValue}>₹{parseFloat(balance * 0.8 || 0).toLocaleString('en-IN')}</Text>
               </View>
               <View style={styles.statDivider} />
               <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>{t('rank')}</Text>
                  <Text style={styles.balanceStatValue}>#3523</Text>
               </View>
            </View>
          </LinearGradient>

          {/* ── Stats Grid ─────────────────────────────────────────────── */}
          <View style={styles.statsGrid}>
             <View style={styles.statBox}>
                <View style={[styles.statIconBg, { backgroundColor: '#FFF5F5' }]}>
                   <Ionicons name="stats-chart" size={20} color="#E53E3E" />
                </View>
                <Text style={styles.statLabel}>{t('last_3_months')}</Text>
                <Text style={styles.statValue}>₹{parseFloat(totalEarning || 0).toLocaleString('en-IN')}</Text>
             </View>
             <View style={styles.statBox}>
                <View style={[styles.statIconBg, { backgroundColor: '#F0FFF4' }]}>
                   <Ionicons name="calendar" size={20} color="#38A169" />
                </View>
                <Text style={styles.statLabel}>{t('monthly_earnings')}</Text>
                <Text style={styles.statValue}>₹{parseFloat(totalEarning * 0.3 || 0).toLocaleString('en-IN')}</Text>
             </View>
          </View>

          <View style={styles.statsGrid}>
             <View style={styles.statBox}>
                <View style={[styles.statIconBg, { backgroundColor: '#EBF8FF' }]}>
                   <Ionicons name="time" size={20} color="#3182CE" />
                </View>
                <Text style={styles.statLabel}>{t('weekly_earnings')}</Text>
                <Text style={styles.statValue}>₹{weeklyEarnings.toLocaleString('en-IN')}</Text>
             </View>
             <TouchableOpacity style={styles.statBox} onPress={() => onRefresh()}>
                <View style={[styles.statIconBg, { backgroundColor: '#FAF5FF' }]}>
                   <Ionicons name="basket" size={20} color="#805AD5" />
                </View>
                <Text style={styles.statLabel}>{t('today')}</Text>
                <Text style={styles.statValue}>₹{todayEarnings.toLocaleString('en-IN')}</Text>
             </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
             <Text style={styles.sectionTitle}>Recent Transactions</Text>
             <TouchableOpacity onPress={() => setShowAllWithdrawals(true)}>
                <Text style={styles.viewAllText}>{t('withdrawal_history')}</Text>
             </TouchableOpacity>
          </View>

          {/* ── Transaction List ────────────────────────────────────────── */}
          {transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
               <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
               <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          ) : (
            transactions.map((tx, i) => (
              <TouchableOpacity key={i} style={styles.premiumTxCard} onPress={() => setSelectedTx(tx)} activeOpacity={0.7}>
                 <View style={[styles.txIconBox, { backgroundColor: tx.isCredit == 1 ? '#F0FFF4' : '#FFF5F5' }]}>
                    <Ionicons 
                      name={tx.transactionType === 'Call' ? 'call' : tx.transactionType === 'Chat' ? 'chatbubble' : 'wallet'} 
                      size={20} 
                      color={tx.isCredit == 1 ? '#38A169' : '#E53E3E'} 
                    />
                 </View>
                 <View style={styles.txContent}>
                    <View style={styles.txTop}>
                       <Text style={styles.txTitle}>
                         {tx.transactionType === 'Call' ? t('call') : tx.transactionType === 'Chat' ? t('chat') : t('wallet')}
                       </Text>
                       <Text style={[styles.txAmount, { color: tx.isCredit == 1 ? '#166534' : '#DC2626' }]}>
                          {tx.isCredit == 1 ? '+' : '-'}₹{parseFloat(tx.amount || 0).toFixed(2)}
                       </Text>
                    </View>
                    <View style={styles.txBottom}>
                       <Text style={styles.txDate}>
                         {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ', ' + new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                       </Text>
                       <Text style={styles.txId}>ID: #{tx.id || 'N/A'}</Text>
                    </View>
                 </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* View All Withdrawals Modal */}
      <Modal visible={showAllWithdrawals} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('withdrawal_history')}</Text>
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
                <Text style={styles.modalTitle}>{t('transaction_detail')}</Text>
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
                     <Text style={styles.txBigType}>{selectedTx.transactionType || t('wallet')}</Text>
                  </View>

                  <View style={styles.detailSection}>
                     <TxDetailRow label={t('transaction_id')} value={`#${selectedTx.id || 'N/A'}`} icon="finger-print-outline" />
                     <TxDetailRow label={t('dob')} value={selectedTx.created_at ? new Date(selectedTx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'} icon="calendar-outline" />
                     <TxDetailRow label={t('tob')} value={selectedTx.created_at ? new Date(selectedTx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'} icon="time-outline" />
                     <TxDetailRow label={t('status')} value={t('successful')} icon="checkmark-circle-outline" color={colors.success} />
                  </View>

                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedTx(null)}>
                     <Text style={styles.modalCloseBtnText}>{t('done')}</Text>
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
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  mainBalanceCard: {
    borderRadius: 24, padding: 24, marginBottom: 20,
    shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  balanceInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  balanceValue: { color: colors.white, fontSize: 32, fontWeight: '800', marginTop: 4 },
  withdrawActionBtn: { backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  withdrawActionText: { color: '#FF6B6B', fontSize: 14, fontWeight: '700' },
  balanceFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 16 },
  balanceStat: { flex: 1 },
  balanceStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  balanceStatValue: { color: colors.white, fontSize: 16, fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 16 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  viewAllText: { fontSize: 14, color: '#FF6B6B', fontWeight: '700' },

  premiumTxCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  txIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txContent: { flex: 1, marginLeft: 12 },
  txTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  txAmount: { fontSize: 16, fontWeight: '800' },
  txBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  txDate: { fontSize: 12, color: colors.textSecondary },
  txId: { fontSize: 11, color: colors.textMuted },

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: colors.textMuted, marginTop: 12, fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContentBox: {
    backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '75%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },

  txDetailBox: {
    backgroundColor: colors.white, borderRadius: 32, padding: 24, margin: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  txDetailHeader: { alignItems: 'center', marginBottom: 24 },
  txBigIconWrap: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  txBigAmount: { fontSize: 32, fontWeight: '900', marginBottom: 4 },
  txBigType: { color: colors.textSecondary, fontSize: 16, fontWeight: '700' },
  detailSection: { backgroundColor: colors.surface, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border },
  txDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  txDetailRowLeft: { flexDirection: 'row', alignItems: 'center' },
  txDetailLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  txDetailValue: { color: colors.text, fontSize: 15, fontWeight: '800' },
  modalCloseBtn: { marginTop: 24, backgroundColor: '#FF6B6B', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  modalCloseBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },

  withdrawItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  withdrawAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
  withdrawMethod: { fontSize: 12, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  itemDate: { fontSize: 10, color: colors.textMuted, textAlign: 'right', marginTop: 4 },
});
