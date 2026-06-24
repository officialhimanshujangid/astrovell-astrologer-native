import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { colors } from '../theme/colors';

import LoginScreen from '../screens/LoginScreen';
import OtpScreen from '../screens/OtpScreen';
import RegisterScreen from '../screens/RegisterScreen';
import MainTabNavigator from './MainTabNavigator';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import CallRoomScreen from '../screens/CallRoomScreen';
import KundaliScreen from '../screens/KundaliScreen';
import SetupPreferenceScreen from '../screens/SetupPreferenceScreen';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.emoji}>🔮</Text>
    <ActivityIndicator size="large" color={colors.gold} style={{ marginBottom: 16 }} />
    <Text style={styles.title}>Astrovell Astrologer</Text>
    <Text style={styles.sub}>Loading your panel...</Text>
  </View>
);

const AppNavigator = () => {
  const { isLoggedIn, setupCompleted } = useSelector((s) => s.auth);

  console.log('[AppNavigator] Flow Check:', { isLoggedIn, setupCompleted });

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Otp" component={OtpScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : !setupCompleted ? (
        <Stack.Screen name="SetupPreference" component={SetupPreferenceScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          <Stack.Screen name="CallRoom" component={CallRoomScreen} />
          <Stack.Screen name="Kundali" component={KundaliScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  sub: { color: colors.textMuted, fontSize: 13 },
});
