import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { followerApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const BASE_IMG = 'https://astrology-i7c9.onrender.com/';

const FollowersScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const [followers,  setFollowers]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await followerApi.getFollowers({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 100 });
      setFollowers(res.data?.recordList || res.data?.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getImg = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `${BASE_IMG}${path}`;
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      {item.profileImage ? (
        <Image source={{ uri: getImg(item.profileImage) }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarLetter}>{(item.name || item.firstName || 'U')[0].toUpperCase()}</Text>
        </View>
      )}
      <View>
        <Text style={styles.name}>{item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'User'}</Text>
        <Text style={styles.meta}>
          {item.created_at ? `Followed on ${new Date(item.created_at).toLocaleDateString('en-IN')}` : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Followers" subtitle={`${followers.length} followers`} onBack={onBack} />
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
              <Text style={styles.emptyText}>No followers yet</Text>
              <Text style={styles.emptyHint}>Build your reputation to gain followers!</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border,
  },
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
