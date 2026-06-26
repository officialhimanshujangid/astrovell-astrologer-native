import React, { useState, useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';

import DashboardScreen    from '../screens/DashboardScreen';
import WalletScreen       from '../screens/WalletScreen';
import InvoiceScreen      from '../screens/InvoiceScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import MoreScreen         from '../screens/MoreScreen';
import ChatHistoryScreen  from '../screens/ChatHistoryScreen';
import CallHistoryScreen  from '../screens/CallHistoryScreen';
import CallScreen         from '../screens/CallScreen';
import ReviewsScreen      from '../screens/ReviewsScreen';
import ReportsScreen      from '../screens/ReportsScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import PujaScreen         from '../screens/PujaScreen';
import PujaOrdersScreen   from '../screens/PujaOrdersScreen';
import FollowersScreen    from '../screens/FollowersScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import KundaliScreen      from '../screens/KundaliScreen';
import KundaliMatchingScreen from '../screens/KundaliMatchingScreen';
import HoroscopeScreen    from '../screens/HoroscopeScreen';
import PanchangScreen     from '../screens/PanchangScreen';
import WaitlistScreen     from '../screens/WaitlistScreen';
import AssistantChatScreen from '../screens/AssistantChatScreen';
import SettingsScreen     from '../screens/SettingsScreen';
import SupportScreen      from '../screens/SupportScreen';
import FeedbackCeoScreen  from '../screens/FeedbackCeoScreen';
import BottomTabBar       from '../components/BottomTabBar';
import { colors }         from '../theme/colors';
import usePermissions     from '../hooks/usePermissions';
import { useNavigation }  from '@react-navigation/native';
import useActiveSession   from '../hooks/useActiveSession';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MainTabNavigator = () => {
  const [activeTab, setActiveTab]         = useState('Dashboard');
  const [activeSubScreen, setActiveSubScreen] = useState(null);
  const [subScreenParams, setSubScreenParams] = useState(null);
  const { can } = usePermissions();
  const navigation = useNavigation();
  const activeSession = useActiveSession();
  
  // ── Hardware Back Button Handling ─────────────────────────────────────────
  useEffect(() => {
    const onBackPress = () => {
      // If a sub-screen is open, close it
      if (activeSubScreen) {
        closeSubScreen();
        return true; // handled
      }
      // If we are not on the Dashboard tab, go to Dashboard
      if (activeTab !== 'Dashboard') {
        setActiveTab('Dashboard');
        return true; // handled
      }
      // Let the default behavior (exit app) happen
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeTab, activeSubScreen]);

  const openSubScreen = (name, params = null) => {
    console.log('[MainTabNavigator] openSubScreen called with:', name);
    if (name === 'Profile') {
      setActiveTab('Profile');
      return;
    }
    // Guard: only open sub-screen if permission allows
    const subPermMap = {
      ChatHistory:   'chat_history',
      CallHistory:   'call_history',
      Reviews:       'reviews',
      Reports:       'reports',
      Appointments:  'appointments',
      Pujas:         'puja',
      PujaOrders:    'puja_orders',
      Followers:     'followers',
      Notifications: 'notifications',
      Kundali:       'kundali',
      KundaliMatching: 'kundali_matching',
      Horoscope:     'horoscope',
      Panchang:      'panchang',
      Wallet:        'wallet',
      Waitlist:      'waitlist',
      AssistantChat: 'assistant_chat',
      Settings:      'settings',
      Support:       'support',
      FeedbackCeo:   'feedback_ceo',
    };
    const isSettingsSub = name && name.startsWith('Settings_');
    const lookupName = isSettingsSub ? 'Settings' : name;
    const permKey = subPermMap[lookupName];
    if (permKey && !can(permKey)) return; // blocked
    setActiveSubScreen(name);
    setSubScreenParams(params);
  };

  const closeSubScreen = () => {
    setActiveSubScreen(null);
    setSubScreenParams(null);
  };

  // ── Sub-screen overlays ───────────────────────────────────────────────────
  if (activeSubScreen === 'ChatHistory')    return <ChatHistoryScreen onBack={closeSubScreen} onOpenSubScreen={openSubScreen} />;
  if (activeSubScreen === 'CallHistory')    return <CallHistoryScreen onBack={closeSubScreen} onOpenSubScreen={openSubScreen} />;
  if (activeSubScreen === 'Reviews')        return <ReviewsScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Reports')        return <ReportsScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Appointments')   return <AppointmentsScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Pujas')          return <PujaScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'PujaOrders')     return <PujaOrdersScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Followers')      return <FollowersScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Notifications')  return <NotificationsScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Kundali')        return <KundaliScreen onBack={closeSubScreen} initialParams={subScreenParams} />;
  if (activeSubScreen === 'KundaliMatching')return <KundaliMatchingScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Horoscope')      return <HoroscopeScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Panchang')       return <PanchangScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Wallet')         return <WalletScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Invoices')       return <InvoiceScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Waitlist')       return <WaitlistScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'AssistantChat')  return <AssistantChatScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Settings' || (activeSubScreen && activeSubScreen.startsWith('Settings_'))) {
    const initialSub = activeSubScreen.startsWith('Settings_') ? activeSubScreen.split('_')[1] : null;
    return <SettingsScreen onBack={closeSubScreen} initialSubScreen={initialSub} />;
  }
  if (activeSubScreen === 'Support')        return <SupportScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'FeedbackCeo')    return <FeedbackCeoScreen onBack={closeSubScreen} />;

  const renderScreen = () => {
    switch (activeTab) {
      case 'Wallet':
        return can('tab_wallet') ? <WalletScreen /> : <DashboardScreen onOpenSubScreen={openSubScreen} />;
      case 'Profile':
        return can('tab_profile') ? <ProfileScreen onOpenSubScreen={openSubScreen} /> : <DashboardScreen onOpenSubScreen={openSubScreen} />;
      case 'More':
        return can('tab_more') ? <MoreScreen onOpenSubScreen={openSubScreen} /> : <DashboardScreen onOpenSubScreen={openSubScreen} />;
      default:
        return <DashboardScreen onOpenSubScreen={openSubScreen} />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.screenArea}>{renderScreen()}</View>
      <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
};

export default MainTabNavigator;

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.primary },
  screenArea: { flex: 1 },
  activeSessionBanner: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
    marginRight: 10,
    // Note: React Native doesn't support keyframe animations in StyleSheet easily
    // but we can add a simple pulse or just leave it solid for now.
  },
  bannerText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  resumeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  resumeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    marginRight: 4,
  },
});
