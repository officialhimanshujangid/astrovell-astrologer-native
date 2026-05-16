import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../theme/colors';
import { profileApi } from '../api/services';
import { updateAstrologer, logout } from '../store/slices/authSlice';
import ScreenHeader from '../components/ScreenHeader';
import usePermissions from '../hooks/usePermissions';
import useTranslation from '../hooks/useTranslation';

const BASE_IMG = 'https://astrology-i7c9.onrender.com/';

const getLanguageString = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) return val.map(l => l?.languageName || l).filter(Boolean).join(', ');
  if (typeof val === 'object') return val.languageName || JSON.stringify(val);
  return String(val);
};

const ProfileScreen = ({ onOpenSubScreen }) => {
  const dispatch   = useDispatch();
  const insets     = useSafeAreaInsets();
  const { astrologer } = useSelector(s => s.auth);
  const { can } = usePermissions();
  const { t } = useTranslation();

  const [mode,    setMode]    = useState('view'); // 'view' | 'edit'
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    name: '', email: '', whatsappNo: '', gender: '',
    birthDate: '', experience: '', aboutMe: '', charge: '', languageKnown: '',
  });

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await profileApi.get({ astrologerId: astrologer?.id });
      const d = res.data;
      const a = d?.recordList?.[0] || d?.data || d?.recordList || {};
      setProfile(a);
      setForm({
        name: a.name || '', email: a.email || '', whatsappNo: a.whatsappNo || '',
        gender: a.gender || '', birthDate: a.birthDate || '',
        experience: String(a.experience || ''), aboutMe: a.aboutMe || '',
        charge: String(a.charge || ''), languageKnown: getLanguageString(a.languageKnown),
      });
    } catch (_) {}
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert(t('error'), t('selection_required')); return; }
    setSaving(true);
    try {
      const payload = { ...form, astrologerId: astrologer?.id };
      await profileApi.update(payload);
      dispatch(updateAstrologer({ name: form.name }));
      Alert.alert(`✅ ${t('success')}`, t('profile_updated'));
      setMode('view');
      loadProfile();
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert(t('logout_confirm_title'), t('logout_confirm_msg'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout_confirm_title'), style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  const profileImg = profile?.profileImage
    ? (profile.profileImage.startsWith('http') ? profile.profileImage : `${BASE_IMG}${profile.profileImage}`)
    : null;

  const isPending = profile?.isAdminApproved === 'Pending';

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.goldDark} size="large" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>{t('profile')}</Text>
      </View>

      {mode === 'view' ? (
        <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Header Card ────────────────────────────────────────── */}
        <View style={styles.profileCard}>
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
               {profileImg ? (
                <Image source={{ uri: profileImg }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetter}>{(profile?.name || 'A')[0].toUpperCase()}</Text>
                </View>
              )}
            </View>
            <View style={styles.profileText}>
               <Text style={styles.profileName}>{profile?.name || 'Astrologer'} ({profile?.id || '3921'})</Text>
               <Text style={styles.profileEmail}>{profile?.email || 'user@email.com'}</Text>
               <Text style={styles.profilePhone}>{profile?.contactNo || '+918560033640'}</Text>
            </View>
            <TouchableOpacity style={styles.editIconBtn} onPress={() => setMode('edit')}>
               <Ionicons name="create-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Menu List ─────────────────────────────────────────────────── */}
        <View style={styles.menuList}>
          <MenuRow icon="person-outline" iconColor="#ff4d4d" label={t('edit_profile')} onPress={() => setMode('edit')} />
          <MenuRow icon="wallet-outline" iconColor="#20b2aa" label={t('wallet')} onPress={() => onOpenSubScreen?.('Wallet')} />
          <MenuRow icon="chatbubbles-outline" iconColor="#6495ed" label={t('chat_history')} onPress={() => onOpenSubScreen?.('ChatHistory')} />
          <MenuRow icon="call-outline" iconColor="#ff4500" label={t('call_history')} onPress={() => onOpenSubScreen?.('CallHistory')} />
          <MenuRow icon="star-outline" iconColor="#ffa500" label={t('user_reviews')} onPress={() => onOpenSubScreen?.('Reviews')} />
          <MenuRow icon="document-text-outline" iconColor="#1e90ff" label={t('my_reports')} onPress={() => onOpenSubScreen?.('Reports')} />
          <MenuRow icon="people-outline" iconColor="#32cd32" label={t('followers')} onPress={() => onOpenSubScreen?.('Followers')} />
          <MenuRow icon="notifications-outline" iconColor="#4682b4" label={t('notifications')} onPress={() => onOpenSubScreen?.('Notifications')} />
        </View>

        <View style={styles.versionFooter}>
          <Text style={styles.versionText}>version 1.1.463</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>{t('logout_account')}</Text>
        </TouchableOpacity>
      </ScrollView>
    ) : (
      /* Edit Form */
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.editForm}>
          {[
            { key: 'name', label: t('name'), icon: 'person' },
            { key: 'email', label: t('email'), icon: 'mail', keyboard: 'email-address' },
            { key: 'whatsappNo', label: t('phone'), icon: 'logo-whatsapp', keyboard: 'phone-pad' },
            { key: 'birthDate', label: t('dob'), icon: 'calendar' },
            { key: 'experience', label: t('experience'), icon: 'briefcase', keyboard: 'number-pad' },
            { key: 'charge', label: t('chat_charge'), icon: 'cash', keyboard: 'number-pad' },
            { key: 'languageKnown', label: t('language'), icon: 'language' },
          ].map(f => (
            <View key={f.key} style={styles.field}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <TextInput
                style={styles.input}
                value={form[f.key]}
                onChangeText={v => update(f.key, v)}
                keyboardType={f.keyboard || 'default'}
                placeholderTextColor={colors.textLight}
              />
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('gender')}</Text>
            <View style={styles.radioRow}>
              {['Male', 'Female', 'Other'].map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.radioBtn, form.gender === g && styles.radioBtnActive]}
                  onPress={() => update('gender', g)}
                >
                  <Text style={[styles.radioText, form.gender === g && styles.radioTextActive]}>{t(g.toLowerCase())}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>{t('about')}</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={form.aboutMe}
              onChangeText={v => update('aboutMe', v)}
              multiline
              placeholderTextColor={colors.textLight}
              placeholder={t('tell_about_yourself')}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>{t('edit_profile')}</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.border, marginTop: 12 }]} onPress={() => setMode('view')}>
            <Text style={[styles.saveBtnText, { color: colors.text }]}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )}
  </View>
);
};

const MenuRow = ({ icon, iconColor, label, badge, badgeColor, badgeTextColor, onPress }) => (
  <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.menuIconWrap, { backgroundColor: iconColor + '15' }]}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    {badge && (
      <View style={[styles.menuBadge, { backgroundColor: badgeColor }]}>
        <Text style={[styles.menuBadgeText, { color: badgeTextColor }]}>{badge}</Text>
      </View>
    )}
    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
  </TouchableOpacity>
);

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf2f2' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdf2f2' },

  customHeader: { backgroundColor: '#fb9494', paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '500' },

  profileCard: {
    backgroundColor: colors.white, borderRadius: 12, margin: 12, padding: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  profileInfo: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 2, borderColor: colors.gold },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: colors.goldDark, fontSize: 24, fontWeight: '900' },
  profileText: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 18, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  profilePhone: { fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  editIconBtn: { padding: 4 },

  menuList: { backgroundColor: colors.white, marginTop: 8 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
  },
  menuIconWrap: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, marginLeft: 16, fontSize: 15, color: colors.text, fontWeight: '500' },
  menuBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginRight: 8 },
  menuBadgeText: { fontSize: 11, fontWeight: '700' },

  versionFooter: { alignItems: 'center', marginTop: 24, marginBottom: 12 },
  versionText: { fontSize: 13, color: colors.textLight },

  logoutBtn: {
    margin: 16, paddingVertical: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
  },
  logoutBtnText: { color: colors.error, fontSize: 15, fontWeight: '600' },

  editForm: { padding: 16 },
  field: { marginBottom: 18 },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    color: colors.text, fontSize: 15,
  },
  radioRow: { flexDirection: 'row', gap: 12 },
  radioBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center',
  },
  radioBtnActive:  { borderColor: '#fb9494', backgroundColor: '#fdf2f2' },
  radioText:       { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  radioTextActive: { color: '#fb9494' },
  saveBtn: {
    backgroundColor: '#fb9494', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 12,
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
