import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme/colors';
import useTranslation from '../hooks/useTranslation';
import { appReviewApi } from '../api/services';

const FeedbackCeoScreen = ({ onBack }) => {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async () => {
    const trimmedFeedback = feedback.trim();
    if (!trimmedFeedback) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your feedback before submitting.' });
      return;
    }

    if (trimmedFeedback.length < 10) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Feedback must be at least 10 characters long.' });
      return;
    }

    setLoading(true);
    try {
      console.log('[FeedbackCeoScreen] Submitting review to API:', trimmedFeedback);
      const res = await appReviewApi.add({
        review: trimmedFeedback,
        appId: 1
      });

      console.log('[FeedbackCeoScreen] API response:', res.data);
      if (res.data?.status === 200 || res.data?.message?.toLowerCase().includes('sucessfully') || res.data?.message?.toLowerCase().includes('success')) {
        Toast.show({ type: 'success', text1: 'Feedback Submitted', text2: res.data?.message || 'App review add sucessfully' });
        onBack();
      } else {
        Toast.show({ type: 'success', text1: 'Feedback Submitted', text2: res.data?.message || 'Feedback added successfully.' });
        onBack();
      }
    } catch (err) {
      console.warn('[FeedbackCeoScreen] Submit feedback failed:', err);
      Toast.show({ type: 'error', text1: 'Submission Failed', text2: err.response?.data?.message || 'Failed to submit feedback. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <SettingsHeader title={t('feedback_ceo')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="mail-open-outline" size={34} color={colors.goldDark} />
          </View>
          <Text style={styles.heroTitle}>{t('feedback_ceo')}</Text>
          <Text style={styles.heroSub}>
            Your suggestions go directly to the CEO's office. Help us improve your experience.
          </Text>
        </View>

        {/* ── Feedback input ── */}
        <Text style={styles.label}>Your Feedback</Text>
        <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
          <TextInput
            style={styles.textArea}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Write your suggestion, idea or concern here..."
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            editable={!loading}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
        <Text style={styles.charCount}>{feedback.length} / 1000</Text>

        {/* ── Confidential note ── */}
        <View style={styles.noteRow}>
          <Ionicons name="lock-closed" size={15} color={colors.success} />
          <Text style={styles.noteText}>Confidential — read only by the CEO's office.</Text>
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color={colors.text} />
              <Text style={styles.submitBtnText}>Submit Feedback</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default FeedbackCeoScreen;

// Header with a gold OS status-bar strip (matches the Dashboard / Settings look)
// + a white title bar.
const SettingsHeader = ({ title, onBack }) => {
  const insets = useSafeAreaInsets();
  return (
    <View>
      <StatusBar style="dark" />
      <View style={{ height: insets.top, backgroundColor: colors.gold }} />
      <View style={styles.shdr}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.shdrBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : <View style={styles.shdrBack} />}
        <Text style={styles.shdrTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.shdrBack} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  scroll: { padding: 20, paddingBottom: 40 },

  // Header
  shdr: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  shdrBack: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  shdrTitle: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 17, fontWeight: '800' },

  // Hero
  hero: { alignItems: 'center', marginTop: 10, marginBottom: 26 },
  heroIcon: {
    width: 74, height: 74, borderRadius: 22,
    backgroundColor: colors.goldGlow,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 21, fontWeight: '900', color: colors.text, textAlign: 'center' },
  heroSub: {
    fontSize: 13.5, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 20, marginTop: 8, paddingHorizontal: 10,
  },

  // Input
  label: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 8 },
  inputWrap: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 16,
    backgroundColor: colors.surface,
  },
  inputWrapFocused: { borderColor: colors.gold, backgroundColor: colors.goldGlow },
  textArea: {
    height: 170, paddingHorizontal: 16, paddingVertical: 14,
    color: colors.text, fontSize: 15, lineHeight: 22,
  },
  charCount: { alignSelf: 'flex-end', fontSize: 12, color: colors.textMuted, marginTop: 6 },

  // Note
  noteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.successBg, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
    marginTop: 16, marginBottom: 24,
  },
  noteText: { flex: 1, fontSize: 12.5, color: colors.textSecondary, fontWeight: '500' },

  // Submit
  submitBtn: {
    flexDirection: 'row', gap: 8,
    backgroundColor: colors.gold,
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.text, fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },
});
