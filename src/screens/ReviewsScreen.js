import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reviewApi } from '../api/services';
import { BASE_URI } from '../api/apiClient';
import { colors } from '../theme/colors';
import GoldHeader from '../components/GoldHeader';
import useTranslation from '../hooks/useTranslation';

const BASE_IMG = BASE_URI;

const Stars = ({ rating = 0, size = 14 }) => (
  <View style={{ flexDirection: 'row', gap: 1 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={size}
        color={i <= rating ? colors.gold : colors.borderStrong}
      />
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
    console.log('[ReviewsScreen] load called for astrologer:', astrologer?.id);
    try {
      console.log('[ReviewsScreen] Calling reviewApi.getReviews...');
      const res = await reviewApi.getReviews({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      console.log('[ReviewsScreen] getReviews success, response items count:', (res.data?.recordList || res.data?.data || []).length);
      setReviews(res.data?.recordList || res.data?.data || []);
    } catch (err) {
      console.warn('[ReviewsScreen] getReviews failed:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    console.log('[ReviewsScreen] mounted');
    load();
  }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const getImg = (path) => (!path ? null : (path.startsWith('http') ? path : `${BASE_IMG}public/${path}`));

  const handleReply = async (reviewId) => {
    const text = replies[reviewId]?.trim();
    if (!text) { Toast.show({ type: 'error', text1: t('error'), text2: t('enter_reply') }); return; }
    setReplyingId(reviewId);
    try {
      await reviewApi.reply({ reviewId, reply: text, astrologerId: astrologer?.id });
      Toast.show({ type: 'success', text1: `✅ ${t('success')}`, text2: t('reply_sent') });
      setReplies(prev => ({ ...prev, [reviewId]: '' }));
      load();
    } catch (_) { Toast.show({ type: 'error', text1: t('error'), text2: t('failed_reply') }); }
    setReplyingId(null);
  };

  const renderItem = ({ item }) => {
    const name = item.userName || item.name || t('user');
    const reviewText = item.review || item.comment;
    return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        {item.profile ? (
          <Image source={{ uri: getImg(item.profile) }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarLetter}>{(name[0] || 'U').toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerMid}>
          <Text style={styles.reviewUser} numberOfLines={1}>{name}</Text>
          <View style={styles.headerSubRow}>
            <Stars rating={item.rating || 0} />
            <Text style={styles.ratingNum}>{Number(item.rating || 0).toFixed(1)}</Text>
          </View>
        </View>
        <Text style={styles.reviewDate}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
        </Text>
      </View>
      {reviewText ? (
        <Text style={styles.reviewText}>“{reviewText}”</Text>
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
  };

  return (
    <View style={styles.container}>
      <GoldHeader title={t('user_reviews')} subtitle={`${reviews.length} ${t('reviews_count')}`} onBack={onBack} />
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
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.border },
  avatarPlaceholder: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.goldDark, fontSize: 18, fontWeight: '800' },
  headerMid: { flex: 1 },
  reviewUser:   { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 5 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingNum:    { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  reviewDate:   { color: colors.textMuted, fontSize: 11 },
  reviewText:   { color: colors.textSecondary, fontSize: 13.5, lineHeight: 21, marginTop: 12, fontStyle: 'italic' },
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
