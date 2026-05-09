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
    if (!form.name.trim()) { Alert.alert('Error', 'Name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, astrologerId: astrologer?.id };
      await profileApi.update(payload);
      dispatch(updateAstrologer({ name: form.name }));
      Alert.alert('✅ Success', 'Profile updated successfully');
      setMode('view');
      loadProfile();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title={mode === 'edit' ? 'Edit Profile' : 'My Profile'}
        onBack={mode === 'edit' ? () => setMode('view') : undefined}
        rightAction={mode === 'view' ? {
          icon: '✏️',
          onPress: () => setMode('edit'),
        } : undefined}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <LinearGradient
          colors={[colors.goldBg, '#FFFFFF']}
          style={styles.profileHeader}
        >
          <View style={styles.avatarWrap}>
            {profileImg ? (
              <Image source={{ uri: profileImg }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{(profile?.name || 'A')[0].toUpperCase()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{profile?.name || 'Astrologer'}</Text>
          <Text style={styles.profilePhone}>{profile?.contactNo || ''}</Text>

          <View style={[styles.approvalBadge, { backgroundColor: isPending ? colors.goldBg : colors.successBg }]}>
            <Ionicons name={isPending ? "time" : "checkmark-circle"} size={14} color={isPending ? colors.goldDark : colors.success} style={{ marginRight: 4 }} />
            <Text style={[styles.approvalBadgeText, { color: isPending ? colors.goldDark : colors.success }]}>
              {isPending ? 'Pending Approval' : 'Verified Astrologer'}
            </Text>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
          {mode === 'view' ? (
            <>
              {/* Professional Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{profile?.experience || 0}</Text>
                  <Text style={styles.statLabel}>Exp. (Yrs)</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>₹{profile?.charge || 0}</Text>
                  <Text style={styles.statLabel}>/ min</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{parseFloat(profile?.rating || 0).toFixed(1)}</Text>
                  <Text style={styles.statLabel}>Rating</Text>
                </View>
              </View>

              {/* Personal Info */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Personal Details</Text>
                <View style={styles.infoCard}>
                  {[
                    { label: 'Email', value: profile?.email, icon: 'mail-outline' },
                    { label: 'WhatsApp', value: profile?.whatsappNo, icon: 'logo-whatsapp' },
                    { label: 'Gender', value: profile?.gender, icon: 'person-outline' },
                    { label: 'Date of Birth', value: profile?.birthDate, icon: 'calendar-outline' },
                    { label: 'Languages', value: getLanguageString(profile?.languageKnown), icon: 'language-outline' },
                  ].map((item, idx) => item.value ? (
                    <View key={item.label} style={[styles.infoRow, idx === 0 && { borderTopWidth: 0 }]}>
                      <View style={styles.infoIconLabel}>
                        <Ionicons name={item.icon} size={18} color={colors.goldDark} style={{ marginRight: 10 }} />
                        <Text style={styles.infoLabel}>{item.label}</Text>
                      </View>
                      <Text style={styles.infoValue}>{item.value}</Text>
                    </View>
                  ) : null)}
                </View>
              </View>

              {/* About Me */}
              {profile?.aboutMe && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>About Me</Text>
                  <View style={styles.aboutCard}>
                    <Text style={styles.aboutText}>{profile.aboutMe}</Text>
                  </View>
                </View>
              )}

              {/* Quick Links */}
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Account & Performance</Text>
                <View style={styles.quickLinks}>
                  {[
                    { icon: 'chatbubbles-outline', label: 'Chat History', key: 'ChatHistory', permKey: 'more_chat_history' },
                    { icon: 'call-outline', label: 'Call History', key: 'CallHistory', permKey: 'more_call_history' },
                    { icon: 'star-outline', label: 'My Reviews', key: 'Reviews', permKey: 'reviews' },
                    { icon: 'document-text-outline', label: 'My Reports', key: 'Reports', permKey: 'reports' },
                    { icon: 'people-outline', label: 'Followers', key: 'Followers', permKey: 'followers' },
                  ].filter(l => can(l.permKey)).map((l, idx) => (
                    <TouchableOpacity key={l.key} style={[styles.quickLink, idx === 0 && { borderTopWidth: 0 }]} onPress={() => onOpenSubScreen?.(l.key)}>
                      <Ionicons name={l.icon} size={20} color={colors.textSecondary} style={{ marginRight: 12 }} />
                      <Text style={styles.quickLinkLabel}>{l.label}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Logout */}
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
                <Text style={styles.logoutBtnText}>Logout Account</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* Edit Form */
            <View style={styles.editForm}>
              {[
                { key: 'name', label: 'Full Name *', icon: 'person' },
                { key: 'email', label: 'Email', icon: 'mail', keyboard: 'email-address' },
                { key: 'whatsappNo', label: 'WhatsApp Number', icon: 'logo-whatsapp', keyboard: 'phone-pad' },
                { key: 'birthDate', label: 'Birth Date (YYYY-MM-DD)', icon: 'calendar' },
                { key: 'experience', label: 'Experience (years)', icon: 'briefcase', keyboard: 'number-pad' },
                { key: 'charge', label: 'Charge per minute (₹)', icon: 'cash', keyboard: 'number-pad' },
                { key: 'languageKnown', label: 'Languages Known', icon: 'language' },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      value={form[f.key]}
                      onChangeText={v => update(f.key, v)}
                      keyboardType={f.keyboard || 'default'}
                      placeholderTextColor={colors.textLight}
                    />
                  </View>
                </View>
              ))}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Gender</Text>
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

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>About Me</Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  value={form.aboutMe}
                  onChangeText={v => update('aboutMe', v)}
                  multiline
                  placeholderTextColor={colors.textLight}
                  placeholder="Tell customers about yourself..."
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.saveBtnText}>Update Profile</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },

  profileHeader: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarWrap: {
    marginBottom: 16,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.white,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.goldDark, fontSize: 40, fontWeight: '900' },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.goldDark,
    width: 28, height: 28,
    borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.white,
  },
  profileName:  { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 4 },
  profilePhone: { color: colors.textSecondary, fontSize: 14, marginBottom: 12 },
  approvalBadge: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
  },
  approvalBadgeText: { fontSize: 12, fontWeight: '800' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingVertical: 18,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statVal: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 2 },
  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statDivider: { width: 1, height: '60%', backgroundColor: colors.border },

  infoSection: { marginTop: 24 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 12, paddingLeft: 4 },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoIconLabel: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  infoValue: { color: colors.text, fontSize: 14, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },

  aboutCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  aboutText: { color: colors.text, fontSize: 14, lineHeight: 22, fontWeight: '500' },

  quickLinks: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  quickLink: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  quickLinkLabel: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },

  logoutBtn: {
    marginTop: 30,
    backgroundColor: colors.errorBg,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  logoutBtnText: { color: colors.error, fontSize: 15, fontWeight: '800' },

  // Edit form
  editForm: { marginTop: 10 },
  field: { marginBottom: 18 },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12,
    color: colors.text, fontSize: 15,
  },
  radioRow: { flexDirection: 'row', gap: 12 },
  radioBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white, alignItems: 'center',
  },
  radioBtnActive:  { borderColor: colors.gold, backgroundColor: colors.goldBg },
  radioText:       { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  radioTextActive: { color: colors.goldDark },
  saveBtn: {
    backgroundColor: colors.gold, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 12,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  saveBtnText: { color: colors.text, fontSize: 16, fontWeight: '900' },
});
