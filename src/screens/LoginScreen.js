import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { authApi } from '../api/services';
import { loginSuccess } from '../store/slices/authSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone.trim() || phone.length < 10) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter a valid 10-digit mobile number' });
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
        Toast.show({ type: 'success', text1: '✅ OTP Sent', text2: 'OTP sent to your registered number' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: res.data?.message || 'Failed to send OTP' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to send OTP' });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length < 4) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter the OTP' });
      return;
    }
    setLoading(true);
    try {
      let pushToken = '';
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (projectId && !projectId.includes("1234") && !projectId.includes("0000")) {
          pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }
      } catch (e) { console.log('Push token fetch failed in Login'); }

      const res = await authApi.login({ 
        contactNo: phone, 
        otp, 
        countryCode: '+91',
        fcmToken: pushToken,
        deviceToken: pushToken,
        expoPushToken: pushToken,
      });
      const d = res.data;
      if (d?.status === 200 && d?.token) {
        await AsyncStorage.setItem('astrologerToken', d.token);
        const astrologer = d.recordList?.[0] || d.recordList || {};
        dispatch(loginSuccess({ token: d.token, astrologer }));
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: d?.message || 'Login failed. Please check OTP.' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Login failed' });
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🔮</Text>
          <Text style={styles.brand}>Astrovell</Text>
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
        <Text style={styles.footer}>Astrovell Astrologer • Trusted by thousands</Text>
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
  brand: { color: colors.goldDark, fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  brandSub: { color: colors.textSecondary, fontSize: 13, marginTop: 4, letterSpacing: 0.5 },

  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: { color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  cardSub: { color: colors.textMuted, fontSize: 13, marginBottom: 24 },

  fieldWrap: { marginBottom: 16 },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryCode: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  countryCodeText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  phoneInput: { flex: 1 },

  devOtp: { color: colors.goldDark, fontSize: 12, fontWeight: '600', marginTop: 6 },

  btn: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  editPhone: { color: colors.goldDark, textAlign: 'center', marginTop: 14, fontSize: 13, fontWeight: '600' },

  registerLink: { marginTop: 20, alignItems: 'center' },
  registerText: { color: colors.textMuted, fontSize: 13 },
  registerHighlight: { color: colors.goldDark, fontWeight: '700' },

  footer: { color: colors.textMuted, fontSize: 11, marginTop: 24, textAlign: 'center' },
});
