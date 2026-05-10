import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPanchang } from '../store/slices/panchangSlice';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// ── i18n Labels ───────────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title: 'Panchang',
    today: 'Today',
    sunrise: 'Sunrise', moonrise: 'Moonrise', abhijit: 'Abhijit',
    inauspicious: '⚠️  Inauspicious Times',
    rahuKaal: 'Rahu Kaal', gulika: 'Gulika', yamakanta: 'Yamakanta',
    tithi: '🌕  Tithi (Lunar Day)',
    nakshatra: '⭐  Nakshatra (Lunar Mansion)',
    yogaKarana: '🔱  Yoga & Karana',
    yoga: 'Yoga', karana: 'Karana',
    sunMoon: '☀️  Sun & Moon Positions',
    sun: 'Sun', moon: 'Moon',
    zodiac: 'Zodiac', nakshPtr: 'Nakshatra', rasi: 'Rasi',
    phase: 'Phase', rise: 'Rise', set: 'Set',
    vedicCal: '📅  Vedic Calendar',
    masa: 'Masa', ritu: 'Ritu (Season)', paksha: 'Paksha',
    tithiNo: 'Tithi No.', ayana: 'Ayana',
    fullMoon: 'Full Moon', newMoon: 'New Moon',
    samvaat: '🏺  Samvaat (Vedic Years)',
    vikram: 'Vikram Samvaat', saka: 'Saka Samvaat', kali: 'Kali Yuga',
    advanced: '🔭  View Advanced Details',
    loading: 'Reading the cosmic calendar…',
    retry: 'Retry',
    start: 'Start', end: 'End',
    next: 'Next →',
    diety: 'Diety', lord: 'Lord', number: 'Number', type: 'Type',
    pada: 'Pada', auspDir: 'Auspicious Direction',
    nextTithi: 'Next Tithi', nextNakshatra: 'Next Nakshatra',
    nextYoga: 'Next Yoga', nextKarana: 'Next Karana',
    meaning: 'Meaning', special: 'Special', summary: 'Summary',
    dishaShool: 'Disha Shool', moonYogini: 'Moon Yogini Nivas',
    ayanamsa: 'Ayanamsa', ayanamsaNo: 'Ayanamsa No.', ahargana: 'Ahargana',
    abhijitMuhurta: 'Abhijit Muhurta (Most Auspicious)',
    tamilCal: 'Tamil Calendar', month: 'Month', day: 'Day',
    advancedDetails: 'Advanced Details',
    selectDate: 'Select Date',
    pickDate: 'Pick a Date',
    cancel: 'Cancel',
    confirm: 'Confirm',
  },
  hi: {
    title: 'पंचांग',
    today: 'आज',
    sunrise: 'सूर्योदय', moonrise: 'चंद्रोदय', abhijit: 'अभिजित',
    inauspicious: '⚠️  अशुभ काल',
    rahuKaal: 'राहु काल', gulika: 'गुलिका', yamakanta: 'यमकंटक',
    tithi: '🌕  तिथि (चंद्र दिवस)',
    nakshatra: '⭐  नक्षत्र (चंद्र मंसिल)',
    yogaKarana: '🔱  योग और करण',
    yoga: 'योग', karana: 'करण',
    sunMoon: '☀️  सूर्य और चंद्र स्थिति',
    sun: 'सूर्य', moon: 'चंद्रमा',
    zodiac: 'राशि', nakshPtr: 'नक्षत्र', rasi: 'राशि',
    phase: 'पक्ष', rise: 'उदय', set: 'अस्त',
    vedicCal: '📅  वैदिक पंचांग',
    masa: 'मास', ritu: 'ऋतु', paksha: 'पक्ष',
    tithiNo: 'तिथि क्र.', ayana: 'अयन',
    fullMoon: 'पूर्णिमा', newMoon: 'अमावस्या',
    samvaat: '🏺  संवत्',
    vikram: 'विक्रम संवत्', saka: 'शक संवत्', kali: 'कलि युग',
    advanced: '🔭  विस्तृत विवरण देखें',
    loading: 'ब्रह्मांडीय कैलेंडर पढ़ा जा रहा है…',
    retry: 'पुनः प्रयास',
    start: 'आरंभ', end: 'समाप्त',
    next: 'अगला →',
    diety: 'देवता', lord: 'स्वामी', number: 'क्रमांक', type: 'प्रकार',
    pada: 'पद', auspDir: 'शुभ दिशा',
    nextTithi: 'अगली तिथि', nextNakshatra: 'अगला नक्षत्र',
    nextYoga: 'अगला योग', nextKarana: 'अगला करण',
    meaning: 'अर्थ', special: 'विशेष', summary: 'सारांश',
    dishaShool: 'दिशाशूल', moonYogini: 'चंद्र योगिनी निवास',
    ayanamsa: 'अयनांश', ayanamsaNo: 'अयनांश संख्या', ahargana: 'अहर्गण',
    abhijitMuhurta: 'अभिजित मुहूर्त (सर्वश्रेष्ठ शुभ)',
    tamilCal: 'तमिल पंचांग', month: 'माह', day: 'दिन',
    advancedDetails: 'विस्तृत विवरण',
    selectDate: 'तारीख चुनें',
    pickDate: 'तारीख चुनें',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
  },
};

// ── Date Helpers ─────────────────────────────────────────────────────────────

// JS Date → "DD/MM/YYYY" (API format)
const toApiDate = (d) => {
  const dd   = String(d.getDate()).padStart(2, '0');
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// JS Date → "Wed, 29 Mar 2026"
const toDisplayDate = (d) =>
  d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

const isToday = (d) => {
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
};

const addDays = (d, n) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

// Month name lists
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_HI = ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर'];
const DAYS_EN   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DAYS_HI   = ['रवि','सोम','मंगल','बुध','गुरु','शुक्र','शनि'];

const fmtTime = (str) => {
  if (!str) return '—';
  const match = str.match(/\d+:\d+:\d+\s+[AP]M/i);
  return match ? match[0] : str;
};

const fmtApiShort = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return dateStr; }
};

// ── Mini Calendar Picker ──────────────────────────────────────────────────────

const CalendarModal = ({ visible, selected, onConfirm, onClose, lang }) => {
  const l = LABELS[lang];
  const MONTHS = lang === 'hi' ? MONTHS_HI : MONTHS_EN;
  const DAYS   = lang === 'hi' ? DAYS_HI   : DAYS_EN;

  const [view, setView] = useState(() => new Date(selected));

  useEffect(() => { if (visible) setView(new Date(selected)); }, [visible]);

  const [picking, setPicking] = useState(selected);

  const year  = view.getFullYear();
  const month = view.getMonth();

  // Build grid – 6 weeks
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const today = new Date();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={cal.overlay}>
        <View style={cal.sheet}>
          {/* Month Nav */}
          <View style={cal.navRow}>
            <TouchableOpacity onPress={() => setView(new Date(year, month - 1, 1))} style={cal.navBtn}>
              <Text style={cal.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={cal.monthTitle}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={() => setView(new Date(year, month + 1, 1))} style={cal.navBtn}>
              <Text style={cal.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={cal.dayRow}>
            {DAYS.map(d => <Text key={d} style={cal.dayHdr}>{d}</Text>)}
          </View>

          {/* Grid */}
          <View style={cal.grid}>
            {cells.map((date, i) => {
              if (!date) return <View key={`e${i}`} style={cal.cell} />;
              const isSel = date.toDateString() === picking.toDateString();
              const isTod = date.toDateString() === today.toDateString();
              return (
                <TouchableOpacity
                  key={date.toDateString()}
                  style={[cal.cell, isSel && cal.cellSel, isTod && !isSel && cal.cellToday]}
                  onPress={() => setPicking(date)}
                >
                  <Text style={[cal.cellText, isSel && cal.cellTextSel, isTod && !isSel && cal.cellTextToday]}>
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={cal.actions}>
            <TouchableOpacity onPress={onClose} style={cal.cancelBtn}>
              <Text style={cal.cancelText}>{l.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onConfirm(picking)} style={cal.confirmBtn}>
              <Text style={cal.confirmText}>{l.confirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel = ({ label }) => <Text style={styles.sectionLabel}>{label}</Text>;

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value || '—'}</Text>
  </View>
);

const PanchangCard = ({ title, emoji, color, children, onPress }) => (
  <TouchableOpacity
    style={[styles.card, { borderColor: color + '55' }]}
    activeOpacity={onPress ? 0.82 : 1}
    onPress={onPress}
  >
    <View style={[styles.cardHeader, { backgroundColor: color + '22' }]}>
      <Text style={styles.cardEmoji}>{emoji}</Text>
      <Text style={[styles.cardTitle, { color }]}>{title}</Text>
      {onPress && <Text style={[styles.cardChevron, { color }]}>›</Text>}
    </View>
    <View style={styles.cardBody}>{children}</View>
  </TouchableOpacity>
);

const TypeBadge = ({ label, type }) => {
  const isAuspicious = type === 'Benefic' || label?.toLowerCase().includes('shukla');
  return (
    <View style={[styles.badge, { backgroundColor: isAuspicious ? colors.successBg : colors.goldGlow }]}>
      <Text style={[styles.badgeText, { color: isAuspicious ? colors.success : colors.gold }]}>{label}</Text>
    </View>
  );
};

const TimeRange = ({ start, end, startLabel, endLabel }) => (
  <View style={styles.timeRangeRow}>
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{startLabel}</Text>
      <Text style={styles.timeValue}>{fmtTime(start)}</Text>
    </View>
    <View style={styles.timeSep} />
    <View style={styles.timeBox}>
      <Text style={styles.timeLabel}>{endLabel}</Text>
      <Text style={styles.timeValue}>{fmtTime(end)}</Text>
    </View>
  </View>
);

// ── Detail Modal ──────────────────────────────────────────────────────────────

const DetailModal = ({ visible, onClose, title, emoji, color, children }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalSheet}>
        <View style={[styles.modalHeader, { backgroundColor: color + '22' }]}>
          <Text style={styles.modalEmoji}>{emoji}</Text>
          <Text style={[styles.modalTitle, { color }]}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {children}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const ModalInfoRow = ({ icon, label, value }) => (
  <View style={styles.modalInfoRow}>
    <Text style={styles.modalInfoIcon}>{icon}</Text>
    <View style={styles.modalInfoRight}>
      <Text style={styles.modalInfoLabel}>{label}</Text>
      <Text style={styles.modalInfoValue}>{value || '—'}</Text>
    </View>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────

const PanchangScreen = ({ onBack }) => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector((s) => s.panchang);
  const { globalLang } = useSelector((s) => s.auth);
  const lang = globalLang || 'hi';

  const [selectedDate, setSelectedDate] = useState(new Date()); // current viewed date
  const [modal, setModal]         = useState(null);          // detail modal key
  const [calVisible, setCalVisible] = useState(false);       // calendar picker
  const [refreshing, setRefreshing] = useState(false);

  const l = LABELS[lang];

  const load = useCallback(
    (date, language) => {
      const params = { lang: language };
      if (!isToday(date)) params.date = toApiDate(date);
      dispatch(fetchPanchang(params));
    },
    [dispatch]
  );

  // Initial fetch based on globalLang
  useEffect(() => { load(selectedDate, lang); }, [lang]);

  // Navigate date by ±1
  const changeDay = (delta) => {
    const next = addDays(selectedDate, delta);
    setSelectedDate(next);
    load(next, lang);
  };

  // Pick from calendar
  const onCalConfirm = (date) => {
    setCalVisible(false);
    setSelectedDate(date);
    load(date, lang);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load(selectedDate, lang);
    setRefreshing(false);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <View style={styles.centerScreen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />
        <Text style={{ fontSize: 64 }}>🪐</Text>
        <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>{l.loading}</Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <View style={styles.centerScreen}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.headerBg} />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load(selectedDate, lang)}>
          <Text style={styles.retryText}>{l.retry}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) return null;

  const {
    day, date: apiDate, tithi, nakshatra, karana, yoga, ayanamsa, rasi,
    sun_position, advanced_details, rahukaal, gulika, yamakanta,
  } = data;

  const ad     = advanced_details || {};
  const masa   = ad.masa || {};
  const years  = ad.years || {};
  const abhijit = ad.abhijit_muhurta || {};

  // Show a loading overlay while refetching (date/lang switch)
  const showOverlay = loading && !!data;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.primary} />

      {/* ── Header ── */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.headerBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{l.title}</Text>
          <Text style={styles.headerDay}>{day?.name || '—'} ✦ {ad.vaara || ''}</Text>
          <Text style={styles.headerDate}>
            {isToday(selectedDate) ? `${l.today} · ` : ''}{toDisplayDate(selectedDate)}
          </Text>
        </View>
        <View style={styles.headerOrb} />
      </View>

      {/* ── Date Navigator Bar ── */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateNavArrow} onPress={() => changeDay(-1)} activeOpacity={0.7}>
          <Text style={styles.dateNavArrowText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateNavCenter} onPress={() => setCalVisible(true)} activeOpacity={0.8}>
          <Text style={styles.dateNavIcon}>📅</Text>
          <Text style={styles.dateNavLabel}>
            {isToday(selectedDate) ? l.today : toApiDate(selectedDate)}
          </Text>
          <Text style={styles.dateNavCaret}>▾</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dateNavArrow, isToday(selectedDate) && styles.dateNavArrowDisabled]}
          onPress={() => !isToday(selectedDate) && changeDay(1)}
          activeOpacity={0.7}
        >
          <Text style={[styles.dateNavArrowText, isToday(selectedDate) && { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Loading overlay on refetch */}
      {showOverlay && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.gold} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* ── Muhurta Banner ── */}
        <View style={styles.muhurtaBanner}>
          <View style={styles.muhurtaItem}>
            <Text style={styles.muhurtaEmoji}>☀️</Text>
            <Text style={styles.muhurtaLabel}>{l.sunrise}</Text>
            <Text style={styles.muhurtaValue}>{ad.sun_rise || '—'}</Text>
          </View>
          <View style={styles.muhurtaDivider} />
          <View style={styles.muhurtaItem}>
            <Text style={styles.muhurtaEmoji}>🌙</Text>
            <Text style={styles.muhurtaLabel}>{l.moonrise}</Text>
            <Text style={styles.muhurtaValue}>{ad.moon_rise || '—'}</Text>
          </View>
          <View style={styles.muhurtaDivider} />
          <View style={styles.muhurtaItem}>
            <Text style={styles.muhurtaEmoji}>🌟</Text>
            <Text style={styles.muhurtaLabel}>{l.abhijit}</Text>
            <Text style={styles.muhurtaValue}>
              {abhijit.start ? abhijit.start.split(' ')[0] : '—'}
            </Text>
          </View>
        </View>

        {/* ── Inauspicious Times ── */}
        <SectionLabel label={l.inauspicious} />
        <View style={styles.inauspiciousRow}>
          {[
            { emoji: '🔴', label: l.rahuKaal, val: rahukaal },
            { emoji: '🟠', label: l.gulika,   val: gulika },
            { emoji: '🟡', label: l.yamakanta, val: yamakanta },
          ].map((row, i) => (
            <View key={i} style={styles.inauspCard}>
              <Text style={styles.inauspEmoji}>{row.emoji}</Text>
              <Text style={styles.inauspLabel}>{row.label}</Text>
              <Text style={styles.inauspValue}>{row.val || '—'}</Text>
            </View>
          ))}
        </View>

        {/* ── Tithi ── */}
        <SectionLabel label={l.tithi} />
        <PanchangCard title={tithi?.name || '—'} emoji="🌕" color={colors.gold} onPress={() => setModal('tithi')}>
          <View style={styles.cardTopRow}>
            <TypeBadge label={tithi?.type} />
            <Text style={styles.cardSub}>{l.diety}: {tithi?.diety}</Text>
          </View>
          <Text style={styles.cardMeaning} numberOfLines={2}>{tithi?.meaning}</Text>
          <TimeRange start={tithi?.start} end={tithi?.end} startLabel={l.start} endLabel={l.end} />
          <Text style={styles.nextLabel}>{l.next} {tithi?.next_tithi}</Text>
        </PanchangCard>

        {/* ── Nakshatra ── */}
        <SectionLabel label={l.nakshatra} />
        <PanchangCard
          title={`${nakshatra?.name} (${l.pada} ${nakshatra?.pada})`}
          emoji="⭐"
          color={colors.purpleLight}
          onPress={() => setModal('nakshatra')}
        >
          <View style={styles.cardTopRow}><TypeBadge label={nakshatra?.special} /></View>
          <View style={styles.nakshatraRow}>
            <InfoRow icon="🪐" label={l.lord}  value={nakshatra?.lord} />
            <InfoRow icon="🙏" label={l.diety} value={nakshatra?.diety} />
          </View>
          <Text style={styles.cardMeaning} numberOfLines={2}>{nakshatra?.meaning}</Text>
          <TimeRange start={nakshatra?.start} end={nakshatra?.end} startLabel={l.start} endLabel={l.end} />
          <Text style={styles.nextLabel}>{l.next} {nakshatra?.next_nakshatra}</Text>
        </PanchangCard>

        {/* ── Yoga & Karana ── */}
        <SectionLabel label={l.yogaKarana} />
        <View style={styles.halfRow}>
          <TouchableOpacity style={[styles.halfCard, { borderColor: colors.success + '55' }]} activeOpacity={0.82} onPress={() => setModal('yoga')}>
            <View style={[styles.halfCardHeader, { backgroundColor: colors.success + '22' }]}>
              <Text style={styles.halfCardEmoji}>🔱</Text>
              <Text style={[styles.halfCardTitle, { color: colors.success }]}>{l.yoga}</Text>
              <Text style={[styles.cardChevron, { color: colors.success }]}>›</Text>
            </View>
            <View style={styles.halfCardBody}>
              <Text style={[styles.halfCardName, { color: colors.success }]}>{yoga?.name}</Text>
              <Text style={styles.halfCardMeaning} numberOfLines={3}>{yoga?.meaning}</Text>
              <Text style={styles.nextLabel}>{l.next} {yoga?.next_yoga}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.halfCard, { borderColor: '#38bdf855' }]} activeOpacity={0.82} onPress={() => setModal('karana')}>
            <View style={[styles.halfCardHeader, { backgroundColor: '#38bdf822' }]}>
              <Text style={styles.halfCardEmoji}>☯️</Text>
              <Text style={[styles.halfCardTitle, { color: '#38bdf8' }]}>{l.karana}</Text>
              <Text style={[styles.cardChevron, { color: '#38bdf8' }]}>›</Text>
            </View>
            <View style={styles.halfCardBody}>
              <Text style={[styles.halfCardName, { color: '#38bdf8' }]}>{karana?.name}</Text>
              <TypeBadge label={karana?.type} type={karana?.type} />
              <Text style={styles.nextLabel}>{l.next} {karana?.next_karana}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Sun & Moon ── */}
        <SectionLabel label={l.sunMoon} />
        <View style={styles.sunMoonRow}>
          <View style={[styles.sunMoonCard, { borderColor: colors.gold + '55' }]}>
            <Text style={styles.sunMoonEmoji}>☀️</Text>
            <Text style={[styles.sunMoonTitle, { color: colors.gold }]}>{l.sun}</Text>
            <InfoRow icon="♐" label={l.zodiac}   value={sun_position?.zodiac} />
            <InfoRow icon="⭐" label={l.nakshPtr} value={sun_position?.nakshatra} />
            <InfoRow icon="🌅" label={l.rise}     value={ad.sun_rise} />
            <InfoRow icon="🌇" label={l.set}      value={ad.sun_set} />
          </View>
          <View style={[styles.sunMoonCard, { borderColor: colors.purpleLight + '55' }]}>
            <Text style={styles.sunMoonEmoji}>🌙</Text>
            <Text style={[styles.sunMoonTitle, { color: colors.purpleLight }]}>{l.moon}</Text>
            <InfoRow icon="♋" label={l.rasi}  value={rasi?.name} />
            <InfoRow icon="🧭" label={l.phase} value={masa.moon_phase} />
            <InfoRow icon="🌕" label={l.rise}  value={ad.moon_rise} />
            <InfoRow icon="🌑" label={l.set}   value={ad.moon_set} />
          </View>
        </View>

        {/* ── Vedic Calendar ── */}
        <SectionLabel label={l.vedicCal} />
        <View style={styles.card}>
          <View style={[styles.cardHeader, { backgroundColor: 'rgba(245,200,66,0.12)' }]}>
            <Text style={styles.cardEmoji}>📅</Text>
            <Text style={[styles.cardTitle, { color: colors.gold }]}>{masa.amanta_name} {l.masa}</Text>
          </View>
          <View style={styles.cardBody}>
            <InfoRow icon="🪴" label={l.ritu}     value={masa.ritu} />
            <InfoRow icon="🌙" label={l.paksha}   value={masa.paksha} />
            <InfoRow icon="📆" label={l.tithiNo}  value={String(masa.amanta_date || '—')} />
            <InfoRow icon="🔆" label={l.ayana}    value={masa.ayana} />
            <InfoRow icon="🌕" label={l.fullMoon} value={fmtApiShort(ad.next_full_moon)} />
            <InfoRow icon="🌑" label={l.newMoon}  value={fmtApiShort(ad.next_new_moon)} />
          </View>
        </View>

        {/* ── Samvaat ── */}
        <SectionLabel label={l.samvaat} />
        <View style={styles.yearsContainer}>
          {[
            { label: l.vikram, value: `${years.vikram_samvaat} — ${years.vikram_samvaat_name}` },
            { label: l.saka,   value: `${years.saka} — ${years.saka_samvaat_name}` },
            { label: l.kali,   value: `${years.kali} — ${years.kali_samvaat_name}` },
          ].map((y, i) => (
            <View key={i} style={[styles.yearRow, i === 2 && { borderBottomWidth: 0 }]}>
              <Text style={styles.yearLabel}>{y.label}</Text>
              <Text style={styles.yearValue}>{y.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Advanced Button ── */}
        <TouchableOpacity style={styles.advancedBtn} activeOpacity={0.85} onPress={() => setModal('advanced')}>
          <Text style={styles.advancedBtnText}>{l.advanced}</Text>
          <Text style={styles.advancedBtnChevron}>›</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ═══ Calendar Picker Modal ═══ */}
      <CalendarModal
        visible={calVisible}
        selected={selectedDate}
        onConfirm={onCalConfirm}
        onClose={() => setCalVisible(false)}
        lang={lang}
      />

      {/* ═══ Detail Modals ═══ */}

      {/* Tithi */}
      <DetailModal visible={modal === 'tithi'} onClose={() => setModal(null)}
        title={`${l.tithi.replace(/[🌕⭐🔱☯️📅🏺☀️⚠️\s]+/g, '').trim()}: ${tithi?.name}`}
        emoji="🌕" color={colors.gold}>
        <ModalInfoRow icon="🔢" label={l.number}     value={String(tithi?.number || '—')} />
        <ModalInfoRow icon="✨" label={l.type}        value={tithi?.type} />
        <ModalInfoRow icon="🙏" label={l.diety}       value={tithi?.diety} />
        <ModalInfoRow icon="▶️" label={l.start}       value={fmtTime(tithi?.start)} />
        <ModalInfoRow icon="⏹️" label={l.end}         value={fmtTime(tithi?.end)} />
        <ModalInfoRow icon="➡️" label={l.nextTithi}   value={tithi?.next_tithi} />
        <View style={styles.modalTextBlock}>
          <Text style={styles.modalBlockTitle}>{l.meaning}</Text>
          <Text style={styles.modalBlockText}>{tithi?.meaning}</Text>
        </View>
        <View style={styles.modalTextBlock}>
          <Text style={styles.modalBlockTitle}>{l.special}</Text>
          <Text style={styles.modalBlockText}>{tithi?.special}</Text>
        </View>
      </DetailModal>

      {/* Nakshatra */}
      <DetailModal visible={modal === 'nakshatra'} onClose={() => setModal(null)}
        title={`${l.nakshatra.replace(/[⭐\s]+/g, '').trim()}: ${nakshatra?.name}`}
        emoji="⭐" color={colors.purpleLight}>
        <ModalInfoRow icon="🔢" label={l.number}        value={String(nakshatra?.number || '—')} />
        <ModalInfoRow icon="🌊" label={l.pada}          value={String(nakshatra?.pada || '—')} />
        <ModalInfoRow icon="🪐" label={l.lord}          value={nakshatra?.lord} />
        <ModalInfoRow icon="🙏" label={l.diety}         value={nakshatra?.diety} />
        <ModalInfoRow icon="🧭" label={l.auspDir}       value={nakshatra?.auspicious_disha?.join(', ')} />
        <ModalInfoRow icon="▶️" label={l.start}         value={fmtTime(nakshatra?.start)} />
        <ModalInfoRow icon="⏹️" label={l.end}           value={fmtTime(nakshatra?.end)} />
        <ModalInfoRow icon="➡️" label={l.nextNakshatra} value={nakshatra?.next_nakshatra} />
        <View style={styles.modalTextBlock}>
          <Text style={styles.modalBlockTitle}>{l.meaning}</Text>
          <Text style={styles.modalBlockText}>{nakshatra?.meaning}</Text>
        </View>
        <View style={styles.modalTextBlock}>
          <Text style={styles.modalBlockTitle}>{l.summary}</Text>
          <Text style={styles.modalBlockText}>{nakshatra?.summary}</Text>
        </View>
      </DetailModal>

      {/* Yoga */}
      <DetailModal visible={modal === 'yoga'} onClose={() => setModal(null)}
        title={`${l.yoga}: ${yoga?.name}`} emoji="🔱" color={colors.success}>
        <ModalInfoRow icon="🔢" label={l.number}   value={String(yoga?.number || '—')} />
        <ModalInfoRow icon="▶️" label={l.start}    value={fmtTime(yoga?.start)} />
        <ModalInfoRow icon="⏹️" label={l.end}      value={fmtTime(yoga?.end)} />
        <ModalInfoRow icon="➡️" label={l.nextYoga} value={yoga?.next_yoga} />
        <View style={styles.modalTextBlock}>
          <Text style={styles.modalBlockTitle}>{l.meaning}</Text>
          <Text style={styles.modalBlockText}>{yoga?.meaning}</Text>
        </View>
        <View style={styles.modalTextBlock}>
          <Text style={styles.modalBlockTitle}>{l.special}</Text>
          <Text style={styles.modalBlockText}>{yoga?.special}</Text>
        </View>
      </DetailModal>

      {/* Karana */}
      <DetailModal visible={modal === 'karana'} onClose={() => setModal(null)}
        title={`${l.karana}: ${karana?.name}`} emoji="☯️" color="#38bdf8">
        <ModalInfoRow icon="🔢" label={l.number}     value={String(karana?.number || '—')} />
        <ModalInfoRow icon="✨" label={l.type}        value={karana?.type} />
        <ModalInfoRow icon="🪐" label={l.lord}        value={karana?.lord} />
        <ModalInfoRow icon="🙏" label={l.diety}       value={karana?.diety} />
        <ModalInfoRow icon="▶️" label={l.start}       value={fmtTime(karana?.start)} />
        <ModalInfoRow icon="⏹️" label={l.end}         value={fmtTime(karana?.end)} />
        <ModalInfoRow icon="➡️" label={l.nextKarana}  value={karana?.next_karana} />
        <View style={styles.modalTextBlock}>
          <Text style={styles.modalBlockTitle}>{l.special}</Text>
          <Text style={styles.modalBlockText}>{karana?.special}</Text>
        </View>
      </DetailModal>

      {/* Advanced */}
      <DetailModal visible={modal === 'advanced'} onClose={() => setModal(null)}
        title={l.advancedDetails} emoji="🔭" color={colors.purpleLight}>
        <ModalInfoRow icon="🧭" label={l.dishaShool}  value={ad.disha_shool} />
        <ModalInfoRow icon="🌙" label={l.moonYogini}  value={ad.moon_yogini_nivas} />
        <ModalInfoRow icon="🏺" label={l.ayanamsa}    value={ayanamsa?.name} />
        <ModalInfoRow icon="🔆" label={l.ayanamsaNo}  value={ayanamsa?.number?.toFixed(4)} />
        <ModalInfoRow icon="📍" label={l.ahargana}    value={ad.ahargana?.toFixed(3)} />
        <View style={styles.modalTextBlock}>
          <Text style={styles.modalBlockTitle}>{l.abhijitMuhurta}</Text>
          <Text style={styles.modalBlockText}>{abhijit.start} — {abhijit.end}</Text>
        </View>
        <View style={styles.modalTextBlock}>
          <Text style={styles.modalBlockTitle}>{l.tamilCal}</Text>
          <Text style={styles.modalBlockText}>
            {l.month}: {masa.tamil_month} ({l.day} {masa.tamil_day}){'\n'}
            Ritu: {masa.ritu_tamil}
          </Text>
        </View>
      </DetailModal>
    </View>
  );
};

export default PanchangScreen;

// ── Calendar Styles ───────────────────────────────────────────────────────────
const CELL_SIZE = Math.floor((width - 80) / 7);

const cal = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  sheet:     { backgroundColor: colors.primary, borderRadius: 24, width: width - 40, borderWidth: 1, borderColor: '#EFEFEF', overflow: 'hidden',
               shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 12 },
  navRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  navBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  navArrow:  { color: colors.text, fontSize: 22, fontWeight: '300' },
  monthTitle:{ color: colors.text, fontSize: 16, fontWeight: '800' },
  dayRow:    { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 6 },
  dayHdr:    { width: CELL_SIZE, textAlign: 'center', color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, marginBottom: 16 },
  cell:      { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  cellSel:   { backgroundColor: colors.gold, borderRadius: CELL_SIZE / 2 },
  cellToday: { borderWidth: 1.5, borderColor: colors.gold, borderRadius: CELL_SIZE / 2, backgroundColor: colors.goldBg },
  cellText:  { color: colors.text, fontSize: 13 },
  cellTextSel:   { color: '#1A1A1A', fontWeight: '800' },
  cellTextToday: { color: colors.goldDark, fontWeight: '700' },
  actions:   { flexDirection: 'row', gap: 12, padding: 16 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB', backgroundColor: '#F5F5F5', alignItems: 'center' },
  cancelText:{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  confirmBtn:{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.gold, alignItems: 'center' },
  confirmText:{ color: '#1A1A1A', fontSize: 14, fontWeight: '800' },
});

// ── Screen Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F7F7' },

  centerScreen: {
    flex: 1, backgroundColor: '#F7F7F7',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
  },
  loadingText: { color: colors.textSecondary, fontSize: 14, marginTop: 14, textAlign: 'center' },
  errorText:   { color: colors.error, fontSize: 15, textAlign: 'center', marginBottom: 20 },
  retryBtn:    { backgroundColor: colors.gold, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  retryText:   { color: '#1A1A1A', fontSize: 14, fontWeight: '800' },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    overflow: 'hidden',
  },
  headerOrb:  { position: 'absolute', right: -50, top: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.gold, opacity: 0.07 },
  headerBack: { marginRight: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 2 },
  headerDay:  { color: colors.goldDark, fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  headerDate: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  // Lang toggle
  langToggle:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#EBEBEB', gap: 6 },
  langActive:  { color: colors.goldDark, fontSize: 12, fontWeight: '800' },
  langSep:     { color: '#DDD', fontSize: 12 },
  langInactive:{ color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  // ── Date Navigator ───────────────────────────────────────────────────────
  dateNav: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  dateNavArrow:         { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  dateNavArrowDisabled: { opacity: 0.3 },
  dateNavArrowText:     { color: colors.text, fontSize: 22, fontWeight: '300' },
  dateNavCenter: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.goldBg, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 16, gap: 8,
    borderWidth: 1, borderColor: colors.borderGold,
  },
  dateNavIcon:  { fontSize: 16 },
  dateNavLabel: { color: colors.goldDark, fontSize: 14, fontWeight: '700' },
  dateNavCaret: { color: colors.goldDark, fontSize: 11 },

  // Loading overlay
  loadingOverlay: {
    position: 'absolute', top: 160, alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 10,
    zIndex: 99,
    borderWidth: 1, borderColor: '#EFEFEF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 4,
  },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 10, marginTop: 6,
  },

  // ── Muhurta Banner ───────────────────────────────────────────────────────
  muhurtaBanner:  { backgroundColor: colors.primary, borderRadius: 18, borderWidth: 1, borderColor: colors.borderGold, flexDirection: 'row', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  muhurtaItem:    { flex: 1, alignItems: 'center', paddingVertical: 16 },
  muhurtaDivider: { width: 1, height: 40, backgroundColor: colors.borderGold },
  muhurtaEmoji:   { fontSize: 22, marginBottom: 4 },
  muhurtaLabel:   { color: colors.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 3 },
  muhurtaValue:   { color: colors.goldDark, fontSize: 12, fontWeight: '800' },

  // ── Inauspicious ─────────────────────────────────────────────────────────
  inauspiciousRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  inauspCard:  { flex: 1, backgroundColor: 'rgba(255,76,106,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,76,106,0.3)', padding: 10, alignItems: 'center' },
  inauspEmoji: { fontSize: 18, marginBottom: 4 },
  inauspLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' },
  inauspValue: { color: colors.error, fontSize: 10, fontWeight: '700', textAlign: 'center' },

  // ── Card ─────────────────────────────────────────────────────────────────
  card:       { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  cardEmoji:  { fontSize: 20 },
  cardTitle:  { flex: 1, fontSize: 16, fontWeight: '800' },
  cardChevron:{ fontSize: 22, fontWeight: '300' },
  cardBody:   { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardSub:    { color: colors.textMuted, fontSize: 11 },
  cardMeaning:{ color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  nakshatraRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  nextLabel:  { color: colors.textMuted, fontSize: 11, marginTop: 8 },

  badge:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  timeRangeRow: { flexDirection: 'row', backgroundColor: '#F8F8F8', borderRadius: 10, overflow: 'hidden', marginTop: 4 },
  timeBox:   { flex: 1, paddingVertical: 10, alignItems: 'center' },
  timeSep:   { width: 1, backgroundColor: colors.border, marginVertical: 8 },
  timeLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', marginBottom: 3 },
  timeValue: { color: colors.text, fontSize: 12, fontWeight: '700' },

  infoRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoIcon:  { fontSize: 13, marginRight: 6 },
  infoLabel: { color: colors.textMuted, fontSize: 11, marginRight: 4, minWidth: 64 },
  infoValue: { color: colors.textSecondary, fontSize: 11, flex: 1 },

  halfRow:       { flexDirection: 'row', gap: 10, marginBottom: 14 },
  halfCard:      { flex: 1, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  halfCardHeader:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  halfCardEmoji: { fontSize: 16 },
  halfCardTitle: { flex: 1, fontSize: 13, fontWeight: '800' },
  halfCardBody:  { padding: 12, paddingTop: 4 },
  halfCardName:  { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  halfCardMeaning: { color: colors.textSecondary, fontSize: 11, lineHeight: 17, marginBottom: 8 },

  sunMoonRow:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  sunMoonCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, padding: 14 },
  sunMoonEmoji:{ fontSize: 26, marginBottom: 4 },
  sunMoonTitle:{ fontSize: 16, fontWeight: '800', marginBottom: 10 },

  yearsContainer: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 14 },
  yearRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  yearLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  yearValue: { color: colors.goldDark, fontSize: 12, fontWeight: '700' },

  advancedBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.goldBg, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1, borderColor: colors.borderGold, marginBottom: 8 },
  advancedBtnText:  { color: colors.goldDark, fontSize: 14, fontWeight: '700' },
  advancedBtnChevron:{ color: colors.goldDark, fontSize: 22 },

  // ── Detail Modals ─────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: colors.primary, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', borderWidth: 1, borderColor: '#EFEFEF' },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalEmoji:   { fontSize: 24 },
  modalTitle:   { flex: 1, fontSize: 18, fontWeight: '800' },
  modalClose:   { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  modalCloseText:{ color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  modalContent:  { paddingHorizontal: 20, paddingTop: 16 },
  modalInfoRow:  { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  modalInfoIcon: { fontSize: 18, width: 28 },
  modalInfoRight:{ flex: 1 },
  modalInfoLabel:{ color: colors.textMuted, fontSize: 11, fontWeight: '600', marginBottom: 3 },
  modalInfoValue:{ color: colors.text, fontSize: 14, fontWeight: '700' },
  modalTextBlock:{ backgroundColor: colors.goldBg, borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.borderGold },
  modalBlockTitle:{ color: colors.goldDark, fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalBlockText: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
});
