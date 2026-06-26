import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { walletApi } from '../api/services';
import { fetchWalletData } from '../store/slices/walletSlice';
import GoldHeader from '../components/GoldHeader';
import WithdrawModal from '../components/WithdrawModal';
import useTranslation from '../hooks/useTranslation';

const money = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const WalletScreen = ({ onBack }) => {
  const dispatch   = useDispatch();
  const { astrologer } = useSelector(s => s.auth);
  const { balance, withdrawals, loading } = useSelector(s => s.wallet);
  const { t } = useTranslation();

  const [refreshing,    setRefreshing]    = useState(false);
  const [showWithdraw,  setShowWithdraw]  = useState(false);
  const [showAllWithdrawals, setShowAllWithdrawals] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);

  // ── Earnings (new /astro/earnings/summary endpoint) ──────────────────
  const [earning,       setEarning]       = useState(null);
  const [earningLoading, setEarningLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showBreakup,   setShowBreakup]   = useState(false);

  // Period options: Today, Yesterday, then the last 8 months (YYYY-M).
  const periodOptions = React.useMemo(() => {
    const opts = [{ key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' }];
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${MON[d.getMonth()]}-${d.getFullYear()}` });
    }
    return opts;
  }, []);
  const selectedLabel = periodOptions.find(o => o.key === selectedPeriod)?.label || 'Today';

  const load = () => dispatch(fetchWalletData(astrologer?.id));

  const loadEarnings = async (period) => {
    setEarningLoading(true);
    try {
      const res = await walletApi.getEarningSummary({ period });
      setEarning(res?.data || null);
    } catch (e) {
      setEarning(null);
    }
    setEarningLoading(false);
  };

  useEffect(() => { load(); loadEarnings(selectedPeriod); }, []);

  const onSelectPeriod = (key) => {
    setSelectedPeriod(key);
    setShowPeriodPicker(false);
    loadEarnings(key);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadEarnings(selectedPeriod)]);
    setRefreshing(false);
  };

  const summary = earning?.summary || {};
  const period  = earning?.period  || {};
  const history = earning?.history || [];

  // ── Withdrawal helpers (unchanged) ─────────────────────────────────────
  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'approved': case 'completed': case 'released': return colors.success;
      case 'rejected': case 'cancelled': return colors.error;
      default: return colors.warning;
    }
  };

  const renderWithdrawItem = ({ item }) => (
    <TouchableOpacity style={styles.withdrawItem} onPress={() => setSelectedWithdrawal(item)} activeOpacity={0.7}>
      <View style={styles.itemIconWrap}>
        <Ionicons name="cash-outline" size={20} color={colors.goldDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.withdrawAmount}>{money(item.withdrawAmount || item.amount || 0)}</Text>
        <Text style={styles.withdrawMethod}>
          {item.paymentMethod === 'upi' ? '📱 UPI' : `🏦 ${t('bank_transfer')}`}
        </Text>
      </View>
      <View style={styles.itemRight}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status) }]}>{item.status || t('pending')}</Text>
        </View>
        <Text style={styles.itemDate}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // ── Stat card ──────────────────────────────────────────────────────────
  const StatCard = ({ label, value, icon, iconColor, iconBg, onPress, hint }) => {
    const Wrap = onPress ? TouchableOpacity : View;
    return (
      <Wrap style={styles.statBox} onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.statIconBg, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <Text style={styles.statLabel}>{label}{hint ? ` ${hint}` : ''}</Text>
        <Text style={styles.statValue}>{money(value)}</Text>
      </Wrap>
    );
  };

  return (
    <View style={styles.container}>
      <GoldHeader title={t('wallet')} subtitle={t('wallet_subtitle')} onBack={onBack} />

      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.goldDark} size="large" />
          <Text style={styles.loadingText}>{t('loading_wallet')}</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Earnings stat cards ── */}
          <View style={styles.statsGrid}>
            <StatCard label="Last 3 Months Earnings" value={summary.last3Months} icon="stats-chart" iconColor="#E53E3E" iconBg="#FFF5F5" />
            <StatCard label="Monthly Earnings" value={summary.thisMonth} icon="calendar" iconColor="#38A169" iconBg="#F0FFF4" />
          </View>
          <View style={styles.statsGrid}>
            <StatCard label="Weekly Earnings" value={summary.thisWeek} icon="time" iconColor="#3182CE" iconBg="#EBF8FF" />
            {/* onPress={() => setShowWithdraw(true)} */}
            <StatCard label="Balance · Withdraw ›" value={balance} icon="wallet" iconColor="#FF6B6B" iconBg="#FFF0E9"  />
          </View>

          {/* ── Date filter ── */}
          <TouchableOpacity style={styles.periodDropdown} onPress={() => setShowPeriodPicker(true)} activeOpacity={0.8}>
            <Text style={styles.periodText}>{selectedLabel}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* ── Available + Payable (→ breakup) ── */}
          <TouchableOpacity style={styles.availPayCard} onPress={() => setShowBreakup(true)} activeOpacity={0.85}>
            <View style={styles.availPayCol}>
              <Text style={styles.availPayLabel}>Available Balance</Text>
              <Text style={styles.availPayValue}>{money(period.available)}</Text>
            </View>
            <View style={styles.availPayDivider} />
            <View style={styles.availPayCol}>
              <Text style={styles.availPayLabel}>Payable Amount</Text>
              <Text style={styles.availPayValue}>{money(period.payable)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* ── Earnings history (period call/chat) ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Earnings History</Text>
          </View>

          {earningLoading ? (
            <View style={styles.emptyContainer}><ActivityIndicator color="#FF6B6B" /></View>
          ) : history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
              <Text style={styles.emptyText}>No Transactions Available</Text>
            </View>
          ) : (
            history.map((h, i) => (
              <View key={`${h.type}-${h.refId}-${i}`} style={styles.premiumTxCard}>
                <View style={[styles.txIconBox, { backgroundColor: h.type === 'Call' ? '#FFF0E9' : '#EBF8FF' }]}>
                  <Ionicons name={h.type === 'Call' ? 'call' : 'chatbubble'} size={20} color={h.type === 'Call' ? '#FF6B6B' : '#3182CE'} />
                </View>
                <View style={styles.txContent}>
                  <View style={styles.txTop}>
                    <Text style={styles.txTitle}>{h.type === 'Call' ? t('call') : t('chat')}</Text>
                    <Text style={[styles.txAmount, { color: '#166534' }]}>+{money(h.earning)}</Text>
                  </View>
                  <Text style={styles.histDesc} numberOfLines={1}>
                    {h.type} with {h.userName} for {h.minutes} {h.minutes === 1 ? 'minute' : 'minutes'}
                  </Text>
                  <View style={styles.txBottom}>
                    <Text style={styles.txId}>#{h.refId}</Text>
                    <Text style={styles.txDate}>
                      {h.created_at ? new Date(h.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ', ' + new Date(h.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {/* ── Withdrawal Requests (unchanged) ── */}
          {/* <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={styles.sectionTitle}>Withdrawal Requests</Text>
            <TouchableOpacity onPress={() => setShowAllWithdrawals(true)}>
              <Text style={styles.viewAllText}>{t('withdrawal_history')}</Text>
            </TouchableOpacity>
          </View> */}

          {/* {(!withdrawals || withdrawals.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={44} color={colors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText}>No withdrawal requests found</Text>
            </View>
          ) : (
            withdrawals.slice(0, 3).map((item, i) => (
              <React.Fragment key={item.id || i}>{renderWithdrawItem({ item })}</React.Fragment>
            ))
          )} */}
        </ScrollView>
      )}

      {/* ── Period picker modal ── */}
      <Modal visible={showPeriodPicker} transparent animationType="fade" onRequestClose={() => setShowPeriodPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowPeriodPicker(false)}>
          <View style={styles.pickerBox}>
            {periodOptions.map((o) => (
              <TouchableOpacity
                key={o.key}
                style={[styles.pickerRow, o.key === selectedPeriod && styles.pickerRowActive]}
                onPress={() => onSelectPeriod(o.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerText, o.key === selectedPeriod && styles.pickerTextActive]}>{o.label}</Text>
                {o.key === selectedPeriod && <Ionicons name="checkmark" size={18} color="#FF6B6B" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Period Earning Breakup modal ── */}
      <Modal visible={showBreakup} transparent animationType="slide" onRequestClose={() => setShowBreakup(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.breakupModalBox}>
            <View style={styles.breakupHeader}>
              <Text style={styles.breakupTitle}>Earning Breakup</Text>
              <TouchableOpacity onPress={() => setShowBreakup(false)} style={styles.breakupCloseBtn}>
                <Ionicons name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.breakupRow}>
                <Text style={[styles.breakupLabel, styles.boldLabel]}>Available Balance</Text>
                <Text style={[styles.breakupValue, styles.boldValue]}>{money(period.available)}</Text>
              </View>

              <View style={styles.breakupRowWithSub}>
                <View style={styles.breakupRowHeader}>
                  <Text style={styles.breakupLabel}>PG Charge:</Text>
                  <Text style={styles.breakupValue}>- {money(period.pgCharge)}</Text>
                </View>
                <Text style={styles.breakupSubtitle}>
                  {period.pgPercent || 2.5}% charge deducted by Payment Gateways for accepting online payments
                </Text>
              </View>

              <View style={styles.breakupDivider} />

              <View style={styles.breakupRow}>
                <Text style={styles.breakupLabel}>Sub Total :</Text>
                <Text style={styles.breakupValue}>{money(period.subTotal)}</Text>
              </View>

              <View style={styles.breakupRowWithSub}>
                <View style={styles.breakupRowHeader}>
                  <Text style={styles.breakupLabel}>TDS:</Text>
                  <Text style={styles.breakupValue}>- {money(period.tdsAmount)}</Text>
                </View>
                <Text style={styles.breakupSubtitle}>
                  {period.tdsPercent || 0}% deducted. Tax deducted as per government regulations
                </Text>
              </View>

              <View style={styles.breakupRowWithSub}>
                <View style={styles.breakupRowHeader}>
                  <Text style={styles.breakupLabel}>GST:</Text>
                  <Text style={styles.breakupValue}>{money(period.gst)}</Text>
                </View>
                <Text style={styles.breakupSubtitle}>
                  GST certificate mandatory for astrologers who earn more than INR 20 lacs per year
                </Text>
              </View>

              <View style={styles.breakupDivider} />

              <View style={[styles.breakupRowWithSub, { marginTop: 8 }]}>
                <View style={styles.breakupRowHeader}>
                  <Text style={[styles.breakupLabel, styles.boldLabel]}>Payable Amount</Text>
                  <Text style={[styles.breakupValue, styles.boldValue]}>{money(period.payable)}</Text>
                </View>
                <Text style={[styles.breakupSubtitle, { fontWeight: '500', marginTop: 4 }]}>
                  Final Amount that gets transferred to your bank account on payout date
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── View All Withdrawals modal (unchanged) ── */}
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

      {/* ── Withdrawal detail / breakup modal (unchanged) ── */}
      <Modal visible={!!selectedWithdrawal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.breakupModalBox}>
            <View style={styles.breakupHeader}>
              <Text style={styles.breakupTitle}>Withdrawal Detail</Text>
              <TouchableOpacity onPress={() => setSelectedWithdrawal(null)} style={styles.breakupCloseBtn}>
                <Ionicons name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            {selectedWithdrawal && (() => {
              const withdrawAmount = parseFloat(selectedWithdrawal.withdrawAmount || 0);
              const payAmount = parseFloat(selectedWithdrawal.pay_amount || selectedWithdrawal.withdrawAmount || 0);
              const tdsAmount = parseFloat(selectedWithdrawal.tds_pay_amount || 0);
              const pgCharge = Math.max(0, withdrawAmount - payAmount - tdsAmount);
              const subTotal = withdrawAmount - pgCharge;
              return (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
                  <View style={styles.breakupRow}>
                    <Text style={styles.breakupLabel}>Withdraw Amount</Text>
                    <Text style={styles.breakupValue}>{money(withdrawAmount)}</Text>
                  </View>
                  <View style={styles.breakupRowWithSub}>
                    <View style={styles.breakupRowHeader}>
                      <Text style={styles.breakupLabel}>PG Charge:</Text>
                      <Text style={styles.breakupValue}>- {money(pgCharge)}</Text>
                    </View>
                  </View>
                  <View style={styles.breakupDivider} />
                  <View style={styles.breakupRow}>
                    <Text style={styles.breakupLabel}>Sub Total :</Text>
                    <Text style={styles.breakupValue}>{money(subTotal)}</Text>
                  </View>
                  <View style={styles.breakupRowWithSub}>
                    <View style={styles.breakupRowHeader}>
                      <Text style={styles.breakupLabel}>TDS:</Text>
                      <Text style={styles.breakupValue}>- {money(tdsAmount)}</Text>
                    </View>
                  </View>
                  <View style={styles.breakupDivider} />
                  <View style={[styles.breakupRowWithSub, { marginTop: 8 }]}>
                    <View style={styles.breakupRowHeader}>
                      <Text style={[styles.breakupLabel, styles.boldLabel]}>Payable Amount</Text>
                      <Text style={[styles.breakupValue, styles.boldValue]}>{money(payAmount)}</Text>
                    </View>
                  </View>

                  <View style={styles.paymentInfoSection}>
                    <Text style={styles.paymentInfoTitle}>Payment Information</Text>
                    <View style={styles.paymentInfoRow}>
                      <Text style={styles.paymentInfoLabel}>Method:</Text>
                      <Text style={styles.paymentInfoValue}>
                        {selectedWithdrawal.paymentMethod === 'upi' ? '📱 UPI' : '🏦 Bank Transfer'}
                      </Text>
                    </View>
                    {selectedWithdrawal.paymentMethod === 'upi' ? (
                      <View style={styles.paymentInfoRow}>
                        <Text style={styles.paymentInfoLabel}>UPI ID:</Text>
                        <Text style={styles.paymentInfoValue}>{selectedWithdrawal.upiId || 'N/A'}</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.paymentInfoRow}>
                          <Text style={styles.paymentInfoLabel}>Account No:</Text>
                          <Text style={styles.paymentInfoValue}>{selectedWithdrawal.accountNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.paymentInfoRow}>
                          <Text style={styles.paymentInfoLabel}>IFSC Code:</Text>
                          <Text style={styles.paymentInfoValue}>{selectedWithdrawal.ifscCode || 'N/A'}</Text>
                        </View>
                      </>
                    )}
                    <View style={styles.paymentInfoRow}>
                      <Text style={styles.paymentInfoLabel}>Status:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedWithdrawal.status) + '15' }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(selectedWithdrawal.status) }]}>
                          {selectedWithdrawal.status}
                        </Text>
                      </View>
                    </View>
                    {selectedWithdrawal.Note && (
                      <View style={[styles.paymentInfoRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                        <Text style={styles.paymentInfoLabel}>Note:</Text>
                        <Text style={styles.noteText}>{selectedWithdrawal.Note}</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              );
            })()}
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

export default WalletScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: colors.white, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  statValue: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },

  // Date filter
  periodDropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: colors.border, marginTop: 4, marginBottom: 12,
  },
  periodText: { fontSize: 15, fontWeight: '700', color: colors.text },

  // Available + Payable
  availPayCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: 16, padding: 18, borderWidth: 1, borderColor: colors.border, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 5, elevation: 2,
  },
  availPayCol: { flex: 1 },
  availPayLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  availPayValue: { fontSize: 19, fontWeight: '800', color: colors.text, marginTop: 4 },
  availPayDivider: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: 12 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 14 },
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
  histDesc: { fontSize: 12.5, color: colors.textSecondary, marginTop: 3 },
  txBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  txDate: { fontSize: 12, color: colors.textSecondary },
  txId: { fontSize: 11, color: colors.textMuted },

  emptyContainer: { alignItems: 'center', paddingVertical: 36 },
  emptyText: { color: colors.textMuted, marginTop: 10, fontSize: 14 },

  // Period picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 30 },
  pickerBox: { backgroundColor: colors.white, borderRadius: 18, paddingVertical: 6, maxHeight: '70%' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  pickerRowActive: { backgroundColor: '#FFF5F5' },
  pickerText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  pickerTextActive: { color: '#FF6B6B', fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContentBox: { backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '75%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },

  withdrawItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  itemIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  withdrawAmount: { fontSize: 16, fontWeight: '700', color: colors.text },
  withdrawMethod: { fontSize: 12, color: colors.textSecondary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  itemDate: { fontSize: 10, color: colors.textMuted, textAlign: 'right', marginTop: 4 },

  // Earning Breakup modal
  breakupModalBox: { backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  breakupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  breakupTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  breakupCloseBtn: { backgroundColor: colors.text, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  breakupRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  breakupRowWithSub: { paddingVertical: 10 },
  breakupRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakupLabel: { fontSize: 15, color: colors.text, fontWeight: '600' },
  breakupValue: { fontSize: 15, color: colors.text, fontWeight: '700' },
  breakupSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  breakupDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  boldLabel: { fontSize: 18, fontWeight: '800', color: colors.text },
  boldValue: { fontSize: 19, fontWeight: '800', color: colors.text },
  paymentInfoSection: { marginTop: 20, backgroundColor: '#F7FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  paymentInfoTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  paymentInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  paymentInfoLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  paymentInfoValue: { fontSize: 13, color: colors.text, fontWeight: '600' },
  noteText: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
});
