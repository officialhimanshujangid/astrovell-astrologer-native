import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import DashboardScreen    from '../screens/DashboardScreen';
import WalletScreen       from '../screens/WalletScreen';
import ProfileScreen      from '../screens/ProfileScreen';
import MoreScreen         from '../screens/MoreScreen';
import ChatHistoryScreen  from '../screens/ChatHistoryScreen';
import CallHistoryScreen  from '../screens/CallHistoryScreen';
import ReviewsScreen      from '../screens/ReviewsScreen';
import ReportsScreen      from '../screens/ReportsScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import PujaScreen         from '../screens/PujaScreen';
import PujaOrdersScreen   from '../screens/PujaOrdersScreen';
import FollowersScreen    from '../screens/FollowersScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import KundaliScreen      from '../screens/KundaliScreen';
import KundaliMatchingScreen from '../screens/KundaliMatchingScreen';
import BottomTabBar       from '../components/BottomTabBar';
import { colors }         from '../theme/colors';
import usePermissions     from '../hooks/usePermissions';

const MainTabNavigator = () => {
  const [activeTab, setActiveTab]         = useState('Dashboard');
  const [activeSubScreen, setActiveSubScreen] = useState(null);
  const { can } = usePermissions();

  const openSubScreen = (name) => {
    // Guard: only open sub-screen if permission allows
    const subPermMap = {
      ChatHistory:   'chat',
      CallHistory:   'call',
      Reviews:       'reviews',
      Reports:       'reports',
      Appointments:  'appointments',
      Pujas:         'puja',
      PujaOrders:    'puja',
      Followers:     'followers',
      Notifications: 'notifications',
      Kundali:       'kundali',
      KundaliMatching: 'kundali_matching',
    };
    const permKey = subPermMap[name];
    if (permKey && !can(permKey)) return; // blocked
    setActiveSubScreen(name);
  };

  const closeSubScreen = () => setActiveSubScreen(null);

  // ── Sub-screen overlays ───────────────────────────────────────────────────
  if (activeSubScreen === 'ChatHistory')    return <ChatHistoryScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'CallHistory')    return <CallHistoryScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Reviews')        return <ReviewsScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Reports')        return <ReportsScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Appointments')   return <AppointmentsScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Pujas')          return <PujaScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'PujaOrders')     return <PujaOrdersScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Followers')      return <FollowersScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Notifications')  return <NotificationsScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'Kundali')        return <KundaliScreen onBack={closeSubScreen} />;
  if (activeSubScreen === 'KundaliMatching')return <KundaliMatchingScreen onBack={closeSubScreen} />;

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
});
