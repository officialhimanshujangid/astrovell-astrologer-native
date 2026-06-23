import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import usePermissions from '../hooks/usePermissions';
import useTranslation from '../hooks/useTranslation';

const ALL_MENU_ITEMS = [
  {
    sectionKey: 'consultations', items: [
      { icon: '💬', labelKey: 'chat_history', key: 'ChatHistory', permKey: 'chat' },
      { icon: '📞', labelKey: 'call_history', key: 'CallHistory', permKey: 'call' },
      { icon: '📅', labelKey: 'appointments', key: 'Appointments', permKey: 'appointments' },
    ]
  },
  {
    sectionKey: 'puja_services', items: [
      { icon: '🪔', labelKey: 'my_pujas', key: 'Pujas', permKey: 'puja' },
      { icon: '📦', labelKey: 'puja_orders', key: 'PujaOrders', permKey: 'puja' },
    ]
  },
  {
    sectionKey: 'reports_tools', items: [
      { icon: '📋', labelKey: 'report_requests', key: 'Reports', permKey: 'reports' },
      { icon: '⭐', labelKey: 'user_reviews', key: 'Reviews', permKey: 'reviews' },
      { icon: '👥', labelKey: 'followers', key: 'Followers', permKey: 'followers' },
      { icon: '🔔', labelKey: 'notifications', key: 'Notifications', permKey: 'notifications' },
      { icon: '📜', labelKey: 'check_kundali', key: 'Kundali', permKey: 'kundali' },
      { icon: '💖', labelKey: 'match_kundali', key: 'KundaliMatching', permKey: 'kundali_matching' },
    ]
  },
  {
    sectionKey: 'settings', items: [
      { icon: '📱', labelKey: 'update_phone', key: 'Settings_phone', permKey: 'settings' },
      { icon: '🎥', labelKey: 'training_video', key: 'Settings_training', permKey: 'settings' },
      { icon: '📜', labelKey: 'terms_conditions', key: 'Settings_terms', permKey: 'settings' },
      { icon: '🏦', labelKey: 'bank_details', key: 'Settings_bank', permKey: 'settings' },
      { icon: '📄', labelKey: 'download_form16a', key: 'Settings_form16a', permKey: 'settings' },
      { icon: '🖼️', labelKey: 'gallery', key: 'Settings_gallery', permKey: 'settings' },
      { icon: '📍', labelKey: 'update_billing', key: 'Settings_billing', permKey: 'settings' },
    ]
  },
];

const MoreScreen = ({ onOpenSubScreen }) => {
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();
  const { t } = useTranslation();

  // Filter sections and items by permissions
  const MENU_ITEMS = ALL_MENU_ITEMS
    .map(section => ({
      ...section,
      items: section.items.filter(item => can(item.permKey)),
    }))
    .filter(section => section.items.length > 0);

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('more')} subtitle={t('features_tools')} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {MENU_ITEMS.map(section => (
          <View key={section.sectionKey} style={styles.section}>
            <Text style={styles.sectionTitle}>{t(section.sectionKey)}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.menuItem, idx < section.items.length - 1 && styles.menuItemBordered]}
                  onPress={() => onOpenSubScreen?.(item.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                  <Text style={styles.menuItemLabel}>{t(item.labelKey)}</Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Always-visible Customer Support — opens WhatsApp directly */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('support')}</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Linking.openURL('https://wa.me/918560033640?text=' + encodeURIComponent('Hi Astrovell team, I need help with the astrologer app.')).catch(() => {})}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemIcon}>🆘</Text>
              <Text style={styles.menuItemLabel}>{t('support')}</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

export default MoreScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

  section: { marginBottom: 20 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  menuItemBordered: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemIcon: { fontSize: 22, width: 28 },
  menuItemLabel: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '600' },
  menuItemArrow: { color: colors.textMuted, fontSize: 20 },

  versionCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 8,
  },
  versionText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  versionSub: { color: colors.textMuted, fontSize: 11, marginTop: 4, opacity: 0.6 },
});
