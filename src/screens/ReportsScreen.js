import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { reportApi } from '../api/services';
import { colors } from '../theme/colors';
import GoldHeader from '../components/GoldHeader';
import useTranslation from '../hooks/useTranslation';

const ReportsScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const { t } = useTranslation();
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    try {
      const res = await reportApi.getReports({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setReports(res.data?.recordList || res.data?.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }) => {
    const isCompleted = !!item.reportFile;
    const isExpanded  = expandedId === item.id;
    const statusColor = isCompleted ? colors.success : colors.warning;

    return (
      <View style={[styles.reportCard, { borderLeftColor: statusColor }]}>
        <TouchableOpacity
          style={styles.reportHeader}
          activeOpacity={0.8}
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
        >
          <View style={[styles.reportIcon, { backgroundColor: statusColor + '18' }]}>
            <Ionicons name="document-text" size={20} color={statusColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportUser}>{item.firstName || t('user')} {item.lastName || ''}</Text>
            <Text style={styles.reportMeta}>
              {item.reportType || 'Report'} · ₹{parseFloat(item.reportRate || 0).toFixed(0)} · {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : ''}
            </Text>
          </View>
          <View style={styles.reportRight}>
            <View style={[styles.reportBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.reportBadgeText, { color: statusColor }]}>
                {isCompleted ? t('done') : t('pending')}
              </Text>
            </View>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.reportDetails}>
            {[
              [t('gender'), item.gender ? (item.gender === 'Male' ? t('male') : item.gender === 'Female' ? t('female') : t('other')) : null],
              [t('dob'), item.birthDate],
              [t('tob'), item.birthTime],
              [t('pob'), item.birthPlace],
              [t('marital_status') || 'Marital Status', item.maritalStatus],
              [t('occupation') || 'Occupation', item.occupation],
            ].filter(([, v]) => v).map(([k, v]) => (
              <View key={k} style={styles.detailRow}>
                <Text style={styles.detailKey}>{k}</Text>
                <Text style={styles.detailVal}>{v}</Text>
              </View>
            ))}
            {item.comments ? (
              <Text style={styles.comments}>“{item.comments}”</Text>
            ) : null}

            {!isCompleted ? (
              <TouchableOpacity
                style={styles.uploadBtn}
                activeOpacity={0.85}
                onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'File picker would open here to upload PDF report' })}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={colors.text} />
                <Text style={styles.uploadBtnText}>{t('upload_report') || 'Upload Report PDF'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.uploadedRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.reportUploaded}>{t('report_uploaded') || 'Report uploaded'}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GoldHeader
        title={t('report_requests')}
        subtitle={t('report_requests_desc') || 'Upload reports for customers'}
        onBack={onBack}
      />
      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>{t('no_reports')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ReportsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.secondary },
  reportCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportIcon: {
    width: 42, height: 42, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  reportUser:   { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  reportMeta:   { color: colors.textMuted, fontSize: 12 },
  reportRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  reportBadgeText: { fontSize: 11, fontWeight: '800' },
  reportDetails: {
    marginTop: 12, backgroundColor: colors.secondary,
    borderRadius: 12, padding: 12, gap: 6,
  },
  detailRow: { flexDirection: 'row', gap: 8 },
  detailKey: { color: colors.textMuted, fontSize: 12, width: 100 },
  detailVal: { color: colors.text, fontSize: 12, flex: 1, fontWeight: '600' },
  comments:  { color: colors.textSecondary, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  uploadBtn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: colors.gold, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10,
  },
  uploadBtnText:  { color: colors.text, fontWeight: '800', fontSize: 13 },
  uploadedRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  reportUploaded: { color: colors.success, fontWeight: '700', fontSize: 13 },
  empty:     { alignItems: 'center', paddingTop: 90, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
