import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { colors } from '../theme/colors';

import LoginScreen       from '../screens/LoginScreen';
import RegisterScreen    from '../screens/RegisterScreen';
import MainTabNavigator  from './MainTabNavigator';
import ChatRoomScreen    from '../screens/ChatRoomScreen';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.emoji}>🔮</Text>
    <ActivityIndicator size="large" color={colors.gold} style={{ marginBottom: 16 }} />
    <Text style={styles.title}>AstroVell Astrologer</Text>
    <Text style={styles.sub}>Loading your panel...</Text>
  </View>
);

const AppNavigator = () => {
  const { isLoggedIn, profileCheckLoading } = useSelector((s) => s.auth);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Login"    component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : profileCheckLoading ? (
        <Stack.Screen name="Loading" component={LoadingScreen} />
      ) : (
        <>
          <Stack.Screen name="Main"     component={MainTabNavigator} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
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
  sub:   { color: colors.textMuted, fontSize: 13 },
});
