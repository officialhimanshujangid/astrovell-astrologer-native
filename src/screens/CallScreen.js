import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const CallScreen = ({ onBack }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.centered}>
        <View style={styles.iconCircle}>
          <Ionicons name="call-outline" size={64} color={colors.goldDark} />
        </View>
        <Text style={styles.title}>Coming Soon!</Text>
        <Text style={styles.subText}>
          Voice and Video calling features for astrologers are currently under development. You will be able to manage your call availability and pricing here soon.
        </Text>
        <TouchableOpacity style={styles.homeBtn} onPress={onBack}>
          <Text style={styles.homeBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CallScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    height: 90, paddingTop: 35, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.goldBg, alignItems: 'center',
    justifyContent: 'center', marginBottom: 24,
    borderWidth: 2, borderColor: colors.gold,
  },
  title: { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 12 },
  subText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 30 },
  homeBtn: {
    backgroundColor: colors.gold, paddingHorizontal: 30,
    paddingVertical: 14, borderRadius: 25, shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1,
    shadowRadius: 8, elevation: 4,
  },
  homeBtnText: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
});
