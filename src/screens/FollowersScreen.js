import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { followerApi } from '../api/services';
import { colors } from '../theme/colors';
import GoldHeader from '../components/GoldHeader';
import useTranslation from '../hooks/useTranslation';
import { BASE_URI } from '../api/apiClient';

const BASE_IMG = BASE_URI;

const FollowersScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await followerApi.getFollowers({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 100 });
      setFollowers(res.data?.recordList || res.data?.data || []);
    } catch (_) { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getImg = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `${BASE_IMG}public/${path}`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      {item.profile ? (
        <Image source={{ uri: getImg(item.profile) }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarLetter}>
            {((item.name || item.userName || item.firstName || t('user') || 'U')[0] || 'U').toUpperCase()}
          </Text>
         
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{item.name || item.userName || `${item.firstName || ''} ${item.lastName || ''}`.trim() || t('user')}</Text>

        {item.contactNo ? (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={13} color={colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>{item.contactNo}</Text>
          </View>
        ) : null}
        {item.email ? (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={13} color={colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={1}>{item.email}</Text>
          </View>
        ) : null}
        {item.addressLine1 ? (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={styles.detailText} numberOfLines={2}>{item.addressLine1}</Text>
          </View>
        ) : null}

        <Text style={styles.meta}>
          {item.created_at ? `${t('followed_on') || 'Followed on'} ${new Date(item.created_at).toLocaleDateString('en-IN')}` : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <GoldHeader title={t('followers')} subtitle={`${followers.length} ${t('followers').toLowerCase()}`} onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={followers}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>{t('no_followers')}</Text>
              <Text style={styles.emptyHint}>{t('followers_desc')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default FollowersScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  item: {
    backgroundColor: colors.card, borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
  info: { flex: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  detailText: { flex: 1, color: colors.textSecondary, fontSize: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.border },
  avatarPlaceholder: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: colors.secondary + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.secondary, fontSize: 20, fontWeight: '800' },
  name: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  meta: { color: colors.textMuted, fontSize: 12 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14, marginBottom: 6 },
  emptyHint: { color: colors.textMuted, fontSize: 12, opacity: 0.6, textAlign: 'center' },
});
