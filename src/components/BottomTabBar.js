import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';
import useTranslation from '../hooks/useTranslation';

const ALL_TABS = [
  { name: 'Dashboard', icon: 'home', iconOutline: 'home-outline', labelKey: 'home', permKey: 'tab_dashboard' },
  { name: 'Wallet',    icon: 'wallet', iconOutline: 'wallet-outline', labelKey: 'wallet', permKey: 'tab_wallet' },
  { name: 'Profile',   icon: 'person', iconOutline: 'person-outline', labelKey: 'profile', permKey: 'tab_profile' },
  { name: 'More',      icon: 'grid', iconOutline: 'grid-outline', labelKey: 'more', permKey: 'tab_more' },
];

const BottomTabBar = ({ activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();
  const { t } = useTranslation();

  const TABS = ALL_TABS.filter(t => can(t.permKey));

  // System bottom inset is applied once globally by the SafeAreaView in App.js,
  // so only a small fixed padding is needed here (avoids double padding).
  return (
    <View style={[styles.container, { paddingBottom: 12, paddingTop: 10 }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Ionicons 
                name={isActive ? tab.icon : tab.iconOutline} 
                size={24} 
                color={isActive ? colors.goldDark : colors.textMuted} 
              />
              {isActive && <View style={styles.activeDot} />}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {t(tab.labelKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomTabBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    marginBottom: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.goldDark,
    position: 'absolute',
    bottom: -6,
  },
  label: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  labelActive: {
    color: colors.goldDark,
    fontWeight: '800',
  },
});
