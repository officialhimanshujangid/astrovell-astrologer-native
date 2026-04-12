import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
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
      case 'rejected': return colors.danger;
      default: return colors.warning;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="My Wallet" subtitle="Earnings & Withdrawals" />

      {loading && !refreshing ? (
        <View style={styles.centered}><ActivityIndicator color={colors.secondary} size="large" /></View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>₹{parseFloat(balance).toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={() => setShowWithdraw(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.withdrawBtnText}>Withdraw</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Total Earned', value: totalEarning, color: colors.success, icon: '📈' },
              { label: 'Withdrawn', value: totalWithdrawn, color: colors.info, icon: '💸' },
              { label: 'Pending', value: totalPending, color: colors.warning, icon: '⏳' },
            ].map(s => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statIcon}>{s.icon}</Text>
                <Text style={[styles.statValue, { color: s.color }]}>₹{parseFloat(s.value).toFixed(0)}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Withdrawal Requests */}
          {withdrawals.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Withdrawal Requests</Text>
              {withdrawals.map((w, i) => (
                <View key={i} style={styles.withdrawItem}>
                  <View>
                    <Text style={styles.withdrawAmount}>₹{parseFloat(w.withdrawAmount || w.amount || 0).toFixed(2)}</Text>
                    <Text style={styles.withdrawMethod}>{w.paymentMethod || 'Bank'}</Text>
                    <Text style={styles.withdrawDate}>
                      {w.created_at ? new Date(w.created_at).toLocaleDateString('en-IN') : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(w.status) + '20', borderColor: getStatusColor(w.status) }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(w.status) }]}>{w.status || 'Pending'}</Text>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Transactions */}
          <Text style={styles.sectionTitle}>Transaction History</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>💳</Text>
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((tx, i) => (
              <View key={i} style={styles.txItem}>
                <View style={[styles.txIcon, { backgroundColor: tx.isCredit == 1 ? colors.success + '20' : colors.danger + '20' }]}>
                  <Text style={{ fontSize: 18 }}>{tx.isCredit == 1 ? '📥' : '📤'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txType}>{tx.transactionType || 'Transaction'}</Text>
                  <Text style={styles.txDate}>
                    {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-IN') : ''}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.isCredit == 1 ? colors.success : colors.danger }]}>
                  {tx.isCredit == 1 ? '+' : '-'}₹{parseFloat(tx.amount || 0).toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

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

export default WalletScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  balanceCard: {
    backgroundColor: colors.secondary,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  balanceLabel:  { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginBottom: 4 },
  balanceAmount: { color: colors.white, fontSize: 30, fontWeight: '900' },
  withdrawBtn: {
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  withdrawBtnText: { color: colors.secondary, fontWeight: '800', fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  statIcon:  { fontSize: 20 },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textAlign: 'center' },

  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 4 },

  withdrawItem: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  withdrawAmount: { color: colors.text, fontSize: 16, fontWeight: '800' },
  withdrawMethod: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  withdrawDate:   { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  statusBadge: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  txItem: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  txType: { color: colors.text, fontSize: 13, fontWeight: '700' },
  txDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
