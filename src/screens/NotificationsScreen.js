import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { notificationApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const NotificationsScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await notificationApi.get({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setItems(res.data?.recordList || res.data?.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getNotifIcon = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'chat':    return '💬';
      case 'call':    return '📞';
      case 'wallet':  return '💰';
      case 'puja':    return '🪔';
      case 'review':  return '⭐';
      default:        return '🔔';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.notifItem}>
      <View style={styles.notifIcon}>
        <Text style={{ fontSize: 22 }}>{getNotifIcon(item.notificationType)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifTitle}>{item.title || item.message || 'Notification'}</Text>
        {item.body && item.body !== item.title ? (
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        ) : null}
        <Text style={styles.notifDate}>
          {item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Notifications" onBack={onBack} />
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
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>No notifications</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  notifItem: {
    backgroundColor: colors.card, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  notifIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.secondary + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 3 },
  notifBody:  { color: colors.textSub, fontSize: 12, lineHeight: 17, marginBottom: 3 },
  notifDate:  { color: colors.textMuted, fontSize: 11 },
  empty:      { alignItems: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 40, marginBottom: 12 },
  emptyText:  { color: colors.textMuted, fontSize: 14 },
});
