import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const ReportsScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);

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

    return (
      <View style={[styles.reportCard, { borderLeftColor: isCompleted ? colors.success : colors.warning }]}>
        <View style={styles.reportHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportUser}>{item.firstName || 'User'} {item.lastName || ''}</Text>
            <Text style={styles.reportMeta}>
              {item.reportType || 'Report'} • ₹{parseFloat(item.reportRate || 0).toFixed(0)} • {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : ''}
            </Text>
          </View>
          <View style={styles.reportRight}>
            <View style={[styles.reportBadge, { backgroundColor: isCompleted ? colors.success + '20' : colors.warning + '20' }]}>
              <Text style={[styles.reportBadgeText, { color: isCompleted ? colors.success : colors.warning }]}>
                {isCompleted ? 'Done' : 'Pending'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : item.id)}>
              <Text style={styles.expandBtn}>{isExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.reportDetails}>
            {[
              ['Gender', item.gender],
              ['Birth Date', item.birthDate],
              ['Birth Time', item.birthTime],
              ['Birth Place', item.birthPlace],
              ['Marital Status', item.maritalStatus],
              ['Occupation', item.occupation],
            ].filter(([, v]) => v).map(([k, v]) => (
              <View key={k} style={styles.detailRow}>
                <Text style={styles.detailKey}>{k}:</Text>
                <Text style={styles.detailVal}>{v}</Text>
              </View>
            ))}
            {item.comments ? (
              <Text style={styles.comments}>{item.comments}</Text>
            ) : null}

            {!isCompleted ? (
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={() => Alert.alert('Info', 'File picker would open here to upload PDF report')}
              >
                <Text style={styles.uploadBtnText}>📄 Upload Report PDF</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.reportUploaded}>✅ Report uploaded</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Report Requests" subtitle="Upload reports for customers" onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No report requests</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ReportsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  reportCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  reportUser:   { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  reportMeta:   { color: colors.textMuted, fontSize: 12 },
  reportRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  reportBadgeText: { fontSize: 11, fontWeight: '700' },
  expandBtn:    { color: colors.textMuted, fontSize: 14, padding: 4 },
  reportDetails:{
    marginTop: 12, backgroundColor: colors.surface,
    borderRadius: 10, padding: 12, gap: 6,
  },
  detailRow: { flexDirection: 'row', gap: 8 },
  detailKey: { color: colors.textMuted, fontSize: 12, width: 90 },
  detailVal: { color: colors.text, fontSize: 12, flex: 1, fontWeight: '600' },
  comments:  { color: colors.textSub, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  uploadBtn: {
    backgroundColor: colors.secondary, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 10,
  },
  uploadBtnText:   { color: colors.white, fontWeight: '700', fontSize: 13 },
  reportUploaded:  { color: colors.success, fontWeight: '700', marginTop: 6, fontSize: 13 },
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
