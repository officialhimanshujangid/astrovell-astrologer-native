import React, { useRef, useEffect } from 'react';
import { Animated, TouchableWithoutFeedback, View, StyleSheet, Easing } from 'react-native';

/**
 * DayNightSwitch — a sun/moon day-night toggle (design ported from a Uiverse.io
 * CSS switch). Pure presentation: drop-in for <Switch>, same value/onValueChange
 * contract. ON (value=true) → day (sun, light blue); OFF → night (moon, navy).
 */
const W = 62;
const H = 32;
const KNOB = 26;
const PAD = 3;

const DayNightSwitch = ({ value, onValueChange, disabled }) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 350,
      easing: Easing.bezier(0, -0.02, 0.4, 1.25),
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const dayOpacity = anim;                                              // 1 = day
  const nightOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [PAD, W - KNOB - PAD] });
  const containerBg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#1D1F2C', '#3D7EAE'] });
  const knobBg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#C4C9D1', '#ECCA2F'] });

  return (
    <TouchableWithoutFeedback onPress={() => !disabled && onValueChange && onValueChange(!value)}>
      <Animated.View style={[styles.container, { backgroundColor: containerBg }, disabled && { opacity: 0.5 }]}>
        {/* Stars — night (right side, opposite the moon knob) */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: nightOpacity }]} pointerEvents="none">
          <View style={[styles.star, { width: 3, height: 3, top: 7, left: 40 }]} />
          <View style={[styles.star, { width: 2, height: 2, top: 15, left: 48 }]} />
          <View style={[styles.star, { width: 2, height: 2, top: 5, left: 50 }]} />
          <View style={[styles.star, { width: 2, height: 2, top: 20, left: 42 }]} />
        </Animated.View>

        {/* Clouds — day (left side, opposite the sun knob) */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: dayOpacity }]} pointerEvents="none">
          <View style={[styles.cloud, { width: 16, height: 7, bottom: 4, left: 6 }]} />
          <View style={[styles.cloud, { width: 11, height: 6, bottom: 9, left: 15 }]} />
        </Animated.View>

        {/* Knob — sun (day) / moon (night) */}
        <Animated.View style={[styles.knob, { backgroundColor: knobBg, transform: [{ translateX }] }]}>
          {/* Moon craters — visible at night */}
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: nightOpacity }]} pointerEvents="none">
            <View style={[styles.crater, { width: 7, height: 7, top: 6, left: 4 }]} />
            <View style={[styles.crater, { width: 4, height: 4, top: 14, left: 14 }]} />
            <View style={[styles.crater, { width: 3, height: 3, top: 4, left: 13 }]} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

export default DayNightSwitch;

const styles = StyleSheet.create({
  container: {
    width: W,
    height: H,
    borderRadius: H / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  knob: {
    position: 'absolute',
    top: (H - KNOB) / 2,
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  star: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 2 },
  cloud: { position: 'absolute', backgroundColor: '#F3FDFF', borderRadius: 6 },
  crater: { position: 'absolute', backgroundColor: '#959DB1', borderRadius: 4 },
});
