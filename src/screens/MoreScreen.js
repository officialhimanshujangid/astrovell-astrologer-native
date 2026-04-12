import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import usePermissions from '../hooks/usePermissions';

const ALL_MENU_ITEMS = [
  {
    section: 'Consultations', items: [
      { icon: '💬', label: 'Chat History', key: 'ChatHistory', permKey: 'chat' },
      { icon: '📞', label: 'Call History', key: 'CallHistory', permKey: 'call' },
      { icon: '📅', label: 'Appointments', key: 'Appointments', permKey: 'appointments' },
    ]
  },
  {
    section: 'Puja Services', items: [
      { icon: '🪔', label: 'My Pujas', key: 'Pujas', permKey: 'puja' },
      { icon: '📦', label: 'Puja Orders', key: 'PujaOrders', permKey: 'puja' },
    ]
  },
  {
    section: 'Reports & Tools', items: [
      { icon: '📋', label: 'Report Requests', key: 'Reports', permKey: 'reports' },
      { icon: '⭐', label: 'User Reviews', key: 'Reviews', permKey: 'reviews' },
      { icon: '👥', label: 'Followers', key: 'Followers', permKey: 'followers' },
      { icon: '🔔', label: 'Notifications', key: 'Notifications', permKey: 'notifications' },
      { icon: '📜', label: 'Check Kundali', key: 'Kundali', permKey: 'kundali' },
      { icon: '💖', label: 'Match Kundali', key: 'KundaliMatching', permKey: 'kundali_matching' },
    ]
  },
];

const MoreScreen = ({ onOpenSubScreen }) => {
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();

  // Filter sections and items by permissions
  const MENU_ITEMS = ALL_MENU_ITEMS
    .map(section => ({
      ...section,
      items: section.items.filter(item => can(item.permKey)),
    }))
    .filter(section => section.items.length > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader title="More" subtitle="Features & Tools" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {MENU_ITEMS.map(section => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.menuItem, idx < section.items.length - 1 && styles.menuItemBordered]}
                  onPress={() => onOpenSubScreen?.(item.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  <Text style={styles.menuItemArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.versionCard}>
          <Text style={styles.versionText}>🔮 AstroVell Astrologer</Text>
          <Text style={styles.versionSub}>Version 1.0.0 • Powered by AstroVell</Text>
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
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
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
  versionText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  versionSub: { color: colors.textMuted, fontSize: 11, marginTop: 4, opacity: 0.6 },
});
