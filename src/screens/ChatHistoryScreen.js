import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const ChatHistoryScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await chatApi.getChatHistory({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setHistory(res.data?.recordList || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{(item.userName || 'U')[0].toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.userName}>{item.userName || 'User'}</Text>
          <Text style={styles.itemMeta}>
            {item.totalMin || 0} min • {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : ''}
          </Text>
        </View>
      </View>
      <Text style={styles.earnings}>+₹{parseFloat(item.deduction || 0).toFixed(2)}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="Chat History" subtitle="Completed consultations" onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyText}>No chat history found</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ChatHistoryScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  item: {
    backgroundColor: colors.card,
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.secondary + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.secondary, fontSize: 18, fontWeight: '800' },
  userName:  { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemMeta:  { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  earnings:  { color: colors.success, fontSize: 15, fontWeight: '800' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
