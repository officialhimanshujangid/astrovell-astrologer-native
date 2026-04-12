import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reviewApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const Stars = ({ rating }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1,2,3,4,5].map(i => (
      <Text key={i} style={{ color: i <= rating ? colors.gold : colors.textMuted, fontSize: 14 }}>★</Text>
    ))}
  </View>
);

const ReviewsScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const [reviews,    setReviews]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replies,    setReplies]    = useState({});
  const [replyingId, setReplyingId] = useState(null);

  const load = async () => {
    try {
      const res = await reviewApi.getReviews({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setReviews(res.data?.recordList || res.data?.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleReply = async (reviewId) => {
    const text = replies[reviewId]?.trim();
    if (!text) { Alert.alert('Error', 'Enter a reply first'); return; }
    setReplyingId(reviewId);
    try {
      await reviewApi.reply({ reviewId, reply: text, astrologerId: astrologer?.id });
      Alert.alert('✅ Success', 'Reply sent!');
      setReplies(prev => ({ ...prev, [reviewId]: '' }));
      load();
    } catch (_) { Alert.alert('Error', 'Failed to send reply'); }
    setReplyingId(null);
  };

  const renderItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View>
          <Text style={styles.reviewUser}>{item.userName || item.name || 'User'}</Text>
          <Stars rating={item.rating || 0} />
        </View>
        <Text style={styles.reviewDate}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : ''}
        </Text>
      </View>
      {item.review || item.comment ? (
        <Text style={styles.reviewText}>{item.review || item.comment}</Text>
      ) : null}

      {item.reply ? (
        <View style={styles.replyWrap}>
          <Text style={styles.replyLabel}>Your Reply</Text>
          <Text style={styles.replyText}>{item.reply}</Text>
        </View>
      ) : (
        <View style={styles.replyInputWrap}>
          <TextInput
            style={styles.replyInput}
            value={replies[item.id] || ''}
            onChangeText={v => setReplies(prev => ({ ...prev, [item.id]: v }))}
            placeholder="Write a reply..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[styles.replyBtn, replyingId === item.id && { opacity: 0.6 }]}
            onPress={() => handleReply(item.id)}
            disabled={replyingId === item.id}
          >
            {replyingId === item.id
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.replyBtnText}>Reply</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="User Reviews" subtitle={`${reviews.length} reviews`} onBack={onBack} />
      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>⭐</Text>
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default ReviewsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  reviewCard: {
    backgroundColor: colors.card, borderRadius: 16,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reviewUser:   { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  reviewDate:   { color: colors.textMuted, fontSize: 11 },
  reviewText:   { color: colors.textSub, fontSize: 13, lineHeight: 20, marginTop: 6 },
  replyWrap: {
    marginTop: 10, backgroundColor: colors.surface,
    borderRadius: 10, padding: 10,
    borderLeftWidth: 3, borderLeftColor: colors.secondary,
  },
  replyLabel: { color: colors.secondary, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  replyText:  { color: colors.text, fontSize: 13 },
  replyInputWrap: { marginTop: 12, gap: 8 },
  replyInput: {
    backgroundColor: colors.surface, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text, fontSize: 13,
    borderWidth: 1, borderColor: colors.border,
  },
  replyBtn: {
    backgroundColor: colors.secondary, borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  replyBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  empty:     { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
