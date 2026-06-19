import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { authApi } from '../api/services';
import { loginSuccess } from '../store/slices/authSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/ScreenHeader';
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
  const [otp,       setOtp]       = useState('');
  const [devOtp,    setDevOtp]    = useState('');
  const [otpSent,   setOtpSent]   = useState(false);
  const [verified,  setVerified]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      update('birthDate', `${yyyy}-${mm}-${dd}`);
    }
  };

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSendOtp = async () => {
    if (!form.contactNo || form.contactNo.length < 10) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Enter valid 10-digit mobile number' }); return;
    }
    setLoading(true);
    try {
      const res = await authApi.sendOtp({
        contactNo: form.contactNo, fromApp: 'astrologer', type: 'register', countryCode: '91',
      });
      if (res.data?.status === 200) {
        if (res.data?.otp) setDevOtp(String(res.data.otp));
        setOtpSent(true);
        Toast.show({ type: 'success', text1: '✅ OTP Sent', text2: 'Enter OTP to verify your number' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: res.data?.message || 'Failed to send OTP' });
      }
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to send OTP' });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length < 4) { Toast.show({ type: 'error', text1: 'Error', text2: 'Enter the OTP' }); return; }
    setLoading(true);
    try {
      let pushToken = '';
      try {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        if (projectId && !projectId.includes("1234") && !projectId.includes("0000")) {
          pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        }
      } catch (e) { console.log('Push token fetch failed in Register'); }

      const payload = {
        ...form,
        otp,
        fcmToken: pushToken,
        deviceToken: pushToken,
        expoPushToken: pushToken,
      };
      const res = await authApi.register(payload);
      const d = res.data;
      if (d?.status === 200 || d?.status === 201) {
        // existing user — just log in
        await AsyncStorage.setItem('astrologerToken', d.token);
        const astrologer = d.recordList?.[0] || d.recordList || {};
        dispatch(loginSuccess({ token: d.token, astrologer }));
      } else {
        // new user — OTP verified, proceed to registration
        setForm(prev => ({ ...prev, whatsappNo: prev.contactNo }));
        setVerified(true);
      }
    } catch (err) {
      const status = err.response?.data?.status;
      if (status === 404 || status === 400) {
        setForm(prev => ({ ...prev, whatsappNo: prev.contactNo }));
        setVerified(true); // new user
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'OTP verification failed' });
      }
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!form.name.trim()) { Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter your full name' }); return; }
    if (!form.gender)      { Toast.show({ type: 'error', text1: 'Error', text2: 'Please select gender' }); return; }
    if (!form.termsAccepted) { Toast.show({ type: 'error', text1: 'Error', text2: 'Please accept the Terms and Conditions' }); return; }
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        contactNo: form.contactNo,
        countryCode: form.countryCode,
        whatsappNo: form.whatsappNo,
        gender: form.gender,
        birthDate: form.birthDate,
        currentCity: form.currentCity,
        country: form.country,
        billingAddress: form.billingAddress,
        termsAccepted: form.termsAccepted,
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

  const renderStep = () => {
    if (!otpSent) {
      return (
        <>
          <Text style={styles.stepTitle}>Enter Mobile Number</Text>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              value={form.contactNo}
              onChangeText={v => update('contactNo', v)}
              placeholder="10-digit number"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleSendOtp} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.btnText}>Send OTP</Text>}
          </TouchableOpacity>
        </>
      );
    }

    if (!verified) {
      return (
        <>
          <Text style={styles.stepTitle}>Verify OTP</Text>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>OTP sent to +91{form.contactNo}</Text>
            <TextInput
              style={styles.input}
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
            />
            {devOtp ? <Text style={styles.devOtp}>OTP (dev): {devOtp}</Text> : null}
          </View>
          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleVerifyOtp} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.btnText}>Verify OTP</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }}>
            <Text style={styles.link}>← Edit number</Text>
          </TouchableOpacity>
        </>
      );
    }

    // Registration form
    return (
      <>
        <Text style={styles.stepTitle}>Complete Your Profile</Text>

        {[
          { key: 'name', label: 'Full Name *', placeholder: 'Your name' },
          { key: 'email', label: 'Email', placeholder: 'your@email.com', keyboard: 'email-address' },
          { key: 'whatsappNo', label: 'WhatsApp Number', placeholder: 'WhatsApp number', keyboard: 'phone-pad' },
          { key: 'birthDate', label: 'Date of Birth', placeholder: 'Select birth date (YYYY-MM-DD)' },
          { key: 'currentCity', label: 'Current City', placeholder: 'Your current city' },
          { key: 'country', label: 'Country', placeholder: 'Your country' },
          { key: 'billingAddress', label: 'Billing Address', placeholder: 'Your full billing address', multiline: true },
        ].map(f => (
          <View style={styles.fieldWrap} key={f.key}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { marginBottom: 0 }]}>{f.label}</Text>
              {f.key === 'whatsappNo' && (
                <TouchableOpacity onPress={() => update('whatsappNo', form.contactNo)}>
                  <Text style={styles.sameAsPhoneText}>Same as contact</Text>
                </TouchableOpacity>
              )}
            </View>
            {f.key === 'birthDate' ? (
              <TouchableOpacity
                style={[styles.input, { justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: form.birthDate ? colors.text : colors.textMuted, fontSize: 15 }}>
                  {form.birthDate || f.placeholder}
                </Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                style={[styles.input, f.multiline && { minHeight: 80, textAlignVertical: 'top' }]}
                value={form[f.key]}
                onChangeText={v => update(f.key, v)}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textMuted}
                keyboardType={f.keyboard || 'default'}
                multiline={f.multiline}
                numberOfLines={f.multiline ? 3 : 1}
              />
            )}
          </View>
        ))}

        {showDatePicker && (
          <DateTimePicker
            value={form.birthDate ? new Date(form.birthDate) : new Date(1990, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.radioRow}>
            {['Male', 'Female', 'Other'].map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.radioBtn, form.gender === g && styles.radioBtnActive]}
                onPress={() => update('gender', g)}
              >
                <Text style={[styles.radioText, form.gender === g && styles.radioTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => update('termsAccepted', !form.termsAccepted)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={form.termsAccepted ? 'checkbox' : 'square-outline'}
            size={24}
            color={form.termsAccepted ? colors.goldDark : colors.textMuted}
          />
          <Text style={styles.checkboxLabel}>I accept the Terms and Conditions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.btnText}>Complete Registration</Text>}
        </TouchableOpacity>
      </>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.primary }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Register as Astrologer" onBack={() => navigation.navigate('Login')} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>{renderStep()}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  card: {
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
  stepTitle: { color: colors.goldDark, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  fieldWrap: { marginBottom: 14 },
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
  devOtp: { color: colors.goldDark, fontSize: 12, marginTop: 6 },
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
  btnText: { color: colors.text, fontSize: 16, fontWeight: '800' },
  link: { color: colors.goldDark, textAlign: 'center', marginTop: 14, fontSize: 13, fontWeight: '600' },
  radioRow: { flexDirection: 'row', gap: 10 },
  radioBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  radioBtnActive: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  radioText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  radioTextActive: { color: colors.goldDark },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sameAsPhoneText: {
    color: colors.goldDark,
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    gap: 8,
  },
  checkboxLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
