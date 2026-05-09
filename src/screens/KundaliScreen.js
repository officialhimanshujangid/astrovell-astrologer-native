import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator, Alert, Dimensions,
  Platform, Image, Modal, KeyboardAvoidingView
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import apiClient from '../api/apiClient';
import { kundaliApi } from '../api/services';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');

const TABS = [
  { key: 'basic', label: '🏠 Basic', phase: 1 },
  { key: 'lagna', label: '📊 Lagna', phase: 2 },
  { key: 'transit', label: '🌌 Transit', phase: 3 },
  { key: 'dasha', label: '⏰ Dasha', phase: 4 },
  { key: 'yogini', label: '🌙 Yogini', phase: 5 },
  { key: 'ashtakvarga', label: '🎯 Ashtakvarga', phase: 6 },
  { key: 'planets', label: '🪐 Planets', phase: 7 },
  { key: 'divisional', label: '📐 Divisional', phase: 8 },
  { key: 'kp', label: '🔮 KP System', phase: 9 },
  { key: 'sadesati', label: '🪨 Sade Sati', phase: 10 },
  { key: 'shadbala', label: '⚖️ Shadbala', phase: 11 },
  { key: 'bhavbala', label: '🏛️ Bhav Bala', phase: 12 },
  { key: 'manglik', label: '🔥 Manglik', phase: 13 },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'or', label: 'Odia' },
];

const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃',
  Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋', Ascendant: '🔱', 'As': '🔱'
};

const VIM_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const VIM_YEARS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };

const YOG_ORDER = ['Mangala', 'Pingala', 'Dhanya', 'Bhramari', 'Bhadrika', 'Ulka', 'Siddha', 'Sankata'];
const YOG_YEARS = { Mangala: 1, Pingala: 2, Dhanya: 3, Bhramari: 4, Bhadrika: 5, Ulka: 6, Siddha: 7, Sankata: 8 };

const computeProportionalSubs = (parentLord, parentStartIso, parentEndIso, ORDER, YEARS, total) => {
  if (!parentLord || !parentStartIso || !parentEndIso) return [];
  const startTs = new Date(parentStartIso).getTime();
  const endTs = new Date(parentEndIso).getTime();
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs <= startTs) return [];
  const idx = ORDER.indexOf(parentLord);
  if (idx === -1) return [];
  const totalMs = endTs - startTs;
  const subs = [];
  let cursor = startTs;
  for (let i = 0; i < ORDER.length; i++) {
    const subLord = ORDER[(idx + i) % ORDER.length];
    const portion = YEARS[subLord] / total;
    const subDuration = totalMs * portion;
    const subEndTs = cursor + subDuration;
    subs.push({
      planet: subLord, lord: subLord,
      start: new Date(cursor).toISOString().split('T')[0],
      end: new Date(subEndTs).toISOString().split('T')[0],
    });
    cursor = subEndTs;
  }
  return subs;
};

const computeSubDashas = (parentLord, parentStart, parentEnd) => computeProportionalSubs(parentLord, parentStart, parentEnd, VIM_ORDER, VIM_YEARS, 120);
const computeYoginiSubs = (parentLord, parentStart, parentEnd) => computeProportionalSubs(parentLord, parentStart, parentEnd, YOG_ORDER, YOG_YEARS, 36);

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

const pickStr = (obj, ...keys) => {
  if (!obj) return null;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return String(obj[k]);
  }
  return null;
};

const extractManglik = (m) => {
  if (!m) return { isPresent: false, percent: 0, description: '', remedies: [], presentRules: [], cancelRules: [] };
  const isPresent = m.is_present === true || m.is_present === 'true' ||
    m.manglik_present_rule?.is_present === true ||
    m.is_manglik === true || m.manglik === true;
  const percent = parseFloat(pickStr(m, 'percentage_manglik_present', 'manglik_percent', 'manglik_percentage') || '0');
  const description = pickStr(m, 'description', 'desc', 'manglik_status', 'bot_response', 'report');
  const remediesRaw = m.remedies || m.remedy_list || m.remedy || [];
  const remedies = Array.isArray(remediesRaw) ? remediesRaw : (typeof remediesRaw === 'object' ? Object.values(remediesRaw) : []);
  const presentRules = m.manglik_present_rule?.based_on_rules || m.manglik_present_rule?.rules || m.present_rules || [];
  const cancelRules = m.manglik_cancel_rule?.based_on_rules || m.manglik_cancel_rule?.rules || m.cancel_rules || [];
  return { isPresent, percent, description, remedies, presentRules, cancelRules };
};
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

const KundaliScreen = ({ onBack }) => {
  const { token } = useSelector(s => s.auth);
  const [form, setForm] = useState({
    name: '', gender: 'Male', birthDate: '', birthTime: '',
    birthPlace: '', latitude: '', longitude: ''
  });

  const [kundaliRecord, setKundaliRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Phase 1
  const [birthPanchang, setBirthPanchang] = useState(null);
  const [avakhada, setAvakhada] = useState(null);
  const [basicTabLoading, setBasicTabLoading] = useState(false);
  // Phase 2
  const [lagnaD1Svg, setLagnaD1Svg] = useState(null);
  const [lagnaD9Svg, setLagnaD9Svg] = useState(null);
  const [lagnaLoading, setLagnaLoading] = useState(false);
  const [chartStyle, setChartStyle] = useState('north');
  const [showDegrees, setShowDegrees] = useState(true);
  // Phase 3
  const [transitSvg, setTransitSvg] = useState(null);
  const [transitPlanets, setTransitPlanets] = useState(null);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitDate, setTransitDate] = useState(new Date().toISOString().split('T')[0]);
  const [transitStyle, setTransitStyle] = useState('north');
  // Phase 4
  const [mahadashaList, setMahadashaList] = useState(null);
  const [mahadashaLoading, setMahadashaLoading] = useState(false);
  const [dashaPath, setDashaPath] = useState([]);
  // Phase 5
  const [yoginiList, setYoginiList] = useState(null);
  const [yoginiLoading, setYoginiLoading] = useState(false);
  const [yoginiPath, setYoginiPath] = useState([]);
  // Phase 6
  const [ashtakvarga, setAshtakvarga] = useState(null);
  const [ashtakvargaLoading, setAshtakvargaLoading] = useState(false);
  const [ashtakvargaView, setAshtakvargaView] = useState('Sav');
  const [ashtakvargaStyle, setAshtakvargaStyle] = useState('north');
  // Phase 7
  const [basicReport, setBasicReport] = useState(null);
  const [basicLoading, setBasicLoading] = useState(false);
  const [planetsSubView, setPlanetsSubView] = useState('sign');
  // Phase 8
  const [chartSvg, setChartSvg] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartDiv, setChartDiv] = useState('D1');
  // Phase 9
  const [kpData, setKpData] = useState(null);
  const [kpLoading, setKpLoading] = useState(false);
  const [kpStyle, setKpStyle] = useState('north');
  // Phase 10
  const [sadeSati, setSadeSati] = useState(null);
  const [sadeSatiTable, setSadeSatiTable] = useState(null);
  const [sadeSatiLoading, setSadeSatiLoading] = useState(false);

  // Phase 11
  const [shadbala, setShadbala] = useState(null);
  const [shadbalaLoading, setShadbalaLoading] = useState(false);
  // Phase 14
  const [divisionalChart, setDivisionalChart] = useState(null);
  const [divisionalLoading, setDivisionalLoading] = useState(false);
  const [divisionalDiv, setDivisionalDiv] = useState('D1');
  const [divisionalStyle, setDivisionalStyle] = useState('north');
  const [showDivModal, setShowDivModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  // Phase 12
  const [bhavBala, setBhavBala] = useState(null);
  const [bhavBalaLoading, setBhavBalaLoading] = useState(false);
  // Phase 13
  const [manglik, setManglik] = useState(null);
  const [manglikLoading, setManglikLoading] = useState(false);

  // Common
  const [lang, setLang] = useState('en');
  const [activeTab, setActiveTab] = useState('basic');

  const debounceRef = useRef(null);
  const [showPicker, setShowPicker] = useState({ visible: false, mode: 'date', target: '' });

  // Safe pick utility
  const dpick = (obj, ...paths) => {
    if (!obj) return '-';
    for (const p of paths) {
      const parts = p.split('.');
      let cur = obj;
      let ok = true;
      for (const part of parts) {
        if (cur == null || typeof cur !== 'object') { ok = false; break; }
        cur = cur[part];
      }
      if (ok && cur !== undefined && cur !== null && cur !== '') {
        if (typeof cur === 'object' && cur.name) return cur.name;
        return cur;
      }
    }
    return '-';
  };

  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const fetchAshtakvargaData = async (style, overrideLang) => {
    if (!kundaliRecord?.id) return;
    setAshtakvargaLoading(true);
    try {
      const payload = { kundaliId: kundaliRecord.id, style: style || ashtakvargaStyle, lang: overrideLang || lang };
      const res = await kundaliApi.getAshtakvargaFull(payload);
      const d = res.data?.data || res.data;
      setAshtakvarga({ sav: d?.sav || null, binnas: d?.binnas || {} });
    } catch (e) {
      console.log('Error fetching ashtakvarga data', e);
    }
    setAshtakvargaLoading(false);
  };

  const fetchKpData = async (style, overrideLang) => {
    if (!kundaliRecord?.id) return;
    setKpLoading(true);
    try {
      const payload = { kundaliId: kundaliRecord.id, style: style || kpStyle, lang: overrideLang || lang };
      const res = await kundaliApi.getKpFull(payload);
      const d = res.data?.data || res.data;
      setKpData({
        kpPlanets: d?.kpPlanets || null,
        kpCusps: d?.kpCusps || null,
        rulingPlanets: d?.rulingPlanets || null,
        chalitChart: d?.chalitChart || null
      });
    } catch (e) {
      console.log('Error fetching KP data', e);
    }
    setKpLoading(false);
  };

  const fetchSadeSatiData = async (overrideLang) => {
    if (!kundaliRecord?.id) return;
    setSadeSatiLoading(true);
    try {
      const payload = { kundaliId: kundaliRecord.id, lang: overrideLang || lang };
      const res = await kundaliApi.getSadeSati(payload);
      const d = res.data?.data || res.data;
      setSadeSati(d?.sadeSati || null);
      setSadeSatiTable(d?.sadeSatiTable || null);
    } catch (e) {
      console.log('Error fetching Sade Sati data', e);
    }
    setSadeSatiLoading(false);
  };

  const fetchShadbalaData = async (overrideLang) => {
    if (!kundaliRecord?.id) return;
    setShadbalaLoading(true);
    try {
      const payload = { kundaliId: kundaliRecord.id, lang: overrideLang || lang };
      const res = await kundaliApi.getShadbala(payload);
      setShadbala(res.data?.shadbala || res.data?.data?.shadbala || res.data?.data || res.data);
    } catch (e) {
      console.log('Error fetching Shadbala', e);
    }
    setShadbalaLoading(false);
  };

  const fetchBhavBalaData = async (overrideLang) => {
    if (!kundaliRecord?.id) return;
    setBhavBalaLoading(true);
    try {
      const payload = { kundaliId: kundaliRecord.id, lang: overrideLang || lang };
      const res = await kundaliApi.getBhavBala(payload);
      setBhavBala(res.data?.bhavBala || res.data?.data?.bhavBala || res.data?.data || res.data);
    } catch (e) {
      console.log('Error fetching Bhav Bala', e);
    }
    setBhavBalaLoading(false);
  };

  const fetchDivisionalChart = async (div, style, overrideLang) => {
    if (!kundaliRecord?.id) return;
    setDivisionalLoading(true);
    try {
      const payload = { kundaliId: kundaliRecord.id, div: div || divisionalDiv, style: style || divisionalStyle, lang: overrideLang || lang };
      const res = await kundaliApi.getChartReport(payload);
      const d = res.data?.data || res.data;
      const raw = d?.chartDetails;
      // extractChart: try common svg/url keys, fall back to raw string
      const svgVal = (typeof raw === 'string') ? raw :
        (raw?.svg || raw?.chartDetails || raw?.chart_svg || raw?.image_url || raw?.chart || raw?.url || null);
      setDivisionalChart(svgVal);
      if (!svgVal) {
        console.log('[Divisional] No SVG found in response:', JSON.stringify(d)?.slice(0, 300));
      }
    } catch (e) {
      console.log('Error fetching Divisional chart', e?.response?.data || e.message);
      setDivisionalChart(null);
    }
    setDivisionalLoading(false);
  };

  const fetchManglikData = async (overrideLang) => {
    if (!kundaliRecord?.id) return;
    setManglikLoading(true);
    try {
      const payload = { kundaliId: kundaliRecord.id, lang: overrideLang || lang };
      const res = await kundaliApi.getManglikDosh(payload);
      setManglik(res.data?.manglik || res.data?.data?.manglik || res.data?.data || res.data);
    } catch (e) {
      console.log('Error fetching Manglik', e);
    }
    setManglikLoading(false);
  };

  const fetchTransitData = async (dateStr, style, overrideLang) => {
    if (!kundaliRecord?.id) return;
    setTransitLoading(true);
    try {
      const payload = { kundaliId: kundaliRecord.id, transit_date: dateStr, style: style, lang: overrideLang || lang };
      const [chartRes, planetsRes] = await Promise.all([
        kundaliApi.getTransitChart(payload),
        kundaliApi.getTransitPlanets(payload)
      ]);
      const chartDetails = chartRes.data?.data?.chartDetails || chartRes.data?.chartDetails || chartRes.data?.data?.svg || chartRes.data?.svg || chartRes.data;
      setTransitSvg(typeof chartDetails === 'string' ? chartDetails : (chartDetails?.svg || null));
      const ptData = planetsRes.data?.data?.planetDetails || planetsRes.data?.planetDetails || planetsRes.data?.data?.transit_planet || planetsRes.data?.transit_planet || planetsRes.data;
      setTransitPlanets(Array.isArray(ptData) ? ptData : (ptData ? Object.values(ptData) : []));
    } catch (e) {
      console.log('Error fetching transit data', e);
    }
    setTransitLoading(false);
  };

  const onChangePicker = (event, selectedDate) => {
    setShowPicker({ ...showPicker, visible: false });
    if (event.type === 'set' && selectedDate) {
      if (showPicker.mode === 'date') {
        const ds = selectedDate.toISOString().split('T')[0];
        if (showPicker.target === 'transitDate') {
          setTransitDate(ds);
          fetchTransitData(ds, transitStyle);
        } else {
          handleChange(showPicker.target, ds);
        }
      } else {
        const hs = selectedDate.getHours().toString().padStart(2, '0');
        const ms = selectedDate.getMinutes().toString().padStart(2, '0');
        handleChange(showPicker.target, `${hs}:${ms}`);
      }
    }
  };

  const handlePlaceChange = (place) => {
    setForm(prev => ({ ...prev, birthPlace: place, latitude: '', longitude: '' }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (place.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setPlaceLoading(true);
      try {
        const res = await kundaliApi.placeAutocomplete({ query: place });
        if (res.data?.suggestions?.length) {
          setSuggestions(res.data.suggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        setSuggestions([]);
      }
      setPlaceLoading(false);
    }, 400);
  };

  const selectPlace = async (suggestion) => {
    setForm(prev => ({
      ...prev,
      birthPlace: suggestion.name,
      latitude: suggestion.lat ? String(suggestion.lat) : '',
      longitude: suggestion.lon ? String(suggestion.lon) : '',
    }));
    setSuggestions([]);
    setShowSuggestions(false);

    if (!suggestion.lat) {
      try {
        const res = await kundaliApi.geocode({ place: suggestion.name });
        if (res.data?.latitude) {
          setForm(prev => ({ ...prev, latitude: String(res.data.latitude), longitude: String(res.data.longitude) }));
        }
      } catch (e) { }
    }
  };

  const onChangeLang = (newLang) => {
    setLang(newLang);
    setShowLangModal(false);
    if (kundaliRecord?.id) {
      // Clear all tab data so they re-fetch
      setTransitSvg(null);
      setTransitPlanets(null);
      setMahadashaList(null);
      setYoginiList(null);
      setAshtakvarga(null);
      setKpData(null);
      setSadeSati(null);
      setShadbala(null);
      setBhavBala(null);
      setDivisionalChart(null);
      setManglik(null);
      setBasicReport(null);
      setBirthPanchang(null);
      setAvakhada(null);
      setLagnaD1Svg(null);
      setLagnaD9Svg(null);
      // Reset loading states so spinners show correctly
      setBasicTabLoading(true);
      setBasicLoading(true);
      setLagnaLoading(true);

      fetchBasic(kundaliRecord.id, newLang);
      fetchLagnaCharts(kundaliRecord.id, chartStyle, newLang);
      fetchBasicTab(kundaliRecord.id, newLang);

      // Force refresh the active tab data with the new language
      if (activeTab !== 'basic' && activeTab !== 'lagna' && activeTab !== 'planets') {
        handleTabChange(activeTab, newLang, true);
      }
    }
  };

  const fetchBasicTab = async (recordId, langCode) => {
    setBasicTabLoading(true);
    try {
      const payload = {
        kundaliId: recordId,
        dob: form.birthDate,
        tob: form.birthTime,
        lat: form.latitude,
        lon: form.longitude,
        tz: 5.5,
        lang: langCode
      };
      const [panchangRes, avakhadaRes] = await Promise.all([
        kundaliApi.getBirthPanchang(payload),
        kundaliApi.getAvakhadaDetails(payload)
      ]);
      setBirthPanchang(panchangRes.data?.data?.panchang || panchangRes.data?.panchang || panchangRes.data);
      setAvakhada(avakhadaRes.data?.data?.avakhada || avakhadaRes.data?.avakhada || avakhadaRes.data);
    } catch (err) {
      console.log('Error fetching basic tab', err);
    }
    setBasicTabLoading(false);
  };

  const fetchLagnaCharts = async (recordId, style, langCode) => {
    setLagnaLoading(true);
    try {
      const payload = {
        kundaliId: recordId,
        dob: form.birthDate,
        tob: form.birthTime,
        lat: form.latitude,
        lon: form.longitude,
        tz: 5.5,
        lang: langCode,
        style
      };

      const fetchOne = async (div) => {
        try {
          const res = await kundaliApi.getChartReport({ ...payload, div });
          const cd = res.data?.data || res.data;
          const raw = cd?.chartDetails;
          return typeof raw === 'string' ? raw : (raw?.svg || raw?.chart_image || raw?.image_url || null);
        } catch (e) {
          return null;
        }
      };

      const [d1, d9] = await Promise.all([
        fetchOne('D1'),
        fetchOne('D9')
      ]);

      setLagnaD1Svg(d1);
      setLagnaD9Svg(d9);
    } catch (err) {
      console.log('Error fetching lagna charts', err);
    }
    setLagnaLoading(false);
  };

  const fetchBasic = async (recordId, langCode) => {
    setBasicLoading(true);
    try {
      const payload = {
        kundaliId: recordId,
        dob: form.birthDate,
        tob: form.birthTime,
        lat: form.latitude,
        lon: form.longitude,
        tz: 5.5,
        lang: langCode
      };
      const res = await kundaliApi.getBasicReport(payload);
      const bd = res.data?.data || res.data;
      setBasicReport(bd?.planetDetails || bd);
    } catch (err) {
      console.log('Error fetching basic report', err);
    }
    setBasicLoading(false);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.birthDate || !form.birthTime || !form.birthPlace) {
      Alert.alert('Missing Fields', 'Please fill in all birth details.');
      return;
    }
    if (!form.latitude) {
      Alert.alert('Location Not Verified', 'Please select a location from the suggestions.');
      return;
    }

    setLoading(true);
    try {
      const addRes = await kundaliApi.add({
        kundali: [{ ...form, pdf_type: 'basic' }]
      });

      const record = addRes.data?.data?.recordList?.[0] || addRes.data?.recordList?.[0];
      setKundaliRecord(record);

      if (record?.id) {
        await Promise.all([
          fetchBasic(record.id, lang),
          fetchLagnaCharts(record.id, chartStyle, lang),
          fetchBasicTab(record.id, lang),
        ]);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  const handleTabChange = async (key, overrideLang = null, force = false) => {
    setActiveTab(key);
    if (!kundaliRecord?.id) return;

    const reqLang = overrideLang || lang;

    if (key === 'dasha' && (!mahadashaList || force) && !mahadashaLoading) {
      setMahadashaLoading(true);
      try {
        const res = await kundaliApi.getMahadashaList({ kundaliId: kundaliRecord.id, lang: reqLang });
        setMahadashaList(res.data?.data?.mahadasha || res.data?.mahadasha || res.data);
      } catch (e) { }
      setMahadashaLoading(false);
    }

    if (key === 'yogini' && (!yoginiList || force) && !yoginiLoading) {
      setYoginiLoading(true);
      try {
        const res = await kundaliApi.getYoginiDashaList({ kundaliId: kundaliRecord.id, lang: reqLang });
        setYoginiList(res.data?.data?.yogini || res.data?.yogini || res.data);
      } catch (e) { }
      setYoginiLoading(false);
    }

    if (key === 'transit' && (!transitSvg || force) && !transitLoading) {
      fetchTransitData(transitDate, transitStyle, reqLang);
    }

    if (key === 'ashtakvarga' && (!ashtakvarga || force) && !ashtakvargaLoading) {
      fetchAshtakvargaData(ashtakvargaStyle, reqLang);
    }

    if (key === 'kp' && (!kpData || force) && !kpLoading) {
      fetchKpData(kpStyle, reqLang);
    }

    if (key === 'sadesati' && (!sadeSati || force) && !sadeSatiLoading) {
      fetchSadeSatiData(reqLang);
    }

    if (key === 'shadbala' && (!shadbala || force) && !shadbalaLoading) {
      fetchShadbalaData(reqLang);
    }

    if (key === 'bhavbala' && (!bhavBala || force) && !bhavBalaLoading) {
      fetchBhavBalaData(reqLang);
    }

    if (key === 'divisional' && (!divisionalChart || force) && !divisionalLoading) {
      fetchDivisionalChart(divisionalDiv, divisionalStyle, reqLang);
    }

    if (key === 'manglik' && (!manglik || force) && !manglikLoading) {
      fetchManglikData(reqLang);
    }
  };

  const planets = Array.isArray(basicReport)
    ? basicReport
    : (basicReport ? Object.values(basicReport).filter(p => p && typeof p === 'object' && p.name) : []);

  const renderBasicTab = () => {
    if (basicTabLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading basic details...</Text>
        </View>
      );
    }
    return (
      <View style={styles.tabScrollContent}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Birth Details</Text>
          <View style={styles.infoGrid}>
            <InfoItem label="Name" value={kundaliRecord?.name || form.name} />
            <InfoItem label="Gender" value={kundaliRecord?.gender || form.gender} />
            <InfoItem label="Date" value={kundaliRecord?.birthDate || form.birthDate} />
            <InfoItem label="Time" value={kundaliRecord?.birthTime || form.birthTime} />
            <InfoItem label="Place" value={kundaliRecord?.birthPlace || form.birthPlace} fullWidth />
            <InfoItem label="Latitude" value={kundaliRecord?.latitude || form.latitude} />
            <InfoItem label="Longitude" value={kundaliRecord?.longitude || form.longitude} />
            <InfoItem label="Timezone" value="UTC +5.5" fullWidth />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Birth Panchang</Text>
          <View style={styles.infoGrid}>
            <InfoItem label="Tithi" value={dpick(birthPanchang, 'tithi.details.tithi_name', 'tithi')} />
            <InfoItem label="Nakshatra" value={dpick(birthPanchang, 'nakshatra.details.nak_name', 'nakshatra')} />
            <InfoItem label="Yoga" value={dpick(birthPanchang, 'yoga.details.yog_name', 'yoga')} />
            <InfoItem label="Karana" value={dpick(birthPanchang, 'karana.details.karan_name', 'karana')} />
            <InfoItem label="Sunrise" value={dpick(birthPanchang, 'sunrise')} />
            <InfoItem label="Sunset" value={dpick(birthPanchang, 'sunset')} />
            <InfoItem label="Moon Sign" value={dpick(birthPanchang, 'moon_sign')} />
            <InfoItem label="Sun Sign" value={dpick(birthPanchang, 'sun_sign')} />
            <InfoItem label="Masa" value={dpick(birthPanchang, 'masa')} />
            <InfoItem label="Ritu" value={dpick(birthPanchang, 'ritu')} />
            <InfoItem label="Ayanamsa" value={dpick(birthPanchang, 'ayanamsa')} />
            <InfoItem label="Vikram Samvat" value={dpick(birthPanchang, 'vikram_samvat')} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Avakhada Details</Text>
          <View style={styles.infoGrid}>
            <InfoItem label="Varna" value={dpick(avakhada, 'varna')} />
            <InfoItem label="Vashya" value={dpick(avakhada, 'vashya')} />
            <InfoItem label="Yoni" value={dpick(avakhada, 'yoni')} />
            <InfoItem label="Gana" value={dpick(avakhada, 'gana')} />
            <InfoItem label="Nadi" value={dpick(avakhada, 'nadi')} />
            <InfoItem label="Rasi" value={dpick(avakhada, 'rasi')} />
            <InfoItem label="Rasi Lord" value={dpick(avakhada, 'rasi_lord')} />
            <InfoItem label="Nakshatra" value={dpick(avakhada, 'nakshatra')} />
            <InfoItem label="Nakshatra Lord" value={dpick(avakhada, 'nakshatra_lord')} />
            <InfoItem label="Lagna" value={dpick(avakhada, 'ascendant_sign', 'lagna', 'ascendant')} />
            <InfoItem label="Lagna Nak." value={dpick(avakhada, 'ascendant_nakshatra')} />
            <InfoItem label="Tatva" value={dpick(avakhada, 'tatva')} />
            <InfoItem label="Paya (Nak)" value={dpick(avakhada, 'paya_by_nakshatra')} />
          </View>
        </View>

        {/* Lucky Factors & Stones */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🍀 Lucky Factors & Gems</Text>
          <View style={styles.luckyCardGrid}>
            <LuckyCard icon="💎" label="Life Stone" value={dpick(avakhada, 'life_stone')} color="#ef4444" />
            <LuckyCard icon="✨" label="Lucky Stone" value={dpick(avakhada, 'lucky_stone')} color="#f59e0b" />
            <LuckyCard icon="💰" label="Fortune Stone" value={dpick(avakhada, 'fortune_stone')} color="#10b981" />
            <LuckyCard icon="🔢" label="Lucky Number" value={dpick(basicReport, 'lucky_num')} color="#3b82f6" />
            <LuckyCard icon="🎨" label="Lucky Color" value={dpick(basicReport, 'lucky_colors')} color="#8b5cf6" />
            <LuckyCard icon="🔤" label="Letters" value={dpick(basicReport, 'lucky_letters')} color="#ec4899" />
          </View>
          {basicReport?.lucky_name_start && (
             <View style={{ marginTop: 12, padding: 12, backgroundColor: '#fdf2f8', borderRadius: 12, borderWidth: 1, borderColor: '#fbcfe8' }}>
               <Text style={{ fontSize: 11, fontWeight: '700', color: '#9d174d', textTransform: 'uppercase', marginBottom: 4 }}>Recommended Name Starts</Text>
               <Text style={{ fontSize: 14, color: '#be185d', fontWeight: '800' }}>{Array.isArray(basicReport.lucky_name_start) ? basicReport.lucky_name_start.join(', ') : basicReport.lucky_name_start}</Text>
             </View>
          )}
        </View>

        {/* Travel & Directions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🗺️ Travel & Directions</Text>
          <View style={styles.infoGrid}>
            <InfoItem label="Disha Shool" value={dpick(birthPanchang, 'advanced_details.disha_shool')} color="#ef4444" />
            <InfoItem label="Ausp. Direction" value={Array.isArray(birthPanchang?.nakshatra?.auspicious_disha) ? birthPanchang.nakshatra.auspicious_disha.join(', ') : dpick(birthPanchang, 'nakshatra.auspicious_disha')} color="#10b981" />
            <InfoItem label="Yogini Nivas" value={dpick(birthPanchang, 'advanced_details.moon_yogini_nivas')} color="#3b82f6" />
            <InfoItem label="Moon Phase" value={dpick(birthPanchang, 'advanced_details.masa.moon_phase')} />
          </View>
        </View>

        {/* Samvat & Year Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📅 Vedic Calendar (Samvat)</Text>
          <View style={styles.infoGrid}>
            <InfoItem label="Vikram Samvat" value={`${dpick(birthPanchang, 'advanced_details.years.vikram_samvaat')} (${dpick(birthPanchang, 'advanced_details.years.vikram_samvaat_name')})`} />
            <InfoItem label="Saka Samvat" value={`${dpick(birthPanchang, 'advanced_details.years.saka')} (${dpick(birthPanchang, 'advanced_details.years.saka_samvaat_name')})`} />
            <InfoItem label="Kali Samvat" value={`${dpick(birthPanchang, 'advanced_details.years.kali')} (${dpick(birthPanchang, 'advanced_details.years.kali_samvaat_name')})`} />
            <InfoItem label="Tamil Month" value={`${dpick(birthPanchang, 'advanced_details.masa.tamil_month')} (${dpick(birthPanchang, 'advanced_details.masa.tamil_day')})`} />
          </View>
        </View>

        {/* Astronomical Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔭 Astronomical Data</Text>
          <View style={styles.infoGrid}>
            <InfoItem label="Sun @ Rise" value={`${String(dpick(birthPanchang, 'sun_position.sun_degree_at_rise', '0')).slice(0, 5)}°`} />
            <InfoItem label="Sun Nakshatra" value={dpick(birthPanchang, 'sun_position.nakshatra')} />
            <InfoItem label="Moon Degree" value={`${String(dpick(birthPanchang, 'moon_position.moon_degree', '0')).slice(0, 5)}°`} />
            <InfoItem label="Ahargana" value={Math.floor(dpick(birthPanchang, 'advanced_details.ahargana', 0))} />
          </View>
        </View>

        {/* Muhurtas & Kaals */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⌛ Muhurta & Important Kaals</Text>
          <View style={styles.muhurtaGrid}>
            <View style={[styles.muhurtaItem, styles.muhurtaAuspicious]}>
              <Text style={styles.muhurtaLabel}>😇 Abhijit Muhurta</Text>
              <Text style={styles.muhurtaValue}>{dpick(birthPanchang, 'advanced_details.abhijit_muhurta.start', 'advanced_details.abhijit_muhurta')} - {dpick(birthPanchang, 'advanced_details.abhijit_muhurta.end', '')}</Text>
            </View>
            <View style={[styles.muhurtaItem, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
              <Text style={styles.muhurtaLabel}>🌙 Moon Rise/Set</Text>
              <Text style={styles.muhurtaValue}>{dpick(birthPanchang, 'advanced_details.moon_rise')} / {dpick(birthPanchang, 'advanced_details.moon_set')}</Text>
            </View>
            <View style={[styles.muhurtaItem, styles.muhurtaInauspicious]}>
              <Text style={styles.muhurtaLabel}>🌑 Rahukaal</Text>
              <Text style={styles.muhurtaValue}>{dpick(birthPanchang, 'rahukaal')}</Text>
            </View>
            <View style={[styles.muhurtaItem, styles.muhurtaInauspicious]}>
              <Text style={styles.muhurtaLabel}>👺 Gulika Kaal</Text>
              <Text style={styles.muhurtaValue}>{dpick(birthPanchang, 'gulika')}</Text>
            </View>
          </View>
        </View>

        {/* Ghatka Chakra */}
        {dpick(basicReport, 'ghatka_chakra') !== '-' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🚫 Ghatka Chakra (Unfavorable)</Text>
            <View style={styles.ghatkaGrid}>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>Rasi</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.rasi')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>Day</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.day')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>Nakshatra</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.nakshatra')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>Tatva</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.tatva')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>Lord</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.lord')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>Tithi</Text><Text style={styles.ghatkaValue}>{Array.isArray(basicReport?.ghatka_chakra?.tithi) ? basicReport.ghatka_chakra.tithi.join(', ') : dpick(basicReport, 'ghatka_chakra.tithi')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>Lagna (M)</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.same_sex_lagna')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>Lagna (F)</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.opposite_sex_lagna')}</Text></View>
            </View>
          </View>
        )}

        {/* Panchang Descriptions */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📜 Panchang Insights</Text>
          <View style={styles.descSection}>
            <View style={styles.descItem}>
              <Text style={styles.descLabel}>Tithi: {dpick(birthPanchang, 'tithi.name', 'tithi')} (Diety: {dpick(birthPanchang, 'tithi.diety')})</Text>
              <Text style={styles.descText}>{dpick(birthPanchang, 'tithi.meaning', 'tithi.special')}</Text>
            </View>
            <View style={styles.descItem}>
              <Text style={styles.descLabel}>Nakshatra: {dpick(birthPanchang, 'nakshatra.name', 'nakshatra')} (Diety: {dpick(birthPanchang, 'nakshatra.diety')})</Text>
              <Text style={styles.descText}>{dpick(birthPanchang, 'nakshatra.summary', 'nakshatra.meaning', 'nakshatra.special')}</Text>
            </View>
            <View style={styles.descItem}>
              <Text style={styles.descLabel}>Yoga: {dpick(birthPanchang, 'yoga.name', 'yoga')}</Text>
              <Text style={styles.descText}>{dpick(birthPanchang, 'yoga.meaning', 'yoga.special')}</Text>
            </View>
            <View style={styles.descItem}>
              <Text style={styles.descLabel}>Karana: {dpick(birthPanchang, 'karana.name', 'karana')} (Lord: {dpick(birthPanchang, 'karana.lord')})</Text>
              <Text style={styles.descText}>{dpick(birthPanchang, 'karana.special')}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderChart = (svgOrUrl, degreeMap = null) => {
    if (!svgOrUrl || typeof svgOrUrl !== 'string') {
      return <Text style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>Chart not available</Text>;
    }
    const isSvg = svgOrUrl.includes('<svg');
    const processedSvg = isSvg ? (degreeMap ? injectDegreesIntoSvg(cleanSvg(svgOrUrl), degreeMap) : cleanSvg(svgOrUrl)) : svgOrUrl;
    const html = isSvg
      ? `<html><body style="margin:0;padding:0;background:#fff;display:flex;justify-content:center;align-items:center;">${processedSvg}</body></html>`
      : `<html><body style="margin:0;padding:0;display:flex;justify-content:center;align-items:center;"><img src="${svgOrUrl}" style="width:100%;max-width:100%;"/></body></html>`;
    return (
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ width: width - 80, height: width - 80, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        scalesPageToFit={true}
      />
    );
  };

  const renderLagnaTab = () => {
    if (lagnaLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading Lagna charts...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabScrollContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          {['north', 'south', 'east'].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chartStyleBtn, chartStyle === s && styles.chartStyleBtnActive]}
              onPress={() => { setChartStyle(s); if (kundaliRecord?.id) fetchLagnaCharts(kundaliRecord.id, s, lang); }}
            >
              <Text style={[styles.chartStyleText, chartStyle === s && styles.chartStyleTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)} Indian
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Lagna Chart (D1)</Text>
          </View>
          <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
            {renderChart(lagnaD1Svg, showDegrees ? buildDegreeMap(basicReport) : null)}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Navamsa Chart (D9)</Text>
          <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
            {renderChart(lagnaD9Svg, showDegrees ? buildDegreeMap(basicReport) : null)}
          </View>
        </View>
      </View>
    );
  };

  const renderPlanetsTab = () => {
    if (basicLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading Planets...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabScrollContent}>
        {planets.map((p, i) => {
          const degreeValue = parseFloat(p.normDegree || p.fullDegree || p.degree || 0);
          const degreePercent = Math.min((degreeValue % 30) / 30 * 100, 100);

          return (
            <View key={i} style={styles.planetCard}>
              <View style={styles.planetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.planetIcon}>
                    <Text style={styles.planetIconText}>{PLANET_GLYPHS[p.name] || '•'}</Text>
                  </View>
                  <Text style={[styles.planetNameText, { color: p.lord_status === 'Benefic' || p.lord_status === 'Highly Benefic' ? '#10b981' : p.lord_status === 'Malefic' || p.lord_status === 'Highly Malefic' ? '#ef4444' : '#1a0533' }]}>
                    {p.name} {p.lord_status === 'Benefic' || p.lord_status === 'Highly Benefic' ? '▲' : p.lord_status === 'Malefic' || p.lord_status === 'Highly Malefic' ? '▼' : ''}
                  </Text>
                  {(p.retro === 'R' || p.retro === true || p.isRetro) ? (
                    <View style={styles.retroBadge}><Text style={styles.retroBadgeText}>Rx</Text></View>
                  ) : null}
                </View>
                <View style={styles.planetHouseBadge}>
                  <Text style={styles.planetHouseText}>House {p.house || '-'}</Text>
                </View>
              </View>

              <View style={styles.planetDetailsGrid}>
                <View style={styles.planetGridItem}>
                  <Text style={styles.planetGridLabel}>Sign</Text>
                  <Text style={styles.planetGridValue}>{p.zodiac || p.sign || '-'}</Text>
                </View>
                <View style={styles.planetGridItem}>
                  <Text style={styles.planetGridLabel}>Status</Text>
                  <Text style={[styles.planetGridValue, { color: p.is_combust ? '#f97316' : '#10b981' }]}>
                    {p.is_combust ? 'Combust' : 'Safe'}
                  </Text>
                </View>
                <View style={styles.planetGridItem}>
                  <Text style={styles.planetGridLabel}>Nakshatra</Text>
                  <Text style={styles.planetGridValue}>{p.nakshatra || '-'}</Text>
                </View>
                <View style={styles.planetGridItem}>
                  <Text style={styles.planetGridLabel}>Avastha</Text>
                  <Text style={styles.planetGridValue}>{p.basic_avastha || '-'}</Text>
                </View>
              </View>

              <View style={styles.degreeRow}>
                <Text style={styles.degreeLabel}>Degree: {degreeValue.toFixed(2)}°</Text>
                <View style={styles.degreeBarBg}>
                  <LinearGradient
                    colors={['#7c3aed', '#c084fc']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.degreeBarFill, { width: `${degreePercent}%` }]}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderDashaTab = () => {
    const rootList = Array.isArray(mahadashaList) ? mahadashaList : (mahadashaList?.mahadasha || mahadashaList?.vimsottari || []);

    let currentList = rootList;
    if (dashaPath.length > 0) {
      const currentParent = dashaPath[dashaPath.length - 1];
      currentList = computeSubDashas(currentParent.planet, currentParent.start, currentParent.end);
    }

    const dashaLevelNames = ['Mahadasha', 'Antardasha', 'Pratyantar', 'Sookshma', 'Pran'];
    const currentLevel = dashaPath.length;

    return (
      <View style={styles.tabScrollContent}>
        {dashaPath.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setDashaPath([])} style={styles.breadcrumbPill}>
                <Text style={styles.breadcrumbText}>Root</Text>
              </TouchableOpacity>
              {dashaPath.map((crumb, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.breadcrumbArrow}>›</Text>
                  <TouchableOpacity
                    onPress={() => setDashaPath(dashaPath.slice(0, idx + 1))}
                    style={[styles.breadcrumbPill, idx === dashaPath.length - 1 && styles.breadcrumbPillActive]}
                  >
                    <Text style={[styles.breadcrumbText, idx === dashaPath.length - 1 && styles.breadcrumbTextActive]}>{crumb.planet}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <Text style={styles.sectionDesc}>Vimshottari Dasha ({dashaLevelNames[currentLevel] || 'Sub-dasha'})</Text>

        {currentList.map((d, i) => {
          const planetName = d.planet || d.lord || d.name;
          const dashaOrders = mahadashaList?.order_of_dashas || {};
          const levelKeys = ['major', 'minor', 'sub_minor', 'sub_sub_minor'];
          const activeAtLevel = dashaOrders[levelKeys[currentLevel]]?.name;
          const isCurrent = d.is_current || d.is_active || planetName === activeAtLevel;
          
          return (
            <TouchableOpacity
              key={i}
              style={[styles.dashaItem, isCurrent && { borderColor: '#7c3aed', backgroundColor: '#faf5ff', borderWidth: 1.5 }]}
              disabled={currentLevel >= 4}
              onPress={() => {
                if (currentLevel < 4) {
                  setDashaPath([...dashaPath, { planet: planetName, start: d.start, end: d.end }]);
                }
              }}
            >
              <View style={[styles.dashaIcon, isCurrent && { backgroundColor: '#7c3aed' }]}>
                <Text style={[styles.dashaIconText, isCurrent && { color: '#fff' }]}>{PLANET_GLYPHS[planetName] || '•'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.dashaPlanet}>{planetName}</Text>
                  {isCurrent && (
                    <View style={{ backgroundColor: '#7c3aed', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 8, color: '#fff', fontWeight: 'bold' }}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.dashaRange}>{new Date(d.start).toLocaleDateString()} - {new Date(d.end).toLocaleDateString()}</Text>
              </View>
              <View style={styles.dashaBadge}>
                <Text style={styles.dashaBadgeText}>{dashaLevelNames[currentLevel]}</Text>
              </View>
              {currentLevel < 4 && <Text style={{ color: '#ccc', fontSize: 20, marginLeft: 8 }}>›</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderYoginiTab = () => {
    if (yoginiLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading Yogini Dasha...</Text>
        </View>
      );
    }

    let rootList = [];
    const ySource = yoginiList?.yogini || yoginiList;
    if (Array.isArray(ySource)) {
      rootList = ySource;
    } else if (ySource && Array.isArray(ySource.dasha_list)) {
      let currentStart = new Date(ySource.start_date);
      rootList = ySource.dasha_list.map((dName, i) => {
        const lord = ySource.dasha_lord_list?.[i] || '';
        const endStr = ySource.dasha_end_dates?.[i];
        const endDt = new Date(endStr);
        const item = {
          planet: dName,
          lord: lord,
          start: isNaN(currentStart.getTime()) ? ySource.start_date : currentStart.toISOString().split('T')[0],
          end: isNaN(endDt.getTime()) ? endStr : endDt.toISOString().split('T')[0]
        };
        if (!isNaN(endDt.getTime())) currentStart = endDt;
        return item;
      });
    }
    let currentList = rootList;
    if (yoginiPath.length > 0) {
      const currentParent = yoginiPath[yoginiPath.length - 1];
      currentList = computeYoginiSubs(currentParent.planet, currentParent.start, currentParent.end);
    }

    const dashaLevelNames = ['Mahadasha', 'Antardasha', 'Pratyantar', 'Sookshma', 'Pran'];
    const currentLevel = yoginiPath.length;

    return (
      <View style={styles.tabScrollContent}>
        {yoginiPath.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setYoginiPath([])} style={styles.breadcrumbPill}>
                <Text style={styles.breadcrumbText}>Root</Text>
              </TouchableOpacity>
              {yoginiPath.map((crumb, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.breadcrumbArrow}>›</Text>
                  <TouchableOpacity
                    onPress={() => setYoginiPath(yoginiPath.slice(0, idx + 1))}
                    style={[styles.breadcrumbPill, idx === yoginiPath.length - 1 && styles.breadcrumbPillActive]}
                  >
                    <Text style={[styles.breadcrumbText, idx === yoginiPath.length - 1 && styles.breadcrumbTextActive]}>{crumb.planet}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <Text style={styles.sectionDesc}>Yogini Dasha ({dashaLevelNames[currentLevel] || 'Sub-dasha'})</Text>

        {currentList.map((d, i) => {
          const planetName = d.planet || d.lord || d.name || d.yogini;
          return (
            <TouchableOpacity
              key={i}
              style={styles.dashaItem}
              disabled={currentLevel >= 4}
              onPress={() => {
                if (currentLevel < 4) {
                  setYoginiPath([...yoginiPath, { planet: planetName, start: d.start, end: d.end }]);
                }
              }}
            >
              <View style={styles.dashaIcon}>
                <Text style={styles.dashaIconText}>{(planetName || 'Y').charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dashaPlanet}>{planetName}</Text>
                <Text style={styles.dashaRange}>{d.start} - {d.end}</Text>
              </View>
              <View style={styles.dashaBadge}>
                <Text style={styles.dashaBadgeText}>{dashaLevelNames[currentLevel]}</Text>
              </View>
              {currentLevel < 4 && <Text style={{ color: '#ccc', fontSize: 20, marginLeft: 8 }}>›</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderTransitTab = () => {
    if (transitLoading && !transitSvg) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading Transit Chart...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabScrollContent}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={[styles.textInput, { flex: 1, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => setShowPicker({ visible: true, mode: 'date', target: 'transitDate' })}
          >
            <Text style={{ fontSize: 14, color: '#374151', fontWeight: '600' }}>📅 {transitDate}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          {['north', 'south', 'east'].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chartStyleBtn, transitStyle === s && styles.chartStyleBtnActive, { flex: 1, alignItems: 'center' }]}
              onPress={() => { setTransitStyle(s); fetchTransitData(transitDate, s); }}
            >
              <Text style={[styles.chartStyleText, transitStyle === s && styles.chartStyleTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {transitLoading && transitSvg && (
          <ActivityIndicator size="small" color="#7c3aed" style={{ marginBottom: 10 }} />
        )}

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Transit Chart</Text>
          <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
            {renderChart(transitSvg)}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Transit Planets</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(transitPlanets || []).map((p, i) => (
              <View key={i} style={[styles.planetGridItem, { width: '48%', backgroundColor: '#faf5ff', borderColor: '#f3e8ff', borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1a0533' }}>{p.name}</Text>
                  <Text style={{ fontSize: 16, color: '#7c3aed' }}>{PLANET_GLYPHS[p.name] || '•'}</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{p.sign || p.zodiac}</Text>
                <Text style={{ fontSize: 11, color: '#6b7280' }}>House {p.house}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };


  const renderKpTab = () => {
    if (kpLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading KP System...</Text>
        </View>
      );
    }
    if (!kpData) return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>No data available</Text>;

    const normalizeKpRows = (raw) => {
      if (!raw) return [];
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'object') {
        const arr = Object.values(raw);
        if (arr.length > 0 && typeof arr[0] === 'object') return arr;
      }
      return [];
    };

    const kpPlanets = normalizeKpRows(kpData.kpPlanets).filter(p => p && typeof p === 'object');
    const kpCusps = normalizeKpRows(kpData.kpCusps).filter(c => c && typeof c === 'object');
    const chalitChartSvg = kpData.chalitChart?.svg || kpData.chalitChart || null;

    const getLordRow = (n) => kpPlanets.find(p => p.name === n || p.full_name === n);
    const ascRow = getLordRow('Ascendant');
    const moonRow = getLordRow('Moon');
    const rpList = [];
    if (ascRow) {
      rpList.push({ label: 'Ascendant Sign Lord', value: ascRow.sign_lord });
      rpList.push({ label: 'Ascendant Star Lord', value: ascRow.star_lord });
      rpList.push({ label: 'Ascendant Sub Lord', value: ascRow.sub_lord });
    }
    if (moonRow) {
      rpList.push({ label: 'Moon Sign Lord', value: moonRow.sign_lord });
      rpList.push({ label: 'Moon Star Lord', value: moonRow.star_lord });
      rpList.push({ label: 'Moon Sub Lord', value: moonRow.sub_lord });
    }

    return (
      <View style={styles.tabScrollContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          {['north', 'south', 'east'].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chartStyleBtn, kpStyle === s && styles.chartStyleBtnActive, { flex: 1, alignItems: 'center' }]}
              onPress={() => { setKpStyle(s); fetchKpData(s); }}
            >
              <Text style={[styles.chartStyleText, kpStyle === s && styles.chartStyleTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>Bhav Chalit Chart (KP)</Text>
          <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
            {renderChart(chalitChartSvg)}
          </View>
        </View>

        {rpList.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Ruling Planets</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {rpList.map((rp, i) => (
                <View key={i} style={[styles.planetGridItem, { width: '48%' }]}>
                  <Text style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2 }}>{rp.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1a0533' }}>{rp.value || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {kpPlanets.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>KP Planets</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {kpPlanets.map((p, i) => (
                <View key={i} style={[styles.planetGridItem, { width: '48%', backgroundColor: '#faf5ff', borderColor: '#f3e8ff', borderWidth: 1 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1a0533' }}>{p.name || p.full_name}</Text>
                    <Text style={{ fontSize: 16, color: '#7c3aed' }}>{PLANET_GLYPHS[p.name || p.full_name] || '•'}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Sign Lord: {p.pseudo_rasi_lord || p.sign_lord}</Text>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Star Lord: {p.pseudo_nakshatra_lord || p.star_lord || p.nakshatra_lord}</Text>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Sub Lord: {p.sub_lord}</Text>
                  <Text style={{ fontSize: 11, color: '#7c3aed', fontWeight: 'bold', marginTop: 4 }}>SS Lord: {p.sub_sub_lord || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {kpCusps.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>KP House Cusps</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {kpCusps.map((c, i) => (
                <View key={i} style={[styles.planetGridItem, { width: '48%', backgroundColor: '#fff', borderColor: '#e5e7eb', borderWidth: 1 }]}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#B8860B', marginBottom: 4 }}>House {c.house_id || c.house || (i + 1)}</Text>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Sign Lord: {c.end_rasi_lord || c.sign_lord}</Text>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Star Lord: {c.end_nakshatra_lord || c.star_lord || c.nakshatra_lord}</Text>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Sub Lord: {c.cusp_sub_lord || c.sub_lord}</Text>
                  <Text style={{ fontSize: 11, color: '#7c3aed', fontWeight: 'bold' }}>SS Lord: {c.cusp_sub_sub_lord || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSadeSatiTab = () => {
    if (sadeSatiLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading Sade Sati...</Text>
        </View>
      );
    }
    if (!sadeSati) return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>No data available</Text>;

    const getField = (...keys) => {
      for (const k of keys) {
        if (sadeSati[k] !== undefined && sadeSati[k] !== null && sadeSati[k] !== '') return sadeSati[k];
      }
      return null;
    };

    const periodType = getField('type', 'sade_sati_status', 'is_under_sade_sati', 'sade_sati_type', 'status');
    const isInSadeSati = periodType && !/none|not|no|nil/i.test(String(periodType));

    let tableData = sadeSatiTable || getField('phases', 'sade_sati_table', 'table');
    if (tableData && typeof tableData === 'object' && !Array.isArray(tableData)) {
      tableData = Object.values(tableData).filter(x => typeof x === 'object');
    }
    if (!Array.isArray(tableData)) tableData = [];

    const statusColor = !isInSadeSati ? '#10b981' : (/peak|janma|moon/i.test(String(periodType)) ? '#dc2626' : '#f59e0b');
    const statusBg = !isInSadeSati ? '#dcfce7' : (/peak|janma|moon/i.test(String(periodType)) ? '#fee2e2' : '#fef3c7');

    return (
      <View style={styles.tabScrollContent}>
        <View style={[styles.sectionCard, { backgroundColor: statusBg, borderColor: statusColor }]}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>
              {!isInSadeSati ? '✅' : (/peak/i.test(String(periodType)) ? '🔥' : '⚠️')}
            </Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: statusColor, marginBottom: 6 }}>
              {!isInSadeSati ? 'Not in Sade Sati' : 'Currently in Sade Sati'}
            </Text>
            {isInSadeSati && periodType && (
              <Text style={{ fontSize: 14, color: '#374151', textTransform: 'capitalize', textAlign: 'center' }}>
                Phase: {String(periodType).replace(/_/g, ' ')}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sade Sati Analysis</Text>
          <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 22 }}>
            {getField('summary', 'description', 'report', 'observation') ||
              "Sade Sati is the 7½ years long period of Saturn (Shani). This astrological phase is much feared by those in India who give credence to Indian Astrology. It represents the transit of Saturn over the natal moon."}
          </Text>
        </View>

        {tableData.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Sade Sati Phases</Text>
            {tableData.map((phase, idx) => (
              <View key={idx} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: idx < tableData.length - 1 ? 1 : 0,
                borderBottomColor: '#f3f4f6'
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a0533', textTransform: 'capitalize' }}>
                    {phase.phase_name || phase.name || `Phase ${idx + 1}`}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {(phase.start || phase.start_date)} - {(phase.end || phase.end_date)}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: String(phase.is_sadesati || phase.is_in_sade_sati).toLowerCase() === 'true' || phase.is_sadesati === true || phase.is_sadesati === 1 ? '#fee2e2' : '#f3f4f6',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: String(phase.is_sadesati || phase.is_in_sade_sati).toLowerCase() === 'true' || phase.is_sadesati === true || phase.is_sadesati === 1 ? '#dc2626' : '#9ca3af'
                  }}>
                    {String(phase.is_sadesati || phase.is_in_sade_sati).toLowerCase() === 'true' || phase.is_sadesati === true || phase.is_sadesati === 1 ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderShadbalaTab = () => {
    if (shadbalaLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading Shadbala...</Text>
        </View>
      );
    }
    if (!shadbala || Object.keys(shadbala).length === 0) {
      return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>Shadbala data unavailable</Text>;
    }

    const SHADBALA_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    const SHADBALA_COMPONENTS = [
      { key: 'uccha_bala', label: 'Uccha' },
      { key: 'saptavargaja_bala', label: 'Saptavarga' },
      { key: 'dig_bala', label: 'Dig' },
      { key: 'ayana_bala', label: 'Ayana' },
      { key: 'chesta_Bala', label: 'Chesta' },
      { key: 'naisargeka_balas', label: 'Naisargika' },
      { key: 'drik_bala', label: 'Drik' }
    ];

    const getVal = (planet, compKey) => {
      for (const k of [compKey, compKey.replace('_bala', ''), compKey.toUpperCase(), compKey.replace('_', ''), 'total_' + compKey]) {
        if (shadbala[k]?.[planet] !== undefined && shadbala[k]?.[planet] !== null) {
          const v = parseFloat(shadbala[k][planet]);
          return isNaN(v) ? '-' : v.toFixed(1);
        }
      }
      return '-';
    };

    const getTotalRupas = (planet) => {
      for (const k of ['total_balas', 'total_shadbala_in_rupas', 'shadbala_in_rupas', 'total_rupas']) {
        if (shadbala[k]?.[planet] !== undefined && shadbala[k]?.[planet] !== null) {
          const v = parseFloat(shadbala[k][planet]);
          return isNaN(v) ? '-' : (v / 60).toFixed(2);
        }
      }
      return '-';
    };

    const getRatio = (planet) => {
      if (shadbala.ratio?.[planet]) return parseFloat(shadbala.ratio[planet]).toFixed(2);
      return '-';
    };

    return (
      <View style={styles.tabScrollContent}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Planetary Strength in Rupas</Text>
          <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
            Total 6-fold strength (Shadbala) aggregated into Rupas.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {SHADBALA_PLANETS.map(p => {
              const rupas = getTotalRupas(p);
              const ratio = getRatio(p);
              if (rupas === '-') return null;
              
              return (
                <View key={p} style={[styles.planetGridItem, { width: '48%' }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#1a0533' }}>{p}</Text>
                    <Text style={{ fontSize: 14, color: '#7c3aed' }}>{PLANET_GLYPHS[p] || '•'}</Text>
                  </View>
                  <Text style={{ fontSize: 16, color: '#7c3aed', fontWeight: 'bold' }}>{rupas} Rupas</Text>
                  <View style={{ marginTop: 4, paddingVertical: 2, paddingHorizontal: 6, backgroundColor: '#f3e8ff', borderRadius: 4, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 10, color: '#7c3aed', fontWeight: '800' }}>Ratio: {ratio}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Component Breakdown (Virupas)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8, marginBottom: 8 }}>
                <Text style={{ width: 80, fontWeight: 'bold', color: '#374151', fontSize: 12 }}>Planet</Text>
                {SHADBALA_COMPONENTS.map(c => (
                  <Text key={c.key} style={{ width: 75, fontWeight: 'bold', color: '#374151', fontSize: 12 }}>{c.label}</Text>
                ))}
              </View>
              {SHADBALA_PLANETS.map((planet, idx) => (
                <View key={planet} style={{ flexDirection: 'row', paddingVertical: 8, backgroundColor: idx % 2 === 0 ? '#fff' : '#faf5ff' }}>
                  <Text style={{ width: 80, fontWeight: '700', color: '#1a0533', fontSize: 12 }}>{planet}</Text>
                  {SHADBALA_COMPONENTS.map(c => (
                    <Text key={c.key} style={{ width: 75, color: '#4b5563', fontSize: 12 }}>
                      {getVal(planet, c.key)}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderBhavBalaTab = () => {
    if (bhavBalaLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading Bhav Bala...</Text>
        </View>
      );
    }
    if (!bhavBala || Object.keys(bhavBala).length === 0) {
      return (
        <View style={styles.tabScrollContent}>
          <View style={[styles.sectionCard, { backgroundColor: '#fdf2f8', borderColor: '#f59e0b' }]}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 8 }}>ℹ️</Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#92400e', textAlign: 'center', marginBottom: 8 }}>
              Bhav Bala Not Available
            </Text>
            <Text style={{ fontSize: 14, color: '#374151', textAlign: 'center', lineHeight: 22 }}>
              Your current plan does not include a dedicated Bhav Bala endpoint. Astrologers calculate Bhav strength by combining House Lord strength (Shadbala) with directional strength. Please refer to the Shadbala tab.
            </Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>House Lord Quick Reference</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[
                ['H1 (Self)', 'See Lagna lord in Shadbala'],
                ['H2 (Wealth)', '2nd sign lord'],
                ['H3 (Siblings)', '3rd sign lord'],
                ['H4 (Mother)', '4th sign lord'],
                ['H5 (Children)', '5th sign lord'],
                ['H6 (Disease)', '6th sign lord'],
                ['H7 (Spouse)', '7th sign lord'],
                ['H8 (Longevity)', '8th sign lord'],
                ['H9 (Fortune)', '9th sign lord'],
                ['H10 (Career)', '10th sign lord'],
                ['H11 (Gains)', '11th sign lord'],
                ['H12 (Loss)', '12th sign lord'],
              ].map(([k, v], i) => (
                <View key={i} style={[styles.planetGridItem, { width: '48%' }]}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#7c3aed' }}>{k}</Text>
                  <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      );
    }

    const BHAVBALA_COMPONENTS = [
      { id: 'bhavadhipathi', label: 'Bhavadhipathi', keys: ['bhavadhipathi_bala', 'bhava_adhipati_bala', 'lord_bala'] },
      { id: 'digbala', label: 'Bhava Dig', keys: ['bhava_digbala', 'bhava_dig_bala', 'dig_bala'] },
      { id: 'drishti', label: 'Bhava Drishti', keys: ['bhava_drishti_bala', 'bhava_drik_bala', 'drishti_bala'] },
    ];

    const getComp = (house, comp) => {
      for (const k of comp.keys) {
        const obj = bhavBala[k];
        if (obj && typeof obj === 'object') {
          const v = obj[house] !== undefined ? obj[house] : obj[String(house)];
          if (v !== undefined && v !== null) {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : null;
          }
        }
      }
      return null;
    };

    const getTotalRupas = (house) => {
      const directKeys = ['total_bhava_bala', 'total_bhavabala', 'bhava_bala_total', 'total'];
      for (const k of directKeys) {
        const obj = bhavBala[k];
        if (obj && typeof obj === 'object') {
          const v = obj[house] !== undefined ? obj[house] : obj[String(house)];
          if (v !== undefined && v !== null) {
            const n = parseFloat(v);
            if (Number.isFinite(n)) return (n / 60).toFixed(2);
          }
        }
      }
      let sum = 0;
      let ok = false;
      for (const c of BHAVBALA_COMPONENTS) {
        const val = getComp(house, c);
        if (val !== null) { sum += val; ok = true; }
      }
      return ok ? (sum / 60).toFixed(2) : '-';
    };

    return (
      <View style={styles.tabScrollContent}>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>House Strength in Rupas</Text>
          <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
            Aggregated strength of all 12 Houses (Bhavas).
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => {
              const rupas = getTotalRupas(h);
              return (
                <View key={h} style={[styles.planetGridItem, { width: '48%' }]}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#1a0533' }}>House {h}</Text>
                  <Text style={{ fontSize: 16, color: '#7c3aed', marginTop: 4 }}>{rupas} Rupas</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Component Breakdown (Virupas)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8, marginBottom: 8 }}>
                <Text style={{ width: 80, fontWeight: 'bold', color: '#374151', fontSize: 12 }}>House</Text>
                {BHAVBALA_COMPONENTS.map(c => (
                  <Text key={c.id} style={{ width: 95, fontWeight: 'bold', color: '#374151', fontSize: 12 }}>{c.label}</Text>
                ))}
              </View>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h, idx) => (
                <View key={h} style={{ flexDirection: 'row', paddingVertical: 8, backgroundColor: idx % 2 === 0 ? '#fff' : '#faf5ff' }}>
                  <Text style={{ width: 80, fontWeight: '700', color: '#1a0533', fontSize: 12 }}>House {h}</Text>
                  {BHAVBALA_COMPONENTS.map(c => (
                    <Text key={c.id} style={{ width: 95, color: '#4b5563', fontSize: 12 }}>
                      {getComp(h, c) ?? '-'}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderDivisionalTab = () => {
    const DIVISIONAL_OPTIONS = [
      { div: 'D1', name: 'Lagna / Birth Chart (D1)', desc: 'Overall life, personality & soul' },
      { div: 'D9', name: 'Navamsa (D9)', desc: 'Marriage, dharma & spiritual path' },
      { div: 'chalit', name: 'Chalit Chart', desc: 'House cusps & bhav placement' },
      { div: 'sun', name: 'Sun Chart (Surya)', desc: 'Personality & ego' },
      { div: 'moon', name: 'Moon Chart (Chandra)', desc: 'Mind & emotions' },
      { div: 'D2', name: 'Hora (D2)', desc: 'Wealth, financial prospects' },
      { div: 'D3', name: 'Drekkana (D3)', desc: 'Siblings, courage, life span' },
      { div: 'D4', name: 'Chaturthamsa (D4)', desc: 'Property, residence, fortune' },
      { div: 'D7', name: 'Saptamsa (D7)', desc: 'Children, progeny, creativity' },
      { div: 'D10', name: 'Dasamsa (D10)', desc: 'Career, profession, social status' },
      { div: 'D12', name: 'Dwadasamsa (D12)', desc: 'Parents, ancestry, lineage' },
      { div: 'D16', name: 'Shodasamsa (D16)', desc: 'Vehicles, pleasures, comforts' },
      { div: 'D20', name: 'Vimsamsa (D20)', desc: 'Spirituality, religious progress' },
      { div: 'D24', name: 'Chaturvimsamsa (D24)', desc: 'Education, learning' },
      { div: 'D27', name: 'Saptavimsamsa (D27)', desc: 'Strength, weakness, stamina' },
      { div: 'D30', name: 'Trimsamsa (D30)', desc: 'Misfortunes, illnesses, troubles' },
      { div: 'D40', name: 'Khavedamsa (D40)', desc: 'Auspicious & inauspicious effects' },
      { div: 'D45', name: 'Akshavedamsa (D45)', desc: 'Character, conduct, integrity' },
      { div: 'D60', name: 'Shashtiamsa (D60)', desc: 'Past karma, deepest analysis' },
    ];

    const currentOpt = DIVISIONAL_OPTIONS.find(o => o.div === divisionalDiv) || DIVISIONAL_OPTIONS[0];

    return (
      <View style={styles.tabScrollContent}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          {['north', 'south', 'east'].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chartStyleBtn, divisionalStyle === s && styles.chartStyleBtnActive, { flex: 1, alignItems: 'center' }]}
              onPress={() => { setDivisionalStyle(s); fetchDivisionalChart(divisionalDiv, s); }}
            >
              <Text style={[styles.chartStyleText, divisionalStyle === s && styles.chartStyleTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.textInput, { paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }]}
          onPress={() => setShowDivModal(true)}
        >
          <View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a0533' }}>{currentOpt.name}</Text>
            <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{currentOpt.desc}</Text>
          </View>
          <Text style={{ color: '#9ca3af', fontSize: 20 }}>⌄</Text>
        </TouchableOpacity>

        <View style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>{currentOpt.name}</Text>
          {divisionalLoading && !divisionalChart ? (
            <ActivityIndicator size="large" color="#7c3aed" style={{ marginVertical: 40 }} />
          ) : (
            <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
              {renderChart(divisionalChart)}
            </View>
          )}
        </View>

        <Modal visible={showDivModal} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>Select Divisional Chart</Text>
                <TouchableOpacity onPress={() => setShowDivModal(false)}>
                  <Text style={{ fontSize: 16, color: '#7c3aed', fontWeight: 'bold' }}>Close</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {DIVISIONAL_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.div}
                    style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: divisionalDiv === opt.div ? '#faf5ff' : '#fff' }}
                    onPress={() => {
                      setDivisionalDiv(opt.div);
                      setShowDivModal(false);
                      fetchDivisionalChart(opt.div, divisionalStyle);
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '700', color: divisionalDiv === opt.div ? '#7c3aed' : '#1a0533' }}>{opt.name}</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{opt.desc}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const renderAshtakvargaTab = () => {
    if (ashtakvargaLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading Ashtakvarga...</Text>
        </View>
      );
    }
    if (!ashtakvarga) {
      return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>Ashtakvarga data unavailable</Text>;
    }

    const { sav, binnas } = ashtakvarga;
    const binnaKeys = binnas ? Object.keys(binnas) : [];
    const selectedBinna = binnaKeys.includes(ashtakvargaView) ? ashtakvargaView : (binnaKeys[0] || null);
    const binnaSvg = selectedBinna ? binnas[selectedBinna]?.chart : null;

    // SAV table data
    const savData = sav?.data || sav;
    const savOrder = savData?.ashtvarga_order || savData?.ashtakvarga_order || [];
    const savPoints = savData?.ashtvarga_points || savData?.ashtakvarga_points || [];
    const savTotal = savData?.ashtvarga_total || savData?.ashtakvarga_total || [];

    return (
      <View style={styles.tabScrollContent}>
        {/* Chart Style Selector */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          {['north', 'south', 'east'].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.chartStyleBtn, ashtakvargaStyle === s && styles.chartStyleBtnActive, { flex: 1, alignItems: 'center' }]}
              onPress={() => { setAshtakvargaStyle(s); fetchAshtakvargaData(s); }}
            >
              <Text style={[styles.chartStyleText, ashtakvargaStyle === s && styles.chartStyleTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Planet Selector for Binna Ashtakvarga */}
        {binnaKeys.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {binnaKeys.map(planet => (
                <TouchableOpacity
                  key={planet}
                  style={[
                    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50, borderWidth: 1.5 },
                    selectedBinna === planet
                      ? { borderColor: '#7c3aed', backgroundColor: '#f3e8ff' }
                      : { borderColor: '#e5e7eb', backgroundColor: '#fff' }
                  ]}
                  onPress={() => setAshtakvargaView(planet)}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: selectedBinna === planet ? '#7c3aed' : '#6b7280' }}>
                    {planet}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        {/* Binna Chart & Breakdown */}
        {selectedBinna && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{selectedBinna} Bhinnashtakvarga</Text>
              <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
                {renderChart(binnaSvg)}
              </View>
            </View>

            {/* Binna Breakdown Table */}
            {binnas[selectedBinna]?.data && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{selectedBinna} Contributions</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Planet-wise points contributed to each house for {selectedBinna}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8, marginBottom: 4 }}>
                      <Text style={{ width: 90, fontWeight: 'bold', color: '#374151', fontSize: 12 }}>Source</Text>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                        <Text key={h} style={{ width: 32, textAlign: 'center', fontWeight: 'bold', color: '#374151', fontSize: 12 }}>{h}</Text>
                      ))}
                    </View>
                    {Object.keys(binnas[selectedBinna].data).map((sourcePlanet, idx) => (
                      <View key={sourcePlanet} style={{ flexDirection: 'row', paddingVertical: 6, backgroundColor: idx % 2 === 0 ? '#fff' : '#faf5ff' }}>
                        <Text style={{ width: 90, fontWeight: '700', color: '#1a0533', fontSize: 12 }}>{sourcePlanet}</Text>
                        {binnas[selectedBinna].data[sourcePlanet].map((v, i) => (
                          <Text key={i} style={{ width: 32, textAlign: 'center', color: v === 1 ? '#16a34a' : '#d1d5db', fontWeight: v === 1 ? '700' : '400', fontSize: 12 }}>
                            {v}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* SAV Table */}
        {savOrder.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Sarvashtakvarga (SAV) Points</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Combined Ashtakvarga points across all 12 houses</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3e8ff', paddingBottom: 8, marginBottom: 4 }}>
                  <Text style={{ width: 90, fontWeight: 'bold', color: '#374151', fontSize: 12 }}>Planet</Text>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                    <Text key={h} style={{ width: 32, textAlign: 'center', fontWeight: 'bold', color: '#374151', fontSize: 12 }}>{h}</Text>
                  ))}
                  <Text style={{ width: 42, textAlign: 'center', fontWeight: 'bold', color: '#7c3aed', fontSize: 12 }}>Tot</Text>
                </View>
                {savOrder.map((planet, idx) => {
                  const pts = savPoints[idx] || [];
                  const tot = savTotal[idx];
                  return (
                    <View key={planet} style={{ flexDirection: 'row', paddingVertical: 6, backgroundColor: idx % 2 === 0 ? '#fff' : '#faf5ff' }}>
                      <Text style={{ width: 90, fontWeight: '700', color: '#1a0533', fontSize: 12 }}>{planet}</Text>
                      {(Array.isArray(pts) ? pts : Object.values(pts)).map((v, i) => {
                        const n = parseInt(v) || 0;
                        const color = n >= 4 ? '#16a34a' : '#dc2626';
                        return (
                          <Text key={i} style={{ width: 32, textAlign: 'center', color, fontWeight: '700', fontSize: 12 }}>{v}</Text>
                        );
                      })}
                      <Text style={{ width: 42, textAlign: 'center', fontWeight: '800', color: '#7c3aed', fontSize: 12 }}>{tot ?? '-'}</Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderManglikTab = () => {
    if (manglikLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>Loading Manglik Details...</Text>
        </View>
      );
    }
    if (!manglik) return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>Manglik data unavailable</Text>;

    const { isPresent, percent, description, remedies, presentRules, cancelRules } = extractManglik(manglik);
    const statusColor = isPresent ? '#dc2626' : '#10b981';
    const statusBg = isPresent ? '#fee2e2' : '#dcfce7';

    return (
      <View style={styles.tabScrollContent}>
        <View style={[styles.sectionCard, { backgroundColor: statusBg, borderColor: statusColor }]}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>{isPresent ? '🔥' : '✅'}</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: statusColor, marginBottom: 6 }}>
              {isPresent ? 'You are Manglik' : 'You are NOT Manglik'}
            </Text>
            {percent > 0 && (
              <Text style={{ fontSize: 14, color: statusColor, fontWeight: '600', marginTop: 4 }}>
                Intensity: {percent}%
              </Text>
            )}
          </View>
        </View>

        {description && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Analysis</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 22 }}>{description}</Text>
          </View>
        )}

        {presentRules.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Factors Causing Mangal Dosh</Text>
            {presentRules.map((rule, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ color: '#dc2626', marginRight: 8 }}>•</Text>
                <Text style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 }}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {cancelRules.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Cancellation Rules (Apavada)</Text>
            {cancelRules.map((rule, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ color: '#10b981', marginRight: 8 }}>•</Text>
                <Text style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 }}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {remedies.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Suggested Remedies</Text>
            {remedies.map((rule, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ color: '#f59e0b', marginRight: 8 }}>★</Text>
                <Text style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 }}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {conclusion && (
          <View style={[styles.sectionCard, { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }]}>
            <Text style={[styles.sectionTitle, { color: '#9d174d' }]}>Final Verdict</Text>
            <Text style={{ fontSize: 14, color: '#831843', lineHeight: 22 }}>{conclusion}</Text>
          </View>
        )}
      </View>
    );
  };

  const InfoItem = ({ label, value, fullWidth, color }) => (
    <View style={[styles.infoItem, fullWidth && { width: '100%' }]}>
      <Text style={[styles.infoLabel, color && { color }]}>{label}</Text>
      <Text style={[styles.infoValue, color && { color }]} numberOfLines={1}>{value}</Text>
    </View>
  );

  const LuckyCard = ({ icon, label, value, color }) => (
    <View style={[styles.luckyCard, { borderColor: color + '40', backgroundColor: color + '10' }]}>
      <Text style={styles.luckyCardIcon}>{icon}</Text>
      <Text style={styles.luckyCardLabel}>{label}</Text>
      <Text style={[styles.luckyCardValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Free Kundali</Text>
        <View style={{ width: 40 }} />
      </View>

      {!kundaliRecord ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={{ flex: 1, backgroundColor: '#F7F7F7' }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            {/* Hero Banner */}
            <LinearGradient
              colors={['#1A1A1A', '#3D1A00']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            >
              <View style={styles.heroIconRow}>
                <Text style={styles.heroEmoji}>🔮</Text>
              </View>
              <Text style={styles.heroTitle}>Free Janam Kundali</Text>
              <Text style={styles.heroSubtitle}>Accurate Vedic birth chart with 13 detailed sections</Text>
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>✦ 100% Free</Text></View>
                <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>✦ Instant Results</Text></View>
                <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>✦ Vedic System</Text></View>
              </View>
            </LinearGradient>

            {/* Form Card */}
            <View style={styles.formWrapper}>
              <View style={styles.formCard}>

                <View style={styles.formTitleRow}>
                  <View style={styles.formTitleAccent} />
                  <Text style={styles.formHeading}>Birth Details</Text>
                </View>

                {/* Name */}
                <Text style={styles.inputLabel}>👤  Full Name</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your full name"
                    placeholderTextColor="#BBBBBB"
                    value={form.name}
                    onChangeText={t => handleChange('name', t)}
                    returnKeyType="next"
                  />
                </View>

                {/* Gender */}
                <Text style={styles.inputLabel}>⚧  Gender</Text>
                <View style={styles.genderRow}>
                  {[
                    { label: '♂ Male', val: 'Male' },
                    { label: '♀ Female', val: 'Female' },
                    { label: '⚧ Other', val: 'Other' },
                  ].map(g => (
                    <TouchableOpacity
                      key={g.val}
                      style={[styles.genderPill, form.gender === g.val && styles.genderPillActive]}
                      onPress={() => handleChange('gender', g.val)}
                    >
                      <Text style={[styles.genderText, form.gender === g.val && styles.genderTextActive]}>
                        {g.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Date & Time Row */}
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>📅  Date of Birth</Text>
                    <TouchableOpacity
                      style={styles.pickerTrigger}
                      onPress={() => setShowPicker({ visible: true, mode: 'date', target: 'birthDate' })}
                    >
                      <Text style={styles.pickerIcon}>📅</Text>
                      <Text style={[styles.pickerValue, !form.birthDate && { color: '#BBBBBB' }]}>
                        {form.birthDate || 'YYYY-MM-DD'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>⏰  Time of Birth</Text>
                    <TouchableOpacity
                      style={styles.pickerTrigger}
                      onPress={() => setShowPicker({ visible: true, mode: 'time', target: 'birthTime' })}
                    >
                      <Text style={styles.pickerIcon}>⏰</Text>
                      <Text style={[styles.pickerValue, !form.birthTime && { color: '#BBBBBB' }]}>
                        {form.birthTime || 'HH:MM'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Place of Birth */}
                <Text style={styles.inputLabel}>📍  Place of Birth</Text>
                <View style={styles.placeWrapper}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Search city, town..."
                      placeholderTextColor="#BBBBBB"
                      value={form.birthPlace}
                      onChangeText={handlePlaceChange}
                      returnKeyType="search"
                    />
                    {placeLoading && (
                      <ActivityIndicator style={styles.placeLoader} size="small" color="#FFCC00" />
                    )}
                  </View>

                  {showSuggestions && suggestions.length > 0 && (
                    <View style={styles.suggestionBox}>
                      {suggestions.map((s, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.suggestionItem, i === suggestions.length - 1 && { borderBottomWidth: 0 }]}
                          onPress={() => selectPlace(s)}
                        >
                          <Text style={styles.suggStar}>📍</Text>
                          <Text style={styles.suggestionText}>{s.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {form.latitude ? (
                  <View style={styles.coordBadge}>
                    <Text style={styles.coordText}>✔ Location verified: {form.latitude}, {form.longitude}</Text>
                  </View>
                ) : null}

                {/* Submit */}
                <TouchableOpacity
                  style={[styles.submitButton, loading && { opacity: 0.75 }]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FFCC00', '#E6A800']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.submitGradient}
                  >
                    {loading
                      ? <ActivityIndicator color="#1A1A1A" />
                      : <>
                          <Text style={styles.submitText}>Generate Free Kundali</Text>
                          <Text style={styles.submitArrow}>→</Text>
                        </>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.formDisclaimer}>🔒 Your data is private & secure</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Result Header */}
          <LinearGradient colors={['#1A1A1A', '#2D1500']} style={styles.resultHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{kundaliRecord.name}</Text>
              <Text style={styles.resultMeta}>
                {kundaliRecord.birthDate} • {kundaliRecord.birthTime} • {kundaliRecord.birthPlace}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowLangModal(true)} style={styles.langBtn}>
              <Text style={styles.langBtnText}>🌐 {LANGUAGES.find(l => l.code === lang)?.label || 'En'}</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Horizontal Tabs */}
          <View style={{ backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrapper} contentContainerStyle={{ paddingHorizontal: 8 }}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
                  onPress={() => handleTabChange(tab.key)}
                >
                  <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
            {activeTab === 'basic' && renderBasicTab()}
            {activeTab === 'lagna' && renderLagnaTab()}
            {activeTab === 'planets' && renderPlanetsTab()}
            {activeTab === 'transit' && renderTransitTab()}
            {activeTab === 'dasha' && renderDashaTab()}
            {activeTab === 'yogini' && renderYoginiTab()}
            {activeTab === 'ashtakvarga' && renderAshtakvargaTab()}
            {activeTab === 'kp' && renderKpTab()}
            {activeTab === 'sadesati' && renderSadeSatiTab()}
            {activeTab === 'shadbala' && renderShadbalaTab()}
            {activeTab === 'bhavbala' && renderBhavBalaTab()}
            {activeTab === 'divisional' && renderDivisionalTab()}
            {activeTab === 'manglik' && renderManglikTab()}

            <TouchableOpacity style={styles.resetButton} onPress={() => setKundaliRecord(null)}>
              <Text style={styles.resetText}>↺ Generate New Kundali</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      )}

      {/* Language Picker Modal */}
      <Modal visible={showLangModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1a0533' }}>Select Language</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Text style={{ fontSize: 16, color: '#7c3aed', fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {LANGUAGES.map(l => (
                <TouchableOpacity
                  key={l.code}
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: lang === l.code ? '#faf5ff' : '#fff' }}
                  onPress={() => onChangeLang(l.code)}
                >
                  <Text style={{ fontSize: 15, fontWeight: lang === l.code ? '700' : '500', color: lang === l.code ? '#7c3aed' : '#1a0533' }}>
                    {l.label}
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

export default KundaliScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    height: 100, paddingTop: 40, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  backIcon: { fontSize: 20, color: '#000', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },

  /* ── Hero ── */
  heroGradient: {
    paddingTop: 36, paddingBottom: 56, alignItems: 'center', paddingHorizontal: 24,
  },
  heroIconRow: { marginBottom: 10 },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFCC00', marginBottom: 8, textAlign: 'center' },
  heroSubtitle: { fontSize: 13, color: '#CCC', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  heroBadgeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroBadge: {
    backgroundColor: 'rgba(255,204,0,0.15)', borderRadius: 50,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,204,0,0.4)',
  },
  heroBadgeText: { color: '#FFCC00', fontSize: 11, fontWeight: '700' },

  /* ── Form card ── */
  formWrapper: { marginTop: -28, paddingHorizontal: 16 },
  formCard: {
    backgroundColor: '#FFF', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10, shadowRadius: 16, elevation: 8,
  },
  formTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  formTitleAccent: { width: 4, height: 22, borderRadius: 4, backgroundColor: '#FFCC00' },
  formHeading: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },

  inputLabel: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 6, marginTop: 14, letterSpacing: 0.3 },
  inputWrapper: { position: 'relative' },
  textInput: {
    backgroundColor: '#F7F7F7', borderWidth: 1.5, borderColor: '#EEEEEE',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: '#1A1A1A', fontWeight: '500',
  },
  row: { flexDirection: 'row', gap: 10 },

  /* Gender pills */
  genderRow: { flexDirection: 'row', gap: 8, marginTop: 2 },
  genderPill: {
    flex: 1, paddingVertical: 11, alignItems: 'center',
    borderRadius: 50, borderWidth: 1.5, borderColor: '#EEEEEE', backgroundColor: '#F7F7F7',
  },
  genderPillActive: { borderColor: '#FFCC00', backgroundColor: '#FFFBE6' },
  genderText: { fontSize: 13, fontWeight: '600', color: '#888' },
  genderTextActive: { color: '#E6A800', fontWeight: '800' },

  /* Date/Time picker */
  pickerTrigger: {
    backgroundColor: '#F7F7F7', borderWidth: 1.5, borderColor: '#EEEEEE',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  pickerIcon: { fontSize: 14 },
  pickerValue: { fontSize: 14, color: '#1A1A1A', fontWeight: '500', flexShrink: 1 },

  /* Place input */
  placeWrapper: { position: 'relative', zIndex: 20 },
  placeLoader: { position: 'absolute', right: 14, top: 14, zIndex: 1 },
  suggestionBox: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE',
    borderRadius: 12, marginTop: 4, elevation: 6, shadowColor: '#000',
    shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 13, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  suggStar: { fontSize: 13 },
  suggestionText: { fontSize: 14, color: '#1A1A1A', flex: 1 },

  coordBadge: {
    marginTop: 8, backgroundColor: '#F0FFF4', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  coordText: { fontSize: 11, color: '#16A34A', fontWeight: '600' },

  /* Submit button */
  submitButton: {
    borderRadius: 14, marginTop: 28,
    shadowColor: '#FFCC00', shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
    elevation: 8, overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, gap: 8,
  },
  submitText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  submitArrow: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  formDisclaimer: { textAlign: 'center', fontSize: 11, color: '#AAA', marginTop: 14 },

  resultHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 20, paddingBottom: 20,
  },
  resultName: { fontSize: 20, fontWeight: '800', color: '#FFCC00' },
  resultMeta: { fontSize: 12, color: '#CCC', marginTop: 4 },
  langBtn: { backgroundColor: 'rgba(255,204,0,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,204,0,0.5)' },
  langBtnText: { fontSize: 12, fontWeight: '800', color: '#FFCC00' },

  tabsWrapper: { backgroundColor: '#FFF' },
  tabItem: { paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabItemActive: { borderBottomColor: '#FFCC00' },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#999' },
  tabLabelActive: { color: '#1A1A1A', fontWeight: '800' },

  tabScrollContent: { padding: 16 },
  sectionCard: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a0533', marginBottom: 16 },
  sectionDesc: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoItem: { width: '48%', backgroundColor: '#FFFBE6', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FFE082' },
  infoLabel: { fontSize: 10, color: '#E6A800', textTransform: 'uppercase', marginBottom: 4, fontWeight: '700', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#1a0533' },

  planetCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#f3e8ff',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2
  },
  planetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 12 },
  planetIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFBE6', alignItems: 'center', justifyContent: 'center' },
  planetIconText: { fontSize: 16, color: '#E6A800' },
  planetNameText: { fontSize: 16, fontWeight: '800', color: '#1a0533' },
  retroBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  retroBadgeText: { fontSize: 10, fontWeight: '800', color: '#ef4444' },
  planetHouseBadge: { backgroundColor: '#FFFBE6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  planetHouseText: { fontSize: 11, fontWeight: '700', color: '#E6A800' },
  planetDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  planetGridItem: { width: '48%', backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EEE' },
  planetGridLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginBottom: 2, fontWeight: '600' },
  planetGridValue: { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  degreeRow: {},
  degreeLabel: { fontSize: 11, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  degreeBarBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  degreeBarFill: { height: '100%', borderRadius: 3 },

  dashaItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f3e8ff',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1
  },
  dashaIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFBE6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dashaIconText: { fontSize: 20, color: '#E6A800' },
  dashaPlanet: { fontSize: 15, fontWeight: '800', color: '#1a0533' },
  dashaRange: { fontSize: 12, color: '#6b7280', marginTop: 2, fontWeight: '500' },
  dashaBadge: { backgroundColor: '#FFFBE6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dashaBadgeText: { fontSize: 10, color: '#E6A800', fontWeight: '800' },

  breadcrumbPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: '#f3f4f6' },
  breadcrumbPillActive: { backgroundColor: '#f3e8ff', borderWidth: 1, borderColor: '#7c3aed' },
  breadcrumbText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
  breadcrumbTextActive: { color: '#7c3aed', fontWeight: '800' },
  breadcrumbArrow: { marginHorizontal: 6, color: '#9ca3af', fontSize: 16 },

  chartStyleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 50, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  chartStyleBtnActive: { borderColor: '#FFCC00', backgroundColor: '#FFCC00' },
  chartStyleText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chartStyleTextActive: { color: '#1A1A1A' },

  statusBanner: {
    padding: 20, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', marginBottom: 16
  },
  statusIcon: { fontSize: 32, marginBottom: 8 },
  statusTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  statusDesc: { fontSize: 13, color: '#666', textAlign: 'center' },
  analysisText: { fontSize: 14, color: '#444', lineHeight: 22 },

  resetButton: {
    margin: 16, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#EEE', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  resetText: { fontSize: 15, fontWeight: '700', color: '#555' },

  /* ── Enhanced Styles ── */
  muhurtaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  muhurtaItem: { flex: 1, minWidth: '45%', padding: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  muhurtaLabel: { fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: '700', marginBottom: 4 },
  muhurtaValue: { fontSize: 13, fontWeight: '800', color: '#1a0533' },
  muhurtaAuspicious: { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  muhurtaInauspicious: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },

  luckyCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  luckyCard: { width: '48%', padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  luckyCardIcon: { fontSize: 24, marginBottom: 6 },
  luckyCardLabel: { fontSize: 10, fontWeight: '700', color: '#666', textTransform: 'uppercase', textAlign: 'center' },
  luckyCardValue: { fontSize: 13, fontWeight: '800', color: '#1a0533', textAlign: 'center', marginTop: 2 },

  descSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 16 },
  descItem: { marginBottom: 12 },
  descLabel: { fontSize: 13, fontWeight: '800', color: '#1a0533', marginBottom: 4 },
  descText: { fontSize: 12, color: '#4b5563', lineHeight: 18 },

  ghatkaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ghatkaItem: { width: '31%', padding: 10, borderRadius: 10, backgroundColor: '#FFFBE6', borderWidth: 1, borderColor: '#FFE082' },
  ghatkaLabel: { fontSize: 9, color: '#E6A800', textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },
  ghatkaValue: { fontSize: 12, fontWeight: '700', color: '#1a0533' },

  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: '800' },
  pillRetro: { backgroundColor: '#fee2e2', color: '#ef4444' },
  pillCombust: { backgroundColor: '#fff7ed', color: '#f97316' },
  pillBenefic: { backgroundColor: '#dcfce7', color: '#10b981' },
  pillMalefic: { backgroundColor: '#f3f4f6', color: '#6b7280' },
});
