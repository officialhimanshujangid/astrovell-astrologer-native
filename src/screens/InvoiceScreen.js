import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as Sharing from 'expo-sharing';

import { colors } from '../theme/colors';
import { walletApi } from '../api/services';
import GoldHeader from '../components/GoldHeader';
import useTranslation from '../hooks/useTranslation';

// expo-print is a NATIVE module — present only after a fresh build. Guarded so the
// screen (view) works on a normal reload; the "Download PDF" button degrades
// gracefully until the app is rebuilt with expo-print.
let Print = null;
try { Print = require('expo-print'); } catch (e) { Print = null; }

const money = (n) => '₹' + parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const invNo = (id) => `INV-${String(id).padStart(5, '0')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const statusColor = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'approved': case 'completed': case 'released': return colors.success;
    case 'rejected': case 'cancelled': return colors.error;
    default: return colors.warning;
  }
};

// Derive the full breakup from a withdrawal row (same definition as the wallet).
const breakup = (w) => {
  const withdrawAmount = parseFloat(w.withdrawAmount || 0);
  const payable = parseFloat(w.pay_amount || w.withdrawAmount || 0);
  const tds = parseFloat(w.tds_pay_amount || 0);
  const pgCharge = Math.max(0, withdrawAmount - payable - tds);
  const subTotal = withdrawAmount - pgCharge;
  return { withdrawAmount, payable, tds, pgCharge, subTotal };
};

const InvoiceScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const { t } = useTranslation();

  const [invoices, setInvoices]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]   = useState(null);
  const [generating, setGenerating] = useState(null);

  const load = async () => {
    try {
      const res = await walletApi.getWithdrawRequests({ astrologerId: astrologer?.id });
      const list = res?.data?.recordList?.withdrawl || res?.data?.recordList || [];
      setInvoices(Array.isArray(list) ? list : []);
    } catch (e) {
      setInvoices([]);
    }
  };

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ── HTML invoice (used for the PDF) ──────────────────────────────────────
  const buildInvoiceHtml = (w) => {
    const b = breakup(w);
    const astroName = w.name || astrologer?.name || 'Astrologer';
    const contact = w.contactNo || astrologer?.contactNo || '';
    const methodLine = w.paymentMethod === 'upi'
      ? `UPI: ${w.upiId || w.upi || '-'}`
      : `A/C: ${w.accountNumber || '-'} &nbsp; IFSC: ${w.ifscCode || '-'}`;
    return `
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        * { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; }
        body { color: #1A1A1A; padding: 28px; }
        .top { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #FF6B6B; padding-bottom: 16px; }
        .brand { font-size: 24px; font-weight: 800; color: #FF6B6B; }
        .muted { color: #777; font-size: 12px; }
        .title { text-align:right; }
        .title h1 { margin:0; font-size: 26px; letter-spacing: 2px; }
        .row { display:flex; justify-content:space-between; margin: 18px 0; }
        .box h3 { margin:0 0 6px; font-size: 12px; color:#777; text-transform:uppercase; letter-spacing:.5px; }
        .box p { margin: 2px 0; font-size: 14px; font-weight:600; }
        table { width:100%; border-collapse: collapse; margin-top: 14px; }
        td { padding: 12px 8px; font-size: 14px; border-bottom: 1px solid #EEE; }
        td.r { text-align:right; }
        .sub td { color:#555; font-size:12px; border:none; padding-top:0; }
        .total td { font-size: 18px; font-weight: 800; border-top: 2px solid #1A1A1A; border-bottom:none; }
        .badge { display:inline-block; padding: 4px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; }
        .foot { margin-top: 30px; font-size: 11px; color:#999; text-align:center; }
      </style></head>
      <body>
        <div class="top">
          <div><div class="brand">Astrovell</div><div class="muted">Astrologer Payout Invoice</div></div>
          <div class="title"><h1>INVOICE</h1>
            <div class="muted">${invNo(w.id)}</div>
            <div class="muted">${fmtDate(w.created_at)}</div>
          </div>
        </div>

        <div class="row">
          <div class="box"><h3>Astrologer</h3><p>${astroName}</p>${contact ? `<p class="muted">${contact}</p>` : ''}</div>
          <div class="box" style="text-align:right"><h3>Status</h3>
            <span class="badge" style="background:${statusColor(w.status)}22; color:${statusColor(w.status)}">${w.status || 'Pending'}</span>
          </div>
        </div>

        <table>
          <tr><td>Withdraw Amount</td><td class="r">${money(b.withdrawAmount)}</td></tr>
          <tr><td>PG Charge</td><td class="r">- ${money(b.pgCharge)}</td></tr>
          <tr class="sub"><td colspan="2">Charge deducted by Payment Gateways for online payouts</td></tr>
          <tr><td>Sub Total</td><td class="r">${money(b.subTotal)}</td></tr>
          <tr><td>TDS</td><td class="r">- ${money(b.tds)}</td></tr>
          <tr class="sub"><td colspan="2">Tax deducted as per government regulations</td></tr>
          <tr class="total"><td>Payable Amount</td><td class="r">${money(b.payable)}</td></tr>
        </table>

        <div class="row" style="margin-top:24px">
          <div class="box"><h3>Payment Method</h3>
            <p>${w.paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'}</p>
            <p class="muted">${methodLine}</p>
          </div>
        </div>

        ${w.Note ? `<div class="muted" style="margin-top:8px"><b>Note:</b> ${w.Note}</div>` : ''}
        <div class="foot">This is a system-generated invoice for your withdrawal request. — Astrovell</div>
      </body></html>`;
  };

  const downloadPdf = async (w) => {
    if (!Print) {
      Toast.show({ type: 'info', text1: 'PDF available soon', text2: 'Update/rebuild the app to download invoices.' });
      return;
    }
    try {
      setGenerating(w.id);
      const { uri } = await Print.printToFileAsync({ html: buildInvoiceHtml(w) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: invNo(w.id), UTI: 'com.adobe.pdf' });
      } else {
        Toast.show({ type: 'success', text1: 'Invoice saved', text2: uri });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Could not generate PDF', text2: e?.message || '' });
    } finally {
      setGenerating(null);
    }
  };

  // ── Invoice list card ────────────────────────────────────────────────────
  const renderCard = (w) => {
    const b = breakup(w);
    return (
      <TouchableOpacity key={w.id} style={styles.card} activeOpacity={0.8} onPress={() => setSelected(w)}>
        <View style={styles.cardIcon}>
          <Ionicons name="document-text-outline" size={22} color="#FF6B6B" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardNo}>{invNo(w.id)}</Text>
          <Text style={styles.cardDate}>{fmtDate(w.created_at)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardAmount}>{money(b.payable)}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor(w.status) + '18' }]}>
            <Text style={[styles.badgeText, { color: statusColor(w.status) }]}>{w.status || 'Pending'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const sel = selected ? breakup(selected) : null;

  return (
    <View style={styles.container}>
      <GoldHeader title="Invoices" subtitle="Your withdrawal invoices" onBack={onBack} />

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#FF6B6B" /></View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {invoices.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No invoices yet</Text>
              <Text style={styles.emptySub}>Invoices appear here for each withdrawal request.</Text>
            </View>
          ) : (
            invoices.map(renderCard)
          )}
        </ScrollView>
      )}

      {/* ── Invoice detail modal ── */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>{selected ? invNo(selected.id) : ''}</Text>
                <Text style={styles.sheetSub}>{selected ? fmtDate(selected.created_at) : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            {selected && sel && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                <View style={styles.bizRow}>
                  <Text style={styles.bizName}>{selected.name || astrologer?.name || 'Astrologer'}</Text>
                  <View style={[styles.badge, { backgroundColor: statusColor(selected.status) + '18' }]}>
                    <Text style={[styles.badgeText, { color: statusColor(selected.status) }]}>{selected.status || 'Pending'}</Text>
                  </View>
                </View>

                <View style={styles.line}><Text style={styles.lLabel}>Withdraw Amount</Text><Text style={styles.lValue}>{money(sel.withdrawAmount)}</Text></View>
                <View style={styles.line}><Text style={styles.lLabel}>PG Charge</Text><Text style={styles.lValue}>- {money(sel.pgCharge)}</Text></View>
                <View style={styles.divider} />
                <View style={styles.line}><Text style={styles.lLabel}>Sub Total</Text><Text style={styles.lValue}>{money(sel.subTotal)}</Text></View>
                <View style={styles.line}><Text style={styles.lLabel}>TDS</Text><Text style={styles.lValue}>- {money(sel.tds)}</Text></View>
                <View style={styles.divider} />
                <View style={styles.line}><Text style={styles.lLabelBold}>Payable Amount</Text><Text style={styles.lValueBold}>{money(sel.payable)}</Text></View>

                <View style={styles.payInfo}>
                  <Text style={styles.payTitle}>Payment Method</Text>
                  <View style={styles.payRow}>
                    <Text style={styles.payLabel}>Method</Text>
                    <Text style={styles.payValue}>{selected.paymentMethod === 'upi' ? '📱 UPI' : '🏦 Bank Transfer'}</Text>
                  </View>
                  {selected.paymentMethod === 'upi' ? (
                    <View style={styles.payRow}><Text style={styles.payLabel}>UPI ID</Text><Text style={styles.payValue}>{selected.upiId || selected.upi || 'N/A'}</Text></View>
                  ) : (
                    <>
                      <View style={styles.payRow}><Text style={styles.payLabel}>A/C No</Text><Text style={styles.payValue}>{selected.accountNumber || 'N/A'}</Text></View>
                      <View style={styles.payRow}><Text style={styles.payLabel}>IFSC</Text><Text style={styles.payValue}>{selected.ifscCode || 'N/A'}</Text></View>
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.pdfBtn}
                  onPress={() => downloadPdf(selected)}
                  disabled={generating === selected.id}
                  activeOpacity={0.85}
                >
                  {generating === selected.id ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="download-outline" size={18} color="#FFF" />
                      <Text style={styles.pdfBtnText}>Download PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default InvoiceScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.white, borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF0E9', alignItems: 'center', justifyContent: 'center' },
  cardNo: { fontSize: 15, fontWeight: '800', color: colors.text },
  cardDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardAmount: { fontSize: 16, fontWeight: '800', color: colors.text },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8 },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  sheetTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  sheetSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  closeBtn: { backgroundColor: colors.text, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  bizRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bizName: { fontSize: 16, fontWeight: '800', color: colors.text },

  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11 },
  lLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  lValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  lLabelBold: { fontSize: 17, color: colors.text, fontWeight: '800' },
  lValueBold: { fontSize: 18, color: colors.text, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 6 },

  payInfo: { marginTop: 18, backgroundColor: '#F7FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.border },
  payTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  payLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  payValue: { fontSize: 13, color: colors.text, fontWeight: '600' },

  pdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF6B6B', borderRadius: 14, paddingVertical: 15, marginTop: 22 },
  pdfBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
