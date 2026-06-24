/**
 * SplashScreen — Astrovell Astrologer
 *
 * Simple launch splash (matches the design reference): white background,
 * centered logo, app name, and a single spinning ring. Mounted above
 * everything in App.js and dismissed via `onDone` after `duration` ms.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { colors } from '../theme/colors';

const SplashScreen = ({ onDone, duration = 2200 }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous spinner
    const loop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
    );
    loop.start();

    // Auto-dismiss
    const t = setTimeout(() => onDone && onDone(), duration);
    return () => { loop.stop(); clearTimeout(t); };
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.appName}>Astrovell Astrologer</Text>
      <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 24,
  },
  appName: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 26,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: colors.border,
    borderTopColor: colors.gold,
  },
});
