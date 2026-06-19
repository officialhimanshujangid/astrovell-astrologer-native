import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import Toast from 'react-native-toast-message';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import useTranslation from '../hooks/useTranslation';
import { appReviewApi } from '../api/services';

const FeedbackCeoScreen = ({ onBack }) => {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScreenHeader title={t('feedback_ceo')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.emoji}>📬</Text>
          </View>
          <Text style={styles.title}>{t('feedback_ceo')}</Text>
          <Text style={styles.subtitle}>
            Your suggestions and comments are delivered directly to the CEO's office. Help us improve your experience!
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textArea}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="Type your review or feedback here..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={6}
              maxLength={1000}
              textAlignVertical="top"
              editable={!loading}
            />
            <Text style={styles.charCount}>
              {feedback.length} / 1000
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default FeedbackCeoScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  scrollContent: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.goldGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.goldLight,
  },
  emoji: { fontSize: 36 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  inputContainer: { width: '100%', marginBottom: 20 },
  textArea: {
    width: '100%',
    height: 150,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    lineHeight: 20,
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    marginRight: 4,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: colors.goldDark,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.goldDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: { color: colors.white, fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
});
