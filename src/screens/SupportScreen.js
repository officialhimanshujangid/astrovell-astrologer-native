import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import useTranslation from '../hooks/useTranslation';

const SupportScreen = ({ onBack }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('support')} onBack={onBack} />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.emoji}>🤝</Text>
        </View>
        <Text style={styles.title}>{t('support')}</Text>
        <Text style={styles.subtitle}>Our customer and partner support portal is currently being integrated. Check back soon to connect with our support agents.</Text>
      </View>
    </View>
  );
};

export default SupportScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E6FFFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#B2F5EA',
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
