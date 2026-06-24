import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { colors } from '../theme/colors';
import { authApi } from '../api/services';
import { loginSuccess } from '../store/slices/authSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OtpScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { phone = '', devOtp: initialDevOtp = '' } = route?.params || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState(initialDevOtp);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef([]);

  // ── Resend countdown ────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getOtpString = () => otp.join('');

  const handleOtpChange = (text, index) => {
    if (text.length > 1) {
      // Paste support
      const digits = text.replace(/\D/g, '').slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      inputRefs.current[Math.min(digits.length, 5)]?.focus();
      return;
    }
    const next = [...otp];
    next[index] = text;
    setOtp(next);
    if (text && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ── Verify (logic unchanged from old inline login) ──────────────────────
  const handleVerifyOtp = async () => {
    const otpString = getOtpString();
    if (otpString.length < 4) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter the OTP' });
      return;
    }
    setLoading(true);
    try {
      let pushToken = '';
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (projectId && !projectId.includes('1234') && !projectId.includes('0000')) {
          pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }
      } catch (e) { console.log('Push token fetch failed in Otp'); }

      const res = await authApi.login({
        contactNo: phone,
        otp: otpString,
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

  // ── Resend OTP (re-uses send logic) ─────────────────────────────────────
  const handleResend = async () => {
    if (resendTimer > 0) return;
    try {
      const res = await authApi.sendOtp({
        contactNo: phone,
        fromApp: 'astrologer',
        type: 'login',
        countryCode: '91',
      });
      if (res.data?.status === 200) {
        if (res.data?.otp) setDevOtp(String(res.data.otp));
        setResendTimer(60);
        Toast.show({ type: 'success', text1: '✅ OTP Resent', text2: 'A new OTP has been sent' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: res.data?.message || 'Failed to resend OTP' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to resend OTP' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── App bar ── */}
      <View style={[styles.appbar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.appbarTitle}>Verify Phone</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sentText}>
          OTP Sent to <Text style={styles.sentNumber}>+91-{phone}</Text>
        </Text>

        {/* Dev OTP hint */}
        {devOtp ? (
          <View style={styles.devOtpBox}>
            <Text style={styles.devOtpLabel}>✨ Test OTP</Text>
            <Text style={styles.devOtpValue}>{devOtp}</Text>
          </View>
        ) : null}

        {/* 6-box OTP */}
        <View style={styles.otpRow}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
              value={digit}
              onChangeText={(text) => handleOtpChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleVerifyOtp}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.submitText}>SUBMIT</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        {resendTimer > 0 ? (
          <Text style={styles.resendTimer}>Resend OTP Available in {resendTimer} s</Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>
        )}

        {/* Change number */}
        <TouchableOpacity style={styles.changeBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <MaterialIcons name="edit" size={16} color={colors.goldDark} />
          <Text style={styles.changeText}>Change mobile number</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default OtpScreen;

const styles = StyleSheet.create({
  appbar: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingBottom: 18,
    backgroundColor: colors.gold,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  appbarTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },

  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 36, alignItems: 'center' },

  sentText: { color: colors.success, fontSize: 13, textAlign: 'center', marginTop: 8 },
  sentNumber: { fontWeight: '700' },

  devOtpBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.success,
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 20,
  },
  devOtpLabel: { color: colors.success, fontSize: 13, fontWeight: '600' },
  devOtpValue: { color: colors.success, fontSize: 18, fontWeight: '800', letterSpacing: 3 },

  otpRow: { flexDirection: 'row', gap: 8, marginTop: 30, marginBottom: 6 },
  otpBox: {
    width: 42, height: 50, borderRadius: 8,
    borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.white,
    color: colors.text, fontSize: 20, fontWeight: '700',
  },
  otpBoxFilled: {
    borderColor: colors.gold, backgroundColor: colors.goldBg,
  },

  submitBtn: {
    width: '100%', backgroundColor: colors.gold, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 28,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  submitText: { color: colors.text, fontSize: 16, fontWeight: '800', letterSpacing: 1 },

  resendTimer: { color: colors.textSecondary, fontSize: 12, fontWeight: '500', marginTop: 18 },
  resendLink: { color: colors.goldDark, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline', marginTop: 18 },

  changeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', marginTop: 24,
    paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 22, borderWidth: 1, borderColor: colors.borderGold,
    backgroundColor: colors.goldBg,
  },
  changeText: { color: colors.goldDark, fontSize: 13, fontWeight: '700' },
});
