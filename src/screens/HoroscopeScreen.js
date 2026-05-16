import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { fetchDailyHoroscope, fetchLanguages, setLang, setSign } from '../store/slices/horoscopeSlice';
import { fetchHoroscopeSign } from '../store/slices/homeSlice';
import { colors } from '../theme/colors';

const SIGN_EMOJI = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const SIGN_NAMES_HI = {
  aries: 'मेष', taurus: 'वृषभ', gemini: 'मिथुन', cancer: 'कर्क',
  leo: 'सिंह', virgo: 'कन्या', libra: 'तुला', scorpio: 'वृश्चिक',
  sagittarius: 'धनु', capricorn: 'मकर', aquarius: 'कुंभ', pisces: 'मीन',
};

const LABELS = {
  en: {
    headerTitle: 'Daily Horoscope',
    todayInsight: "Today's Insight",
    luckyTraits: 'Lucky Traits',
    lifeAreas: 'Life Areas',
    score: 'Score',
    color: 'Color',
    number: 'Number',
    career: 'Career',
    family: 'Family',
    finances: 'Finances',
    friends: 'Friends',
    health: 'Health',
    physique: 'Physique',
    relationship: 'Relationship',
    status: 'Status',
    travel: 'Travel',
    loadingHoroscope: 'Unveiling cosmic secrets...',
    noHoroscope: 'Horoscope data is currently unavailable for this sign in this language.',
  },
  hi: {
    headerTitle: 'दैनिक राशिफल',
    todayInsight: 'आज का विचार',
    luckyTraits: 'भाग्यशाली लक्षण',
    lifeAreas: 'जीवन के क्षेत्र',
    score: 'स्कोर',
    color: 'रंग',
    number: 'नंबर',
    career: 'करियर',
    family: 'परिवार',
    finances: 'वित्त',
    friends: 'दोस्त',
    health: 'स्वास्थ्य',
    physique: 'शारीरिक संरचना',
    relationship: 'संबंध',
    status: 'स्थिति',
    travel: 'यात्रा',
    loadingHoroscope: 'ब्रह्मांडीय रहस्यों का अनावरण...',
    noHoroscope: 'इस भाषा में इस राशि के लिए राशिफल डेटा वर्तमान में अनुपलब्ध है।',
  },
};

const StatBar = ({ label, value, color }) => {
  const percent = value ? `${value}%` : '0%';
  return (
    <View style={styles.statLine}>
      <View style={styles.statLabelRow}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValueText, { color }]}>{percent}</Text>
      </View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: percent, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const HoroscopeScreen = ({ initialSign, onBack }) => {
  const dispatch = useDispatch();

  const { horoscopeSigns, signsLoad } = useSelector((s) => s.home);
  const { globalLang } = useSelector((s) => s.auth);
  const { languages, daily, dailyLoad, selectedLang, selectedSignId } = useSelector((s) => s.horoscope);

  const lang = globalLang || selectedLang || 'hi';

  // Use initialSign ID if passed, otherwise fallback to existing selection or signs[0]
  const currentSignId = selectedSignId || initialSign?.id || horoscopeSigns[0]?.id;
  const activeSign = horoscopeSigns.find(s => s.id === currentSignId);

  useEffect(() => {
    if (!horoscopeSigns.length) {
      dispatch(fetchHoroscopeSign());
    }
    if (!languages.length) {
      dispatch(fetchLanguages());
    }
  }, []);

  useEffect(() => {
    if (currentSignId && lang) {
      dispatch(fetchDailyHoroscope({ horoscopeSignId: currentSignId, langcode: lang }));
    }
  }, [currentSignId, lang]);

  const onSelectSign = (id) => {
    dispatch(setSign(id));
  };

  const todayData = daily?.todayHoroscope?.[0] || {};
  const { 
    bot_response, total_score, lucky_color, lucky_number, date,
    career, family, finances, friends, health, physique, relationship, status, travel
  } = todayData;

  const l = LABELS[lang] || LABELS.en;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* Yellow Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={22} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{l.headerTitle}</Text>

        {/* Language Picker */}
        {languages.length > 0 && (
          <View style={styles.langSelectorRow}>
            {languages.map((l) => (
              <TouchableOpacity
                key={l.id}
                onPress={() => dispatch(setLang(l.code))}
                style={[styles.langBtn, selectedLang === l.code && styles.langBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.langText, selectedLang === l.code && styles.langTextActive]}>
                  {l.code.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Signs Horizontal Scroll */}
      <View>
        {signsLoad ? (
           <ActivityIndicator color={colors.gold} style={{ paddingVertical: 20 }} />
        ) : (
           <ScrollView
             horizontal
             showsHorizontalScrollIndicator={false}
             style={styles.zodiacScroll}
             contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 16 }}
           >
             {horoscopeSigns.map((z) => {
               const slugGroup = z.slug?.toLowerCase();
               const emoji = SIGN_EMOJI[slugGroup] || '⭐';
               const displayName = (selectedLang === 'hi' && SIGN_NAMES_HI[slugGroup]) ? SIGN_NAMES_HI[slugGroup] : z.name;
               const isActive = z.id === currentSignId;
               return (
                 <TouchableOpacity
                   key={z.id}
                   onPress={() => onSelectSign(z.id)}
                   style={[styles.zodiacChip, isActive && styles.zodiacChipActive]}
                 >
                   <Text style={[styles.zodiacChipSign, isActive && { color: '#1A1A1A' }]}>{emoji}</Text>
                   <Text style={[styles.zodiacChipName, isActive && styles.zodiacChipNameActive]}>
                     {displayName}
                   </Text>
                 </TouchableOpacity>
               );
             })}
           </ScrollView>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Active Sign Header */}
        {activeSign && (
           <View style={{ alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
             <View style={styles.bigSignCircle}>
               <Text style={styles.bigSignEmoji}>{SIGN_EMOJI[activeSign.slug?.toLowerCase()] || '⭐'}</Text>
             </View>
             <Text style={styles.signTitleName}>
               {(selectedLang === 'hi' && SIGN_NAMES_HI[activeSign.slug?.toLowerCase()]) ? SIGN_NAMES_HI[activeSign.slug?.toLowerCase()] : activeSign.name}
             </Text>
             <Text style={styles.signTitleDate}>{date || new Date().toLocaleDateString()}</Text>
           </View>
        )}

        {/* Content Loading / Error */}
        {dailyLoad ? (
           <View style={styles.centerLoading}>
             <ActivityIndicator color={colors.gold} size="large" />
             <Text style={styles.loadingText}>{l.loadingHoroscope}</Text>
           </View>
        ) : (
           <>
             {/* Readout */}
             <View style={styles.summaryCard}>
               <Text style={styles.summaryEmoji}>🔮</Text>
               <Text style={styles.summaryTitle}>{l.todayInsight}</Text>
               <Text style={styles.summaryText}>
                 {bot_response || l.noHoroscope}
               </Text>
             </View>

             {/* Attributes Grid */}
             {total_score != null && (
               <>
                 <Text style={styles.sectionHeader}>{l.luckyTraits}</Text>
                 <View style={styles.traitsGrid}>
                   <View style={styles.traitBox}>
                     <Text style={styles.traitEmoji}>💯</Text>
                     <Text style={styles.traitVal}>{total_score}%</Text>
                     <Text style={styles.traitLbl}>{l.score}</Text>
                   </View>
                   <View style={styles.traitBox}>
                     <Text style={styles.traitEmoji}>🎨</Text>
                     <Text style={styles.traitVal}>{lucky_color || 'N/A'}</Text>
                     <Text style={styles.traitLbl}>{l.color}</Text>
                   </View>
                   <View style={styles.traitBox}>
                     <Text style={styles.traitEmoji}>🎲</Text>
                     <Text style={styles.traitVal}>{lucky_number || 'N/A'}</Text>
                     <Text style={styles.traitLbl}>{l.number}</Text>
                   </View>
                 </View>

                 <Text style={styles.sectionHeader}>{l.lifeAreas}</Text>
                 <View style={styles.statsCard}>
                   <StatBar label={l.career} value={career} color="#38bdf8" />
                   <StatBar label={l.health} value={health} color="#34d399" />
                   <StatBar label={l.finances} value={finances} color={colors.gold} />
                   <StatBar label={l.relationship} value={relationship} color="#f43f5e" />
                   <StatBar label={l.family} value={family} color="#a78bfa" />
                   <StatBar label={l.friends} value={friends} color="#fb923c" />
                   <StatBar label={l.travel} value={travel} color="#818cf8" />
                   <StatBar label={l.physique} value={physique} color="#14b8a6" />
                   <StatBar label={l.status} value={status} color="#e879f9" />
                 </View>
               </>
             )}
           </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

    </View>
  );
};

export default HoroscopeScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.secondary },

  // Header
  header: {
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12,
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    flexDirection: 'row', alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },

  langSelectorRow: { flexDirection: 'row', gap: 6 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: '#F5F5F5' },
  langBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  langText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  langTextActive: { color: '#1A1A1A', fontSize: 11, fontWeight: '800' },

  zodiacScroll: { paddingTop: 12, paddingBottom: 4, backgroundColor: colors.primary },
  zodiacChip: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    width: 68, height: 72,
  },
  zodiacChipActive: { borderColor: colors.gold, backgroundColor: colors.goldBg, transform: [{ scale: 1.05 }] },
  zodiacChipSign: { fontSize: 22, marginBottom: 4 },
  zodiacChipName: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  zodiacChipNameActive: { color: colors.goldDark, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 16 },

  bigSignCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.goldBg, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  bigSignEmoji:  { fontSize: 40 },
  signTitleName: { color: colors.goldDark, fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  signTitleDate: { color: colors.textMuted, fontSize: 14, marginTop: 4, fontWeight: '600' },

  centerLoading: { alignItems: 'center', marginTop: 60 },
  loadingText: { color: colors.textMuted, fontSize: 14, marginTop: 16 },

  summaryCard: {
    backgroundColor: colors.primary,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    padding: 18, marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryEmoji: { fontSize: 24, marginBottom: 8 },
  summaryTitle: { color: colors.goldDark, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  summaryText:  { color: colors.textSecondary, fontSize: 15, lineHeight: 24 },

  sectionHeader: { color: colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginLeft: 4 },

  traitsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  traitBox: {
    flex: 1, backgroundColor: colors.primary, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6,
  },
  traitEmoji: { fontSize: 22, marginBottom: 6 },
  traitVal: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 2, textAlign: 'center' },
  traitLbl: { color: colors.textMuted, fontSize: 10, fontWeight: '600' },

  statsCard: { backgroundColor: colors.primary, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 },
  statLine: { width: '100%' },
  statLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  statLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  statValueText: { fontSize: 13, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
});
