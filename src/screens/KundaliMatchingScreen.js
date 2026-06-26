import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator, Dimensions,
  Platform, KeyboardAvoidingView, Modal, ImageBackground
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import apiClient from '../api/apiClient';
import { kundaliApi } from '../api/services';
import { locationService } from '../api/locationService';
import { colors } from '../theme/colors';
import GoldHeader from '../components/GoldHeader';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import Svg, { Circle } from 'react-native-svg';
import matchingPermissions from '../config/matching_permissions.json';


const { width } = Dimensions.get('window');

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  /*
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'or', label: 'Odia' }
  */
];

const KOOTA_META = {
  varna: { label: 'Varna', max: 1, hint: 'Spiritual / ego compatibility' },
  vasya: { label: 'Vasya', max: 2, hint: 'Mutual attraction & control' },
  tara: { label: 'Tara', max: 3, hint: 'Birth-star auspiciousness' },
  yoni: { label: 'Yoni', max: 4, hint: 'Sexual & physical compatibility' },
  graha_maitri: { label: 'Graha Maitri', max: 5, hint: 'Mental compatibility' },
  grahamaitri: { label: 'Graha Maitri', max: 5, hint: 'Mental compatibility' },
  gana: { label: 'Gana', max: 6, hint: 'Temperament harmony' },
  bhakoot: { label: 'Bhakoot', max: 7, hint: 'Wealth, family welfare' },
  nadi: { label: 'Nadi', max: 8, hint: 'Health & progeny' },
  // Dashakoot (South Indian) specific
  dina: { label: 'Dina', max: 3, hint: 'Day-to-day harmony' },
  mahendra: { label: 'Mahendra', max: 0, hint: 'Wealth & longevity' },
  stree_deergha: { label: 'Stree Deergha', max: 0, hint: 'Longevity of wife' },
  rajju: { label: 'Rajju', max: 0, hint: 'Mangalya / longevity of husband' },
  vedha: { label: 'Vedha', max: 0, hint: 'Avoidance of obstacles' },
};

const KOOTA_ORDER = [
  'varna', 'vasya', 'tara', 'dina', 'yoni', 'grahamaitri', 'graha_maitri',
  'gana', 'bhakoot', 'nadi', 'mahendra', 'stree_deergha', 'rajju', 'vedha'
];

const LABELS = {
  en: {
    title: 'Kundali Matching',
    heroTitle: 'Match Your Souls',
    heroDesc: 'Vedic compatibility analysis for a prosperous and happy married life.',
    boyDetails: "Boy's Details",
    girlDetails: "Girl's Details",
    fullName: 'Full Name',
    enterName: 'Enter full name',
    date: 'Date',
    time: 'Time',
    placeOfBirth: 'Place of Birth',
    searchCity: 'Search city, town...',
    locVerified: 'Location verified',
    calculate: 'Calculate Compatibility',
    conclusion: 'Conclusion',
    astroComp: 'Astro Comparison',
    panchangComp: 'Birth Panchang Comparison',
    ghatkaChakra: 'Ghatka Chakra',
    planetaryDetails: 'Planetary Details',
    manglikAnalysis: 'Manglik Dosha Analysis',
    papasamya: 'Papasamya Match',
    westernMatch: 'Western Astrology Match',
    gunaBreakdown: 'Guna-by-Guna Breakdown',
    reset: 'Reset & Match Another',
    charts: 'Birth Charts',
    north: 'North', south: 'South', east: 'East',
    loading: 'Calculating compatibility...',
    excellent: 'Excellent Match',
    good: 'Good Match',
    average: 'Average Match',
    poor: 'Poor Match',
    private: 'Your data is private & secure',
    selectLang: 'Select Language',
    close: 'Close',
    attribute: 'Attribute', boy: 'Boy', girl: 'Girl',
    panchang: 'Panchang',
    dosha: 'Dosha Analysis Summary', doshaDesc: 'Critical compatibility checkpoints',
    luckyFactors: 'Lucky Factors', luckyFactorsDesc: 'Personalized auspicious elements',
    quickMatch: 'Quick Match Result', aggregateMatch: 'Aggregate Match',
    aggregateMatchDesc: 'Comprehensive overall compatibility combining all factors',
    unfavorableFactors: 'Unfavorable Factors',
    boyPlanetary: "Boy's Planetary Positions",
    girlPlanetary: "Girl's Planetary Positions",
    planetHeader: 'Planet', zodiacHeader: 'Zodiac', houseHeader: 'House',
    nakshatraHeader: 'Nakshatra', padaHeader: 'P.', degreeHeader: 'Degree',
    avasthaHeader: 'Avastha', statusHeader: 'Status',
    ghatkaSub: 'Factors to avoid for prosperity',
    planetarySub: 'Precise positions at the time of birth',
    combust: 'Combust', retro: 'Retro', direct: 'Direct',
    manglikYes: 'Manglik', manglikNo: 'Not Manglik',
    intensity: 'Intensity', scoreLabel: 'SCORE',
    papasamyaSub: 'Malefic effects equality for harmony',
    papaMatch: 'Papa levels match', papaDiff: 'Papa levels differ',
    boyTotal: 'Boy Total', girlTotal: 'Girl Total',
    westernSub: 'Sun sign & element-based compatibility',
    compScore: 'COMPATIBILITY SCORE',
    compLabel: 'Compatibility:',
    planetaryPositions: 'Planetary Positions',
    ashtakoot: 'Ashtakoot', dashakoot: 'Dashakoot', overallScore: 'OVERALL SCORE',
    compatibilityLabel: 'COMPATIBILITY', verdictLabel: 'Verdict:',
    vAshtakoot: 'Ashtakoot', vManglik: 'Manglik', vDashakoot: 'Dashakoot',
    compScoreColon: 'Compatibility Score:',
    chartsSubTitle: 'Lagna (D1) & Navamsa (D9) charts for both',
    loadingCharts: 'Loading charts...',
    lagnaChartD1: 'LAGNA CHART (D1)', navamsaChartD9: 'NAVAMSA CHART (D9)',
    locationVerified: 'Location verified',
  },
  hi: {
    title: 'कुंडली मिलान',
    heroTitle: 'गुण मिलान',
    heroDesc: 'एक समृद्ध और सुखी वैवाहिक जीवन के लिए वैदिक संगतता विश्लेषण।',
    boyDetails: "लड़के का विवरण",
    girlDetails: "लड़की का विवरण",
    fullName: 'पूरा नाम',
    enterName: 'पूरा नाम दर्ज करें',
    date: 'तारीख',
    time: 'समय',
    placeOfBirth: 'जन्म स्थान',
    searchCity: 'शहर खोजें...',
    locVerified: 'स्थान सत्यापित',
    calculate: 'संगतता की गणना करें',
    conclusion: 'निष्कर्ष',
    astroComp: 'ज्योतिषीय तुलना',
    panchangComp: 'जन्म पंचांग तुलना',
    ghatkaChakra: 'घातक चक्र',
    planetaryDetails: 'ग्रह विवरण',
    manglikAnalysis: 'मांगलिक दोष विश्लेषण',
    papasamya: 'पापसाम्य मिलान',
    westernMatch: 'पश्चिमी ज्योतिष मिलान',
    gunaBreakdown: 'गुण-दर-गुण विवरण',
    reset: 'रीसेट और दूसरा मिलान करें',
    charts: 'जन्म कुंडली',
    north: 'उत्तर', south: 'दक्षिण', east: 'पूर्व',
    loading: 'संगतता की गणना हो रही है...',
    excellent: 'उत्कृष्ट मिलान',
    good: 'अच्छा मिलान',
    average: 'औसत मिलान',
    poor: 'कमजोर मिलान',
    private: 'आपका डेटा निजी और सुरक्षित है',
    selectLang: 'भाषा चुनें',
    close: 'बंद करें',
    attribute: 'विशेषता', boy: 'लड़का', girl: 'लड़की',
    panchang: 'पंचांग',
    dosha: 'दोष विश्लेषण सारांश', doshaDesc: 'महत्वपूर्ण संगतता जांच बिंदु',
    luckyFactors: 'भाग्यशाली कारक', luckyFactorsDesc: 'व्यक्तिगत शुभ तत्व',
    quickMatch: 'त्वरित मिलान परिणाम', aggregateMatch: 'समग्र मिलान',
    aggregateMatchDesc: 'सभी कारकों को मिलाकर समग्र संगतता',
    unfavorableFactors: 'अशुभ कारक',
    boyPlanetary: 'लड़के के ग्रह स्थितियां',
    girlPlanetary: 'लड़की के ग्रह स्थितियां',
    planetHeader: 'ग्रह', zodiacHeader: 'राशि', houseHeader: 'भाव',
    nakshatraHeader: 'नक्षत्र', padaHeader: 'पद', degreeHeader: 'अंश',
    avasthaHeader: 'अवस्था', statusHeader: 'स्थिति',
    ghatkaSub: 'समृद्धि के लिए बचने योग्य कारक',
    planetarySub: 'जन्म के समय सटीक स्थितियां',
    combust: 'अस्त', retro: 'वक्री', direct: 'मार्गी',
    manglikYes: 'मांगलिक', manglikNo: 'मांगलिक नहीं',
    intensity: 'तीव्रता', scoreLabel: 'स्कोर',
    papasamyaSub: 'सद्भाव के लिए अशुभ प्रभावों की समानता',
    papaMatch: 'पाप स्तर मेल खाते हैं', papaDiff: 'पाप स्तर भिन्न हैं',
    boyTotal: 'लड़के का कुल', girlTotal: 'लड़की का कुल',
    westernSub: 'सूर्य राशि और तत्व-आधारित संगतता',
    compScore: 'संगतता स्कोर',
    compLabel: 'संगतता:',
    planetaryPositions: 'ग्रह स्थितियां',
    ashtakoot: 'अष्टकूट', dashakoot: 'दशकूट', overallScore: 'कुल स्कोर',
    compatibilityLabel: 'संगतता', verdictLabel: 'निर्णय:',
    vAshtakoot: 'अष्टकूट', vManglik: 'मांगलिक', vDashakoot: 'दशकूट',
    compScoreColon: 'संगतता स्कोर:',
    chartsSubTitle: 'दोनों के लिए लग्न (D1) और नवांश (D9) चार्ट',
    loadingCharts: 'चार्ट लोड हो रहे हैं...',
    lagnaChartD1: 'लग्न कुंडली (D1)', navamsaChartD9: 'नवांश कुंडली (D9)',
    locationVerified: 'स्थान सत्यापित',
  }
};

const num = (v, fb = 0) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fb;
};
const pickStr = (...vals) => {
  for (const v of vals) if (v !== undefined && v !== null && v !== '') return String(v);
  return null;
};
const extractManglik = (rpt) => {
  if (!rpt || typeof rpt !== 'object') return null;
  const isManglik =
    rpt.manglik_by_mars === true || rpt.manglik_by_saturn === true || rpt.manglik_by_rahuketu === true ||
    rpt.is_present === true || rpt.is_present === 'true' ||
    rpt.manglik_present_rule?.is_present === true ||
    rpt.manglik === true || rpt.is_manglik === true ||
    (typeof rpt.score === 'number' && rpt.score > 0);
  const status = pickStr(rpt.manglik_status, rpt.status, rpt.bot_response);
  const presentRules = rpt.factors || rpt.manglik_present_rule?.based_on_rules || rpt.manglik_present_rule?.rules || [];
  const cancelRules = rpt.manglik_cancel_rule?.based_on_rules || rpt.manglik_cancel_rule?.rules || [];
  const percentage = rpt.score ?? rpt.percentage_manglik_present ?? rpt.manglik_percent;
  return { isManglik, status, presentRules, cancelRules, percentage };
};
const extractChart = (cd) => {
  if (cd === null || cd === undefined) return null;
  if (typeof cd === 'string') return cd;
  if (typeof cd === 'object') {
    const fields = ['svg', 'svgString', 'svg_string', 'base64Image', 'base64', 'b64',
      'image_url', 'imageUrl', 'chart_url', 'chartUrl',
      'chart_image', 'chartImage', 'chart', 'image', 'url', 'src',
      'data', 'response'];
    for (const f of fields) if (cd[f]) return cd[f];
    const keys = Object.keys(cd);
    if (keys.length === 1 && typeof cd[keys[0]] === 'string') return cd[keys[0]];
  }
  return null;
};
const cleanSvg = (str) => {
  if (typeof str !== 'string') return null;
  const idx = str.indexOf('<svg');
  if (idx < 0) return null;
  return str.substring(idx).replace(/<svg([^>]*)>/, (m, attrs) => {
    const hasViewBox = /viewBox\s*=/i.test(attrs);
    const wMatch = attrs.match(/\bwidth\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
    const hMatch = attrs.match(/\bheight\s*=\s*["']?(\d+(?:\.\d+)?)["']?/i);
    let newAttrs = attrs
      .replace(/\bwidth\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '')
      .replace(/\bheight\s*=\s*["']?\d+(?:\.\d+)?["']?/i, '');
    if (!hasViewBox && wMatch && hMatch) newAttrs = ` viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"` + newAttrs;
    return `<svg width="100%" height="auto" preserveAspectRatio="xMidYMid meet"${newAttrs}>`;
  });
};
const isRetro = (p) => p?.retro === 1 || p?.retro === '1' || p?.retro === true || p?.isRetro === true || p?.isRetro === 'true';
const buildDegreeMap = (report) => {
  if (!report) return {};
  const raw = Array.isArray(report) ? report : Object.values(report);
  const map = {};
  raw.forEach(p => {
    if (!p || typeof p !== 'object') return;
    const code = p.name || p.short_name;
    if (!code) return;
    const deg = p.local_degree || p.normDegree || p.fullDegree || p.degree;
    if (deg === undefined || deg === null || deg === '') return;
    const n = parseFloat(deg);
    if (!Number.isFinite(n)) return;
    const abs = Math.abs(n);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    map[code] = `${d}°${String(m).padStart(2, '0')}'${isRetro(p) ? 'R' : ''}`;
  });
  return map;
};
const injectDegreesIntoSvg = (svgStr, degreeMap) => {
  if (!svgStr || typeof svgStr !== 'string') return svgStr;
  if (!degreeMap || !Object.keys(degreeMap).length) return svgStr;
  return svgStr.replace(
    /<text\s+([^>]*?)>\s*([A-Za-z]{2,4})\s*<\/text>/g,
    (match, attrs, content) => {
      const planet = content.trim();
      if (!degreeMap[planet]) return match;
      const xMatch = attrs.match(/\bx\s*=\s*["']?([-\d.]+)["']?/);
      const yMatch = attrs.match(/\by\s*=\s*["']?([-\d.]+)["']?/);
      if (!xMatch || !yMatch) return match;
      const x = parseFloat(xMatch[1]);
      const y = parseFloat(yMatch[1]);
      const degEl = `<text x="${x}" y="${y + 16}" style="font-family:'roboto','Lucida Sans',sans-serif;font-size:13px;fill:#7c3aed;font-weight:600;">${degreeMap[planet]}</text>`;
      return match + degEl;
    }
  );
};
const SectionTitle = ({ icon, title, sub }) => (
  <View>
    <View style={[styles.secHead, sub ? { marginBottom: 2 } : { marginBottom: 12 }]}>
      <View style={styles.secHeadIcon}><Ionicons name={icon} size={16} color="#E6A800" /></View>
      <Text style={styles.secHeadTitle}>{title}</Text>
    </View>
    {sub ? <Text style={styles.sectionSubTitle}>{sub}</Text> : null}
  </View>
);

const KundaliMatchingScreen = ({ onBack }) => {
  const { token, globalLang } = useSelector(s => s.auth);
  const [boy, setBoy] = useState({ name: '', birthDate: '', birthTime: '', birthPlace: '', latitude: '', longitude: '' });
  const [girl, setGirl] = useState({ name: '', birthDate: '', birthTime: '', birthPlace: '', latitude: '', longitude: '' });
  const [matchType, setMatchType] = useState('North');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState(globalLang || 'en');
  const [showLangModal, setShowLangModal] = useState(false);

  React.useEffect(() => {
    if (globalLang) setLang(globalLang);
  }, [globalLang]);

  const [chartStyle, setChartStyle] = useState('north');
  const [chartsLoading, setChartsLoading] = useState(false);
  const [boyCharts, setBoyCharts] = useState({});
  const [girlCharts, setGirlCharts] = useState({});
  const [boyKundaliId, setBoyKundaliId] = useState(null);
  const [girlKundaliId, setGirlKundaliId] = useState(null);

  const [placeLoading, setPlaceLoading] = useState({ boy: false, girl: false });
  const [suggestions, setSuggestions] = useState({ boy: [], girl: [] });
  const [showSuggestions, setShowSuggestions] = useState({ boy: false, girl: false });
  const debounceRef = useRef({ boy: null, girl: null });

  const [showPicker, setShowPicker] = useState({ visible: false, mode: 'date', target: null, key: '' });

  const canShowMatching = (sectionKey, subKey) => {
    const sec = matchingPermissions?.kundali_matching?.sections?.[sectionKey];
    if (!sec || sec.show === false) return false;
    if (subKey && sec.sections && sec.sections[subKey] === false) return false;
    return true;
  };



  const handleChange = (target, key, val) => {
    if (target === 'boy') setBoy(prev => ({ ...prev, [key]: val }));
    else setGirl(prev => ({ ...prev, [key]: val }));
  };

  const onChangePicker = (event, selectedDate) => {
    setShowPicker({ ...showPicker, visible: false });
    if (event.type === 'set' && selectedDate) {
      if (showPicker.mode === 'date') {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const date = String(selectedDate.getDate()).padStart(2, '0');
        handleChange(showPicker.target, showPicker.key, `${year}-${month}-${date}`);
      } else {
        const hs = selectedDate.getHours().toString().padStart(2, '0');
        const ms = selectedDate.getMinutes().toString().padStart(2, '0');
        handleChange(showPicker.target, showPicker.key, `${hs}:${ms}`);
      }
    }
  };

  const handlePlaceChange = (target, place) => {
    handleChange(target, 'birthPlace', place);
    handleChange(target, 'latitude', '');
    handleChange(target, 'longitude', '');

    if (debounceRef.current[target]) clearTimeout(debounceRef.current[target]);
    if (place.length < 2) {
      setSuggestions(prev => ({ ...prev, [target]: [] }));
      setShowSuggestions(prev => ({ ...prev, [target]: false }));
      return;
    }

    debounceRef.current[target] = setTimeout(async () => {
      setPlaceLoading(prev => ({ ...prev, [target]: true }));
      try {
        const results = await locationService.search(place);
        if (results?.length) {
          setSuggestions(prev => ({ ...prev, [target]: results }));
          setShowSuggestions(prev => ({ ...prev, [target]: true }));
        } else {
          setSuggestions(prev => ({ ...prev, [target]: [] }));
          setShowSuggestions(prev => ({ ...prev, [target]: false }));
        }
      } catch (err) {
        setSuggestions(prev => ({ ...prev, [target]: [] }));
      }
      setPlaceLoading(prev => ({ ...prev, [target]: false }));
    }, 400);
  };

  const selectPlace = async (target, suggestion) => {
    const data = {
      birthPlace: suggestion.name,
      latitude: suggestion.lat ? String(suggestion.lat) : '',
      longitude: suggestion.lon ? String(suggestion.lon) : '',
    };
    if (target === 'boy') setBoy(prev => ({ ...prev, ...data }));
    else setGirl(prev => ({ ...prev, ...data }));

    setSuggestions(prev => ({ ...prev, [target]: [] }));
    setShowSuggestions(prev => ({ ...prev, [target]: false }));

    if (!suggestion.lat) {
      try {
        const res = await locationService.geocode(suggestion.name);
        if (res?.latitude) {
          handleChange(target, 'latitude', String(res.latitude));
          handleChange(target, 'longitude', String(res.longitude));
        }
      } catch (e) { }
    }
  };

  const fetchOneChart = async (kundaliId, div, style, langCode) => {
    try {
      const res = await kundaliApi.getChartReport({ kundaliId, div, style, lang: langCode || lang });
      const cd = res.data?.data || res.data;
      return extractChart(cd?.chartDetails);
    } catch { return null; }
  };

  const fetchAllCharts = async (bId, gId, style, langCode) => {
    if (!bId || !gId) return;
    setChartsLoading(true);
    const [bD1, bD9, gD1, gD9] = await Promise.all([
      fetchOneChart(bId, 'D1', style, langCode),
      fetchOneChart(bId, 'D9', style, langCode),
      fetchOneChart(gId, 'D1', style, langCode),
      fetchOneChart(gId, 'D9', style, langCode),
    ]);
    setBoyCharts({ D1: bD1, D9: bD9 });
    setGirlCharts({ D1: gD1, D9: gD9 });
    setChartsLoading(false);
  };

  const onChangeChartStyle = (s) => {
    setChartStyle(s);
    if (boyKundaliId && girlKundaliId) fetchAllCharts(boyKundaliId, girlKundaliId, s, lang);
  };

  const handleSubmit = async () => {
    if (!boy.name || !boy.birthDate || !boy.birthTime || !boy.birthPlace ||
      !girl.name || !girl.birthDate || !girl.birthTime || !girl.birthPlace) {
      Toast.show({ type: 'error', text1: 'Missing Fields', text2: 'Please fill all fields for both Boy and Girl.' });
      return;
    }
    if (!boy.latitude || !girl.latitude) {
      Toast.show({ type: 'error', text1: 'Location Error', text2: 'Please select locations from suggestions.' });
      return;
    }

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [boyRes, girlRes] = await Promise.all([
        apiClient.post('/customer/kundali/add', { kundali: [{ ...boy, gender: 'Male', pdf_type: 'basic' }] }, { headers }),
        apiClient.post('/customer/kundali/add', { kundali: [{ ...girl, gender: 'Female', pdf_type: 'basic' }] }, { headers }),
      ]);

      const bId = boyRes.data?.data?.recordList?.[0]?.id || boyRes.data?.recordList?.[0]?.id;
      const gId = girlRes.data?.data?.recordList?.[0]?.id || girlRes.data?.recordList?.[0]?.id;

      if (!bId || !gId) throw new Error('Failed to create kundali profiles.');

      setBoyKundaliId(bId);
      setGirlKundaliId(gId);
      fetchAllCharts(bId, gId, chartStyle, lang);

      const matchRes = await apiClient.post('/customer/KundaliMatching/report', {
        maleKundaliId: bId,
        femaleKundaliId: gId,
        match_type: matchType,
        lang: lang
      }, { headers });

      setResult(matchRes.data?.data || matchRes.data);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || err.message });
    }
    setLoading(false);
  };

  const onChangeLang = async (newLang) => {
    setLang(newLang);
    setShowLangModal(false);
    if (result && boyKundaliId && girlKundaliId) {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const matchRes = await apiClient.post('/customer/KundaliMatching/report', {
          maleKundaliId: boyKundaliId,
          femaleKundaliId: girlKundaliId,
          match_type: matchType,
          lang: newLang
        }, { headers });
        setResult(matchRes.data?.data || matchRes.data);
        await fetchAllCharts(boyKundaliId, girlKundaliId, chartStyle, newLang);
      } catch (err) {
        console.log('Error changing language:', err);
      }
      setLoading(false);
    }
  };

  const matchData =
    result?.recordList ||
    result?.match_report ||
    result?.ashtakoot ||
    result?.ashtakoota ||
    result?.guna_milan ||
    result?.data?.recordList ||
    result?.data?.match_report ||
    result?.data ||
    result ||
    null;

  const totalReceived = num(
    matchData?.score
    ?? matchData?.total?.received_points
    ?? matchData?.score?.received_points
    ?? matchData?.received_points
    ?? matchData?.total?.score
    ?? matchData?.points
    ?? result?.total?.received_points
    ?? result?.score?.received_points
  );
  const totalMax = num(
    matchData?.total?.total_points
    ?? matchData?.score?.total_points
    ?? matchData?.total_points
    ?? matchData?.total?.max_score
    ?? result?.total?.total_points
    ?? 36,
    36
  );
  const conclusionText = pickStr(
    matchData?.bot_response,
    matchData?.conclusion?.report,
    typeof matchData?.conclusion === 'string' ? matchData.conclusion : null,
    result?.conclusion?.report,
    typeof result?.conclusion === 'string' ? result.conclusion : null,
    matchData?.message,
    result?.message
  );
  const scorePct = totalMax ? (totalReceived / totalMax) : 0;

  const getBand = (received, max) => {
    if (!max) return { label: 'N/A', color: '#9ca3af', icon: 'remove' };
    const pct = (received / max) * 100;
    const l = LABELS[lang];
    if (pct >= 75) return { label: l.excellent, color: '#10b981', icon: 'star' };
    if (pct >= 50) return { label: l.good, color: '#3b82f6', icon: 'sparkles' };
    if (pct >= 25) return { label: l.average, color: '#f59e0b', icon: 'git-compare' };
    return { label: l.poor, color: '#ef4444', icon: 'alert-circle' };
  };
  const band = getBand(totalReceived, totalMax);

  const kootasToRender = (() => {
    if (!matchData) return [];
    const seen = new Set();
    const out = [];
    for (const k of KOOTA_ORDER) {
      const data = matchData[k] || matchData[k.charAt(0).toUpperCase() + k.slice(1)] || matchData[k.toUpperCase()];
      if (data && typeof data === 'object') {
        const meta = KOOTA_META[k];
        if (meta && !seen.has(meta.label)) { out.push(k); seen.add(meta.label); }
      }
    }
    return out;
  })();

  const renderKootaItem = (key) => {
    const meta = KOOTA_META[key];
    const data = matchData?.[key] || matchData?.[key.charAt(0).toUpperCase() + key.slice(1)] || matchData?.[key.toUpperCase()];
    if (!meta || !data || typeof data !== 'object') return null;
    const got = num(
      data[key]
      ?? data[key.charAt(0).toUpperCase() + key.slice(1)]
      ?? data.received_points
      ?? data.score?.received_points
      ?? data.score
      ?? data.points
      ?? data.received_score,
      0
    );
    const max = num(
      data.full_score
      ?? data.total_points
      ?? data.score?.total_points
      ?? data.max_points
      ?? data.total_score
      ?? meta.max,
      meta.max
    );
    const desc = pickStr(data.description, data.bot_response, data.report, data.meaning);
    const pct = max ? (got / max) : 0;
    const barColor = pct >= 0.75 ? '#10b981' : pct >= 0.5 ? '#3b82f6' : pct >= 0.25 ? '#f59e0b' : '#ef4444';

    return (
      <View key={key} style={styles.kootaCard}>
        <View style={styles.kootaHeader}>
          <Text style={styles.kootaLabel}>{meta.label}</Text>
          <Text style={[styles.kootaScore, { color: barColor }]}>{got}/{max}</Text>
        </View>
        <View style={styles.kootaBarBg}>
          <View style={[styles.kootaBarFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={styles.kootaHint}>{meta.hint}</Text>
        {desc ? <Text style={styles.kootaDesc}>{desc}</Text> : null}
      </View>
    );
  };

  const CompRow = ({ label, b, g }) => (
    <View style={styles.compRow}>
      <Text style={[styles.compLabel, { flex: 1.2 }]}>{label}</Text>
      <Text style={styles.compVal}>{b || '-'}</Text>
      <Text style={styles.compVal}>{g || '-'}</Text>
    </View>
  );

  const renderComparison = () => {
    const boyD = matchData?.boy_details || matchData?.boy_astro_details || {};
    const girlD = matchData?.girl_details || matchData?.girl_astro_details || {};

    return (
      <View style={styles.sectionCard}>
        <SectionTitle icon="people" title={l.astroComp} />
        <View style={styles.compTable}>
          <View style={[styles.compHeader, { backgroundColor: '#E6A800' }]}>
            <Text style={[styles.compTh, { flex: 1.2, color: '#FFF' }]}>{l.attribute || 'Attribute'}</Text>
            <Text style={[styles.compTh, { flex: 1, color: '#FFF' }]}>{l.boy || 'Boy'}</Text>
            <Text style={[styles.compTh, { flex: 1, color: '#FFF' }]}>{l.girl || 'Girl'}</Text>
          </View>
          <CompRow label="Rashi" b={boyD?.rashi} g={girlD?.rashi} />
          <CompRow label="Nakshatra" b={boyD?.nakshatra} g={girlD?.nakshatra} />
          <CompRow label="Nakshatra Lord" b={boyD?.nakshatra_lord} g={girlD?.nakshatra_lord} />
          <CompRow label="Element (Tatva)" b={boyD?.tatva} g={girlD?.tatva} />
          <CompRow label="Paya" b={boyD?.paya} g={girlD?.paya} />
          <CompRow label="Current Dasha" b={boyD?.current_dasa} g={girlD?.current_dasa} />
        </View>
      </View>
    );
  };

  const renderPanchangComparison = () => {
    const boyP = result?.boyPlanets?.panchang || result?.boy_astro_details?.panchang;
    const girlP = result?.girlPlanets?.panchang || result?.girl_astro_details?.panchang;
    if (!boyP && !girlP) return null;

    return (
      <View style={styles.sectionCard}>
        <SectionTitle icon="partly-sunny" title={l.panchangComp} />
        <View style={styles.compTable}>
          <View style={[styles.compHeader, { backgroundColor: '#f59e0b' }]}>
            <Text style={[styles.compTh, { flex: 1.2, color: '#FFF' }]}>{l.panchang || 'Panchang'}</Text>
            <Text style={[styles.compTh, { flex: 1, color: '#FFF' }]}>{l.boy || 'Boy'}</Text>
            <Text style={[styles.compTh, { flex: 1, color: '#FFF' }]}>{l.girl || 'Girl'}</Text>
          </View>
          <CompRow label="Tithi" b={boyP?.tithi} g={girlP?.tithi} />
          <CompRow label="Yoga" b={boyP?.yoga} g={girlP?.yoga} />
          <CompRow label="Karana" b={boyP?.karana} g={girlP?.karana} />
          <CompRow label="Sunrise" b={boyP?.sunrise_at_birth} g={girlP?.sunrise_at_birth} />
          <CompRow label="Sunset" b={boyP?.sunset_at_birth} g={girlP?.sunset_at_birth} />
          <CompRow label="Day" b={boyP?.day_of_birth} g={girlP?.day_of_birth} />
        </View>
      </View>
    );
  };

  const renderGhatkaChakra = () => {
    const boyG = result?.boyPlanets?.ghatka_chakra || result?.boy_astro_details?.ghatka_chakra;
    const girlG = result?.girlPlanets?.ghatka_chakra || result?.girl_astro_details?.ghatka_chakra;
    if (!boyG && !girlG) return null;

    const GhatkaSection = ({ title, data, accent }) => (
      <View style={[styles.luckyBox, { borderTopColor: accent }]}>
        <Text style={[styles.luckyBoxTitle, { color: accent }]}>{title} - {l.unfavorableFactors}</Text>
        <View style={styles.luckyGrid}>
          <LuckyItem label="Rasi" value={data?.rasi} />
          <LuckyItem label="Day" value={data?.day} />
          <LuckyItem label="Nakshatra" value={data?.nakshatra} />
          <LuckyItem label="Tatva" value={data?.tatva} />
          <LuckyItem label="Tithi" value={Array.isArray(data?.tithi) ? data.tithi.join(', ') : data?.tithi} />
          <LuckyItem label="Lord" value={data?.lord} />
        </View>
      </View>
    );

    return (
      <View style={styles.sectionCard}>
        <SectionTitle icon="alert-circle" title={l.ghatkaChakra} sub={l.ghatkaSub} />
        <View style={{ gap: 12 }}>
          {boyG && <GhatkaSection title={result?.maleKundali?.name || 'Boy'} data={boyG} accent="#3b82f6" />}
          {girlG && <GhatkaSection title={result?.femaleKundali?.name || 'Girl'} data={girlG} accent="#ec4899" />}
        </View>
      </View>
    );
  };

  const renderPlanetaryPositions = () => {
    const boyP = result?.boyPlanets || result?.recordList?.boy_planetary_details;
    const girlP = result?.girlPlanets || result?.recordList?.girl_planetary_details;
    if (!boyP && !girlP) return null;

    const PlanetTable = ({ title, data, accent }) => {
      if (!data || typeof data !== 'object') return null;
      const planets = Object.keys(data).filter(k => !isNaN(k)).map(k => data[k]);
      if (planets.length === 0) return null;

      return (
        <View style={[styles.luckyBox, { borderTopColor: accent, padding: 0, overflow: 'hidden' }]}>
          <View style={{ padding: 12, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
            <Text style={[styles.luckyBoxTitle, { color: accent, marginBottom: 0 }]}>{title} - {l.planetaryPositions || 'Planetary Positions'}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={[styles.compHeader, { backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#DDD', paddingVertical: 8 }]}>
                <Text style={[styles.compTh, { width: 45, color: '#4B5563', fontSize: 10 }]}>{l.planetHeader}</Text>
                <Text style={[styles.compTh, { width: 75, color: '#4B5563', fontSize: 10 }]}>{l.zodiacHeader}</Text>
                <Text style={[styles.compTh, { width: 45, color: '#4B5563', fontSize: 10 }]}>{l.houseHeader}</Text>
                <Text style={[styles.compTh, { width: 90, color: '#4B5563', fontSize: 10 }]}>{l.nakshatraHeader}</Text>
                <Text style={[styles.compTh, { width: 35, color: '#4B5563', fontSize: 10 }]}>{l.padaHeader}</Text>
                <Text style={[styles.compTh, { width: 60, color: '#4B5563', fontSize: 10 }]}>{l.degreeHeader}</Text>
                <Text style={[styles.compTh, { width: 75, color: '#4B5563', fontSize: 10 }]}>{l.avasthaHeader}</Text>
                <Text style={[styles.compTh, { width: 65, color: '#4B5563', fontSize: 10 }]}>{l.statusHeader}</Text>
              </View>
              {planets.map((p, i) => (
                <View key={i} style={[styles.compRow, { borderBottomWidth: i === planets.length - 1 ? 0 : 1, borderBottomColor: '#EEE', paddingVertical: 10 }]}>
                  <Text style={[styles.compVal, { width: 45, textAlign: 'left', fontWeight: '800', fontSize: 11 }]}>{p?.name || '-'}</Text>
                  <Text style={[styles.compVal, { width: 75, textAlign: 'left', fontSize: 11 }]}>{p?.zodiac || '-'}</Text>
                  <Text style={[styles.compVal, { width: 45, fontSize: 11 }]}>{p?.house || '-'}</Text>
                  <Text style={[styles.compVal, { width: 90, textAlign: 'left', fontSize: 11 }]}>{p?.nakshatra || '-'}</Text>
                  <Text style={[styles.compVal, { width: 35, fontSize: 11 }]}>{p?.nakshatra_pada || '-'}</Text>
                  <Text style={[styles.compVal, { width: 60, fontSize: 11 }]}>{p?.local_degree ? p.local_degree.toFixed(2) : '-'}</Text>
                  <Text style={[styles.compVal, { width: 75, fontSize: 10, color: '#6b7280' }]}>{p?.basic_avastha || '-'}</Text>
                  <Text style={[styles.compVal, { width: 65, fontSize: 10, color: p?.is_combust ? '#ef4444' : p?.retro ? '#3b82f6' : '#10b981', fontWeight: '700' }]}>
                    {p?.is_combust ? l.combust : p?.retro ? l.retro : l.direct}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      );
    };

    return (
      <View style={styles.sectionCard}>
        <SectionTitle icon="planet" title={l.planetaryDetails} sub={l.planetarySub} />
        <View style={{ gap: 16 }}>
          {boyP && <PlanetTable title={result?.maleKundali?.name || 'Boy'} data={boyP} accent="#3b82f6" />}
          {girlP && <PlanetTable title={result?.femaleKundali?.name || 'Girl'} data={girlP} accent="#ec4899" />}
        </View>
      </View>
    );
  };

  const boyManglik = extractManglik(result?.boyManaglikRpt || result?.boyManglikRpt || result?.boy_manglik);
  const girlManglik = extractManglik(result?.girlMangalikRpt || result?.girlManglikRpt || result?.girl_manglik);

  const ManglikCard = ({ side, data, accent }) => {
    if (!data) return null;
    return (
      <View style={styles.manglikCard}>
        <View style={styles.manglikHeader}>
          <Text style={[styles.manglikTitle, { color: accent }]}>{side}</Text>
          <View style={[styles.manglikBadge, { backgroundColor: data.isManglik ? '#fee2e2' : '#dcfce7' }]}>
            <Text style={[styles.manglikBadgeText, { color: data.isManglik ? '#b91c1c' : '#166534' }]}>
              {data.isManglik ? l.manglikYes : l.manglikNo}
            </Text>
          </View>
        </View>
        {data.percentage != null && (
          <Text style={styles.manglikIntensity}>{l.intensity}: <Text style={{ fontWeight: '700', color: '#1A1A1A' }}>{data.percentage}%</Text></Text>
        )}
        {data.status ? <Text style={styles.manglikStatus}>{data.status}</Text> : null}

        {((Array.isArray(data.factors) && data.factors.length > 0) || (Array.isArray(data.aspects) && data.aspects.length > 0)) && (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
            {Array.isArray(data.factors) && data.factors.map((f, i) => <Text key={`f-${i}`} style={styles.manglikDetailText}>• {f}</Text>)}
            {Array.isArray(data.aspects) && data.aspects.map((a, i) => <Text key={`a-${i}`} style={[styles.manglikDetailText, { color: '#6b7280' }]}>◦ {a}</Text>)}
          </View>
        )}
      </View>
    );
  };

  const renderQuickMatch = () => {
    if (!result?.quickMatch || typeof result.quickMatch !== 'object') return null;
    const qm = result.quickMatch;
    const isCompatible = qm.is_compatible === true || qm.compatible === true || qm.match === true || /yes|good|excellent|compatible/i.test(String(qm.verdict || qm.result || qm.match));
    const scoreQ = qm.score ?? qm.compatibility_score ?? qm.percentage;
    const verdict = qm.verdict || qm.result || qm.match || qm.bot_response || qm.message;
    const description = qm.description || qm.bot_response;

    return (
      <View style={[styles.quickMatchCard, { backgroundColor: isCompatible ? '#d1fae5' : '#fee2e2', borderColor: isCompatible ? '#10b981' : '#dc2626' }]}>
        <View style={styles.qmHeader}>
          <Ionicons name={isCompatible ? 'flash' : 'alert-circle'} size={26} color={isCompatible ? '#065f46' : '#7f1d1d'} />
          <View style={{ flex: 1, paddingLeft: 10 }}>
            <Text style={[styles.qmTitle, { color: isCompatible ? '#065f46' : '#7f1d1d' }]}>{l.quickMatch}</Text>
            {verdict ? <Text style={styles.qmVerdict}>{String(verdict)}</Text> : null}
          </View>
          {scoreQ !== undefined && scoreQ !== null && (
            <View style={[styles.qmScoreBox, { borderColor: isCompatible ? '#10b981' : '#dc2626' }]}>
              <Text style={styles.qmScoreLabel}>{l.scoreLabel}</Text>
              <Text style={[styles.qmScoreValue, { color: isCompatible ? '#065f46' : '#7f1d1d' }]}>{scoreQ}</Text>
            </View>
          )}
        </View>
        {description && description !== verdict && <Text style={styles.qmDesc}>{String(description)}</Text>}
      </View>
    );
  };

  const renderAggregateMatch = () => {
    if (!result?.aggregateMatch) return null;
    const ag = result.aggregateMatch;
    const sc = ag.score ?? ag.match_score ?? ag.received_points ?? ag.total_points;
    const maxSc = ag.total_points ?? ag.max_score ?? 100;
    const verdict = ag.verdict || ag.bot_response || ag.message || ag.conclusion || ag.report;
    const desc = ag.description || ag.bot_response;
    const extended = ag.extended_response;
    const perc = ag.percentage || (typeof sc === 'number' && typeof maxSc === 'number' ? Math.round((sc / maxSc) * 100) : null);

    return (
      <View style={styles.aggCard}>
        <View style={styles.titleRow}>
          <Ionicons name="locate" size={16} color="#92400e" />
          <Text style={styles.aggTitle}>{l.aggregateMatch}</Text>
        </View>
        <Text style={styles.aggSub}>{l.aggregateMatchDesc}</Text>

        {(ag.ashtakoot_score || ag.dashkoot_score) && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {ag.ashtakoot_score && (
              <View style={styles.miniScore}>
                <Text style={styles.miniScoreLabel}>{l.ashtakoot}</Text>
                <Text style={styles.miniScoreVal}>{ag.ashtakoot_score}</Text>
              </View>
            )}
            {ag.dashkoot_score && (
              <View style={styles.miniScore}>
                <Text style={styles.miniScoreLabel}>{l.dashakoot}</Text>
                <Text style={styles.miniScoreVal}>{ag.dashkoot_score}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.aggRow}>
          {sc !== undefined && sc !== null && (
            <View style={styles.aggBox}>
              <Text style={styles.aggBoxLabel}>{l.overallScore}</Text>
              <Text style={styles.aggBoxVal}>{sc}{maxSc ? ` / ${maxSc}` : ''}</Text>
            </View>
          )}
          {perc !== null && (
            <View style={styles.aggBox}>
              <Text style={styles.aggBoxLabel}>{l.compatibilityLabel}</Text>
              <Text style={styles.aggBoxVal}>{perc}%</Text>
            </View>
          )}
        </View>
        {verdict ? <Text style={styles.aggVerdict}><Text style={{ fontWeight: '700', color: '#92400e' }}>{l.verdictLabel}</Text> {String(verdict)}</Text> : null}
        {extended ? <Text style={styles.aggDesc}>{String(extended)}</Text> : (desc && desc !== verdict ? <Text style={styles.aggDesc}>{String(desc)}</Text> : null)}
      </View>
    );
  };

  const renderDetailedDoshas = () => {
    const ag = result?.aggregateMatch;
    const rv = result?.rajjuVedha;
    if (!ag && !rv) return null;

    const items = [];
    if (ag?.mangaldosh) items.push({ title: 'Mars (Mangal)', text: ag.mangaldosh, ok: !/not favorable|bad|unfavorable|greater than/i.test(ag.mangaldosh) });
    if (ag?.pitradosh) items.push({ title: 'Pitra Dosha', text: ag.pitradosh, ok: !/have pitra dosha/i.test(ag.pitradosh) });
    if (ag?.kaalsarpdosh) items.push({ title: 'Kaal-Sarp', text: ag.kaalsarpdosh, ok: !/have kaal-sarp/i.test(ag.kaalsarpdosh) });

    const hasRajju = rv?.is_rajju_dosha_present === true || ag?.rajjudosh === true;
    const hasVedha = rv?.is_vedha_dosha_present === true || ag?.vedhadosh === true;

    if (hasRajju !== undefined) items.push({ title: 'Rajju Dosha', text: hasRajju ? 'Rajju Dosha is present' : 'No Rajju Dosha present', ok: !hasRajju });
    if (hasVedha !== undefined) items.push({ title: 'Vedha Dosha', text: hasVedha ? 'Vedha Dosha is present' : 'No Vedha Dosha present', ok: !hasVedha });

    if (items.length === 0) return null;

    return (
      <View style={styles.sectionCard}>
        <SectionTitle icon="shield-checkmark" title={l.dosha || 'Dosha Analysis Summary'} sub={l.doshaDesc || 'Critical compatibility checkpoints'} />
        <View style={{ gap: 10 }}>
          {items.map((item, i) => (
            <View key={i} style={[styles.doshaItem, { borderLeftColor: item.ok ? '#10b981' : '#ef4444' }]}>
              <Text style={[styles.doshaItemTitle, { color: item.ok ? '#065f46' : '#991b1b' }]}>{item.title}</Text>
              <Text style={styles.doshaItemText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderLuckyFactors = () => {
    const boyD = matchData?.boy_astro_details;
    const girlD = matchData?.girl_astro_details;
    if (!boyD && !girlD) return null;

    const renderLuckyBox = (title, data, accent) => (
      <View style={[styles.luckyBox, { borderTopColor: accent }]}>
        <Text style={[styles.luckyBoxTitle, { color: accent }]}>{title}</Text>
        <View style={styles.luckyGrid}>
          {data.lucky_gem && <LuckyItem label="Gem" value={Array.isArray(data.lucky_gem) ? data.lucky_gem.join(', ') : data.lucky_gem} />}
          {data.lucky_num && <LuckyItem label="Number" value={Array.isArray(data.lucky_num) ? data.lucky_num.join(', ') : data.lucky_num} />}
          {data.lucky_colors && <LuckyItem label="Color" value={Array.isArray(data.lucky_colors) ? data.lucky_colors.join(', ') : data.lucky_colors} />}
          {data.lucky_letters && <LuckyItem label="Letters" value={Array.isArray(data.lucky_letters) ? data.lucky_letters.join(', ') : data.lucky_letters} />}
          {data.lucky_name_start && <LuckyItem label="Name Starts" value={Array.isArray(data.lucky_name_start) ? data.lucky_name_start.join(', ') : data.lucky_name_start} />}
        </View>
      </View>
    );

    return (
      <View style={styles.sectionCard}>
        <SectionTitle icon="leaf" title={l.luckyFactors || 'Lucky Factors'} sub={l.luckyFactorsDesc || 'Personalized auspicious elements'} />
        <View style={{ gap: 12 }}>
          {boyD && renderLuckyBox(`${result?.maleKundali?.name || 'Boy'}`, boyD, '#3b82f6')}
          {girlD && renderLuckyBox(`${result?.femaleKundali?.name || 'Girl'}`, girlD, '#ec4899')}
        </View>
      </View>
    );
  };

  const renderPapasamya = () => {
    if (!result?.papasamayaMatch || typeof result.papasamayaMatch !== 'object') return null;
    const pp = result.papasamayaMatch;
    const boyPapa = pp.boy_papa_count ?? pp.male_papa_count ?? pp.boy_papasamya;
    const girlPapa = pp.girl_papa_count ?? pp.female_papa_count ?? pp.girl_papasamya;
    const isMatching = pp.is_matching === true || pp.is_matching === 'true' || pp.match === true || /yes/i.test(String(pp.match));
    const desc = pp.description || pp.bot_response || pp.message || pp.report;

    const renderPapaBreakdown = (pData) => {
      if (!pData || typeof pData !== 'object') return null;
      const keys = Object.keys(pData).filter(k => k.endsWith('_papa'));
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
          {keys.map(k => (
            <View key={k} style={styles.miniPapaBadge}>
              <Text style={styles.miniPapaLabel}>{k.replace('_papa', '').toUpperCase()}</Text>
              <Text style={styles.miniPapaVal}>{pData[k]}</Text>
            </View>
          ))}
        </View>
      );
    };

    return (
      <View style={styles.sectionCard}>
        <SectionTitle icon="git-compare" title={l.papasamya} sub={l.papasamyaSub} />
        <View style={[styles.papaContainer, { borderColor: isMatching ? '#10b981' : '#f59e0b' }]}>
          <View style={[styles.manglikBadge, { alignSelf: 'center', backgroundColor: isMatching ? '#dcfce7' : '#fef3c7', marginBottom: 12 }]}>
            <Text style={[styles.manglikBadgeText, { color: isMatching ? '#166534' : '#92400e' }]}>
              {isMatching ? l.papaMatch : l.papaDiff}
            </Text>
          </View>
          <View style={styles.papaRow}>
            <View style={styles.papaBoxBoy}>
              <Text style={styles.papaLabelBoy}>{l.boyTotal}</Text>
              <Text style={styles.papaValBoy}>{boyPapa ?? '-'}</Text>
              {renderPapaBreakdown(pp.boy_papa)}
            </View>
            <View style={styles.papaBoxGirl}>
              <Text style={styles.papaLabelGirl}>{l.girlTotal}</Text>
              <Text style={styles.papaValGirl}>{girlPapa ?? '-'}</Text>
              {renderPapaBreakdown(pp.girl_papa)}
            </View>
          </View>
          {desc ? <Text style={styles.papaDesc}>{String(desc)}</Text> : null}
        </View>
      </View>
    );
  };

  const renderWesternMatch = () => {
    if (!result?.westernMatch || typeof result.westernMatch !== 'object') return null;
    const wm = result.westernMatch;
    const score = wm.score ?? wm.compatibility_score ?? wm.match_score ?? wm.percentage ?? wm.total ?? wm.match;
    const boySign = wm.boy_sign || wm.male_sign || wm.boy_sun_sign || wm.boy?.sun_sign || wm.boy?.sign || wm.boy_zodiac;
    const girlSign = wm.girl_sign || wm.female_sign || wm.girl_sun_sign || wm.girl?.sun_sign || wm.girl?.sign || wm.girl_zodiac;
    const comp = wm.compatibility || wm.verdict || wm.bot_response || wm.report || wm.message;
    const desc = wm.description || wm.bot_response;

    const hasData = score !== undefined || boySign || girlSign || comp || desc;
    if (!hasData) return null;

    return (
      <View style={styles.sectionCard}>
        <SectionTitle icon="earth" title={l.westernMatch} sub={l.westernSub} />
        <View style={styles.westernContainer}>
          {score !== undefined && score !== null && (
            <View style={styles.westernScoreBox}>
              <Text style={styles.westernScoreLabel}>{l.compScore}</Text>
              <Text style={styles.westernScoreVal}>{score}{typeof score === 'number' && score <= 100 && score >= 0 ? '%' : ''}</Text>
            </View>
          )}
          {(boySign || girlSign) && (
            <View style={styles.papaRow}>
              <View style={styles.papaBoxBoy}>
                <Text style={styles.papaLabelBoy}>{l.boy}</Text>
                <Text style={styles.papaValBoy}>{boySign || '-'}</Text>
              </View>
              <View style={styles.papaBoxGirl}>
                <Text style={styles.papaLabelGirl}>{l.girl}</Text>
                <Text style={styles.papaValGirl}>{girlSign || '-'}</Text>
              </View>
            </View>
          )}
          {comp ? <Text style={styles.westernComp}><Text style={{ fontWeight: '700' }}>{l.compLabel}</Text> {String(comp)}</Text> : null}
          {desc && desc !== comp ? <Text style={styles.westernDesc}>{String(desc)}</Text> : null}
        </View>
      </View>
    );
  };

  const l = LABELS[lang];

  return (
    <View style={styles.container}>
      <GoldHeader
        title={l.title}
        onBack={onBack}
        rightAction={{ icon: 'language', onPress: () => setShowLangModal(true) }}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {!result ? (
          <View>
            <View style={styles.formContent}>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[styles.toggleBtn, matchType === 'North' && styles.toggleBtnActive]}
                  onPress={() => setMatchType('North')}
                >
                  <Text style={[styles.toggleBtnText, matchType === 'North' && styles.toggleBtnTextActive]}>{l.north} Indian</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, matchType === 'South' && styles.toggleBtnActive]}
                  onPress={() => setMatchType('South')}
                >
                  <Text style={[styles.toggleBtnText, matchType === 'South' && styles.toggleBtnTextActive]}>{l.south} Indian</Text>
                </TouchableOpacity>
              </View>

              <PersonForm title={l.boyDetails} icon="man" data={boy} target="boy" accent="#3b82f6"
                onChangeField={handleChange}
                onPlaceChange={handlePlaceChange}
                onPick={() => setShowPicker}
                suggestions={suggestions.boy}
                showSuggestions={showSuggestions.boy}
                onSelectPlace={selectPlace}
                loading={placeLoading.boy}
                l={l}
              />
              <View style={{ height: 16 }} />
              <PersonForm title={l.girlDetails} icon="woman" data={girl} target="girl" accent="#ec4899"
                onChangeField={handleChange}
                onPlaceChange={handlePlaceChange}
                onPick={() => setShowPicker}
                suggestions={suggestions.girl}
                showSuggestions={showSuggestions.girl}
                onSelectPlace={selectPlace}
                loading={placeLoading.girl}
                l={l}
              />

              <TouchableOpacity style={styles.goldMatchButton} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={['#FFCC00', '#E6A800']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.matchGradient}>
                  {loading
                    ? <ActivityIndicator color="#1A1A1A" />
                    : <><Ionicons name="heart" size={18} color="#1A1A1A" /><Text style={styles.matchButtonText}>{l.calculate}</Text><Ionicons name="arrow-forward" size={18} color="#1A1A1A" /></>
                  }
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.disclaimerRow}>
                <Ionicons name="lock-closed" size={12} color="#AAA" />
                <Text style={styles.formDisclaimer}>{l.private}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View>
            <LinearGradient colors={['#1A1A1A', '#2D1500']} style={styles.resultHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.matchTitleNames}>
                  {result.maleKundali?.name || boy.name} <Text style={{ color: '#ec4899' }}>♥</Text> {result.femaleKundali?.name || girl.name}
                </Text>
                <Text style={styles.matchTitleSub}>
                  {matchType === 'North' ? 'Ashtakoot Guna Milan' : 'Dashakoot Milan'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLangModal(true)} style={styles.langBtn}>
                <Text style={styles.langBtnText}>🌐 {LANGUAGES.find(l => l.code === lang)?.label || 'En'}</Text>
              </TouchableOpacity>
            </LinearGradient>

            <ImageBackground source={require('../../assets/chat_background.jpg')} resizeMode="cover">
            <View style={styles.resultContent}>

              {/* Total Score Section */}
              {canShowMatching('ashtakoot_guna_milan', 'total_score') && totalMax > 0 && (

                <View style={styles.scoreCard}>
                  <View style={styles.scoreDonutWrap}>
                    <Svg width={100} height={100} viewBox="0 0 120 120">
                      <Circle cx="60" cy="60" r="50" fill="none" stroke="#f3f0fa" strokeWidth="12" />
                      <Circle cx="60" cy="60" r="50" fill="none" stroke={band.color} strokeWidth="12"
                        strokeDasharray={`${(scorePct * 2 * Math.PI * 50)} ${2 * Math.PI * 50}`}
                        strokeDashoffset="0"
                        origin="60, 60"
                        rotation="-90"
                        strokeLinecap="round" />
                    </Svg>
                    <View style={styles.scoreDonutInner}>
                      <Text style={[styles.scoreBig, { color: band.color }]}>{totalReceived}</Text>
                      <Text style={styles.scoreMax}>of {totalMax}</Text>
                    </View>
                  </View>
                  <View style={styles.scoreInfo}>
                    <View style={styles.bandRow}>
                      <Ionicons name={band.icon} size={18} color={band.color} />
                      <Text style={[styles.scoreBand, { color: band.color }]}>{band.label}</Text>
                    </View>
                    <Text style={styles.scoreVerdict}>{l.compScoreColon} <Text style={{ fontWeight: '800', color: '#E6A800' }}>{String(Math.round(scorePct * 100))}%</Text></Text>
                  </View>
                </View>
              )}

              {canShowMatching('quick_match') && renderQuickMatch()}
              {canShowMatching('aggregate_match') && renderAggregateMatch()}
              {/* Birth Charts */}
              {canShowMatching('charts') && (
                <View style={styles.sectionCard}>
                  <SectionTitle icon="grid" title={l.charts} sub={l.chartsSubTitle} />

                  {/* Chart style selector */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
                    {['north', 'south', 'east'].map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.chartStyleBtn, chartStyle === s && styles.chartStyleBtnActive]}
                        onPress={() => onChangeChartStyle(s)}
                      >
                        <Text style={[styles.chartStyleText, chartStyle === s && styles.chartStyleTextActive]}>
                          {l[s] || s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {chartsLoading ? (
                    <View style={{ height: 120, justifyContent: 'center', alignItems: 'center' }}>
                      <ActivityIndicator size="large" color="#FFCC00" />
                      <Text style={{ color: '#999', marginTop: 10, fontSize: 13 }}>{l.loadingCharts}</Text>
                    </View>
                  ) : (
                    <View>
                      {/* ── Lagna D1 ── */}
                      <View style={styles.chartDivider}>
                        <View style={styles.chartDividerLine} />
                        <Text style={styles.chartDividerLabel}>{l.lagnaChartD1}</Text>
                        <View style={styles.chartDividerLine} />
                      </View>

                      <View style={styles.chartPersonRow}>
                        <View style={styles.chartPersonBadgeBoy}>
                          <Text style={styles.chartPersonBadgeText}>{result?.maleKundali?.name || boy.name || 'Boy'}</Text>
                        </View>
                      </View>
                      <View style={styles.chartBox}>
                        <WebView
                          originWhitelist={['*']}
                          source={{ html: `<html><body style="margin:0;padding:0;background:#fff;display:flex;justify-content:center;align-items:center;">${injectDegreesIntoSvg(cleanSvg(boyCharts.D1), buildDegreeMap(result?.boyPlanets || result?.recordList?.boy_planetary_details)) || '<p style="color:#999;font-family:sans-serif;font-size:13px;text-align:center;">Chart not available</p>'}</body></html>` }}
                          style={{ width: '100%', height: width - 64, backgroundColor: 'transparent' }}
                          scrollEnabled={false}
                          scalesPageToFit={true}
                        />
                      </View>

                      <View style={{ height: 12 }} />

                      <View style={styles.chartPersonRow}>
                        <View style={styles.chartPersonBadgeGirl}>
                          <Text style={styles.chartPersonBadgeText}>{result?.femaleKundali?.name || girl.name || 'Girl'}</Text>
                        </View>
                      </View>
                      <View style={styles.chartBox}>
                        <WebView
                          originWhitelist={['*']}
                          source={{ html: `<html><body style="margin:0;padding:0;background:#fff;display:flex;justify-content:center;align-items:center;">${injectDegreesIntoSvg(cleanSvg(girlCharts.D1), buildDegreeMap(result?.girlPlanets || result?.recordList?.girl_planetary_details)) || '<p style="color:#999;font-family:sans-serif;font-size:13px;text-align:center;">Chart not available</p>'}</body></html>` }}
                          style={{ width: '100%', height: width - 64, backgroundColor: 'transparent' }}
                          scrollEnabled={false}
                          scalesPageToFit={true}
                        />
                      </View>

                      {/* ── Navamsa D9 ── */}
                      {(boyCharts.D9 || girlCharts.D9) && (
                        <View>
                          <View style={[styles.chartDivider, { marginTop: 20 }]}>
                            <View style={styles.chartDividerLine} />
                            <Text style={styles.chartDividerLabel}>{l.navamsaChartD9}</Text>
                            <View style={styles.chartDividerLine} />
                          </View>

                          {boyCharts.D9 && (
                            <View>
                              <View style={styles.chartPersonRow}>
                                <View style={styles.chartPersonBadgeBoy}>
                                  <Text style={styles.chartPersonBadgeText}>{result?.maleKundali?.name || boy.name || 'Boy'}</Text>
                                </View>
                              </View>
                              <View style={styles.chartBox}>
                                <WebView
                                  originWhitelist={['*']}
                                  source={{ html: `<html><body style="margin:0;padding:0;background:#fff;display:flex;justify-content:center;align-items:center;">${injectDegreesIntoSvg(cleanSvg(boyCharts.D9), buildDegreeMap(result?.boyPlanets || result?.recordList?.boy_planetary_details)) || '<p style="color:#999;font-family:sans-serif;font-size:13px;text-align:center;">Chart not available</p>'}</body></html>` }}
                                  style={{ width: '100%', height: width - 64, backgroundColor: 'transparent' }}
                                  scrollEnabled={false}
                                  scalesPageToFit={true}
                                />
                              </View>
                              <View style={{ height: 12 }} />
                            </View>
                          )}

                          {girlCharts.D9 && (
                            <View>
                              <View style={styles.chartPersonRow}>
                                <View style={styles.chartPersonBadgeGirl}>
                                  <Text style={styles.chartPersonBadgeText}>{result?.femaleKundali?.name || girl.name || 'Girl'}</Text>
                                </View>
                              </View>
                              <View style={styles.chartBox}>
                                <WebView
                                  originWhitelist={['*']}
                                  source={{ html: `<html><body style="margin:0;padding:0;background:#fff;display:flex;justify-content:center;align-items:center;">${injectDegreesIntoSvg(cleanSvg(girlCharts.D9), buildDegreeMap(result?.girlPlanets || result?.recordList?.girl_planetary_details)) || '<p style="color:#999;font-family:sans-serif;font-size:13px;text-align:center;">Chart not available</p>'}</body></html>` }}
                                  style={{ width: '100%', height: width - 64, backgroundColor: 'transparent' }}
                                  scrollEnabled={false}
                                  scalesPageToFit={true}
                                />
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
              {canShowMatching('rajju_vedha_dosha') && renderDetailedDoshas()}
              {canShowMatching('lucky_factors') && renderLuckyFactors()}
              {canShowMatching('ghatka_chakra') && renderGhatkaChakra()}

              {canShowMatching('aggregate_match') && conclusionText && (
                <View style={styles.conclusionBox}>
                  <View style={styles.titleRow}>
                    <Ionicons name="document-text" size={15} color="#E6A800" />
                    <Text style={styles.conclusionTitle}>{l.conclusion}</Text>
                  </View>
                  <Text style={styles.conclusionText}>{conclusionText}</Text>
                </View>
              )}

              {canShowMatching('planetary_details') && renderPlanetaryPositions()}
              {canShowMatching('astro_comparison') && renderComparison()}
              {canShowMatching('panchang_comparison') && renderPanchangComparison()}

              {canShowMatching('manglik_match') && (boyManglik || girlManglik) && (
                <View style={styles.sectionCard}>
                  <SectionTitle icon="flame" title={l.manglikAnalysis} />
                  <ManglikCard side={`${result?.maleKundali?.name || boy.name}`} data={boyManglik} accent="#3b82f6" />
                  <View style={{ height: 10 }} />
                  <ManglikCard side={`${result?.femaleKundali?.name || girl.name}`} data={girlManglik} accent="#ec4899" />
                </View>
              )}

              {canShowMatching('papasamya_match') && renderPapasamya()}
              {canShowMatching('quick_match') && renderWesternMatch()}

              {/* Koota Breakdown */}
              {canShowMatching('ashtakoot_guna_milan', 'breakdown') && kootasToRender.length > 0 && (
                <View style={styles.sectionCard}>
                  <SectionTitle icon="bar-chart" title={l.gunaBreakdown} />
                  <View style={styles.kootaGrid}>
                    {kootasToRender.map(key => renderKootaItem(key))}
                  </View>
                </View>
              )}

              <TouchableOpacity style={styles.resetButton} onPress={() => setResult(null)}>
                <Ionicons name="refresh" size={16} color="#555" />
                <Text style={styles.resetText}>{l.reset}</Text>
              </TouchableOpacity>
            </View>
            </ImageBackground>
          </View>
        )}
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' }}>{l.selectLang}</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Text style={{ fontSize: 16, color: '#E6A800', fontWeight: 'bold' }}>{l.close}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {LANGUAGES.map(langOpt => (
                <TouchableOpacity
                  key={langOpt.code}
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: lang === langOpt.code ? '#FFFBE6' : '#fff' }}
                  onPress={() => onChangeLang(langOpt.code)}
                >
                  <Text style={{ fontSize: 16, color: lang === langOpt.code ? '#E6A800' : '#4b5563', fontWeight: lang === langOpt.code ? 'bold' : 'normal' }}>
                    {langOpt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showPicker.visible && (
        <DateTimePicker
          value={new Date()}
          mode={showPicker.mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onChangePicker}
        />
      )}
    </View>
  );
};

const PersonForm = ({ title, icon, data, target, accent, onChangeField, onPlaceChange, onPick, suggestions, showSuggestions, onSelectPlace, loading, l }) => (
  <View style={styles.formCard}>
    <View style={styles.formCardHeader}>
      <View style={[styles.formCardIcon, { backgroundColor: accent + '18' }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={[styles.formCardTitle, { color: accent }]}>{title}</Text>
    </View>

    <Text style={styles.inputLabel}>{l.fullName}</Text>
    <View style={styles.inputBox}>
      <Ionicons name="person-outline" size={18} color="#888" />
      <TextInput
        style={styles.inputField}
        placeholder={l.enterName}
        placeholderTextColor="#BBB"
        value={data.name}
        returnKeyType="next"
        onChangeText={t => onChangeField(target, 'name', t)}
      />
    </View>

    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.inputLabel}>{l.date}</Text>
        <TouchableOpacity style={styles.inputBox} onPress={() => onPick()({ visible: true, mode: 'date', target, key: 'birthDate' })}>
          <Ionicons name="calendar-outline" size={18} color="#888" />
          <Text style={[styles.pickerValue, !data.birthDate && { color: '#BBB' }]}>{data.birthDate || 'YYYY-MM-DD'}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.inputLabel}>{l.time}</Text>
        <TouchableOpacity style={styles.inputBox} onPress={() => onPick()({ visible: true, mode: 'time', target, key: 'birthTime' })}>
          <Ionicons name="time-outline" size={18} color="#888" />
          <Text style={[styles.pickerValue, !data.birthTime && { color: '#BBB' }]}>{data.birthTime || 'HH:MM'}</Text>
        </TouchableOpacity>
      </View>
    </View>

    <Text style={styles.inputLabel}>{l.placeOfBirth}</Text>
    <View style={{ position: 'relative', zIndex: 10 }}>
      <View style={[styles.inputBox, data.latitude && styles.inputBoxVerified]}>
        <Ionicons name="location-outline" size={18} color={data.latitude ? '#16A34A' : '#888'} />
        <TextInput
          style={styles.inputField}
          placeholder={l.searchCity}
          placeholderTextColor="#BBB"
          value={data.birthPlace}
          returnKeyType="search"
          onChangeText={t => onPlaceChange(target, t)}
        />
        {loading ? (
          <ActivityIndicator size="small" color={accent} />
        ) : data.latitude ? (
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
        ) : null}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionBox}>
          {suggestions.map((s, i) => (
            <TouchableOpacity key={i} style={[styles.suggestionItem, i === suggestions.length - 1 && { borderBottomWidth: 0 }]} onPress={() => onSelectPlace(target, s)}>
              <Ionicons name="location-sharp" size={14} color="#E6A800" />
              <Text style={styles.suggestionText}>{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    height: 90, paddingTop: 30, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 20, color: '#000', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  scroll: { flexGrow: 1 },
  formContent: { padding: 16, paddingBottom: 40 },
  heroBanner: { paddingTop: 36, paddingBottom: 48, alignItems: 'center', paddingHorizontal: 20 },
  heroEmoji: { fontSize: 42, marginBottom: 10 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#FFCC00', textAlign: 'center', marginBottom: 8 },
  heroDesc: { fontSize: 13, color: '#CCC', textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  heroBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroBadge: { backgroundColor: 'rgba(255,204,0,0.15)', borderRadius: 50, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,204,0,0.4)' },
  heroBadgeText: { color: '#FFCC00', fontSize: 11, fontWeight: '700' },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  toggleBtnTextActive: { color: '#1A1A1A', fontWeight: '800' },
  formCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  formCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  formCardDot: { width: 8, height: 8, borderRadius: 4 },
  formCardIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  formCardTitle: { fontSize: 15, fontWeight: '800' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 12, letterSpacing: 0.3 },
  textInput: { backgroundColor: '#F7F7F7', borderWidth: 1.5, borderColor: '#EEE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F7F7F7', borderWidth: 1.5, borderColor: '#EEE', borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
  },
  inputField: { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '500', paddingVertical: 1 },
  inputBoxVerified: { borderColor: '#16A34A', backgroundColor: '#F0FFF4' },
  row: { flexDirection: 'row', gap: 10 },
  pickerTrigger: { backgroundColor: '#F7F7F7', borderWidth: 1.5, borderColor: '#EEE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13 },
  pickerValue: { fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  placeLoader: { position: 'absolute', right: 12, top: 12 },
  placeCheck: { position: 'absolute', right: 12, top: 12, color: '#10b981', fontWeight: '800' },
  coordBadge: { marginTop: 6, backgroundColor: '#F0FFF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#BBF7D0' },
  coordText: { fontSize: 11, color: '#16A34A', fontWeight: '600' },
  suggestionBox: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, marginTop: 4, elevation: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggestionText: { flex: 1, fontSize: 13, color: '#1A1A1A' },
  goldMatchButton: { borderRadius: 14, marginTop: 20, overflow: 'hidden', shadowColor: '#FFCC00', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  matchGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  matchButton: { borderRadius: 14, marginTop: 20, overflow: 'hidden' },
  matchButtonText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  matchArrow: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  disclaimerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 },
  formDisclaimer: { textAlign: 'center', fontSize: 11, color: '#AAA' },

  resultHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 20, paddingBottom: 20,
  },
  langBtn: { backgroundColor: 'rgba(255,204,0,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,204,0,0.5)' },
  langBtnText: { fontSize: 12, fontWeight: '800', color: '#FFCC00' },
  resultContent: { padding: 16 },
  matchTitleNames: { fontSize: 20, fontWeight: '800', color: '#FFCC00' },
  matchTitleSub: { fontSize: 13, color: '#CCC', marginTop: 4 },
  scoreCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  scoreDonutWrap: { width: 100, height: 100, position: 'relative' },
  scoreDonutInner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  scoreBig: { fontSize: 24, fontWeight: '800' },
  scoreMax: { fontSize: 11, color: '#9ca3af' },
  scoreInfo: { flex: 1, marginLeft: 20, alignItems: 'center' },
  scoreBand: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  scoreVerdict: { fontSize: 13, color: '#666', marginTop: 6, textAlign: 'center' },
  conclusionBox: { backgroundColor: '#FFFBE6', borderLeftWidth: 4, borderLeftColor: '#FFCC00', padding: 16, borderRadius: 10, marginBottom: 20 },
  conclusionTitle: { fontSize: 14, fontWeight: '800', color: '#E6A800', marginBottom: 6 },
  conclusionText: { fontSize: 13, color: '#374151', lineHeight: 20 },
  sectionCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  sectionSubTitle: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secHeadIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: '#FFFBE6', alignItems: 'center', justifyContent: 'center' },
  secHeadTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  bandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  chartStyleBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: '#EEE', backgroundColor: '#FFF' },
  chartStyleBtnActive: { borderColor: '#FFCC00', backgroundColor: '#FFCC00' },
  chartStyleText: { fontSize: 12, fontWeight: '600', color: '#555' },
  chartStyleTextActive: { color: '#1A1A1A', fontWeight: '800' },
  chartPair: { flexDirection: 'row', justifyContent: 'space-between' },
  chartLabel: { fontSize: 12, fontWeight: '800', color: '#1A1A1A', marginBottom: 4, textAlign: 'center' },

  chartBox: {
    width: '100%', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F0F0F0',
    backgroundColor: '#FFF',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  chartDivider: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 14,
  },
  chartDividerLine: { flex: 1, height: 1, backgroundColor: '#EEEEEE' },
  chartDividerLabel: {
    marginHorizontal: 10, fontSize: 10, fontWeight: '800',
    color: '#AAAAAA', letterSpacing: 1,
  },
  chartPersonRow: { marginBottom: 6 },
  chartPersonBadgeBoy: {
    alignSelf: 'flex-start', backgroundColor: '#EFF6FF',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  chartPersonBadgeGirl: {
    alignSelf: 'flex-start', backgroundColor: '#FDF2F8',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#FBCFE8',
  },
  chartPersonBadgeText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  compTable: { borderWidth: 1, borderColor: '#F0F0F0', borderRadius: 12, overflow: 'hidden' },
  compHeader: { flexDirection: 'row', padding: 10 },
  compTh: { fontSize: 12, fontWeight: '700' },
  compRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  compLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', flex: 1.2 },
  compVal: { flex: 1, fontSize: 12, fontWeight: '600', color: '#1A1A1A' },
  kootaGrid: { gap: 10 },
  kootaCard: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F0F0F0' },
  kootaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kootaLabel: { fontSize: 14, fontWeight: '800', color: '#1A1A1A' },
  kootaScore: { fontSize: 14, fontWeight: '800' },
  kootaBarBg: { height: 6, backgroundColor: '#EEEEEE', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  kootaBarFill: { height: '100%', borderRadius: 3 },
  kootaHint: { fontSize: 11, color: '#9ca3af', marginBottom: 4 },
  kootaDesc: { fontSize: 12, color: '#4b5563', lineHeight: 18 },
  manglikCard: { borderWidth: 1, borderRadius: 12, padding: 14, backgroundColor: '#FFF' },
  manglikHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  manglikTitle: { fontSize: 14, fontWeight: '800' },
  manglikBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  manglikBadgeText: { fontSize: 11, fontWeight: '800' },
  manglikIntensity: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  manglikStatus: { fontSize: 12, color: '#374151', lineHeight: 18 },
  quickMatchCard: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 2, flexDirection: 'column' },
  qmHeader: { flexDirection: 'row', alignItems: 'center' },
  qmIcon: { fontSize: 28 },
  qmTitle: { fontSize: 15, fontWeight: '800' },
  qmVerdict: { fontSize: 13, fontWeight: '700', marginTop: 2, color: '#1A1A1A' },
  qmScoreBox: { backgroundColor: '#FFF', padding: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center', minWidth: 60 },
  qmScoreLabel: { fontSize: 9, fontWeight: '800', color: '#6b7280' },
  qmScoreValue: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  qmDesc: { fontSize: 12, color: '#374151', marginTop: 10, lineHeight: 18 },
  aggCard: { backgroundColor: '#FFFBE6', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: '#FFCC00' },
  aggTitle: { fontSize: 15, fontWeight: '800', color: '#92400e' },
  aggSub: { fontSize: 12, color: '#92400e', opacity: 0.8, marginBottom: 12 },
  aggRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  aggBox: { backgroundColor: '#FFF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', flex: 1, alignItems: 'center' },
  aggBoxLabel: { fontSize: 10, fontWeight: '800', color: '#92400e' },
  aggBoxVal: { fontSize: 18, fontWeight: '800', color: '#92400e', marginTop: 2 },
  aggVerdict: { fontSize: 13, backgroundColor: '#FFF', padding: 12, borderRadius: 8, color: '#374151', marginBottom: 8 },
  aggDesc: { fontSize: 12, backgroundColor: '#FFF', padding: 12, borderRadius: 8, color: '#374151' },
  papaContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 2 },
  papaRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  papaBoxBoy: { flex: 1, backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe', alignItems: 'center' },
  papaBoxGirl: { flex: 1, backgroundColor: '#fdf2f8', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fbcfe8', alignItems: 'center' },
  papaLabelBoy: { fontSize: 11, fontWeight: '800', color: '#1e40af' },
  papaLabelGirl: { fontSize: 11, fontWeight: '800', color: '#9d174d' },
  papaValBoy: { fontSize: 20, fontWeight: '800', color: '#1e40af', marginVertical: 4 },
  papaValGirl: { fontSize: 20, fontWeight: '800', color: '#9d174d', marginVertical: 4 },
  papaSub: { fontSize: 10, color: '#6b7280' },
  papaDesc: { fontSize: 12, color: '#374151', marginTop: 6 },
  westernContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 2, borderColor: '#6366f1', borderTopWidth: 4 },
  westernScoreBox: { backgroundColor: '#eef2ff', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  westernScoreLabel: { fontSize: 10, fontWeight: '800', color: '#4338ca' },
  westernScoreVal: { fontSize: 22, fontWeight: '800', color: '#4338ca', marginTop: 4 },
  westernComp: { fontSize: 13, backgroundColor: '#FFFBE6', padding: 10, borderRadius: 8, color: '#1A1A1A', marginBottom: 8 },
  westernDesc: { fontSize: 12, color: '#374151' },
  resetButton: { flexDirection: 'row', gap: 6, marginVertical: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: '#EEE', backgroundColor: '#FFF' },
  resetText: { fontSize: 14, fontWeight: '800', color: '#555' },

  doshaItem: { backgroundColor: '#F9FAFB', borderLeftWidth: 4, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  doshaItemTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  doshaItemText: { fontSize: 12, color: '#4B5563', lineHeight: 18 },
  luckyBox: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F0F0F0', borderTopWidth: 4 },
  luckyBoxTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  luckyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  luckyItem: { minWidth: '45%' },
  luckyItemLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 2 },
  luckyItemVal: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  miniScore: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', alignItems: 'center', flex: 1 },
  miniScoreLabel: { fontSize: 9, fontWeight: '800', color: '#92400E', marginBottom: 2 },
  miniScoreVal: { fontSize: 13, fontWeight: '800', color: '#92400E' },
  manglikDetailText: { fontSize: 11, color: '#4b5563', lineHeight: 16, marginBottom: 2 },
  miniPapaBadge: { backgroundColor: '#FFF', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: '#DDD', alignItems: 'center', minWidth: 45 },
  miniPapaLabel: { fontSize: 8, fontWeight: '800', color: '#666' },
  miniPapaVal: { fontSize: 10, fontWeight: '800', color: '#1A1A1A' },
});

const LuckyItem = ({ label, value }) => (
  <View style={styles.luckyItem}>
    <Text style={styles.luckyItemLabel}>{label}</Text>
    <Text style={styles.luckyItemVal}>{value || '-'}</Text>
  </View>
);

export default KundaliMatchingScreen;
