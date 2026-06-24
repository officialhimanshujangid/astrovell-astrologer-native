import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { notificationApi } from '../api/services';
import { colors } from '../theme/colors';
import GoldHeader from '../components/GoldHeader';
import useTranslation from '../hooks/useTranslation';

const getNotif = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'chat':   return { icon: 'chatbubble-ellipses', color: '#DB2777', bg: colors.iconPink };
    case 'call':   return { icon: 'call', color: '#059669', bg: colors.iconGreen };
    case 'wallet': return { icon: 'wallet', color: '#0891B2', bg: colors.iconTeal };
    case 'puja':   return { icon: 'flame', color: '#EA580C', bg: colors.iconOrange };
    case 'review': return { icon: 'star', color: '#D97706', bg: colors.iconYellow };
    default:       return { icon: 'notifications', color: colors.goldDark, bg: colors.goldBg };
  }
};

const NotificationsScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const { t } = useTranslation();
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

  const renderItem = ({ item }) => {
    const n = getNotif(item.notificationType);
    return (
      <View style={styles.notifItem}>
        <View style={[styles.notifIcon, { backgroundColor: n.bg }]}>
          <Ionicons name={n.icon} size={20} color={n.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.notifTitle}>{item.title || item.message || t('notifications')}</Text>
          {item.body && item.body !== item.title ? (
            <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          ) : null}
          <View style={styles.notifDateRow}>
            <Ionicons name="time-outline" size={11} color={colors.textMuted} />
            <Text style={styles.notifDate}>
              {item.created_at ? new Date(item.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <GoldHeader
        title={t('notifications')}
        subtitle={`${items.length} ${t('notifications').toLowerCase()}`}
        onBack={onBack}
      />
      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={48} color={colors.textLight} />
              <Text style={styles.emptyText}>{t('no_notifications')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default NotificationsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.secondary },
  notifItem: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  notifIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  notifTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 3 },
  notifBody:  { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginBottom: 5 },
  notifDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  notifDate:  { color: colors.textMuted, fontSize: 11 },
  empty:      { alignItems: 'center', paddingTop: 90, gap: 12 },
  emptyText:  { color: colors.textMuted, fontSize: 14 },
});
