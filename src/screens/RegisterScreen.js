import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { authApi } from '../api/services';
import { loginSuccess } from '../store/slices/authSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets   = useSafeAreaInsets();

  const [form, setForm] = useState({
    name: '',
    email: '',
    contactNo: '',
    countryCode: '+91',
    whatsappNo: '',
    gender: '',
    birthDate: '',
    currentCity: '',
    country: 'India',
    billingAddress: '',
    termsAccepted: false,
  });
  const [otp,     setOtp]     = useState('');
  const [devOtp,  setDevOtp]  = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUri,    setImageUri]    = useState(null);
  const [imageBase64, setImageBase64] = useState('');

  // The rest of the form unlocks only after an OTP has been sent AND entered.
  const unlocked = otpSent && otp.trim().length >= 4;

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      update('birthDate', `${yyyy}-${mm}-${dd}`);
    }
  };

  // ── Pick astrologer photo ─────────────────────────────────────────────────
  const pickImage = async () => {
    if (!unlocked) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Toast.show({ type: 'error', text1: 'Permission needed', text2: 'Allow photo access to upload your image' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      setImageBase64(asset.base64 || '');
    }
  };

  // ── Send OTP (delivers the code only; does not register) ──────────────────
  const handleSendOtp = async () => {
    if (!form.contactNo || form.contactNo.length < 10) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Enter valid 10-digit mobile number' }); return;
    }
    setSendingOtp(true);
    try {
      const res = await authApi.sendOtp({
        contactNo: form.contactNo, fromApp: 'astrologer', type: 'register', countryCode: '91',
      });
      if (res.data?.status === 200) {
        if (res.data?.otp) setDevOtp(String(res.data.otp));
        setOtpSent(true);
        Toast.show({ type: 'success', text1: '✅ OTP Sent', text2: 'Enter the OTP to unlock the form' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: res.data?.message || 'Failed to send OTP' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to send OTP' });
    }
    setSendingOtp(false);
  };

  // ── Final submit — registers with all fields + OTP in one call ────────────
  const handleRegister = async () => {
    if (!form.name.trim())                      { Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your full name' }); return; }
    if (!form.contactNo || form.contactNo.length < 10) { Toast.show({ type: 'error', text1: 'Error', text2: 'Enter valid 10-digit mobile number' }); return; }
    if (!otpSent)                               { Toast.show({ type: 'error', text1: 'Error', text2: 'Please tap "Send OTP" to verify your number' }); return; }
    if (!otp.trim() || otp.length < 4)          { Toast.show({ type: 'error', text1: 'Error', text2: 'Enter the OTP sent to your number' }); return; }
    if (!form.gender)                           { Toast.show({ type: 'error', text1: 'Error', text2: 'Please select gender' }); return; }
    if (!form.termsAccepted)                    { Toast.show({ type: 'error', text1: 'Error', text2: 'Please accept the Terms and Conditions' }); return; }

    setLoading(true);
    try {
      let pushToken = '';
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (projectId && !projectId.includes('1234') && !projectId.includes('0000')) {
          pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }
      } catch (e) { console.log('Push token fetch failed in Register'); }

      const payload = {
        name: form.name,
        email: form.email,
        contactNo: form.contactNo,
        countryCode: form.countryCode,
        whatsappNo: form.whatsappNo || form.contactNo,
        gender: form.gender,
        // birthDate is a DATE column — send null (not '') when empty
        birthDate: form.birthDate || null,
        currentCity: form.currentCity,
        country: form.country,
        billingAddress: form.billingAddress,
        termsAccepted: form.termsAccepted,
        // Backend does Buffer.from(profileImage, 'base64') → send RAW base64 (no data: prefix)
        profileImage: imageBase64 || '',
        otp,
        fcmToken: pushToken,
        deviceToken: pushToken,
        expoPushToken: pushToken,
      };
      const res = await authApi.register(payload);
      const d = res.data;
      if (d?.status === 200 || d?.status === 201) {
        if (d?.token) {
          await AsyncStorage.setItem('astrologerToken', d.token);
          const astrologer = d.recordList?.[0] || d.recordList || payload;
          dispatch(loginSuccess({ token: d.token, astrologer }));
        } else {
          Toast.show({ type: 'success', text1: 'Success', text2: 'Registration submitted! Awaiting approval. Please login.' });
          navigation.navigate('Login');
        }
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: d?.message || 'Registration failed' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Registration failed' });
    }
    setLoading(false);
  };

  // Labeled text input (called inline so it keeps focus between renders)
  const textInput = (fkey, placeholder, { keyboard, multiline, maxLength } = {}) => (
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline, !unlocked && styles.inputDisabled]}
      value={form[fkey]}
      onChangeText={v => update(fkey, v)}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboard || 'default'}
      multiline={!!multiline}
      numberOfLines={multiline ? 3 : 1}
      editable={unlocked}
      maxLength={maxLength}
    />
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.primary }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Gold header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register as Astrologer</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Photo upload ── */}
        <View style={styles.avatarWrap}>
          <TouchableOpacity
            style={[styles.avatar, !unlocked && styles.avatarLocked]}
            onPress={pickImage}
            disabled={!unlocked}
            activeOpacity={0.85}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <MaterialIcons name="person" size={50} color={colors.textMuted} />
            )}
            <View style={styles.avatarBadge}>
              <MaterialIcons name="photo-camera" size={16} color={colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>
            {unlocked ? 'Tap to upload your photo' : 'Verify OTP to upload your photo'}
          </Text>
        </View>

        {/* ── Mobile + OTP row ── */}
        <View style={styles.gridRow}>
          {/* Mobile */}
          <View style={styles.gridCell}>
            <Text style={styles.label}>Mobile Number *</Text>
            <View style={styles.phoneField}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.cc}>+91</Text>
              <View style={styles.sep} />
              <TextInput
                style={styles.phoneInput}
                value={form.contactNo}
                onChangeText={v => {
                  update('contactNo', v.replace(/[^0-9]/g, ''));
                  if (otpSent) { setOtpSent(false); setOtp(''); setDevOtp(''); }
                }}
                placeholder="Number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* OTP */}
          <View style={styles.gridCell}>
            <Text style={styles.label}>OTP *</Text>
            {!otpSent ? (
              <TouchableOpacity
                style={[styles.sendOtpBtn, (form.contactNo.length < 10 || sendingOtp) && styles.sendOtpBtnDisabled]}
                onPress={handleSendOtp}
                disabled={form.contactNo.length < 10 || sendingOtp}
                activeOpacity={0.85}
              >
                {sendingOtp
                  ? <ActivityIndicator size="small" color={colors.text} />
                  : <Text style={styles.sendOtpBtnText}>Send OTP</Text>}
              </TouchableOpacity>
            ) : (
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={v => setOtp(v.replace(/[^0-9]/g, ''))}
                placeholder="Enter OTP"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            )}
          </View>
        </View>

        {/* Resend / dev OTP hint */}
        {otpSent && (
          <View style={styles.otpHintRow}>
            {devOtp ? <Text style={styles.devOtp}>OTP (dev): {devOtp}</Text> : <View />}
            <TouchableOpacity onPress={handleSendOtp} disabled={sendingOtp}>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Name + Email row ── */}
        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <Text style={styles.label}>Full Name *</Text>
            {textInput('name', 'Your name')}
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.label}>Email</Text>
            {textInput('email', 'your@email.com', { keyboard: 'email-address' })}
          </View>
        </View>

        {/* ── WhatsApp + DOB row ── */}
        <View style={styles.gridRow}>
          <View style={styles.gridCell}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>WhatsApp Number</Text>
              <TouchableOpacity onPress={() => unlocked && update('whatsappNo', form.contactNo)} disabled={!unlocked}>
                <Text style={[styles.sameAsPhoneText, !unlocked && { opacity: 0.4 }]}>Same</Text>
              </TouchableOpacity>
            </View>
            {textInput('whatsappNo', 'WhatsApp number', { keyboard: 'phone-pad', maxLength: 10 })}
          </View>
          <View style={styles.gridCell}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput, !unlocked && styles.inputDisabled]}
              onPress={() => unlocked && setShowDatePicker(true)}
              disabled={!unlocked}
            >
              <Text style={{ color: form.birthDate ? colors.text : colors.textMuted, fontSize: 14 }} numberOfLines={1}>
                {form.birthDate || 'YYYY-MM-DD'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={form.birthDate ? new Date(form.birthDate) : new Date(1990, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* ── Full-width fields ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Current City</Text>
          {textInput('currentCity', 'Your current city')}
        </View>
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Country</Text>
          {textInput('country', 'Your country')}
        </View>
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Billing Address</Text>
          {textInput('billingAddress', 'Your full billing address', { multiline: true })}
        </View>

        {/* Gender */}
        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Gender *</Text>
          <View style={[styles.radioRow, !unlocked && { opacity: 0.5 }]}>
            {['Male', 'Female', 'Other'].map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.radioBtn, form.gender === g && styles.radioBtnActive]}
                onPress={() => unlocked && update('gender', g)}
                disabled={!unlocked}
              >
                <Text style={[styles.radioText, form.gender === g && styles.radioTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Terms */}
        <TouchableOpacity
          style={[styles.checkboxRow, !unlocked && { opacity: 0.5 }]}
          onPress={() => unlocked && update('termsAccepted', !form.termsAccepted)}
          disabled={!unlocked}
          activeOpacity={0.8}
        >
          <Ionicons
            name={form.termsAccepted ? 'checkbox' : 'square-outline'}
            size={24}
            color={form.termsAccepted ? colors.goldDark : colors.textMuted}
          />
          <Text style={styles.checkboxLabel}>I accept the Terms and Conditions</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.btn, (loading || !unlocked) && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading || !unlocked}
          activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color={colors.text} /> : <Text style={styles.btnText}>Register</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 18 },

  // Gold header
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingBottom: 18,
    backgroundColor: colors.gold,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 5,
  },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },

  // Avatar
  avatarWrap: { alignItems: 'center', marginBottom: 22 },
  avatar: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: colors.secondary,
    borderWidth: 2, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarLocked: { opacity: 0.55 },
  avatarImg: { width: '100%', height: '100%' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.primary,
  },
  avatarHint: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8 },

  // Grid
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  gridCell: { flex: 1 },
  fieldWrap: { marginBottom: 16 },

  // Labels — black & bold
  label: { color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 6 },

  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 50,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputDisabled: { backgroundColor: colors.secondary, color: colors.textMuted, borderColor: colors.border },
  otpInput: { fontWeight: '700', letterSpacing: 2 },
  dateInput: { justifyContent: 'center' },

  // Premium phone field
  phoneField: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.goldGlow,
    borderWidth: 1.5, borderColor: colors.borderGold,
    borderRadius: 12, paddingHorizontal: 10, minHeight: 50,
  },
  flag: { fontSize: 17 },
  cc: { color: colors.text, fontSize: 15, fontWeight: '800' },
  sep: { width: 1, height: 22, backgroundColor: colors.borderStrong },
  phoneInput: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700', paddingVertical: 12 },

  // Send OTP button (in OTP cell)
  sendOtpBtn: {
    backgroundColor: colors.gold,
    borderRadius: 12, minHeight: 50,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 5, elevation: 3,
  },
  sendOtpBtnDisabled: { backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  sendOtpBtnText: { color: colors.text, fontSize: 14, fontWeight: '800' },

  otpHintRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: -6, marginBottom: 16,
  },
  devOtp: { color: colors.goldDark, fontSize: 12, fontWeight: '600' },
  resendLink: { color: colors.goldDark, fontSize: 12, fontWeight: '800', textDecorationLine: 'underline' },

  // Submit
  btn: {
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.text, fontSize: 16, fontWeight: '800' },

  // Gender
  radioRow: { flexDirection: 'row', gap: 10 },
  radioBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.borderStrong,
    backgroundColor: colors.white, alignItems: 'center',
  },
  radioBtnActive: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  radioText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  radioTextActive: { color: colors.goldDark },

  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sameAsPhoneText: { color: colors.goldDark, fontSize: 11, fontWeight: '800' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 22, gap: 8 },
  checkboxLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
});
