import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * GoldHeader — shared screen header with a gold OS status-bar strip + dark
 * status-bar icons + a white title bar. Drop-in replacement for ScreenHeader.
 * Props: title, subtitle?, onBack?, rightAction? { icon, onPress }
 */
const GoldHeader = ({ title, subtitle, onBack, rightAction }) => {
  const insets = useSafeAreaInsets();
  return (
    <View>
      {/* Dark icons so OS time/network/battery stay visible on gold */}
      <StatusBar style="dark" />
      {/* Gold status-bar strip */}
      <View style={{ height: insets.top, backgroundColor: colors.gold }} />
      {/* White title bar */}
      <View style={styles.bar}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.sideBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.sidePlaceholder} />
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {rightAction ? (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.sideBtn} activeOpacity={0.7}>
            <Ionicons name={rightAction.icon} size={20} color={colors.goldDark} />
          </TouchableOpacity>
        ) : (
          <View style={styles.sidePlaceholder} />
        )}
      </View>
    </View>
  );
};

export default GoldHeader;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sideBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sidePlaceholder: { width: 38 },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { color: colors.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  subtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
});
