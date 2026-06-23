import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import useTranslation from '../hooks/useTranslation';

const SUPPORT_WHATSAPP = '918529411977';

const SupportScreen = ({ onBack }) => {
  const { t } = useTranslation();

  const openWhatsApp = () => {
    const msg = encodeURIComponent('Hi Astrovell team, I need help with the astrologer app.');
    Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}`).catch(() => { });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('support')} onBack={onBack} />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.emoji}>🤝</Text>
        </View>
        <Text style={styles.title}>{t('support')}</Text>
        <Text style={styles.subtitle}>
          Facing an issue? Reach our support team directly on WhatsApp and we’ll help you out.
        </Text>

        <TouchableOpacity style={styles.waBtn} onPress={openWhatsApp} activeOpacity={0.85}>
          <View style={styles.waIcon}>
            <MaterialCommunityIcons name="whatsapp" size={22} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.waLabel}>Customer Support (WhatsApp)</Text>
            <Text style={styles.waValue}>+91 85294 11977</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SupportScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: '#E6FFFA',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: '#B2F5EA',
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  waBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch',
    backgroundColor: '#25D366', borderRadius: 16, padding: 16,
    shadowColor: '#25D366', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  waIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  waLabel: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  waValue: { color: 'rgba(255,255,255,0.92)', fontSize: 13, fontWeight: '600', marginTop: 1 },
});
