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
import useTranslation from '../hooks/useTranslation';

const Stars = ({ rating }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1,2,3,4,5].map(i => (
      <Text key={i} style={{ color: i <= rating ? colors.gold : colors.textMuted, fontSize: 14 }}>★</Text>
    ))}
  </View>
);

const ReviewsScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const { t } = useTranslation();
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
    if (!text) { Alert.alert(t('error'), t('enter_reply')); return; }
    setReplyingId(reviewId);
    try {
      await reviewApi.reply({ reviewId, reply: text, astrologerId: astrologer?.id });
      Alert.alert(`✅ ${t('success')}`, t('reply_sent'));
      setReplies(prev => ({ ...prev, [reviewId]: '' }));
      load();
    } catch (_) { Alert.alert(t('error'), t('failed_reply')); }
    setReplyingId(null);
  };

  const renderItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View>
          <Text style={styles.reviewUser}>{item.userName || item.name || t('user')}</Text>
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
          <Text style={styles.replyLabel}>{t('your_reply')}</Text>
          <Text style={styles.replyText}>{item.reply}</Text>
        </View>
      ) : (
        <View style={styles.replyInputWrap}>
          <TextInput
            style={styles.replyInput}
            value={replies[item.id] || ''}
            onChangeText={v => setReplies(prev => ({ ...prev, [item.id]: v }))}
            placeholder={t('write_reply')}
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
              : <Text style={styles.replyBtnText}>{t('reply')}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('user_reviews')} subtitle={`${reviews.length} ${t('reviews_count')}`} onBack={onBack} />
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
              <Text style={styles.emptyText}>{t('no_reviews')}</Text>
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
    backgroundColor: colors.surface, borderRadius: 20,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 5, elevation: 2,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  reviewUser:   { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  reviewDate:   { color: colors.textMuted, fontSize: 11 },
  reviewText:   { color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 6 },
  replyWrap: {
    marginTop: 12, backgroundColor: colors.goldBg,
    borderRadius: 12, padding: 12,
    borderLeftWidth: 4, borderLeftColor: colors.gold,
  },
  replyLabel: { color: colors.goldDark, fontSize: 11, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase' },
  replyText:  { color: colors.text, fontSize: 13, lineHeight: 18 },
  replyInputWrap: { marginTop: 12, gap: 10 },
  replyInput: {
    backgroundColor: colors.white, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    color: colors.text, fontSize: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  replyBtn: {
    backgroundColor: colors.gold, borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  replyBtnText: { color: colors.text, fontWeight: '800', fontSize: 14 },
  empty:     { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});
