import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pujaApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const PujaOrdersScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(null);

  const load = async () => {
    try {
      const res = await pujaApi.getOrders({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setOrders(res.data?.recordList || res.data?.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleComplete = (orderId) => {
    Alert.alert('Complete Order', 'Mark this puja order as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete', onPress: async () => {
          setCompleting(orderId);
          try {
            await pujaApi.completeOrder({ orderId, astrologerId: astrologer?.id });
            Alert.alert('✅ Success', 'Puja order marked as completed!');
            load();
          } catch (_) { Alert.alert('Error', 'Failed to complete order'); }
          setCompleting(null);
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const isPending = (item.status || '').toLowerCase() !== 'completed';

    return (
      <View style={[styles.orderCard, { borderLeftColor: isPending ? colors.warning : colors.success }]}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.pujaTitle}>{item.pujaTitle || item.puja_title || 'Puja'}</Text>
            <Text style={styles.customerName}>Customer: {item.userName || item.firstName || 'User'}</Text>
            <Text style={styles.orderMeta}>
              ₹{parseFloat(item.amount || item.pujaPrice || 0).toFixed(0)} • {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isPending ? colors.warning + '20' : colors.success + '20' }]}>
            <Text style={[styles.statusText, { color: isPending ? colors.warning : colors.success }]}>
              {item.status || 'Pending'}
            </Text>
          </View>
        </View>

        {isPending && (
          <TouchableOpacity
            style={[styles.completeBtn, completing === item.id && { opacity: 0.6 }]}
            onPress={() => handleComplete(item.id)}
            disabled={completing === item.id}
          >
            {completing === item.id
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.completeBtnText}>Mark as Completed</Text>}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Puja Orders" subtitle="Customer puja bookings" onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No puja orders yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default PujaOrdersScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  orderCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  pujaTitle:    { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  customerName: { color: colors.textSub, fontSize: 12, marginBottom: 3 },
  orderMeta:    { color: colors.textMuted, fontSize: 12 },
  statusBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:   { fontSize: 11, fontWeight: '700' },
  completeBtn: {
    backgroundColor: colors.success, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  completeBtnText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
