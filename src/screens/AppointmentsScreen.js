import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appointmentApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const AppointmentsScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await appointmentApi.getScheduleCalls({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setItems(res.data?.recordList || res.data?.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDelete = (id) => {
    Alert.alert('Delete Appointment', 'Delete this scheduled appointment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await appointmentApi.delete(id);
            setItems(prev => prev.filter(a => a.id !== id));
          } catch (_) { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'confirmed': return colors.success;
      case 'cancelled': return colors.danger;
      default: return colors.warning;
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>
            {item.scheduleDate ? new Date(item.scheduleDate).getDate() : '--'}
          </Text>
          <Text style={styles.dateMonth}>
            {item.scheduleDate ? new Date(item.scheduleDate).toLocaleString('en-IN', { month: 'short' }) : ''}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{item.userName || 'User'}</Text>
          <Text style={styles.itemMeta}>
            {item.scheduleTime || ''} • {item.requestType || 'Call'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status || 'Pending'}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
        <Text style={styles.deleteBtnText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Appointments" subtitle="Scheduled calls" onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No appointments scheduled</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default AppointmentsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  card: {
    backgroundColor: colors.card, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  dateBox: {
    backgroundColor: colors.secondary + '20',
    borderRadius: 12, padding: 10, alignItems: 'center',
    minWidth: 48,
  },
  dateDay:   { color: colors.secondary, fontSize: 20, fontWeight: '900' },
  dateMonth: { color: colors.textSub, fontSize: 11, fontWeight: '600' },
  userName:  { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  itemMeta:  { color: colors.textMuted, fontSize: 12, marginBottom: 5 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 20 },
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
