import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { profileApi } from '../api/services';
import { updateAstrologer, logout } from '../store/slices/authSlice';
import ScreenHeader from '../components/ScreenHeader';
import usePermissions from '../hooks/usePermissions';

const BASE_IMG = 'https://astrology-i7c9.onrender.com/';

// languageKnown can be a string OR an array of { languageName, id } objects
const getLanguageString = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) return val.map(l => l?.languageName || l).filter(Boolean).join(', ');
  if (typeof val === 'object') return val.languageName || JSON.stringify(val);
  return String(val);
};

const ProfileScreen = ({ onOpenSubScreen }) => {
  const dispatch   = useDispatch();
  const insets     = useSafeAreaInsets();
  const { astrologer, token } = useSelector(s => s.auth);
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
      <ActivityIndicator color={colors.secondary} size="large" />
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {profileImg ? (
              <Image source={{ uri: profileImg }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{(profile?.name || 'A')[0].toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{profile?.name || 'Astrologer'}</Text>
          <Text style={styles.profilePhone}>{profile?.contactNo || ''}</Text>

          {/* Approval Badge */}
          <View style={[styles.approvalBadge, { backgroundColor: isPending ? colors.warning + '25' : colors.success + '25' }]}>
            <Text style={[styles.approvalBadgeText, { color: isPending ? colors.warning : colors.success }]}>
              {isPending ? '⏳ Pending Approval' : '✅ Approved'}
            </Text>
          </View>
        </View>

        {mode === 'view' ? (
          <>
            {/* Profile Info */}
            <View style={styles.infoCard}>
              {[
                { label: 'Email', value: profile?.email },
                { label: 'WhatsApp', value: profile?.whatsappNo },
                { label: 'Gender', value: profile?.gender },
                { label: 'Date of Birth', value: profile?.birthDate },
                { label: 'Experience', value: profile?.experience ? `${profile.experience} years` : null },
                { label: 'Charge', value: profile?.charge ? `₹${profile.charge}/min` : null },
                { label: 'Languages', value: getLanguageString(profile?.languageKnown) },
              ].map(item => item.value ? (
                <View key={item.label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              ) : null)}
            </View>

            {/* About Me */}
            {profile?.aboutMe ? (
              <View style={styles.aboutCard}>
                <Text style={styles.aboutTitle}>About Me</Text>
                <Text style={styles.aboutText}>{profile.aboutMe}</Text>
              </View>
            ) : null}

            {/* Rating */}
            {profile?.rating && (
              <View style={styles.ratingCard}>
                <Text style={styles.ratingEmoji}>⭐</Text>
                <View>
                  <Text style={styles.ratingValue}>{parseFloat(profile.rating).toFixed(1)}</Text>
                  <Text style={styles.ratingLabel}>Average Rating</Text>
                </View>
              </View>
            )}

            {/* Quick Links */}
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.quickLinks}>
              {[
                { icon: '💬', label: 'Chat History', key: 'ChatHistory', permKey: 'more_chat_history' },
                { icon: '📞', label: 'Call History', key: 'CallHistory', permKey: 'more_call_history' },
                { icon: '⭐', label: 'Reviews', key: 'Reviews', permKey: 'reviews' },
                { icon: '📋', label: 'Reports', key: 'Reports', permKey: 'reports' },
                { icon: '📅', label: 'Appointments', key: 'Appointments', permKey: 'appointments' },
                { icon: '👥', label: 'Followers', key: 'Followers', permKey: 'followers' },
              ].filter(l => can(l.permKey)).map(l => (
                <TouchableOpacity key={l.key} style={styles.quickLink} onPress={() => onOpenSubScreen?.(l.key)}>
                  <Text style={styles.quickLinkIcon}>{l.icon}</Text>
                  <Text style={styles.quickLinkLabel}>{l.label}</Text>
                  <Text style={styles.quickLinkArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.logoutBtnText}>🚪 Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Edit Form */
          <View style={styles.editForm}>
            {[
              { key: 'name', label: 'Full Name *' },
              { key: 'email', label: 'Email', keyboard: 'email-address' },
              { key: 'whatsappNo', label: 'WhatsApp Number', keyboard: 'phone-pad' },
              { key: 'birthDate', label: 'Birth Date (YYYY-MM-DD)' },
              { key: 'experience', label: 'Experience (years)', keyboard: 'number-pad' },
              { key: 'charge', label: 'Charge per minute (₹)', keyboard: 'number-pad' },
              { key: 'languageKnown', label: 'Languages Known' },
            ].map(f => (
              <View key={f.key} style={styles.field}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  value={form[f.key]}
                  onChangeText={v => update(f.key, v)}
                  keyboardType={f.keyboard || 'default'}
                  placeholderTextColor={colors.textMuted}
                />
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
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                value={form.aboutMe}
                onChangeText={v => update('aboutMe', v)}
                multiline
                placeholderTextColor={colors.textMuted}
                placeholder="Tell customers about yourself..."
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary },

  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  avatarWrap: {
    marginBottom: 12,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.secondary,
    padding: 2,
  },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.secondary + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: colors.secondary, fontSize: 36, fontWeight: '900' },
  profileName:  { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  profilePhone: { color: colors.textMuted, fontSize: 13, marginBottom: 10 },
  approvalBadge: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
  },
  approvalBadgeText: { fontSize: 12, fontWeight: '700' },

  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: { color: colors.textMuted, fontSize: 13 },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  aboutCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  aboutTitle: { color: colors.textSub, fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },
  aboutText:  { color: colors.text, fontSize: 14, lineHeight: 22 },

  ratingCard: {
    backgroundColor: colors.warning + '15',
    borderWidth: 1, borderColor: colors.warning + '40',
    borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 16,
  },
  ratingEmoji: { fontSize: 30 },
  ratingValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  ratingLabel: { color: colors.textMuted, fontSize: 12 },

  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 10 },

  quickLinks: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 20,
  },
  quickLink: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 12,
  },
  quickLinkIcon:  { fontSize: 20 },
  quickLinkLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  quickLinkArrow: { color: colors.textMuted, fontSize: 18 },

  logoutBtn: {
    backgroundColor: colors.danger + '15',
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1, borderColor: colors.danger + '40',
  },
  logoutBtnText: { color: colors.danger, fontSize: 15, fontWeight: '800' },

  // Edit form
  editForm: { gap: 2 },
  field: { marginBottom: 14 },
  fieldLabel: { color: colors.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontSize: 15,
  },
  radioRow: { flexDirection: 'row', gap: 10 },
  radioBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center',
  },
  radioBtnActive:  { borderColor: colors.secondary, backgroundColor: colors.secondary + '20' },
  radioText:       { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  radioTextActive: { color: colors.secondary },
  saveBtn: {
    backgroundColor: colors.secondary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
