import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { authApi } from '../api/services';
import { loginSuccess } from '../store/slices/authSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
  const dispatch  = useDispatch();
  const insets    = useSafeAreaInsets();
  const [phone,   setPhone]   = useState('');
  const [otp,     setOtp]     = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp,  setDevOtp]  = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone.trim() || phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.sendOtp({
        contactNo: phone,
        fromApp: 'astrologer',
        type: 'login',
        countryCode: '91',
      });
      if (res.data?.status === 200) {
        if (res.data?.otp) setDevOtp(String(res.data.otp));
        setOtpSent(true);
        Alert.alert('✅ OTP Sent', 'OTP sent to your registered number');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to send OTP');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length < 4) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.login({ contactNo: phone, otp, countryCode: '+91' });
      const d = res.data;
      if (d?.status === 200 && d?.token) {
        await AsyncStorage.setItem('astrologerToken', d.token);
        const astrologer = d.recordList?.[0] || d.recordList || {};
        dispatch(loginSuccess({ token: d.token, astrologer }));
      } else {
        Alert.alert('Error', d?.message || 'Login failed. Please check OTP.');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🔮</Text>
          <Text style={styles.brand}>AstroVell</Text>
          <Text style={styles.brandSub}>Astrologer Panel</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome Back</Text>
          <Text style={styles.cardSub}>Sign in to manage your consultations</Text>

          {/* Phone Field */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="10-digit mobile"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!otpSent}
              />
            </View>
          </View>

          {/* OTP Field */}
          {otpSent && (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                placeholderTextColor={colors.textMuted}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              {devOtp ? (
                <Text style={styles.devOtp}>OTP (dev): {devOtp}</Text>
              ) : null}
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={otpSent ? handleVerifyOtp : handleSendOtp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.btnText}>{otpSent ? 'Verify & Login' : 'Send OTP'}</Text>
            )}
          </TouchableOpacity>

          {/* Edit phone */}
          {otpSent && (
            <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); setDevOtp(''); }}>
              <Text style={styles.editPhone}>← Edit mobile number</Text>
            </TouchableOpacity>
          )}

          {/* Register link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerLink}
          >
            <Text style={styles.registerText}>
              New astrologer? <Text style={styles.registerHighlight}>Register here</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>AstroVell Astrologer • Trusted by thousands</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: { fontSize: 56, marginBottom: 8 },
  brand: { color: colors.gold, fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  brandSub: { color: colors.textSub, fontSize: 13, marginTop: 4, letterSpacing: 0.5 },

  card: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  cardSub:   { color: colors.textMuted, fontSize: 13, marginBottom: 24 },

  fieldWrap: { marginBottom: 16 },
  label: { color: colors.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  phoneRow:    { flexDirection: 'row', gap: 8 },
  countryCode: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  countryCodeText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  phoneInput:      { flex: 1 },

  devOtp: { color: colors.secondary, fontSize: 12, fontWeight: '600', marginTop: 6 },

  btn: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  editPhone: { color: colors.secondary, textAlign: 'center', marginTop: 14, fontSize: 13, fontWeight: '600' },

  registerLink: { marginTop: 20, alignItems: 'center' },
  registerText: { color: colors.textMuted, fontSize: 13 },
  registerHighlight: { color: colors.accent, fontWeight: '700' },

  footer: { color: colors.textMuted, fontSize: 11, marginTop: 24, textAlign: 'center' },
});
