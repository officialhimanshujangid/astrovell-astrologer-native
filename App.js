import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Platform } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { store, persistor } from './src/store/store';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { Audio } from 'expo-av';
import Toast from 'react-native-toast-message';
import { AlertProvider } from './src/context/AlertContext';
import { navigationRef } from './src/navigation/navigationRef';
import { CallProvider } from './src/context/CallContext';
import OngoingSessionPill from './src/components/OngoingSessionPill';
import SplashScreen from './src/screens/SplashScreen';
import { colors } from './src/theme/colors';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ff2255',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? 
      Constants?.easConfig?.projectId;

    try {
      if (!projectId || projectId.includes("1234") || projectId.includes("0000")) {
        console.log('Skipping token fetch: missing valid EAS projectId.');
      } else {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('Expo Push Token (Astrologer):', token);
      }
    } catch (e) {
      console.log('Push token fetch skipped (Expected in Expo Go SDK 53+)');
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

const LoadingView = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a0533' }}>
    <ActivityIndicator size="large" color="#f5c518" />
  </View>
);

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Configure global Audio settings so ringtones work on silent mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(console.warn);

    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(noti => {
      setNotification(noti);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped!', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={<LoadingView />} persistor={persistor}>
        <SafeAreaProvider>
          <AlertProvider>
            <CallProvider>
              {/* Global bottom safe-area inset so no screen's content sits behind
                  the Android system navigation bar (edge-to-edge is mandatory on
                  Expo SDK 54). Top inset stays per-screen. */}
              <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.text }}>
                <NavigationContainer ref={navigationRef}>
                  <AppNavigator />
                </NavigationContainer>
              </SafeAreaView>
              {/* Global ongoing call/chat pill — visible on every screen */}
              <OngoingSessionPill />
            </CallProvider>
          </AlertProvider>
          <Toast />
        </SafeAreaProvider>
      </PersistGate>
      {/* Animated launch splash — sits above everything (even the PersistGate
          loader) and fades itself out after ~2.6s. */}
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    </Provider>
  );
}
