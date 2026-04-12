import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import usePermissions from '../hooks/usePermissions';

const ALL_TABS = [
  { name: 'Dashboard', icon: '🏠', label: 'Dashboard', permKey: 'tab_dashboard' },
  { name: 'Wallet',    icon: '💰', label: 'Wallet',    permKey: 'tab_wallet'    },
  { name: 'Profile',  icon: '👤', label: 'Profile',   permKey: 'tab_profile'   },
  { name: 'More',     icon: '☰',  label: 'More',      permKey: 'tab_more'      },
];

const BottomTabBar = ({ activeTab, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();

  const TABS = ALL_TABS.filter(t => can(t.permKey));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => onTabPress(tab.name)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              <Text style={[styles.icon, isActive && styles.iconActive]}>{tab.icon}</Text>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default BottomTabBar;

const styles = StyleSheet.create({
  container: {
    flexDirection:   'row',
    backgroundColor: colors.surface,
    borderTopWidth:  1,
    borderTopColor:  colors.border,
    paddingTop:      8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconWrapActive: {
    backgroundColor: colors.secondary + '30',
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.secondary,
    fontWeight: '700',
  },
});
