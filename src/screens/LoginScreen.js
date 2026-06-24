import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { authApi } from '../api/services';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Send OTP → navigate to dedicated Otp screen (logic unchanged) ──────────
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
        const devOtp = res.data?.otp ? String(res.data.otp) : '';
        Toast.show({ type: 'success', text1: '✅ OTP Sent', text2: 'OTP sent to your registered number' });
        navigation.navigate('Otp', { phone, devOtp });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: res.data?.message || 'Failed to send OTP' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to send OTP' });
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.primary }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Curved gold header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 26 }]}>
          <View style={styles.logoCircle}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.brand}>ASTROVELL</Text>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>
          <Text style={styles.title}>Login to Astrologer</Text>

          {/* Phone field */}
          <View style={styles.phoneField}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.cc}>+91</Text>
            <View style={styles.sep} />
            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor={colors.textMuted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          {/* Send OTP */}
          <TouchableOpacity
            style={[styles.sendBtn, loading && styles.btnDisabled]}
            onPress={handleSendOtp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Text style={styles.sendBtnText}>SEND OTP</Text>
                <MaterialIcons name="arrow-forward" size={17} color={colors.text} />
              </>
            )}
          </TouchableOpacity>

          {/* Continue with Gmail (decorative — no action) */}
          <View style={styles.gmailBtn}>
            <MaterialIcons name="email" size={20} color="#EA4335" />
            <Text style={styles.gmailText}>Continue with Gmail</Text>
          </View>

          {/* Terms */}
          <Text style={styles.terms}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of use</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>

          {/* First Chat Free banner → Register */}
          <TouchableOpacity
            style={styles.freeBanner}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.freeBannerText}>Register</Text>
          </TouchableOpacity>

          {/* Flexible spacer pushes the trust badges down to the bottom */}
          <View style={styles.spacer} />

          {/* Trust badges (sit at the bottom, just above the nav bar) */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <View style={styles.trustIcon}>
                <MaterialIcons name="lock" size={40} color={colors.goldDark} />
              </View>
              <Text style={styles.trustText}>Private &{'\n'}Confidential</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={styles.trustIcon}>
                <MaterialIcons name="verified" size={40} color={colors.success} />
              </View>
              <Text style={styles.trustText}>Verified{'\n'}Astrologer</Text>
            </View>
            <View style={styles.trustItem}>
              <View style={styles.trustIcon}>
                <MaterialIcons name="payment" size={40} color={colors.info} />
              </View>
              <Text style={styles.trustText}>Secure{'\n'}Payments</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  scroll: { flexGrow: 1},

  // Header
  header: {
    backgroundColor: colors.gold,
    alignItems: 'center',
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  logoCircle: {
    width: 152, height: 152, borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  logo: { width: 151, height: 151 },
  brand: { color: colors.text, fontSize: 27, fontWeight: '900', letterSpacing: 2, marginTop: 14 },
  brandSub: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 3, opacity: 0.8 },

  // Body
  body: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 20 },
  title: { textAlign: 'center', color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 22 },
  spacer: { flex: 1 },

  // Phone field
  phoneField: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4, gap: 8,
    backgroundColor: colors.white,
  },
  flag: { fontSize: 18 },
  cc: { color: colors.text, fontSize: 15, fontWeight: '700' },
  sep: { width: 1, height: 22, backgroundColor: colors.borderStrong, marginHorizontal: 2 },
  phoneInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 12, fontWeight: '600' },

  // Send OTP
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 15, marginTop: 20,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  btnDisabled: { opacity: 0.6 },
  sendBtnText: { color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },

  // Gmail (decorative)
  gmailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12,
    paddingVertical: 14, marginTop: 14, backgroundColor: colors.white,
  },
  gmailG: { fontSize: 16, fontWeight: '900', color: '#4285F4' },
  gmailText: { color: colors.text, fontSize: 19, fontWeight: '800' },

  // Terms
  terms: { color: colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 15 },
  termsLink: { color: colors.info, textDecorationLine: 'underline' },

  // First Chat Free banner
  freeBanner: {
    backgroundColor: colors.accent, borderRadius: 6,
    paddingVertical: 12, alignItems: 'center', marginTop: 18,
  },
  freeBannerText: { color: '#FFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  // Trust badges
  trustRow: { flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 26 },
  trustItem: { alignItems: 'center', flex: 1 },
  trustIcon: {
    width: 75, height: 75, borderRadius: 12, backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  trustText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 16 },

  // Register link
  registerLink: { marginTop: 22, alignItems: 'center' },
  registerText: { color: colors.textMuted, fontSize: 13 },
  registerHighlight: { color: colors.goldDark, fontWeight: '700' },
});
