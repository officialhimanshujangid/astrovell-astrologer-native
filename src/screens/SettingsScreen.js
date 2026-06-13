import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, BackHandler, Linking, Image, Modal } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import useTranslation from '../hooks/useTranslation';
import { profileApi, pageApi, authApi } from '../api/services';
import { SOCKET_BASE } from '../api/apiClient';

const maskAccountNumber = (num) => {
  if (!num) return '•••• •••• •••• ••••';
  const str = num.toString().trim();
  if (str.length <= 4) return str;
  return `•••• •••• •••• ${str.slice(-4)}`;
};

const getForm16aUrl = (filePath) => {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  let path = filePath;
  if (path.startsWith('/')) {
    path = path.substring(1);
  }
  return `${SOCKET_BASE}/${path}`;
};

const generateHtmlTemplate = (bodyContent) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #F7F7F7;
          color: #1A1A1A;
          padding: 16px;
          margin: 0;
          font-size: 15px;
          line-height: 1.6;
        }
        p {
          margin-bottom: 16px;
        }
        h1, h2, h3, h4, h5, h6 {
          color: #E6A800;
          font-weight: bold;
          margin-top: 24px;
          margin-bottom: 12px;
        }
        a {
          color: #E6A800;
          text-decoration: none;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
  </html>
`;

const getYoutubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const SettingsScreen = ({ onBack }) => {
  const { t, globalLang } = useTranslation();
  const { astrologer } = useSelector((s) => s.auth);
  const [activeSubScreen, setActiveSubScreen] = useState(null);

  const [profileDetails, setProfileDetails] = useState(null);
  const [phoneForm, setPhoneForm] = useState({ contactNo: '', whatsappNo: '' });
  const [newPhone, setNewPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [receivedOtp, setReceivedOtp] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    bankBranch: '',
    accountType: 'Saving',
    upi: '',
  });
  const [bankStatus, setBankStatus] = useState(null);
  const [bankFetchLoading, setBankFetchLoading] = useState(false);
  const [bankSaveLoading, setBankSaveLoading] = useState(false);

  // Form 16A State
  const [form16aList, setForm16aList] = useState([]);
  const [form16aLoading, setForm16aLoading] = useState(false);

  // Terms State
  const [termsContent, setTermsContent] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);

  // Training Video State
  const [videoList, setVideoList] = useState([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);

  // Load Phone Data
  const loadPhoneData = async () => {
    setFetchLoading(true);
    try {
      const res = await profileApi.get({ astrologerId: astrologer?.id });
      const d = res.data;
      const a = d?.recordList?.[0] || d?.data || d?.recordList || {};
      setProfileDetails(a);
      setPhoneForm({
        contactNo: a.contactNo || '',
        whatsappNo: a.whatsappNo || '',
      });
    } catch (err) {
      Alert.alert(t('error'), 'Failed to load contact information.');
    } finally {
      setFetchLoading(false);
    }
  };

  // Load Bank Data
  const loadBankData = async () => {
    setBankFetchLoading(true);
    try {
      const res = await profileApi.getBankStatus({ astrologerId: astrologer?.id });
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        setBankStatus(d);
        const current = d.current || {};
        setBankForm({
          accountHolderName: current.accountHolderName || '',
          accountNumber: current.accountNumber || '',
          ifscCode: current.ifscCode || '',
          bankName: current.bankName || '',
          bankBranch: current.bankBranch || '',
          accountType: current.accountType || 'Saving',
          upi: current.upi || '',
        });
      }
    } catch (err) {
      Alert.alert(t('error'), 'Failed to load bank details.');
    } finally {
      setBankFetchLoading(false);
    }
  };

  // Load Form 16A Data
  const loadForm16aData = async () => {
    setForm16aLoading(true);
    try {
      const res = await profileApi.getForm16a({ astrologerId: astrologer?.id });
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        setForm16aList(d.recordList || []);
      }
    } catch (err) {
      Alert.alert(t('error'), 'Failed to load Form 16A documents.');
    } finally {
      setForm16aLoading(false);
    }
  };

  const handleDownloadForm16a = async (filePath) => {
    const url = getForm16aUrl(filePath);
    if (!url) {
      Alert.alert(t('error'), 'Document link is invalid.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t('error'), 'Cannot open download URL: ' + url);
      }
    } catch (err) {
      Alert.alert(t('error'), 'An error occurred while opening the URL.');
    }
  };

  // Load Terms & Conditions
  const loadTermsContent = async () => {
    setTermsLoading(true);
    try {
      const res = await pageApi.getPage('refund-policy');
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        const record = d.recordList?.[0] || d.data?.[0] || d.data || {};
        setTermsContent(record);
      }
    } catch (err) {
      Alert.alert(t('error'), 'Failed to load terms and conditions.');
    } finally {
      setTermsLoading(false);
    }
  };

  // Load Training Videos
  const loadVideoData = async () => {
    setVideoLoading(true);
    try {
      const res = await profileApi.getTrainingVideos({ type: 'astrologer' });
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        setVideoList(d.recordList || []);
      }
    } catch (err) {
      Alert.alert(t('error'), 'Failed to load training videos.');
    } finally {
      setVideoLoading(false);
    }
  };

  const handlePlayVideo = async (video) => {
    if (!video || !video.video_link) return;
    const yId = getYoutubeId(video.video_link);
    if (yId) {
      setActiveVideo(video);
    } else {
      try {
        const supported = await Linking.canOpenURL(video.video_link);
        if (supported) {
          await Linking.openURL(video.video_link);
        } else {
          Alert.alert(t('error'), 'Cannot open video URL: ' + video.video_link);
        }
      } catch (err) {
        Alert.alert(t('error'), 'An error occurred while opening the video link.');
      }
    }
  };

  useEffect(() => {
    if (activeSubScreen === 'phone') {
      loadPhoneData();
    } else if (activeSubScreen === 'bank') {
      loadBankData();
    } else if (activeSubScreen === 'form16a') {
      loadForm16aData();
    } else if (activeSubScreen === 'terms') {
      loadTermsContent();
    } else if (activeSubScreen === 'training') {
      loadVideoData();
    }
  }, [activeSubScreen]);

  useEffect(() => {
    if (!activeSubScreen) return;

    const handleHardwareBack = () => {
      setActiveSubScreen(null);
      return true; // prevent default (global back handler)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [activeSubScreen]);

  const handleSendOtp = async () => {
    if (!newPhone.trim()) {
      Alert.alert(t('error'), 'Please enter a valid phone number.');
      return;
    }
    setOtpLoading(true);
    try {
      const payload = {
        contactNo: newPhone.trim(),
        fromApp: 'astrologer',
        type: 'register',
        countryCode: '91',
      };
      const res = await authApi.sendOtp(payload);
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        setReceivedOtp(d.otp);
        setOtpSent(true);
        Alert.alert(
          `📩 ${t('success')}`,
          `${d.message || 'OTP sent successfully.'}\n(For testing: OTP is ${d.otp})`
        );
      } else {
        Alert.alert(t('error'), d?.message || 'Failed to send OTP.');
      }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndUpdatePhone = async () => {
    if (!otpInput.trim()) {
      Alert.alert(t('error'), 'Please enter the OTP.');
      return;
    }
    if (otpInput.trim() !== String(receivedOtp)) {
      Alert.alert(t('error'), 'Incorrect OTP. Please check and try again.');
      return;
    }
    setSaveLoading(true);
    try {
      const payload = {
        astrologerId: astrologer?.id,
        contactNo: newPhone.trim(),
      };
      const res = await profileApi.changeContactNo(payload);
      const d = res.data;
      if (d?.status === 200 || res.status === 200) {
        Alert.alert(`✅ ${t('success')}`, d.message || 'Mobile number updated successfully.');
        // Refetch profile details and clear state
        await loadPhoneData();
        setNewPhone('');
        setOtpInput('');
        setReceivedOtp(null);
        setOtpSent(false);
        setActiveSubScreen(null);
      } else {
        Alert.alert(t('error'), d?.message || 'Failed to update phone number.');
      }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to update phone number.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateBank = async () => {
    if (!bankForm.accountNumber.trim() || !bankForm.ifscCode.trim() || !bankForm.bankName.trim()) {
      Alert.alert(t('error'), 'Account Number, IFSC Code and Bank Name are required.');
      return;
    }
    setBankSaveLoading(true);
    try {
      const payload = {
        astrologerId: astrologer?.id,
        accountHolderName: bankForm.accountHolderName,
        accountNumber: bankForm.accountNumber,
        ifscCode: bankForm.ifscCode,
        bankName: bankForm.bankName,
        bankBranch: bankForm.bankBranch,
        accountType: bankForm.accountType,
        upi: bankForm.upi,
      };
      const res = await profileApi.requestBankUpdate(payload);
      if (res.data?.status === 200 || res.status === 200) {
        Alert.alert(
          `✅ ${t('success')}`, 
          res.data?.message || 'Bank update request submitted. Awaiting admin approval.'
        );
        setActiveSubScreen(null);
      } else {
        Alert.alert(t('error'), res.data?.message || 'Failed to submit request.');
      }
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to submit bank update request.');
    } finally {
      setBankSaveLoading(false);
    }
  };

  const SETTING_ITEMS = [
    {
      key: 'phone',
      title: t('update_phone'),
      emoji: '📱',
      desc: globalLang === 'hi' ? 'अपने संपर्क विवरण और व्हाट्सएप नंबर अपडेट करें।' : 'Update your contact details and WhatsApp numbers.',
      color: colors.iconPink
    },
    {
      key: 'training',
      title: t('training_video'),
      emoji: '🎥',
      desc: globalLang === 'hi' ? 'Astrovell के साथ शुरू करने के लिए प्रशिक्षण वीडियो देखें।' : 'Watch training videos to get started with Astrovell.',
      color: colors.iconBlue
    },
    {
      key: 'terms',
      title: t('terms_conditions'),
      emoji: '📜',
      desc: globalLang === 'hi' ? 'पार्टनर समझौते के नियम और शर्तें पढ़ें।' : 'Read the partner agreement terms and conditions.',
      color: colors.iconYellow
    },
    {
      key: 'bank',
      title: t('bank_details'),
      emoji: '🏦',
      desc: globalLang === 'hi' ? 'अपनी भुगतान बैंक खाता जानकारी देखें और अपडेट करें।' : 'View and update your payout bank account information.',
      color: colors.iconPurple
    },
    {
      key: 'form16a',
      title: t('download_form16a'),
      emoji: '📄',
      desc: globalLang === 'hi' ? 'अपना त्रैमासिक टीडीएस प्रमाणपत्र / फॉर्म 16A डाउनलोड करें।' : 'Download your quarterly TDS certificate / Form 16A.',
      color: colors.iconTeal
    },
    {
      key: 'gallery',
      title: t('gallery'),
      emoji: '🖼️',
      desc: globalLang === 'hi' ? 'अपनी प्रोफ़ाइल गैलरी छवियों को प्रबंधित करें।' : 'Manage your profile gallery images.',
      color: colors.iconOrange
    },
    {
      key: 'billing',
      title: t('update_billing'),
      emoji: '📍',
      desc: globalLang === 'hi' ? 'अपने व्यावसायिक बिलिंग और जीएसटी पते को अपडेट करें।' : 'Update your business billing and GST address.',
      color: colors.iconPink
    },
  ];

  if (activeSubScreen) {
    if (activeSubScreen === 'phone') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('update_phone')} onBack={() => setActiveSubScreen(null)} />
          {fetchLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.formContainer}>
                
                {/* Current Mobile Number (Read-only) */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    {globalLang === 'hi' ? 'वर्तमान मोबाइल नंबर' : 'Current Mobile Number'}
                  </Text>
                  <View style={[styles.input, { backgroundColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                    <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
                      {profileDetails?.contactNo || 'Not Configured'}
                    </Text>
                    <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                  </View>
                </View>

                {/* New Mobile Number Input */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>
                    {globalLang === 'hi' ? 'नया मोबाइल नंबर' : 'New Mobile Number'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={newPhone}
                    onChangeText={setNewPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.textLight}
                    placeholder={globalLang === 'hi' ? 'नया मोबाइल नंबर दर्ज करें' : 'Enter New Mobile Number'}
                    editable={!otpSent}
                  />
                </View>

                {/* OTP Input and Action */}
                {!otpSent ? (
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.goldDark }, otpLoading && { opacity: 0.6 }]}
                    onPress={handleSendOtp}
                    disabled={otpLoading}
                  >
                    {otpLoading ? (
                      <ActivityIndicator color={colors.white} />
                    ) : (
                      <Text style={[styles.saveBtnText, { color: colors.white }]}>
                        {globalLang === 'hi' ? 'ओटीपी भेजें' : 'Send OTP'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View>
                    <View style={styles.field}>
                      <Text style={styles.fieldLabel}>
                        {globalLang === 'hi' ? 'ओटीपी दर्ज करें' : 'Enter OTP'}
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={otpInput}
                        onChangeText={setOtpInput}
                        keyboardType="number-pad"
                        placeholderTextColor={colors.textLight}
                        placeholder={globalLang === 'hi' ? '६-अंकीय ओटीपी दर्ज करें' : 'Enter 6-digit OTP'}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: colors.goldDark }, saveLoading && { opacity: 0.6 }]}
                      onPress={handleVerifyAndUpdatePhone}
                      disabled={saveLoading}
                    >
                      {saveLoading ? (
                        <ActivityIndicator color={colors.white} />
                      ) : (
                        <Text style={[styles.saveBtnText, { color: colors.white }]}>
                          {globalLang === 'hi' ? 'सत्यापित करें और अपडेट करें' : 'Verify & Update'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendBtn}
                      onPress={handleSendOtp}
                      disabled={otpLoading}
                    >
                      {otpLoading ? (
                        <ActivityIndicator size="small" color={colors.goldDark} />
                      ) : (
                        <Text style={styles.resendText}>
                          {globalLang === 'hi' ? 'ओटीपी पुनः भेजें' : 'Resend OTP'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

              </View>
            </ScrollView>
          )}
        </View>
      );
    }

    if (activeSubScreen === 'bank') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('bank_details')} onBack={() => setActiveSubScreen(null)} />
          {bankFetchLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.sectionHeader}>{t('current_bank_details')}</Text>
              
              <LinearGradient
                colors={['#1e293b', '#0f172a']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.bankCard}
              >
                <View style={styles.bankCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankCardLabel}>{t('bank_name')}</Text>
                    <Text style={styles.bankCardValue} numberOfLines={1}>
                      {bankStatus?.current?.bankName || 'Not Linked'}
                    </Text>
                  </View>
                  <Ionicons name="card" size={32} color={colors.gold} style={{ opacity: 0.8 }} />
                </View>
                
                <Text style={styles.bankCardNumber}>
                  {maskAccountNumber(bankStatus?.current?.accountNumber)}
                </Text>
                
                <View style={styles.bankCardFooter}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.bankCardLabel}>{t('account_holder_name')}</Text>
                    <Text style={styles.bankCardValue} numberOfLines={1}>
                      {bankStatus?.current?.accountHolderName || 'Not Provided'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.bankCardLabel}>{t('ifsc_code')}</Text>
                    <Text style={styles.bankCardValue}>
                      {bankStatus?.current?.ifscCode || 'N/A'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {bankStatus?.current && (
                <View style={styles.detailsList}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('bank_branch')}</Text>
                    <Text style={styles.detailValue}>{bankStatus.current.bankBranch || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('account_type')}</Text>
                    <Text style={styles.detailValue}>
                      {bankStatus.current.accountType === 'Saving' ? t('saving_type') : bankStatus.current.accountType === 'Current' ? t('current_type') : bankStatus.current.accountType || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('upi_id')}</Text>
                    <Text style={styles.detailValue}>{bankStatus.current.upi || 'N/A'}</Text>
                  </View>
                </View>
              )}

              {bankStatus?.latestRequest && (
                <View style={styles.pendingCard}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.pendingCardHeader}>
                      <Ionicons name="time-outline" size={20} color="#B45309" style={{ marginRight: 8 }} />
                      <Text style={styles.pendingText}>
                        {t('pending_admin_approval')}
                      </Text>
                    </View>
                    <View style={styles.pendingCardBody}>
                      <Text style={styles.pendingSubText}>
                        Requested Details:
                      </Text>
                      <View style={styles.pendingDetailsGrid}>
                        <Text style={styles.pendingDetailItem}>• {t('bank_name')}: {bankStatus.latestRequest.bankName}</Text>
                        <Text style={styles.pendingDetailItem}>• {t('account_number')}: {maskAccountNumber(bankStatus.latestRequest.accountNumber)}</Text>
                        {bankStatus.latestRequest.accountHolderName && (
                          <Text style={styles.pendingDetailItem}>• {t('account_holder_name')}: {bankStatus.latestRequest.accountHolderName}</Text>
                        )}
                        <Text style={styles.pendingDetailItem}>• {t('ifsc_code')}: {bankStatus.latestRequest.ifscCode}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.sectionHeader}>{t('request_details_update')}</Text>

              <View style={styles.formContainer}>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('account_holder_name')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.accountHolderName}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, accountHolderName: v }))}
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter Account Holder Name"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('account_number')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.accountNumber}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, accountNumber: v }))}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter Account Number"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('ifsc_code')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.ifscCode}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, ifscCode: v.toUpperCase() }))}
                    autoCapitalize="characters"
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter IFSC Code"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('bank_name')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.bankName}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, bankName: v }))}
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter Bank Name"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('bank_branch')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.bankBranch}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, bankBranch: v }))}
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter Bank Branch"
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('account_type')}</Text>
                  <View style={styles.radioRow}>
                    {['Saving', 'Current'].map(type => (
                      <TouchableOpacity
                         key={type}
                         style={[styles.radioBtn, bankForm.accountType === type && styles.radioBtnActive]}
                         onPress={() => setBankForm(prev => ({ ...prev, accountType: type }))}
                      >
                        <Text style={[styles.radioText, bankForm.accountType === type && styles.radioTextActive]}>
                          {type === 'Saving' ? t('saving_type') : t('current_type')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>{t('upi_id')}</Text>
                  <TextInput
                    style={styles.input}
                    value={bankForm.upi}
                    onChangeText={(v) => setBankForm(prev => ({ ...prev, upi: v }))}
                    autoCapitalize="none"
                    placeholderTextColor={colors.textLight}
                    placeholder="Enter UPI ID (optional)"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.goldDark }, bankSaveLoading && { opacity: 0.6 }]}
                  onPress={handleUpdateBank}
                  disabled={bankSaveLoading}
                >
                  {bankSaveLoading ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={[styles.saveBtnText, { color: colors.white }]}>{t('submit_bank_request')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      );
    }

    if (activeSubScreen === 'form16a') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('download_form16a')} onBack={() => setActiveSubScreen(null)} />
          {form16aLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {form16aList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="document-text-outline" size={60} color={colors.goldDark} />
                  </View>
                  <Text style={styles.emptyTitle}>{t('no_records_found')}</Text>
                  <Text style={styles.emptyDesc}>{t('no_form16a_desc')}</Text>
                </View>
              ) : (
                <View style={styles.docList}>
                  {form16aList.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.docCard}
                      activeOpacity={0.8}
                      onPress={() => handleDownloadForm16a(item.filePath)}
                    >
                      <View style={styles.docCardLeft}>
                        <View style={styles.pdfIconContainer}>
                          <Ionicons name="document" size={32} color="#EF4444" />
                          <Text style={styles.pdfBadge}>PDF</Text>
                        </View>
                      </View>
                      
                      <View style={styles.docCardMiddle}>
                        <Text style={styles.docTitle} numberOfLines={1}>
                          {item.fileName || 'Form 16A Document'}
                        </Text>
                        <View style={styles.docMetaRow}>
                          <Text style={styles.docMetaLabel}>{t('financial_year')}: </Text>
                          <Text style={styles.docMetaValue}>{item.financialYear}</Text>
                        </View>
                        <View style={styles.docMetaRow}>
                          <Text style={styles.docMetaLabel}>{t('quarter')}: </Text>
                          <Text style={styles.docMetaValue}>{item.quarter}</Text>
                        </View>
                        <Text style={styles.docDate}>
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                        </Text>
                      </View>
                      
                      <View style={styles.docCardRight}>
                        <View style={styles.downloadIconCircle}>
                          <Ionicons name="download-outline" size={20} color={colors.white} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      );
    }

    if (activeSubScreen === 'terms') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('terms_conditions')} onBack={() => setActiveSubScreen(null)} />
          {termsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {termsContent ? (
                <WebView
                  originWhitelist={['*']}
                  source={{ html: generateHtmlTemplate(termsContent.description || '') }}
                  style={styles.webView}
                  textZoom={100}
                />
              ) : (
                <View style={styles.centered}>
                  <Text style={{ color: colors.textSecondary }}>{t('no_records_found')}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      );
    }

    if (activeSubScreen === 'training') {
      return (
        <View style={styles.container}>
          <ScreenHeader title={t('training_video')} onBack={() => setActiveSubScreen(null)} />
          {videoLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.goldDark} />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {videoList.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="play-circle-outline" size={60} color={colors.goldDark} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('no_videos_found')}</Text>
                    <Text style={styles.emptyDesc}>{t('no_videos_desc')}</Text>
                  </View>
                ) : (
                  <View style={styles.videoListContainer}>
                    {videoList.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.videoCard}
                        activeOpacity={0.9}
                        onPress={() => handlePlayVideo(item)}
                      >
                        <View style={styles.videoCoverContainer}>
                          {item.cover_image ? (
                            <Image
                              source={{ uri: getForm16aUrl(item.cover_image) }}
                              style={styles.videoCover}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.videoPlaceholderCover}>
                              <Ionicons name="image-outline" size={48} color={colors.textLight} />
                            </View>
                          )}
                          <View style={styles.playButtonOverlay}>
                            <View style={styles.playIconInner}>
                              <Ionicons name="play" size={28} color={colors.white} style={{ marginLeft: 3 }} />
                            </View>
                          </View>
                        </View>
                        
                        <View style={styles.videoInfoBlock}>
                          <Text style={styles.videoTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <View style={styles.videoMeta}>
                            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={styles.videoDate}>
                              {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              {activeVideo && (
                <Modal
                  visible={!!activeVideo}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setActiveVideo(null)}
                >
                  <View style={styles.modalBg}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalVideoTitle} numberOfLines={1}>
                        {activeVideo.title}
                      </Text>
                      <TouchableOpacity
                        style={styles.modalCloseBtn}
                        onPress={() => setActiveVideo(null)}
                      >
                        <Ionicons name="close" size={24} color={colors.white} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.webViewWrapper}>
                      <WebView
                        style={{ flex: 1 }}
                        javaScriptEnabled={true}
                        allowsFullscreenVideo={true}
                        source={{
                          uri: `https://www.youtube.com/embed/${getYoutubeId(activeVideo.video_link)}?autoplay=1&modestbranding=1&rel=0`
                        }}
                      />
                    </View>
                  </View>
                </Modal>
              )}
            </View>
          )}
        </View>
      );
    }

    const sub = SETTING_ITEMS.find(item => item.key === activeSubScreen);
    return (
      <View style={styles.container}>
        <ScreenHeader title={sub.title} onBack={() => setActiveSubScreen(null)} />
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: sub.color }]}>
            <Text style={styles.emoji}>{sub.emoji}</Text>
          </View>
          <Text style={styles.subTitle}>{sub.title}</Text>
          <Text style={styles.subDescription}>{sub.desc}</Text>
          <View style={styles.badgePlaceholder}>
            <Text style={styles.badgeText}>
              {globalLang === 'hi' ? 'जल्द ही आ रहा है' : 'Under Development'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('settings')} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {SETTING_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => setActiveSubScreen(item.key)}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: item.color }]}>
                <Text style={styles.cardEmoji}>{item.emoji}</Text>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.secondary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingBottom: 40 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%', // approx half, minus gap spacing
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    flexGrow: 1,
  },
  cardIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardEmoji: { fontSize: 24 },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 48 },
  subTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subDescription: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  badgePlaceholder: {
    marginTop: 12,
    backgroundColor: colors.goldBg,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.goldDark },

  // Phone Form Styles
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    marginTop: 8,
  },
  field: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#fb9494', // Astrovell theme red/pink brand color
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#fb9494',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: { color: colors.white, fontSize: 15, fontWeight: '800' },

  // Radio button / selector styles
  radioRow: { flexDirection: 'row', gap: 12 },
  radioBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  radioBtnActive: { borderColor: colors.gold, backgroundColor: colors.goldBg },
  radioText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  radioTextActive: { color: colors.goldDark, fontWeight: '700' },

  // Pending verification alert card
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  pendingText: { fontSize: 13, fontWeight: '800', color: '#B45309' },
  pendingSubText: { fontSize: 11, color: '#D97706', marginTop: 4, fontWeight: '600' },

  // Bank Card Styles
  bankCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  bankCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bankCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  bankCardNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 2,
    marginVertical: 12,
  },
  bankCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  detailsList: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  
  // Pending verification card additions
  pendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingCardBody: {
    paddingLeft: 28,
  },
  pendingDetailsGrid: {
    marginTop: 4,
    gap: 4,
  },
  pendingDetailItem: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },

  // Form 16A Styles
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  docList: {
    gap: 16,
    marginTop: 8,
  },
  docCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  docCardLeft: {
    marginRight: 16,
  },
  pdfIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  pdfBadge: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#EF4444',
    color: colors.white,
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    textTransform: 'uppercase',
  },
  docCardMiddle: {
    flex: 1,
    justifyContent: 'center',
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  docMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  docMetaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  docMetaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  docDate: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
  docCardRight: {
    marginLeft: 12,
  },
  downloadIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.goldDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  
  // Training Videos Styles
  videoListContainer: {
    gap: 20,
    marginTop: 8,
  },
  videoCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  videoCoverContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoCover: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholderCover: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  playIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(230, 168, 0, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  videoInfoBlock: {
    padding: 16,
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoDate: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  
  // Modal video player styles
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  modalVideoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    flex: 1,
    marginRight: 16,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  webViewWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  resendBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    color: colors.goldDark,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default SettingsScreen;
