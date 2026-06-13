import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import { setGlobalLang, completeSetup } from '../store/slices/authSlice';
import { fetchLanguages } from '../store/slices/horoscopeSlice';
import { colors } from '../theme/colors';
import useTranslation from '../hooks/useTranslation';

const { width } = Dimensions.get('window');

const SetupPreferenceScreen = () => {
  const dispatch = useDispatch();
  const { languages, langsLoad } = useSelector((state) => state.horoscope);
  const { globalLang, t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(globalLang);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);

  useEffect(() => {
    dispatch(fetchLanguages());
    checkCurrentPermissions();
  }, []);

  const checkCurrentPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        const hasAudio = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (hasAudio) setPermissionGranted(true);
      } else {
        // iOS permissions are handled at point of use or via WebView prompt
        setPermissionGranted(true);
      }
    } catch (e) {
      console.warn('Permission check error:', e);
    }
  };

  const requestAudioPermission = async () => {
    setRequestingPermission(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Astrovell needs access to your microphone for consultations with customers.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionGranted(true);
        } else {
          Alert.alert('Permission Denied', 'Microphone access is recommended for taking calls. You can enable it later in system settings.');
        }
      } else {
        setPermissionGranted(true);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleContinue = () => {
    if (!selectedLang) {
      Alert.alert(t('selection_required'), t('select_lang_msg'));
      return;
    }
    dispatch(setGlobalLang(selectedLang));
    dispatch(completeSetup());
  };

  const handleLangSelect = (code) => {
    setSelectedLang(code);
    dispatch(setGlobalLang(code)); // Update immediately to reflect in UI
  };

  const langList = languages.length > 0 ? languages : [
    { languageName: 'Hindi', code: 'hi' },
    { languageName: 'English', code: 'en' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* Background Decor */}
      <View style={styles.topCircle} />
      <View style={styles.bottomCircle} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles-outline" size={40} color={colors.goldDark} />
          </View>
          <Text style={styles.title}>{t('welcome_Astrovell')}</Text>
          <Text style={styles.subtitle}>
            {t('setup_subtitle')}
          </Text>
        </View>

        {/* Language Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('preferred_language')}</Text>
          {langsLoad ? (
            <ActivityIndicator size="small" color={colors.gold} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.langGrid}>
              {langList.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langCard,
                    selectedLang === lang.code && styles.langCardActive,
                  ]}
                  onPress={() => handleLangSelect(lang.code)}
                  activeOpacity={0.8}
                >
                  <View style={[
                    styles.radio,
                    selectedLang === lang.code && styles.radioActive
                  ]}>
                    {selectedLang === lang.code && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[
                    styles.langText,
                    selectedLang === lang.code && styles.langTextActive
                  ]}>
                    {lang.name || lang.languageName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Permission Section */}
        <View style={[styles.section, { marginTop: 30 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('essential_permissions')}</Text>
            {permissionGranted && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
          </View>
          <View style={styles.permissionCard}>
            <View style={styles.permIcon}>
              <Ionicons name="mic-outline" size={24} color={colors.goldDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.permTitle}>{t('microphone_access')}</Text>
              <Text style={styles.permSub}>{t('mic_required')}</Text>
            </View>
            {!permissionGranted ? (
              <TouchableOpacity
                style={styles.permBtn}
                onPress={requestAudioPermission}
                disabled={requestingPermission}
              >
                {requestingPermission ? (
                  <ActivityIndicator size="small" color={colors.goldDark} />
                ) : (
                  <Text style={styles.permBtnText}>{t('enable')}</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.grantedText}>{t('granted')}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, !selectedLang && styles.submitBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <Text style={styles.submitBtnText}>{t('complete_setup')}</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          {t('footer_note')}
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  topCircle: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.goldBg,
    opacity: 0.6,
  },
  bottomCircle: {
    position: 'absolute',
    bottom: -80,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.goldBg,
    opacity: 0.4,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.goldBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  langCard: {
    width: (width - 48 - 12) / 2,
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langCardActive: {
    borderColor: colors.gold,
    backgroundColor: colors.goldBg,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: colors.goldDark,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.goldDark,
  },
  langText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  langTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  permissionCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  permIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  permTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  permSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  permBtn: {
    backgroundColor: colors.goldBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  permBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.goldDark,
  },
  grantedText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  submitBtn: {
    backgroundColor: colors.gold,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 40,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#EEE',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  footerNote: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 20,
    fontStyle: 'italic',
  }
});

export default SetupPreferenceScreen;
