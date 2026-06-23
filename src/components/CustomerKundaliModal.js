/**
 * CustomerKundaliModal — Astrologer Native
 *
 * Reusable "Open Kundali" sheet shown during an active chat OR call. It takes
 * the customer's intake birth details, fetches the kundali (basic + planets +
 * dasha + panchang) and renders Basic / Planets / Dasha tabs — the same view
 * the chat astro-tools workspace shows, but self-contained so it can also be
 * opened from the call overlay (CallContext).
 *
 * `details` accepts the intake fields as returned by getCallById / chat detail:
 *   { intakeName|name|userName, intakeBirthDate|birthDate, intakeBirthTime|birthTime,
 *     intakeLat|lat, intakeLon|lon }
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { kundaliApi } from '../api/services';
import { colors } from '../theme/colors';

// DD/MM/YYYY → YYYY-MM-DD (intake form stores DD/MM/YYYY); pass through otherwise.
const normalizeDob = (d) => {
  if (!d) return '1990-01-01';
  const m = String(d).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return String(d).slice(0, 10);
};
const normalizeTob = (t) => {
  if (!t) return '12:00:00';
  const parts = String(t).split(':');
  if (parts.length === 2) return `${t}:00`;
  return t;
};

const DetailItem = ({ label, value }) => (
  <View style={st.detailItem}>
    <Text style={st.detailLabel}>{label}</Text>
    <Text style={st.detailValue}>{value || '—'}</Text>
  </View>
);

const fmtDashaDate = (d) => {
  if (!d) return '';
  try { return String(d).split(' ')[0]; } catch (_) { return String(d); }
};

const CustomerKundaliModal = ({ visible, onClose, details }) => {
  const [subTab, setSubTab] = useState('Basic');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const name = details?.intakeName || details?.name || details?.userName || 'User';

  useEffect(() => {
    if (!visible) return;
    if (data || loading) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = {
          dob: normalizeDob(details?.intakeBirthDate || details?.birthDate),
          tob: normalizeTob(details?.intakeBirthTime || details?.birthTime),
          lat: String(details?.intakeLat || details?.lat || details?.latitude || '28.6139'),
          lon: String(details?.intakeLon || details?.intakeLong || details?.lon || details?.longitude || '77.2090'),
          tz: 5.5,
          name,
        };
        const [basicRes, planetRes, dashaRes, panchangRes] = await Promise.all([
          kundaliApi.getBasicReport(payload),
          kundaliApi.getPlanetReport(payload),
          kundaliApi.getMahadashaList(payload),
          kundaliApi.getBirthPanchang(payload),
        ]);
        if (cancelled) return;
        setData({
          basic: basicRes.data?.data || basicRes.data,
          planets: planetRes.data?.recordList || planetRes.data?.data || [],
          dasha: dashaRes.data?.recordList || dashaRes.data?.data || [],
          panchang: panchangRes.data?.data || panchangRes.data,
          rashi: basicRes.data?.data?.moonSign || 'Aries',
          nakshatra: basicRes.data?.data?.nakshatra || 'N/A',
        });
      } catch (e) {
        if (!cancelled) setError('Could not load kundali. Please retry.');
      }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, [visible]);

  const retry = () => { setData(null); setError(null); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={st.sheet}>
          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>🔮 Kundali</Text>
              <Text style={st.sub} numberOfLines={1}>{name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={st.tabs}>
            {['Basic', 'Planets', 'Dasha'].map((tb) => (
              <TouchableOpacity
                key={tb}
                style={[st.tab, subTab === tb && st.tabActive]}
                onPress={() => setSubTab(tb)}
              >
                <Text style={[st.tabText, subTab === tb && st.tabTextActive]}>{tb}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 14 }}>
            {loading ? (
              <View style={st.center}>
                <ActivityIndicator color={colors.gold || colors.secondary} />
                <Text style={st.muted}>Casting the chart…</Text>
              </View>
            ) : error ? (
              <View style={st.center}>
                <Text style={st.muted}>{error}</Text>
                <TouchableOpacity style={st.retryBtn} onPress={retry}>
                  <Text style={st.retryTxt}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {subTab === 'Basic' && (
                  <View>
                    <Text style={st.cardTitle}>Birth Panchang</Text>
                    <View style={st.quickInfo}>
                      <DetailItem label="Rashi (Moon)" value={data?.rashi} />
                      <DetailItem label="Nakshatra" value={data?.nakshatra} />
                      <DetailItem label="Tithi" value={data?.panchang?.tithi} />
                      <DetailItem label="Karan" value={data?.panchang?.karan} />
                      <DetailItem label="Yog" value={data?.panchang?.yog} />
                      <DetailItem label="Sunrise" value={data?.panchang?.sunrise} />
                      <DetailItem label="Sunset" value={data?.panchang?.sunset} />
                    </View>
                  </View>
                )}

                {subTab === 'Planets' && (
                  <View>
                    <Text style={st.cardTitle}>Planet Positions</Text>
                    {(data?.planets || []).slice(0, 12).map((p, idx) => (
                      <View key={idx} style={st.planetRow}>
                        <Text style={st.planetName}>{p.name}</Text>
                        <Text style={st.planetDeg}>{typeof p.fullDegree === 'number' ? `${p.fullDegree.toFixed(2)}°` : '—'}</Text>
                        <Text style={st.planetRashi}>{p.rasi ? String(p.rasi).substring(0, 3) : '—'}</Text>
                      </View>
                    ))}
                    {(!data?.planets || data.planets.length === 0) && <Text style={st.muted}>No planet data.</Text>}
                  </View>
                )}

                {subTab === 'Dasha' && (
                  <View>
                    <Text style={st.cardTitle}>Vimshottari Mahadasha</Text>
                    {(data?.dasha || []).slice(0, 9).map((d, idx) => (
                      <View key={idx} style={st.dashaRow}>
                        <Text style={st.dashaLord}>{d.planet}</Text>
                        <Text style={st.dashaDate}>{fmtDashaDate(d.start)} → {fmtDashaDate(d.end)}</Text>
                      </View>
                    ))}
                    {(!data?.dasha || data.dasha.length === 0) && <Text style={st.muted}>No dasha data.</Text>}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default CustomerKundaliModal;

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.primary || '#FFF', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text || '#1A1A1A' },
  sub: { fontSize: 13, color: colors.textMuted || '#888', marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F2F2' },
  tabs: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F4F4F4', alignItems: 'center' },
  tabActive: { backgroundColor: colors.gold || colors.secondary || '#FFCC00' },
  tabText: { fontSize: 13, fontWeight: '700', color: colors.textMuted || '#777' },
  tabTextActive: { color: '#1A1A1A' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  muted: { color: colors.textMuted || '#888', fontSize: 13, textAlign: 'center' },
  retryBtn: { marginTop: 6, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.gold || '#FFCC00' },
  retryTxt: { color: '#1A1A1A', fontWeight: '800' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.text || '#1A1A1A', marginBottom: 10 },
  quickInfo: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailItem: { width: '47%', backgroundColor: '#F7F7F7', borderRadius: 10, padding: 10 },
  detailLabel: { fontSize: 11, color: colors.textMuted || '#888', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '700', color: colors.text || '#1A1A1A' },
  planetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  planetName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text || '#1A1A1A' },
  planetDeg: { width: 70, fontSize: 13, color: colors.textMuted || '#666', textAlign: 'right' },
  planetRashi: { width: 50, fontSize: 13, fontWeight: '700', color: colors.gold || colors.secondary || '#C9A227', textAlign: 'right' },
  dashaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dashaLord: { fontSize: 14, fontWeight: '700', color: colors.text || '#1A1A1A' },
  dashaDate: { fontSize: 12, color: colors.textMuted || '#666' },
});
