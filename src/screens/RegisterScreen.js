import React, { useState, useEffect } from 'react';
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
import ScreenHeader from '../components/ScreenHeader';

const RegisterScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const insets   = useSafeAreaInsets();

  const [form, setForm] = useState({
    name: '', email: '', contactNo: '', gender: '', dob: '',
    experience: '', about: '', charge: '', language: '',
  });
  const [otp,       setOtp]       = useState('');
  const [devOtp,    setDevOtp]    = useState('');
  const [otpSent,   setOtpSent]   = useState(false);
  const [verified,  setVerified]  = useState(false);
  const [skills,    setSkills]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedCat,   setSelectedCat]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authApi.getMasterData()
      .then(res => {
        const d = res.data;
        setSkills(d?.skills || d?.recordList?.skills || []);
        setCategories(d?.categories || d?.recordList?.categories || []);
      })
      .catch(() => {});
  }, []);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSendOtp = async () => {
    if (!form.contactNo || form.contactNo.length < 10) {
      Alert.alert('Error', 'Enter valid 10-digit mobile number'); return;
    }
    setLoading(true);
    try {
      const res = await authApi.sendOtp({
        contactNo: form.contactNo, fromApp: 'astrologer', type: 'register', countryCode: '91',
      });
      if (res.data?.status === 200) {
        if (res.data?.otp) setDevOtp(String(res.data.otp));
        setOtpSent(true);
        Alert.alert('✅ OTP Sent', 'Enter OTP to verify your number');
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to send OTP');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { Alert.alert('Error', 'Enter OTP'); return; }
    setLoading(true);
    try {
      const res = await authApi.login({ contactNo: form.contactNo, otp, countryCode: '+91' });
      const d = res.data;
      if (d?.status === 200 && d?.token) {
        // existing user — just log in
        await AsyncStorage.setItem('astrologerToken', d.token);
        const astrologer = d.recordList?.[0] || d.recordList || {};
        dispatch(loginSuccess({ token: d.token, astrologer }));
      } else {
        // new user — OTP verified, proceed to registration
        setVerified(true);
      }
    } catch (err) {
      const status = err.response?.data?.status;
      if (status === 404 || status === 400) {
        setVerified(true); // new user
      } else {
        Alert.alert('Error', err.response?.data?.message || 'OTP verification failed');
      }
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!form.name.trim()) { Alert.alert('Error', 'Please enter your full name'); return; }
    if (!form.gender)      { Alert.alert('Error', 'Please select gender'); return; }
    setLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email, contactNo: form.contactNo,
        gender: form.gender, birthDate: form.dob,
        experience: form.experience, aboutMe: form.about, charge: form.charge,
        languageKnown: form.language,
        primarySkill: selectedSkill, astrologerCategoryId: selectedCat,
      };
      const res = await authApi.register(payload);
      const d = res.data;
      if (d?.status === 200 || d?.status === 201) {
        if (d?.token) {
          await AsyncStorage.setItem('astrologerToken', d.token);
          const astrologer = d.recordList?.[0] || d.recordList || payload;
          dispatch(loginSuccess({ token: d.token, astrologer }));
        } else {
          Alert.alert('Success', 'Registration submitted! Awaiting approval. Please login.');
          navigation.navigate('Login');
        }
      } else {
        Alert.alert('Error', d?.message || 'Registration failed');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Registration failed');
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
          { key: 'dob', label: 'Date of Birth', placeholder: 'YYYY-MM-DD' },
          { key: 'experience', label: 'Experience (years)', placeholder: '5', keyboard: 'number-pad' },
          { key: 'charge', label: 'Charge per minute (₹)', placeholder: '20', keyboard: 'number-pad' },
          { key: 'language', label: 'Languages Known', placeholder: 'Hindi, English' },
        ].map(f => (
          <View style={styles.fieldWrap} key={f.key}>
            <Text style={styles.label}>{f.label}</Text>
            <TextInput
              style={styles.input}
              value={form[f.key]}
              onChangeText={v => update(f.key, v)}
              placeholder={f.placeholder}
              placeholderTextColor={colors.textMuted}
              keyboardType={f.keyboard || 'default'}
            />
          </View>
        ))}

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

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>About Me</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={form.about}
            onChangeText={v => update('about', v)}
            placeholder="Tell customers about yourself..."
            placeholderTextColor={colors.textMuted}
            multiline
          />
        </View>

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
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepTitle: { color: colors.gold, fontSize: 18, fontWeight: '800', marginBottom: 20 },
  fieldWrap: { marginBottom: 14 },
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
  devOtp: { color: colors.secondary, fontSize: 12, marginTop: 6 },
  btn: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  link: { color: colors.secondary, textAlign: 'center', marginTop: 14, fontSize: 13, fontWeight: '600' },
  radioRow: { flexDirection: 'row', gap: 10 },
  radioBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  radioBtnActive: { borderColor: colors.secondary, backgroundColor: colors.secondary + '20' },
  radioText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  radioTextActive: { color: colors.secondary },
});
