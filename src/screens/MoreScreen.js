import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import GoldHeader from '../components/GoldHeader';
import usePermissions from '../hooks/usePermissions';
import useTranslation from '../hooks/useTranslation';

const ALL_MENU_ITEMS = [
  {
    sectionKey: 'consultations', items: [
      { icon: 'chatbubbles-outline',    color: '#6366F1', labelKey: 'chat_history',  key: 'ChatHistory',  permKey: 'chat' },
      { icon: 'call-outline',           color: '#EF4444', labelKey: 'call_history',  key: 'CallHistory',  permKey: 'call' },
      { icon: 'calendar-outline',       color: '#8B5CF6', labelKey: 'appointments',  key: 'Appointments', permKey: 'appointments' },
    ]
  },
  {
    sectionKey: 'puja_services', items: [
      { icon: 'flame-outline',          color: '#EA580C', labelKey: 'my_pujas',      key: 'Pujas',        permKey: 'puja' },
      { icon: 'cube-outline',           color: '#F59E0B', labelKey: 'puja_orders',   key: 'PujaOrders',   permKey: 'puja' },
    ]
  },
  {
    sectionKey: 'reports_tools', items: [
      { icon: 'document-text-outline',  color: '#3B82F6', labelKey: 'report_requests', key: 'Reports',         permKey: 'reports' },
      { icon: 'star-outline',           color: '#F59E0B', labelKey: 'user_reviews',    key: 'Reviews',         permKey: 'reviews' },
      { icon: 'people-outline',         color: '#22C55E', labelKey: 'followers',       key: 'Followers',       permKey: 'followers' },
      { icon: 'notifications-outline',  color: '#4682B4', labelKey: 'notifications',   key: 'Notifications',   permKey: 'notifications' },
      { icon: 'planet-outline',         color: '#9333EA', labelKey: 'check_kundali',   key: 'Kundali',         permKey: 'kundali' },
      { icon: 'heart-outline',          color: '#EC4899', labelKey: 'match_kundali',   key: 'KundaliMatching', permKey: 'kundali_matching' },
    ]
  },
  {
    sectionKey: 'settings', items: [
      { icon: 'call-outline',           color: '#DB2777', labelKey: 'update_phone',      key: 'Settings_phone',   permKey: 'settings' },
      { icon: 'videocam-outline',       color: '#0EA5E9', labelKey: 'training_video',    key: 'Settings_training', permKey: 'settings' },
      { icon: 'document-text-outline',  color: '#CA8A04', labelKey: 'terms_conditions',  key: 'Settings_terms',   permKey: 'settings' },
      { icon: 'business-outline',       color: '#7C3AED', labelKey: 'bank_details',      key: 'Settings_bank',    permKey: 'settings' },
      { icon: 'receipt-outline',        color: '#14B8A6', labelKey: 'download_form16a',  key: 'Settings_form16a', permKey: 'settings' },
      { icon: 'images-outline',         color: '#E67E22', labelKey: 'gallery',           key: 'Settings_gallery', permKey: 'settings' },
      { icon: 'location-outline',       color: '#E11D48', labelKey: 'update_billing',    key: 'Settings_billing', permKey: 'settings' },
    ]
  },
];

const MoreScreen = ({ onOpenSubScreen }) => {
  const { can } = usePermissions();
  const { t } = useTranslation();

  // Filter sections and items by permissions
  const MENU_ITEMS = ALL_MENU_ITEMS
    .map(section => ({
      ...section,
      items: section.items.filter(item => can(item.permKey)),
    }))
    .filter(section => section.items.length > 0);

  const MenuRow = ({ icon, color, label, onPress, bordered }) => (
    <TouchableOpacity
      style={[styles.menuItem, bordered && styles.menuItemBordered]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.menuItemLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <GoldHeader title={t('more')} subtitle={t('features_tools')} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {MENU_ITEMS.map(section => (
          <View key={section.sectionKey} style={styles.section}>
            <Text style={styles.sectionTitle}>{t(section.sectionKey)}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <MenuRow
                  key={item.key}
                  icon={item.icon}
                  color={item.color}
                  label={t(item.labelKey)}
                  bordered={idx < section.items.length - 1}
                  onPress={() => onOpenSubScreen?.(item.key)}
                />
              ))}
            </View>
          </View>
        ))}

        {/* Always-visible Customer Support — opens WhatsApp directly */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('support')}</Text>
          <View style={styles.sectionCard}>
            <MenuRow
              icon="logo-whatsapp"
              color="#25D366"
              label={t('support')}
              onPress={() => Linking.openURL('https://wa.me/918529411977?text=' + encodeURIComponent('Hi Astrovell team, I need help with the astrologer app.')).catch(() => { })}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default MoreScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.secondary },

  section: { marginBottom: 20 },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
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
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  menuItemBordered: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },
  menuIconWrap: {
    width: 40, height: 40, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  menuItemLabel: { flex: 1, color: colors.text, fontSize: 14.5, fontWeight: '600' },
});
