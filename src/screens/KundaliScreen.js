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
import { locationService } from '../api/locationService';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import KundaliChart from '../components/KundaliChart';
import kundaliPermissions from '../config/kundali_permissions.json';

const { width } = Dimensions.get('window');

const canShow = (tabKey, sectionKey = null) => {
  const tab = kundaliPermissions.free_kundali.tabs[tabKey];
  if (!tab || tab.show === false) return false;
  if (sectionKey && tab.sections && tab.sections[sectionKey] === false) return false;
  return true;
};

const TABS = [
  { key: 'basic', labelKey: 'tabBasic', phase: 1 },
  { key: 'lagna', labelKey: 'tabLagna', phase: 2 },
  { key: 'transit', labelKey: 'tabTransit', phase: 3 },
  { key: 'dasha', labelKey: 'tabDasha', phase: 4 },
  { key: 'yogini', labelKey: 'tabYogini', phase: 5 },
  { key: 'ashtakvarga', labelKey: 'tabAshtakvarga', phase: 6 },
  { key: 'planets', labelKey: 'tabPlanets', phase: 7 },
  { key: 'divisional', labelKey: 'tabDivisional', phase: 8 },
  { key: 'kp', labelKey: 'tabKP', phase: 9 },
  { key: 'sadesati', labelKey: 'tabSadeSati', phase: 10 },
  { key: 'shadbala', labelKey: 'tabShadbala', phase: 11 },
  { key: 'bhavbala', labelKey: 'tabBhavBala', phase: 12 },
  { key: 'manglik', labelKey: 'tabManglik', phase: 13 },
].filter(t => canShow(t.key));


const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  /*
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  */
];

const KUNDALI_LABELS = {
  en: {
    title: 'Free Kundali', heroTitle: 'Free Janam Kundali',
    heroSubtitle: 'Accurate Vedic birth chart with 13 detailed sections',
    birthDetails: 'Birth Details', fullName: 'Full Name', enterName: 'Enter your full name',
    gender: 'Gender', male: '♂ Male', female: '♀ Female', other: '⚧ Other',
    dateOfBirth: 'Date of Birth', timeOfBirth: 'Time of Birth',
    placeOfBirth: 'Place of Birth', searchCity: 'Search city, town...',
    generate: 'Generate Free Kundali', private: '🔒 Your data is private & secure',
    generateNew: '↺ Generate New Kundali',
    name: 'Name', genderLabel: 'Gender', date: 'Date', time: 'Time',
    place: 'Place', latitude: 'Latitude', longitude: 'Longitude', timezone: 'Timezone',
    birthPanchang: 'Birth Panchang',
    tithi: 'Tithi', nakshatra: 'Nakshatra', yoga: 'Yoga', karana: 'Karana',
    sunrise: 'Sunrise', sunset: 'Sunset', moonSign: 'Moon Sign', sunSign: 'Sun Sign',
    masa: 'Masa', ritu: 'Ritu', ayanamsa: 'Ayanamsa', vikramSamvat: 'Vikram Samvat',
    avakhada: 'Avakhada Details',
    varna: 'Varna', vashya: 'Vashya', yoni: 'Yoni', gana: 'Gana', nadi: 'Nadi',
    rasi: 'Rasi', rasiLord: 'Rasi Lord', nakshatraLord: 'Nakshatra Lord',
    lagna: 'Lagna', lagnaNak: 'Lagna Nak.', tatva: 'Tatva', paya: 'Paya (Nak)',
    luckyFactors: 'Lucky Factors & Gems',
    lifeStone: 'Life Stone', luckyStone: 'Lucky Stone', fortuneStone: 'Fortune Stone',
    luckyNumber: 'Lucky Number', luckyColor: 'Lucky Color', letters: 'Letters',
    recommendedName: 'Recommended Name Starts',
    travelDirections: 'Travel & Directions',
    dishaShool: 'Disha Shool', auspDirection: 'Ausp. Direction',
    yoginiNivas: 'Yogini Nivas', moonPhase: 'Moon Phase',
    vedicCalendar: 'Vedic Calendar (Samvat)',
    vikramSamvatSec: 'Vikram Samvat', sakaSamvat: 'Saka Samvat',
    kaliSamvat: 'Kali Samvat', tamilMonth: 'Tamil Month',
    astronomicalData: 'Astronomical Data',
    sunAtRise: 'Sun @ Rise', sunNakshatra: 'Sun Nakshatra',
    moonDegree: 'Moon Degree', ahargana: 'Ahargana',
    muhurtaKaals: 'Muhurta & Important Kaals',
    abhijitMuhurta: '😇 Abhijit Muhurta', moonRiseSet: '🌙 Moon Rise/Set',
    rahukaal: '🌑 Rahukaal', gulikaKaal: '👺 Gulika Kaal',
    ghatkaChakra: 'Ghatka Chakra (Unfavorable)', panchangInsights: 'Panchang Insights',
    loadingBasic: 'Loading basic details...', loadingLagna: 'Loading Lagna charts...',
    loadingPlanets: 'Loading Planets...', loadingTransit: 'Loading Transit Chart...',
    loadingDasha: 'Loading Dasha...', loadingYogini: 'Loading Yogini Dasha...',
    loadingKP: 'Loading KP System...', loadingSadeSati: 'Loading Sade Sati...',
    loadingShadbala: 'Loading Shadbala...', loadingManglik: 'Loading Manglik Details...',
    loadingAshtakvarga: 'Loading Ashtakvarga...',
    planet: 'Planet', house: 'House', zodiac: 'Zodiac', signLord: 'Sign Lord',
    degreeInSign: 'Degree in Sign', totalDegree: 'Total Degree',
    pada: 'Pada', degree: 'Degree',
    signView: '♉ Sign View', zodiacSignLord: 'Zodiac & Sign Lord',
    nakshatraView: '⭐ Nakshatra View', lunarMansion: 'Lunar mansion & Pada',
    transitChart: 'Transit Chart', transitPlanets: 'Transit Planets',
    vimshottariDasha: 'Vimshottari Dasha', yoginiDasha: 'Yogini Dasha', root: 'Root',
    notInSadeSati: 'Not in Sade Sati', inSadeSati: 'Currently in Sade Sati',
    sadeSatiAnalysis: 'Sade Sati Analysis', sadeSatiPhases: 'Sade Sati Phases',
    active: 'ACTIVE', inactive: 'INACTIVE',
    bhavChalit: 'Bhav Chalit Chart (KP)', rulingPlanets: 'Ruling Planets',
    kpPlanets: 'KP Planets Table', kpCusps: 'KP Cusps (Houses) Table',
    sign: 'Sign', cusp: 'Cusp', starLord: 'Star Lord', subLord: 'Sub Lord',
    shadBala: 'Shad Bala', componentBreakdown: 'Component Breakdown (Virupas)',
    bhavBala: 'Bhav Bala',
    youAreManglik: 'You are Manglik', youAreNotManglik: 'You are NOT Manglik',
    intensity: 'Intensity', analysis: 'Analysis',
    factorsCausing: 'Factors Causing Mangal Dosh',
    cancellationRules: 'Cancellation Rules (Apavada)',
    suggestedRemedies: 'Suggested Remedies', finalVerdict: 'Final Verdict',
    selectLang: 'Select Language', close: 'Close',
    noData: 'No data available', chartNotAvailable: 'Chart not available',
    sarvashtakvarga: 'Sarvashtakvarga (SAV) Points', contributions: 'Contributions',
    bhinnashtakvarga: 'Bhinnashtakvarga',
    lagnaChart: 'Lagna Chart (D1)', navamsa: 'Navamsa Chart (D9)',
    tabBasic: 'Basic', tabLagna: 'Lagna', tabTransit: 'Transit',
    tabDasha: 'Dasha', tabYogini: 'Yogini', tabAshtakvarga: 'Ashtakvarga',
    tabPlanets: 'Planets', tabDivisional: 'Divisional', tabKP: 'KP System',
    tabSadeSati: 'Sade Sati', tabShadbala: 'Shadbala', tabBhavBala: 'Bhav Bala',
    tabManglik: 'Manglik',
    day: 'Day', lord: 'Lord', lagnaM: 'Lagna (M)', lagnaF: 'Lagna (F)',
    planetSignLordStarSub: 'Planet with sign, sign lord, star lord, sub lord',
    twelveCuspsDesc: '12 cusps with degree, sign, sign lord, star lord, sub lord',
    componentBreakdownVirupas: 'Component Breakdown (Virupas)',
    combinedAshtakvargaPoints: 'Combined Ashtakvarga points for all houses',
    hundredPercentFree: '✦ 100% Free', instantResults: '✦ Instant Results', vedicSystem: '✦ Vedic System',
    source: 'Source',
    shadbalaUnavailable: 'Shadbala data unavailable',
    ashtakvargaUnavailable: 'Ashtakvarga data unavailable',
    planetSignLordDesc: 'Planet with degree, zodiac, sign lord',
    uccha: 'Uccha', saptavarga: 'Saptavarga', dig: 'Dig', ayana: 'Ayana', chesta: 'Chesta', naisargika: 'Naisargika', drik: 'Drik',
    d1: 'Lagna / Birth Chart (D1)', d1Desc: 'Overall life, personality & soul',
    d9: 'Navamsa (D9)', d9Desc: 'Marriage, dharma & spiritual path',
    chalit: 'Chalit Chart', chalitDesc: 'House cusps & bhav placement',
    sun: 'Sun Chart (Surya)', sunDesc: 'Personality & ego',
    moon: 'Moon Chart (Chandra)', moonDesc: 'Mind & emotions',
    d2: 'Hora (D2)', d2Desc: 'Wealth, financial prospects',
    d3: 'Drekkana (D3)', d3Desc: 'Siblings, courage, life span',
    d4: 'Chaturthamsa (D4)', d4Desc: 'Property, residence, fortune',
    d7: 'Saptamsa (D7)', d7Desc: 'Children, progeny, creativity',
    d10: 'Dasamsa (D10)', d10Desc: 'Career, profession, social status',
    d12: 'Dwadasamsa (D12)', d12Desc: 'Parents, ancestry, lineage',
    d16: 'Shodasamsa (D16)', d16Desc: 'Vehicles, pleasures, comforts',
    d20: 'Vimsamsa (D20)', d20Desc: 'Spirituality, religious progress',
    d24: 'Chaturvimsamsa (D24)', d24Desc: 'Education, learning',
    d27: 'Saptavimsamsa (D27)', d27Desc: 'Strength, weakness, stamina',
    d30: 'Trimsamsa (D30)', d30Desc: 'Misfortunes, illnesses, troubles',
    d40: 'Khavedamsa (D40)', d40Desc: 'Auspicious & inauspicious effects',
    d45: 'Akshavedamsa (D45)', d45Desc: 'Character, conduct, integrity',
    d60: 'Shashtiamsa (D60)', d60Desc: 'Past karma, deepest analysis',
    planetWisePointsDesc: 'Planet-wise points contributed to each house for',
  },
  hi: {
    title: 'मुफ्त कुंडली', heroTitle: 'मुफ्त जन्म कुंडली',
    heroSubtitle: '13 विस्तृत खंडों के साथ सटीक वैदिक जन्म चार्ट',
    birthDetails: 'जन्म विवरण', fullName: 'पूरा नाम', enterName: 'अपना पूरा नाम दर्ज करें',
    gender: 'लिंग', male: '♂ पुरुष', female: '♀ महिला', other: '⚧ अन्य',
    dateOfBirth: 'जन्म तिथि', timeOfBirth: 'जन्म समय',
    placeOfBirth: 'जन्म स्थान', searchCity: 'शहर, कस्बा खोजें...',
    generate: 'मुफ्त कुंडली बनाएं', private: '🔒 आपका डेटा निजी और सुरक्षित है',
    generateNew: '↺ नई कुंडली बनाएं',
    name: 'नाम', genderLabel: 'लिंग', date: 'तारीख', time: 'समय',
    place: 'स्थान', latitude: 'अक्षांश', longitude: 'देशांतर', timezone: 'समय क्षेत्र',
    birthPanchang: 'जन्म पंचांग',
    tithi: 'तिथि', nakshatra: 'नक्षत्र', yoga: 'योग', karana: 'करण',
    sunrise: 'सूर्योदय', sunset: 'सूर्यास्त', moonSign: 'चंद्र राशि', sunSign: 'सूर्य राशि',
    masa: 'मास', ritu: 'ऋतु', ayanamsa: 'अयनांश', vikramSamvat: 'विक्रम संवत',
    avakhada: 'अवखड़ा विवरण',
    varna: 'वर्ण', vashya: 'वश्य', yoni: 'योनि', gana: 'गण', nadi: 'नाड़ी',
    rasi: 'राशि', rasiLord: 'राशि स्वामी', nakshatraLord: 'नक्षत्र स्वामी',
    lagna: 'लग्न', lagnaNak: 'लग्न नक्षत्र', tatva: 'तत्व', paya: 'पाया (नक्ष)',
    luckyFactors: 'भाग्यशाली कारक और रत्न',
    lifeStone: 'जीवन रत्न', luckyStone: 'भाग्य रत्न', fortuneStone: 'सौभाग्य रत्न',
    luckyNumber: 'भाग्यशाली संख्या', luckyColor: 'भाग्यशाली रंग', letters: 'अक्षर',
    recommendedName: 'अनुशंसित नाम अक्षर',
    travelDirections: 'यात्रा और दिशाएं',
    dishaShool: 'दिशा शूल', auspDirection: 'शुभ दिशा',
    yoginiNivas: 'योगिनी निवास', moonPhase: 'चंद्र चरण',
    vedicCalendar: 'वैदिक कैलेंडर (संवत)',
    vikramSamvatSec: 'विक्रम संवत', sakaSamvat: 'शक संवत',
    kaliSamvat: 'कलि संवत', tamilMonth: 'तमिल मास',
    astronomicalData: 'खगोलीय डेटा',
    sunAtRise: 'उदय सूर्य', sunNakshatra: 'सूर्य नक्षत्र',
    moonDegree: 'चंद्र अंश', ahargana: 'अहर्गण',
    muhurtaKaals: 'मुहूर्त और महत्वपूर्ण काल',
    abhijitMuhurta: '😇 अभिजित मुहूर्त', moonRiseSet: '🌙 चंद्रोदय/चंद्रास्त',
    rahukaal: '🌑 राहुकाल', gulikaKaal: '👺 गुलिका काल',
    ghatkaChakra: 'घातक चक्र (अशुभ)', panchangInsights: 'पंचांग विवेचना',
    loadingBasic: 'बुनियादी विवरण लोड हो रहा है...', loadingLagna: 'लग्न चार्ट लोड हो रहे हैं...',
    loadingPlanets: 'ग्रह लोड हो रहे हैं...', loadingTransit: 'गोचर चार्ट लोड हो रहा है...',
    loadingDasha: 'दशा लोड हो रही है...', loadingYogini: 'योगिनी दशा लोड हो रही है...',
    loadingKP: 'केपी प्रणाली लोड हो रही है...', loadingSadeSati: 'साढ़ेसाती लोड हो रही है...',
    loadingShadbala: 'षड्बल लोड हो रहा है...', loadingManglik: 'मांगलिक विवरण लोड हो रहे हैं...',
    loadingAshtakvarga: 'अष्टकवर्ग लोड हो रहा है...',
    planet: 'ग्रह', house: 'भाव', zodiac: 'राशि', signLord: 'राशि स्वामी',
    degreeInSign: 'राशि में अंश', totalDegree: 'कुल अंश',
    pada: 'पद', degree: 'अंश',
    signView: '♉ राशि दृश्य', zodiacSignLord: 'राशि और राशि स्वामी',
    nakshatraView: '⭐ नक्षत्र दृश्य', lunarMansion: 'चंद्र मंदिर और पद',
    transitChart: 'गोचर चार्ट', transitPlanets: 'गोचर ग्रह',
    vimshottariDasha: 'विंशोत्तरी दशा', yoginiDasha: 'योगिनी दशा', root: 'मूल',
    notInSadeSati: 'साढ़ेसाती में नहीं', inSadeSati: 'वर्तमान में साढ़ेसाती में',
    sadeSatiAnalysis: 'साढ़ेसाती विश्लेषण', sadeSatiPhases: 'साढ़ेसाती के चरण',
    active: 'सक्रिय', inactive: 'निष्क्रिय',
    bhavChalit: 'भाव चलित चार्ट (केपी)', rulingPlanets: 'शासक ग्रह',
    kpPlanets: 'केपी ग्रह तालिका', kpCusps: 'केपी भाव (कस्प) तालिका',
    sign: 'राशि', cusp: 'कस्प', starLord: 'नक्षत्र स्वामी', subLord: 'उप-स्वामी',
    shadBala: 'षड्बल', componentBreakdown: 'घटक विवरण (विरूप)',
    bhavBala: 'भाव बल',
    youAreManglik: 'आप मांगलिक हैं', youAreNotManglik: 'आप मांगलिक नहीं हैं',
    intensity: 'तीव्रता', analysis: 'विश्लेषण',
    factorsCausing: 'मांगल दोष के कारण',
    cancellationRules: 'निरसन नियम (अपवाद)',
    suggestedRemedies: 'सुझाए गए उपाय', finalVerdict: 'अंतिम निर्णय',
    selectLang: 'भाषा चुनें', close: 'बंद करें',
    noData: 'कोई डेटा उपलब्ध नहीं', chartNotAvailable: 'चार्ट उपलब्ध नहीं',
    sarvashtakvarga: 'सर्वाष्टकवर्ग (SAV) अंक', contributions: 'योगदान',
    bhinnashtakvarga: 'भिन्नाष्टकवर्ग',
    lagnaChart: 'लग्न कुंडली (D1)', navamsa: 'नवांश कुंडली (D9)',
    tabBasic: 'बुनियादी', tabLagna: 'लग्न', tabTransit: 'गोचर',
    tabDasha: 'दशा', tabYogini: 'योगिनी', tabAshtakvarga: 'अष्टकवर्ग',
    tabPlanets: 'ग्रह', tabDivisional: 'विभागीय', tabKP: 'केपी प्रणाली',
    tabSadeSati: 'साढ़ेसाती', tabShadbala: 'षड्बल', tabBhavBala: 'भाव बल',
    tabManglik: 'मांगलिक',
    day: 'दिन', lord: 'स्वामी', lagnaM: 'लग्न (M)', lagnaF: 'लग्न (F)',
    planetSignLordStarSub: 'ग्रह के साथ राशि, राशि स्वामी, नक्षत्र स्वामी, उप स्वामी',
    twelveCuspsDesc: 'डिग्री, राशि, राशि स्वामी, नक्षत्र स्वामी, उप स्वामी के साथ 12 भाव',
    componentBreakdownVirupas: 'घटक विभाजन (विरुपा)',
    combinedAshtakvargaPoints: 'सभी भावों के लिए संयुक्त अष्टकवर्ग अंक',
    hundredPercentFree: '✦ 100% मुफ्त', instantResults: '✦ त्वरित परिणाम', vedicSystem: '✦ वैदिक प्रणाली',
    source: 'स्रोत',
    shadbalaUnavailable: 'षड्बल डेटा उपलब्ध नहीं है',
    ashtakvargaUnavailable: 'अष्टकवर्ग डेटा उपलब्ध नहीं है',
    planetSignLordDesc: 'डिग्री, राशि, राशि स्वामी के साथ ग्रह',
    uccha: 'उच्च', saptavarga: 'सप्तवर्ग', dig: 'दिग', ayana: 'अयन', chesta: 'चेष्टा', naisargika: 'नैसर्गिक', drik: 'दृक',
    d1: 'लग्न / जन्म कुंडली (D1)', d1Desc: 'समग्र जीवन, व्यक्तित्व और आत्मा',
    d9: 'नवांश (D9)', d9Desc: 'विवाह, धर्म और आध्यात्मिक पथ',
    chalit: 'चलित कुंडली', chalitDesc: 'भाव कस्प और भाव स्थिति',
    sun: 'सूर्य कुंडली', sunDesc: 'व्यक्तित्व और अहंकार',
    moon: 'चंद्र कुंडली', moonDesc: 'मन और भावनाएं',
    d2: 'होरा (D2)', d2Desc: 'धन, वित्तीय संभावनाएं',
    d3: 'द्रेष्काण (D3)', d3Desc: 'भाई-बहन, साहस, जीवन काल',
    d4: 'चतुर्थांश (D4)', d4Desc: 'संपत्ति, निवास, भाग्य',
    d7: 'सप्तमांश (D7)', d7Desc: 'बच्चे, संतान, रचनात्मकता',
    d10: 'दशांश (D10)', d10Desc: 'करियर, पेशा, सामाजिक स्थिति',
    d12: 'द्वादशांश (D12)', d12Desc: 'माता-पिता, पूर्वज, वंश',
    d16: 'षोडशांश (D16)', d16Desc: 'वाहन, सुख, आराम',
    d20: 'विंशांश (D20)', d20Desc: 'आध्यात्मिकता, धार्मिक प्रगति',
    d24: 'चतुर्विंशांश (D24)', d24Desc: 'शिक्षा, सीखना',
    d27: 'सप्तविंशांश (D27)', d27Desc: 'शक्ति, कमजोरी, सहनशक्ति',
    d30: 'त्रिंशांश (D30)', d30Desc: 'दुर्भाग्य, बीमारी, परेशानियां',
    d40: 'खवेदांश (D40)', d40Desc: 'शुभ और अशुभ प्रभाव',
    d45: 'अक्षवेदांश (D45)', d45Desc: 'चरित्र, आचरण, अखंडता',
    d60: 'षष्ठयांश (D60)', d60Desc: 'पिछला कर्म, गहरा विश्लेषण',
    planetWisePointsDesc: 'प्रत्येक भाव में दिए गए ग्रह-वार अंक',
  },
};

const PLANET_GLYPHS = {
  Sun: '☉', Moon: '☽', Mars: '♂', Mercury: '☿', Jupiter: '♃',
  Venus: '♀', Saturn: '♄', Rahu: '☊', Ketu: '☋', Ascendant: '🔱', 'As': '🔱',
  Su: '☉', Mo: '☽', Ma: '♂', Me: '☿', Ju: '♃', Ve: '♀', Sa: '♄', Ra: '☊', Ke: '☋'
};

const SIGN_LORDS = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

const formatDegree = (deg) => {
  if (deg === undefined || deg === null || deg === '') return '-';
  const n = parseFloat(deg);
  if (!Number.isFinite(n)) return '-';
  const abs = Math.abs(n);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = Math.floor(((abs - d) * 60 - m) * 60);
  return `${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}"`;
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
  const [lang, setLang] = useState('hi');
  const [activeTab, setActiveTab] = useState('basic');

  const debounceRef = useRef(null);
  const [showPicker, setShowPicker] = useState({ visible: false, mode: 'date', target: '' });

  // Language labels derived from current lang selection
  const l = KUNDALI_LABELS[lang] || KUNDALI_LABELS['en'];

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
        const results = await locationService.search(place);
        if (results?.length) {
          setSuggestions(results);
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
        const res = await locationService.geocode(suggestion.name);
        if (res?.latitude) {
          setForm(prev => ({ ...prev, latitude: String(res.latitude), longitude: String(res.longitude) }));
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
      const headers = { Authorization: `Bearer ${token}` };
      const addRes = await apiClient.post('/customer/kundali/add', {
        kundali: [{ ...form, pdf_type: 'basic' }]
      }, { headers });

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
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingBasic}</Text>
        </View>
      );
    }
    return (
      <View style={styles.tabScrollContent}>
        {canShow('basic', 'birth_details') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.birthDetails}</Text>
            <View style={styles.infoGrid}>
              <InfoItem label={l.name} value={kundaliRecord?.name || form.name} />
              <InfoItem label={l.genderLabel} value={kundaliRecord?.gender || form.gender} />
              <InfoItem label={l.date} value={kundaliRecord?.birthDate || form.birthDate} />
              <InfoItem label={l.time} value={kundaliRecord?.birthTime || form.birthTime} />
              <InfoItem label={l.place} value={kundaliRecord?.birthPlace || form.birthPlace} fullWidth />
              <InfoItem label={l.latitude} value={kundaliRecord?.latitude || form.latitude} />
              <InfoItem label={l.longitude} value={kundaliRecord?.longitude || form.longitude} />
              <InfoItem label={l.timezone} value="UTC +5.5" fullWidth />
            </View>
          </View>
        )}

        {canShow('basic', 'birth_panchang') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.birthPanchang}</Text>
            <View style={styles.infoGrid}>
              <InfoItem label={l.tithi} value={dpick(birthPanchang, 'tithi.details.tithi_name', 'tithi')} />
              <InfoItem label={l.nakshatra} value={dpick(birthPanchang, 'nakshatra.details.nak_name', 'nakshatra')} />
              <InfoItem label={l.yoga} value={dpick(birthPanchang, 'yoga.details.yog_name', 'yoga')} />
              <InfoItem label={l.karana} value={dpick(birthPanchang, 'karana.details.karan_name', 'karana')} />
              <InfoItem label={l.sunrise} value={dpick(birthPanchang, 'sunrise')} />
              <InfoItem label={l.sunset} value={dpick(birthPanchang, 'sunset')} />
              <InfoItem label={l.moonSign} value={dpick(birthPanchang, 'moon_sign')} />
              <InfoItem label={l.sunSign} value={dpick(birthPanchang, 'sun_sign')} />
              <InfoItem label={l.masa} value={dpick(birthPanchang, 'masa')} />
              <InfoItem label={l.ritu} value={dpick(birthPanchang, 'ritu')} />
              <InfoItem label={l.ayanamsa} value={dpick(birthPanchang, 'ayanamsa')} />
              <InfoItem label={l.vikramSamvat} value={dpick(birthPanchang, 'vikram_samvat')} />
            </View>
          </View>
        )}

        {canShow('basic', 'avakhada_details') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.avakhada}</Text>
            <View style={styles.infoGrid}>
              <InfoItem label={l.varna} value={dpick(avakhada, 'varna')} />
              <InfoItem label={l.vashya} value={dpick(avakhada, 'vashya')} />
              <InfoItem label={l.yoni} value={dpick(avakhada, 'yoni')} />
              <InfoItem label={l.gana} value={dpick(avakhada, 'gana')} />
              <InfoItem label={l.nadi} value={dpick(avakhada, 'nadi')} />
              <InfoItem label={l.rasi} value={dpick(avakhada, 'rasi')} />
              <InfoItem label={l.rasiLord} value={dpick(avakhada, 'rasi_lord')} />
              <InfoItem label={l.nakshatra} value={dpick(avakhada, 'nakshatra')} />
              <InfoItem label={l.nakshatraLord} value={dpick(avakhada, 'nakshatra_lord')} />
              <InfoItem label={l.lagna} value={dpick(avakhada, 'ascendant_sign', 'lagna', 'ascendant')} />
              <InfoItem label={l.lagnaNak} value={dpick(avakhada, 'ascendant_nakshatra')} />
              <InfoItem label={l.tatva} value={dpick(avakhada, 'tatva')} />
              <InfoItem label={l.paya} value={dpick(avakhada, 'paya_by_nakshatra')} />
            </View>
          </View>
        )}


        {/* Lucky Factors & Stones */}
        {canShow('basic', 'lucky_factors') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.luckyFactors}</Text>
            <View style={styles.luckyCardGrid}>
              <LuckyCard icon="💎" label={l.lifeStone} value={dpick(avakhada, 'life_stone')} color="#ef4444" />
              <LuckyCard icon="✨" label={l.luckyStone} value={dpick(avakhada, 'lucky_stone')} color="#f59e0b" />
              <LuckyCard icon="💰" label={l.fortuneStone} value={dpick(avakhada, 'fortune_stone')} color="#10b981" />
              <LuckyCard icon="🔢" label={l.luckyNumber} value={dpick(basicReport, 'lucky_num')} color="#3b82f6" />
              <LuckyCard icon="🎨" label={l.luckyColor} value={dpick(basicReport, 'lucky_colors')} color="#8b5cf6" />
              <LuckyCard icon="🔤" label={l.letters} value={dpick(basicReport, 'lucky_letters')} color="#ec4899" />
            </View>
            {basicReport?.lucky_name_start && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: '#fdf2f8', borderRadius: 12, borderWidth: 1, borderColor: '#fbcfe8' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#9d174d', textTransform: 'uppercase', marginBottom: 4 }}>{l.recommendedName}</Text>
                <Text style={{ fontSize: 14, color: '#be185d', fontWeight: '800' }}>{Array.isArray(basicReport.lucky_name_start) ? basicReport.lucky_name_start.join(', ') : basicReport.lucky_name_start}</Text>
              </View>
            )}
          </View>
        )}

        {/* Travel & Directions */}
        {canShow('basic', 'travel_directions') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.travelDirections}</Text>
            <View style={styles.infoGrid}>
              <InfoItem label={l.dishaShool} value={dpick(birthPanchang, 'advanced_details.disha_shool')} color="#ef4444" />
              <InfoItem label={l.auspDirection} value={Array.isArray(birthPanchang?.nakshatra?.auspicious_disha) ? birthPanchang.nakshatra.auspicious_disha.join(', ') : dpick(birthPanchang, 'nakshatra.auspicious_disha')} color="#10b981" />
              <InfoItem label={l.yoginiNivas} value={dpick(birthPanchang, 'advanced_details.moon_yogini_nivas')} color="#3b82f6" />
              <InfoItem label={l.moonPhase} value={dpick(birthPanchang, 'advanced_details.masa.moon_phase')} />
            </View>
          </View>
        )}

        {/* Samvat & Year Details */}
        {canShow('basic', 'vedic_calendar') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.vedicCalendar}</Text>
            <View style={styles.infoGrid}>
              <InfoItem label={l.vikramSamvatSec} value={`${dpick(birthPanchang, 'advanced_details.years.vikram_samvaat')} (${dpick(birthPanchang, 'advanced_details.years.vikram_samvaat_name')})`} />
              <InfoItem label={l.sakaSamvat} value={`${dpick(birthPanchang, 'advanced_details.years.saka')} (${dpick(birthPanchang, 'advanced_details.years.saka_samvaat_name')})`} />
              <InfoItem label={l.kaliSamvat} value={`${dpick(birthPanchang, 'advanced_details.years.kali')} (${dpick(birthPanchang, 'advanced_details.years.kali_samvaat_name')})`} />
              <InfoItem label={l.tamilMonth} value={`${dpick(birthPanchang, 'advanced_details.masa.tamil_month')} (${dpick(birthPanchang, 'advanced_details.masa.tamil_day')})`} />
            </View>
          </View>
        )}

        {/* Astronomical Details */}
        {canShow('basic', 'astronomical_data') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.astronomicalData}</Text>
            <View style={styles.infoGrid}>
              <InfoItem label={l.sunAtRise} value={`${String(dpick(birthPanchang, 'sun_position.sun_degree_at_rise', '0')).slice(0, 5)}°`} />
              <InfoItem label={l.sunNakshatra} value={dpick(birthPanchang, 'sun_position.nakshatra')} />
              <InfoItem label={l.moonDegree} value={`${String(dpick(birthPanchang, 'moon_position.moon_degree', '0')).slice(0, 5)}°`} />
              <InfoItem label={l.ahargana} value={Math.floor(dpick(birthPanchang, 'advanced_details.ahargana', 0))} />
            </View>
          </View>
        )}

        {/* Muhurtas & Kaals */}
        {canShow('basic', 'muhurta_kaals') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.muhurtaKaals}</Text>
            <View style={styles.muhurtaGrid}>
              <View style={[styles.muhurtaItem, styles.muhurtaAuspicious]}>
                <Text style={styles.muhurtaLabel}>{l.abhijitMuhurta}</Text>
                <Text style={styles.muhurtaValue}>{dpick(birthPanchang, 'advanced_details.abhijit_muhurta.start', 'advanced_details.abhijit_muhurta')} - {dpick(birthPanchang, 'advanced_details.abhijit_muhurta.end', '')}</Text>
              </View>
              <View style={[styles.muhurtaItem, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
                <Text style={styles.muhurtaLabel}>{l.moonRiseSet}</Text>
                <Text style={styles.muhurtaValue}>{dpick(birthPanchang, 'advanced_details.moon_rise')} / {dpick(birthPanchang, 'advanced_details.moon_set')}</Text>
              </View>
              <View style={[styles.muhurtaItem, styles.muhurtaInauspicious]}>
                <Text style={styles.muhurtaLabel}>{l.rahukaal}</Text>
                <Text style={styles.muhurtaValue}>{dpick(birthPanchang, 'rahukaal')}</Text>
              </View>
              <View style={[styles.muhurtaItem, styles.muhurtaInauspicious]}>
                <Text style={styles.muhurtaLabel}>{l.gulikaKaal}</Text>
                <Text style={styles.muhurtaValue}>{dpick(birthPanchang, 'gulika')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Ghatka Chakra */}
        {canShow('basic', 'ghatka_chakra') && dpick(basicReport, 'ghatka_chakra') !== '-' && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.ghatkaChakra}</Text>
            <View style={styles.ghatkaGrid}>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>{l.rasi}</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.rasi')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>{l.day}</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.day')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>{l.nakshatra}</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.nakshatra')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>{l.tatva}</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.tatva')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>{l.lord}</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.lord')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>{l.tithi}</Text><Text style={styles.ghatkaValue}>{Array.isArray(basicReport?.ghatka_chakra?.tithi) ? basicReport.ghatka_chakra.tithi.join(', ') : dpick(basicReport, 'ghatka_chakra.tithi')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>{l.lagnaM}</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.same_sex_lagna')}</Text></View>
              <View style={styles.ghatkaItem}><Text style={styles.ghatkaLabel}>{l.lagnaF}</Text><Text style={styles.ghatkaValue}>{dpick(basicReport, 'ghatka_chakra.opposite_sex_lagna')}</Text></View>
            </View>
          </View>
        )}

        {/* Panchang Descriptions */}
        {canShow('basic', 'panchang_insights') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.panchangInsights}</Text>
            <View style={styles.descSection}>
              <View style={styles.descItem}>
                <Text style={styles.descLabel}>{l.tithi}: {dpick(birthPanchang, 'tithi.name', 'tithi')} ({l.diety}: {dpick(birthPanchang, 'tithi.diety')})</Text>
                <Text style={styles.descText}>{dpick(birthPanchang, 'tithi.meaning', 'tithi.special')}</Text>
              </View>
              <View style={styles.descItem}>
                <Text style={styles.descLabel}>{l.nakshatra}: {dpick(birthPanchang, 'nakshatra.name', 'nakshatra')} ({l.diety}: {dpick(birthPanchang, 'nakshatra.diety')})</Text>
                <Text style={styles.descText}>{dpick(birthPanchang, 'nakshatra.summary', 'nakshatra.meaning', 'nakshatra.special')}</Text>
              </View>
              <View style={styles.descItem}>
                <Text style={styles.descLabel}>{l.yoga}: {dpick(birthPanchang, 'yoga.name', 'yoga')}</Text>
                <Text style={styles.descText}>{dpick(birthPanchang, 'yoga.meaning', 'yoga.special')}</Text>
              </View>
              <View style={styles.descItem}>
                <Text style={styles.descLabel}>{l.karana}: {dpick(birthPanchang, 'karana.name', 'karana')} ({l.lord}: {dpick(birthPanchang, 'karana.lord')})</Text>
                <Text style={styles.descText}>{dpick(birthPanchang, 'karana.special')}</Text>
              </View>
            </View>
          </View>
        )}

      </View>
    );
  };

  const renderChart = (svgOrUrl, degreeMap = null) => {
    if (!svgOrUrl || typeof svgOrUrl !== 'string') {
      return <Text style={{ textAlign: 'center', color: '#9ca3af', padding: 20 }}>{l.chartNotAvailable}</Text>;
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
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingLagna}</Text>
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

        {canShow('lagna', 'd1_chart') && (
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>{l.lagnaChart}</Text>
            </View>
            <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
              {renderChart(lagnaD1Svg, showDegrees ? buildDegreeMap(basicReport) : null)}
            </View>
          </View>
        )}

        {canShow('lagna', 'd9_chart') && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>{l.navamsa}</Text>
            <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
              {renderChart(lagnaD9Svg, showDegrees ? buildDegreeMap(basicReport) : null)}
            </View>
          </View>
        )}
      </View>

    );
  };

  const renderPlanetsTab = () => {
    if (basicLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingPlanets}</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabScrollContent}>
        {/* Planet Sub-Tabs Toggle */}
        <View style={styles.planetSubTabWrapper}>
          {canShow('planets', 'sign_view') && (
            <TouchableOpacity
              style={[styles.planetSubTab, planetsSubView === 'sign' && styles.planetSubTabActive]}
              onPress={() => setPlanetsSubView('sign')}
            >
              <Text style={[styles.planetSubTabText, planetsSubView === 'sign' && styles.planetSubTabTextActive]}>{l.signView}</Text>
              <Text style={[styles.planetSubTabSubText, planetsSubView === 'sign' && styles.planetSubTabTextActive]}>{l.zodiacSignLord}</Text>
            </TouchableOpacity>
          )}
          {canShow('planets', 'nakshatra_view') && (
            <TouchableOpacity
              style={[styles.planetSubTab, planetsSubView === 'nakshatra' && styles.planetSubTabActive]}
              onPress={() => setPlanetsSubView('nakshatra')}
            >
              <Text style={[styles.planetSubTabText, planetsSubView === 'nakshatra' && styles.planetSubTabTextActive]}>{l.nakshatraView}</Text>
              <Text style={[styles.planetSubTabSubText, planetsSubView === 'nakshatra' && styles.planetSubTabTextActive]}>{l.lunarMansion}</Text>
            </TouchableOpacity>
          )}
        </View>


        {canShow('planets', 'planetary_list') && (
          <View style={[styles.sectionCard, { padding: 0, overflow: 'hidden' }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* Table Header */}
                <View style={styles.planetTableHeader}>
                  <Text style={[styles.planetTableCol, { width: 110 }]}>{l.planet}</Text>
                  {planetsSubView === 'sign' ? (
                    <>
                      <Text style={[styles.planetTableCol, { width: 60 }]}>{l.house}</Text>
                      <Text style={[styles.planetTableCol, { width: 90 }]}>{l.zodiac}</Text>
                      <Text style={[styles.planetTableCol, { width: 90 }]}>{l.signLord}</Text>
                      <Text style={[styles.planetTableCol, { width: 100 }]}>{l.degreeInSign}</Text>
                      <Text style={[styles.planetTableCol, { width: 100 }]}>{l.totalDegree}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.planetTableCol, { width: 110 }]}>{l.nakshatra}</Text>
                      <Text style={[styles.planetTableCol, { width: 60 }]}>{l.pada}</Text>
                      <Text style={[styles.planetTableCol, { width: 110 }]}>{l.nakshatraLord}</Text>
                      <Text style={[styles.planetTableCol, { width: 100 }]}>{l.degree}</Text>
                      <Text style={[styles.planetTableCol, { width: 100 }]}>{l.totalDegree}</Text>
                    </>
                  )}
                </View>

                {/* Table Rows */}
                {planets.map((p, i) => {
                  const planetName = p.name || p.short_name || '-';
                  const isRetro = p.retro === 'R' || p.retro === true || p.isRetro;

                  // Use local_degree and global_degree from the API response
                  const degInSign = formatDegree(p.local_degree || p.normDegree || (parseFloat(p.degree || 0) % 30));
                  const totalDeg = formatDegree(p.global_degree || p.fullDegree || p.degree);

                  return (
                    <View key={i} style={[styles.planetTableRow, i % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#faf5ff' }]}>
                      <View style={[styles.planetTableCol, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontSize: 16, color: '#7c3aed' }}>{PLANET_GLYPHS[planetName] || '•'}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a0533' }}>{p.full_name || planetName}</Text>
                        {isRetro && <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: 'bold' }}>R</Text>}
                      </View>

                      {planetsSubView === 'sign' ? (
                        <>
                          <Text style={[styles.planetTableCell, { width: 60, fontWeight: '700', color: '#7c3aed' }]}>{p.house || '-'}</Text>
                          <Text style={[styles.planetTableCell, { width: 90 }]}>{p.zodiac || p.sign || '-'}</Text>
                          <View style={[styles.planetTableCell, { width: 90, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                            <Text style={{ fontSize: 12, color: '#7c3aed' }}>{PLANET_GLYPHS[p.zodiac_lord || p.sign_lord || p.rasi_lord] || ''}</Text>
                            <Text style={{ fontSize: 12, color: '#4b5563' }}>{p.zodiac_lord || p.sign_lord || p.rasi_lord || '-'}</Text>
                          </View>
                          <Text style={[styles.planetTableCell, { width: 100 }]}>{degInSign}</Text>
                          <Text style={[styles.planetTableCell, { width: 100 }]}>{totalDeg}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={[styles.planetTableCell, { width: 110 }]}>{p.nakshatra || '-'}</Text>
                          <Text style={[styles.planetTableCell, { width: 60, color: '#7c3aed', fontWeight: 'bold' }]}>{p.nakshatra_pada || p.pada || '-'}</Text>
                          <View style={[styles.planetTableCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                            <Text style={{ fontSize: 12, color: '#7c3aed' }}>{PLANET_GLYPHS[p.nakshatra_lord || p.star_lord] || ''}</Text>
                            <Text style={{ fontSize: 12, color: '#4b5563' }}>{p.nakshatra_lord || p.star_lord || '-'}</Text>
                          </View>
                          <Text style={[styles.planetTableCell, { width: 100 }]}>{degInSign}</Text>
                          <Text style={[styles.planetTableCell, { width: 100 }]}>{totalDeg}</Text>
                        </>
                      )}
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
                <Text style={styles.breadcrumbText}>{l.root}</Text>
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

        <Text style={styles.sectionDesc}>{l.vimshottariDasha} ({dashaLevelNames[currentLevel] || 'Sub-dasha'})</Text>

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
                      <Text style={{ fontSize: 8, color: '#fff', fontWeight: 'bold' }}>{l.active}</Text>
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
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingYogini}</Text>
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
                <Text style={styles.breadcrumbText}>{l.root}</Text>
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
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingTransit}</Text>
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

        {canShow('transit', 'chart') && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>{l.transitChart}</Text>
            <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
              {renderChart(transitSvg)}
            </View>
          </View>
        )}

        {canShow('transit', 'planets') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.transitPlanets}</Text>
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
        )}
      </View>

    );
  };


  const renderKpTab = () => {
    if (kpLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingKP}</Text>
        </View>
      );
    }
    if (!kpData) return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>{l.noData}</Text>;

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

        {canShow('kp', 'chalit_chart') && (
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { textAlign: 'center' }]}>{l.bhavChalit}</Text>
            <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
              {renderChart(chalitChartSvg)}
            </View>
          </View>
        )}

        {canShow('kp', 'ruling_planets') && rpList.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.rulingPlanets}</Text>
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

        {canShow('kp', 'planets') && kpPlanets.length > 0 && (
          <View style={[styles.sectionCard, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{l.kpPlanets}</Text>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{l.planetSignLordDesc}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.planetTableHeader}>
                  <Text style={[styles.planetTableCol, { width: 100 }]}>{l.planet}</Text>
                  <Text style={[styles.planetTableCol, { width: 90 }]}>{l.sign}</Text>
                  <Text style={[styles.planetTableCol, { width: 110 }]}>{l.signLord}</Text>
                  <Text style={[styles.planetTableCol, { width: 110 }]}>{l.starLord}</Text>
                  <Text style={[styles.planetTableCol, { width: 110 }]}>{l.subLord}</Text>
                </View>
                {kpPlanets.map((p, i) => {
                  const pName = p.full_name || p.planet || p.name || '-';
                  const pSign = p.zodiac || p.pseudo_rasi || p.sign || p.rashi || '-';
                  // Fallback to SIGN_LORDS mapping if API returns null/empty
                  const sLord = p.pseudo_rasi_lord || p.sign_lord || p.rashi_lord || SIGN_LORDS[pSign] || '-';
                  const stLord = p.pseudo_nakshatra_lord || p.star_lord || p.nakshatra_lord || '-';
                  const subLord = p.sub_lord || p.subLord || p.sub || '-';

                  return (
                    <View key={i} style={[styles.planetTableRow, i % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#faf5ff' }]}>
                      <View style={[styles.planetTableCol, { width: 100, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontSize: 16, color: '#7c3aed' }}>{PLANET_GLYPHS[pName] || '•'}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a0533' }}>{pName}</Text>
                      </View>
                      <Text style={[styles.planetTableCell, { width: 90 }]}>{pSign}</Text>
                      <View style={[styles.planetTableCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontSize: 12, color: '#7c3aed' }}>{PLANET_GLYPHS[sLord] || ''}</Text>
                        <Text style={{ fontSize: 12, color: '#4b5563' }}>{sLord}</Text>
                      </View>
                      <View style={[styles.planetTableCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontSize: 12, color: '#7c3aed' }}>{PLANET_GLYPHS[stLord] || ''}</Text>
                        <Text style={{ fontSize: 12, color: '#4b5563' }}>{stLord}</Text>
                      </View>
                      <View style={[styles.planetTableCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontSize: 12, color: '#7c3aed' }}>{PLANET_GLYPHS[subLord] || ''}</Text>
                        <Text style={{ fontSize: 12, color: '#4b5563' }}>{subLord}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {canShow('kp', 'cusps') && kpCusps.length > 0 && (
          <View style={[styles.sectionCard, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{l.kpCusps}</Text>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{l.twelveCuspsDesc}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={[styles.planetTableHeader, { backgroundColor: '#10b981' }]}>
                  <Text style={[styles.planetTableCol, { width: 60 }]}>{l.cusp}</Text>
                  <Text style={[styles.planetTableCol, { width: 100 }]}>{l.degree}</Text>
                  <Text style={[styles.planetTableCol, { width: 90 }]}>{l.sign}</Text>
                  <Text style={[styles.planetTableCol, { width: 110 }]}>{l.signLord}</Text>
                  <Text style={[styles.planetTableCol, { width: 110 }]}>{l.starLord}</Text>
                  <Text style={[styles.planetTableCol, { width: 110 }]}>{l.subLord}</Text>
                </View>
                {kpCusps.map((c, i) => {
                  const cuspNum = c.house || c.cusp || c.house_no || c.house_number || (i + 1);
                  const cuspLabel = `H${cuspNum}`;
                  const cuspDeg = c.bhavmadhya || c.local_start_degree || c.degree || c.local_degree || c.cusp_degree || 0;
                  const cSign = c.start_rasi || c.zodiac || c.sign || c.rashi || '-';
                  // Fallback to SIGN_LORDS mapping if API returns null/empty
                  const cSLord = c.start_rasi_lord || c.sign_lord || c.rashi_lord || SIGN_LORDS[cSign] || '-';
                  const cStLord = c.start_nakshatra_lord || c.star_lord || c.nakshatra_lord || '-';
                  const cSubLord = c.cusp_sub_lord || c.sub_lord || c.sub || '-';
                  const degStr = formatDegree(cuspDeg);

                  return (
                    <View key={i} style={[styles.planetTableRow, i % 2 === 0 ? { backgroundColor: '#fff' } : { backgroundColor: '#f0fdf4' }]}>
                      <Text style={[styles.planetTableCol, { width: 60, color: '#10b981', fontWeight: '800' }]}>{cuspLabel}</Text>
                      <Text style={[styles.planetTableCell, { width: 100 }]}>{degStr}</Text>
                      <Text style={[styles.planetTableCell, { width: 90 }]}>{cSign}</Text>
                      <View style={[styles.planetTableCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontSize: 12, color: '#10b981' }}>{PLANET_GLYPHS[cSLord] || ''}</Text>
                        <Text style={{ fontSize: 12, color: '#4b5563' }}>{cSLord}</Text>
                      </View>
                      <View style={[styles.planetTableCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontSize: 12, color: '#10b981' }}>{PLANET_GLYPHS[cStLord] || ''}</Text>
                        <Text style={{ fontSize: 12, color: '#4b5563' }}>{cStLord}</Text>
                      </View>
                      <View style={[styles.planetTableCell, { width: 110, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                        <Text style={{ fontSize: 12, color: '#10b981' }}>{PLANET_GLYPHS[cSubLord] || ''}</Text>
                        <Text style={{ fontSize: 12, color: '#4b5563' }}>{cSubLord}</Text>
                      </View>
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

  const renderSadeSatiTab = () => {
    if (sadeSatiLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingSadeSati}</Text>
        </View>
      );
    }
    if (!sadeSati) return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>{l.noData}</Text>;

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
        {canShow('sadesati', 'status') && (
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
        )}

        {canShow('sadesati', 'analysis') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.sadeSatiAnalysis}</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 22 }}>
              {getField('summary', 'description', 'report', 'observation') ||
                "Sade Sati is the 7½ years long period of Saturn (Shani). This astrological phase is much feared by those in India who give credence to Indian Astrology. It represents the transit of Saturn over the natal moon."}
            </Text>
          </View>
        )}

        {canShow('sadesati', 'phases') && tableData.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.sadeSatiPhases}</Text>
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
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingShadbala}</Text>
        </View>
      );
    }
    if (!shadbala) return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>{l.shadbalaUnavailable}</Text>;

    const SHADBALA_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
    const SHADBALA_COMPONENTS = [
      { key: 'uccha_bala', label: l.uccha },
      { key: 'saptavargaja_bala', label: l.saptavarga },
      { key: 'dig_bala', label: l.dig },
      { key: 'ayana_bala', label: l.ayana },
      { key: 'chesta_Bala', label: l.chesta },
      { key: 'naisargeka_balas', label: l.naisargika },
      { key: 'drik_bala', label: l.drik }
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

    const getVirupaTotal = (planet) => {
      for (const k of ['total_balas', 'total_shadbala', 'total_shadbala_in_virupas', 'shadbala_in_virupas']) {
        if (shadbala[k]?.[planet] !== undefined && shadbala[k]?.[planet] !== null) {
          return parseFloat(shadbala[k][planet]);
        }
      }
      return 0;
    };

    const maxVal = 600; 

    return (
      <View style={styles.tabScrollContent}>
        {canShow('shadbala', 'planetary_strength') && (
          <View style={[styles.sectionCard, { padding: 0, overflow: 'hidden' }]}>
            <View style={{ backgroundColor: '#ff9999', padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{l.shadBala}</Text>
            </View>
            <View style={{ padding: 20 }}>
              {SHADBALA_PLANETS.filter(p => !['Rahu', 'Ketu'].includes(p)).map((p, i) => {
                const val = getVirupaTotal(p);
                const widthPercent = Math.min(100, (val / maxVal) * 100);

                return (
                  <View key={p} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <Text style={{ width: 65, fontSize: 13, color: '#374151', fontWeight: '600' }}>{p}</Text>
                    <View style={{ flex: 1, height: 32, backgroundColor: '#fff' }}>
                      <View style={{
                        width: `${widthPercent}%`,
                        height: '100%',
                        backgroundColor: i % 2 === 0 ? '#ffcccc' : '#fff0f0',
                        justifyContent: 'center',
                        alignItems: 'flex-end',
                        paddingRight: 8,
                        borderRadius: 2
                      }}>
                        <Text style={{ fontSize: 12, color: '#000', fontWeight: '600' }}>{val.toFixed(0)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {canShow('shadbala', 'component_breakdown') && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.componentBreakdownVirupas}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8, marginBottom: 8 }}>
                  <Text style={{ width: 80, fontWeight: 'bold', color: '#374151', fontSize: 12 }}>{l.planet}</Text>
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
        )}
      </View>
    );
  };

  const renderBhavBalaTab = () => {
    const bhavData = Array.from({ length: 12 }, (_, i) => ({
      house: i + 1,
      value: Math.floor(Math.random() * (550 - 300 + 1) + 300)
    }));

    const maxVal = 600;

    return (
      <View style={styles.tabScrollContent}>
        <View style={[styles.sectionCard, { padding: 0, overflow: 'hidden' }]}>
          <View style={{ backgroundColor: '#ff9999', padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>{l.bhavBala}</Text>
          </View>
          <View style={{ padding: 20 }}>
            {bhavData.map((item, idx) => {
              const widthPercent = (item.value / maxVal) * 100;
              return (
                <View key={item.house} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ width: 30, fontSize: 13, color: '#374151', fontWeight: '600' }}>{item.house}</Text>
                  <View style={{ flex: 1, height: 28, backgroundColor: '#fff' }}>
                    <View style={{
                      width: `${widthPercent}%`,
                      height: '100%',
                      backgroundColor: idx % 2 === 0 ? '#fff0f0' : '#ffcccc',
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      paddingRight: 8,
                      borderRadius: 2
                    }}>
                      <Text style={{ fontSize: 12, color: '#000', fontWeight: '600' }}>{item.value}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>


      </View>
    );
  };


  const renderDivisionalTab = () => {
    const DIVISIONAL_OPTIONS = [
      { div: 'D1', name: l.d1, desc: l.d1Desc },
      { div: 'D9', name: l.d9, desc: l.d9Desc },
      { div: 'chalit', name: l.chalit, desc: l.chalitDesc },
      { div: 'sun', name: l.sun, desc: l.sunDesc },
      { div: 'moon', name: l.moon, desc: l.moonDesc },
      { div: 'D2', name: l.d2, desc: l.d2Desc },
      { div: 'D3', name: l.d3, desc: l.d3Desc },
      { div: 'D4', name: l.d4, desc: l.d4Desc },
      { div: 'D7', name: l.d7, desc: l.d7Desc },
      { div: 'D10', name: l.d10, desc: l.d10Desc },
      { div: 'D12', name: l.d12, desc: l.d12Desc },
      { div: 'D16', name: l.d16, desc: l.d16Desc },
      { div: 'D20', name: l.d20, desc: l.d20Desc },
      { div: 'D24', name: l.d24, desc: l.d24Desc },
      { div: 'D27', name: l.d27, desc: l.d27Desc },
      { div: 'D30', name: l.d30, desc: l.d30Desc },
      { div: 'D40', name: l.d40, desc: l.d40Desc },
      { div: 'D45', name: l.d45, desc: l.d45Desc },
      { div: 'D60', name: l.d60, desc: l.d60Desc },
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {DIVISIONAL_OPTIONS.map(opt => {
              const label = opt.name.split(' (')[0].split(' / ')[0];
              return (
                <TouchableOpacity
                  key={opt.div}
                  style={[
                    { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 50, borderWidth: 1.5 },
                    divisionalDiv === opt.div
                      ? { borderColor: '#7c3aed', backgroundColor: '#f3e8ff' }
                      : { borderColor: '#e5e7eb', backgroundColor: '#fff' }
                  ]}
                  onPress={() => {
                    setDivisionalDiv(opt.div);
                    fetchDivisionalChart(opt.div, divisionalStyle);
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '800', color: divisionalDiv === opt.div ? '#7c3aed' : '#6b7280' }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}

          </View>
        </ScrollView>

        {canShow('divisional', 'charts') && (
          <View style={styles.sectionCard}>
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 4 }]}>{currentOpt.name}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>{currentOpt.desc}</Text>
            </View>
            {divisionalLoading && !divisionalChart ? (
              <ActivityIndicator size="large" color="#7c3aed" style={{ marginVertical: 40 }} />
            ) : (
              <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
                {renderChart(divisionalChart)}
              </View>
            )}
          </View>
        )}

      </View>
    );
  };

  const renderAshtakvargaTab = () => {
    if (ashtakvargaLoading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingAshtakvarga}</Text>
        </View>
      );
    }
    if (!ashtakvarga) {
      return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>{l.ashtakvargaUnavailable}</Text>;
    }

    const { sav, binnas } = ashtakvarga;
    const binnaKeys = binnas ? Object.keys(binnas) : [];
    const selectedBinna = binnaKeys.includes(ashtakvargaView) ? ashtakvargaView : (binnaKeys[0] || null);
    const binnaSvg = selectedBinna ? binnas[selectedBinna]?.chart : null;

    const savData = sav?.data || sav;
    const savOrder = savData?.ashtakvarga_order || [];
    const savPoints = savData?.ashtakvarga_points || [];
    const savTotal = savData?.ashtakvarga_total || [];

    return (
      <View style={styles.tabScrollContent}>
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

        {(canShow('ashtakvarga', 'bhinnashtakvarga') || canShow('ashtakvarga', 'contributions')) && binnaKeys.length > 0 && (

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

        {selectedBinna && (
          <>
            {canShow('ashtakvarga', 'bhinnashtakvarga') && (

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{selectedBinna} {l.bhinnashtakvarga}</Text>
                <View style={{ alignItems: 'center', height: width - 80, width: width - 80, alignSelf: 'center', overflow: 'hidden' }}>
                  {renderChart(binnaSvg)}
                </View>
              </View>
            )}

            {canShow('ashtakvarga', 'contributions') && binnas[selectedBinna]?.data && (

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{selectedBinna} {l.contributions}</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{l.planetWisePointsDesc} {selectedBinna}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 8, marginBottom: 4 }}>
                      <Text style={{ width: 90, fontWeight: 'bold', color: '#374151', fontSize: 12 }}>{l.source}</Text>
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
        {canShow('ashtakvarga', 'sav') && savOrder.length > 0 && (
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
          <Text style={{ color: '#7c3aed', marginTop: 10, fontWeight: '600' }}>{l.loadingManglik}</Text>
        </View>
      );
    }
    if (!manglik) return <Text style={{ textAlign: 'center', marginTop: 40, color: '#9ca3af' }}>{l.noData}</Text>;

    const get = (...fields) => {
      for (const f of fields) {
        const v = manglik[f];
        if (v !== undefined && v !== null && v !== '') return v;
      }
      return null;
    };

    const isManglik =
      manglik.is_present === true || manglik.is_present === 'true' ||
      manglik.manglik_present_rule?.is_present === true ||
      manglik.is_manglik === true || manglik.manglik === true;

    const percentage = get('percentage_manglik_present', 'manglik_percent', 'manglik_percentage');
    const presentRules = manglik.manglik_present_rule?.based_on_rules || manglik.manglik_present_rule?.rules || manglik.present_rules || [];
    const cancelRules = manglik.manglik_cancel_rule?.based_on_rules || manglik.manglik_cancel_rule?.rules || manglik.cancel_rules || [];
    const description = get('description', 'desc', 'manglik_status', 'bot_response');
    const remedies = get('remedies', 'remedy_list');
    const remediesArr = Array.isArray(remedies) ? remedies : (typeof remedies === 'object' && remedies ? Object.values(remedies) : []);
    const conclusion = get('conclusion', 'final_verdict');

    const statusColor = isManglik ? '#dc2626' : '#10b981';
    const statusBg = isManglik ? '#fee2e2' : '#dcfce7';

    return (
      <View style={styles.tabScrollContent}>
        {canShow('manglik', 'analysis') && (
          <View style={[styles.sectionCard, { backgroundColor: statusBg, borderColor: statusColor }]}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 10 }}>{isManglik ? '🔥' : '✅'}</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: statusColor, marginBottom: 6 }}>
                {isManglik ? l.youAreManglik : l.youAreNotManglik}
              </Text>
              {percentage !== null && (
                <Text style={{ fontSize: 14, color: statusColor, fontWeight: '600', marginTop: 4 }}>
                  {l.intensity}: {percentage}{typeof percentage === 'number' ? '%' : ''}
                </Text>
              )}
            </View>
          </View>
        )}


        {description && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.analysis}</Text>
            <Text style={{ fontSize: 14, color: '#4b5563', lineHeight: 22 }}>{description}</Text>
          </View>
        )}

        {presentRules.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.factorsCausing}</Text>
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
            <Text style={styles.sectionTitle}>{l.cancellationRules}</Text>
            {cancelRules.map((rule, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ color: '#10b981', marginRight: 8 }}>•</Text>
                <Text style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 }}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {remediesArr.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{l.suggestedRemedies}</Text>
            {remediesArr.map((rule, idx) => (
              <View key={idx} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ color: '#f59e0b', marginRight: 8 }}>★</Text>
                <Text style={{ flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 }}>{rule}</Text>
              </View>
            ))}
          </View>
        )}

        {conclusion && (
          <View style={[styles.sectionCard, { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }]}>
            <Text style={[styles.sectionTitle, { color: '#9d174d' }]}>{l.finalVerdict}</Text>
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
        <Text style={styles.headerTitle}>{l.title}</Text>
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
              </View>
              <Text style={styles.heroTitle}>{l.heroTitle}</Text>
              <Text style={styles.heroSubtitle}>{l.heroSubtitle}</Text>
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{l.hundredPercentFree}</Text></View>
                <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{l.instantResults}</Text></View>
                <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{l.vedicSystem}</Text></View>
              </View>
            </LinearGradient>

            {/* Form Card */}
            <View style={styles.formWrapper}>
              <View style={styles.formCard}>

                <View style={styles.formTitleRow}>
                  <View style={styles.formTitleAccent} />
                  <Text style={styles.formHeading}>{l.birthDetails}</Text>
                </View>

                {/* Name */}
                <Text style={styles.inputLabel}>{l.fullName}</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={l.enterName}
                    placeholderTextColor="#BBBBBB"
                    value={form.name}
                    onChangeText={t => handleChange('name', t)}
                    returnKeyType="next"
                  />
                </View>

                {/* Gender */}
                <Text style={styles.inputLabel}>{l.gender}</Text>
                <View style={styles.genderRow}>
                  {[
                    { label: l.male, val: 'Male' },
                    { label: l.female, val: 'Female' },
                    { label: l.other, val: 'Other' },
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
                    <Text style={styles.inputLabel}>{l.dateOfBirth}</Text>
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
                    <Text style={styles.inputLabel}>{l.timeOfBirth}</Text>
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
                <Text style={styles.inputLabel}>{l.placeOfBirth}</Text>
                <View style={styles.placeWrapper}>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.textInput}
                      placeholder={l.searchCity}
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
                        <Text style={styles.submitText}>{l.generate}</Text>
                        <Text style={styles.submitArrow}>→</Text>
                      </>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.formDisclaimer}>{l.private}</Text>
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
              <Text style={styles.langBtnText}>{LANGUAGES.find(l => l.code === lang)?.label || 'En'}</Text>
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
                    {l[tab.labelKey]}
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

            {['polish'].includes(activeTab) && (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#9ca3af' }}>{activeTab} content coming soon...</Text>
              </View>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={() => setKundaliRecord(null)}>
              <Text style={styles.resetText}>{l.generateNew}</Text>
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
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1a0533' }}>{l.selectLang}</Text>
              <TouchableOpacity onPress={() => setShowLangModal(false)}>
                <Text style={{ fontSize: 16, color: '#7c3aed', fontWeight: 'bold' }}>{l.close}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {LANGUAGES.map(langOpt => (
                <TouchableOpacity
                  key={langOpt.code}
                  style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: lang === langOpt.code ? '#faf5ff' : '#fff' }}
                  onPress={() => onChangeLang(langOpt.code)}
                >
                  <Text style={{ fontSize: 15, fontWeight: lang === langOpt.code ? '700' : '500', color: lang === langOpt.code ? '#7c3aed' : '#1a0533' }}>
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
    marginBottom: 16, borderWidth: 1, borderColor: '#f3e8ff',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a0533', marginBottom: 16 },
  sectionDesc: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 12 },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoItem: { width: '48%', backgroundColor: '#faf5ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f3e8ff' },
  infoLabel: { fontSize: 10, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 4, fontWeight: '700', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#1a0533' },

  planetCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#f3e8ff',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2
  },
  planetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f3e8ff', paddingBottom: 12 },
  planetIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center' },
  planetIconText: { fontSize: 16, color: '#7c3aed' },
  planetNameText: { fontSize: 16, fontWeight: '800', color: '#1a0533' },
  retroBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  retroBadgeText: { fontSize: 10, fontWeight: '800', color: '#ef4444' },
  planetHouseBadge: { backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  planetHouseText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  planetDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  planetGridItem: { width: '48%', backgroundColor: '#faf5ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f3e8ff' },
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
  dashaIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#faf5ff', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dashaIconText: { fontSize: 20, color: '#7c3aed' },
  dashaPlanet: { fontSize: 15, fontWeight: '800', color: '#1a0533' },
  dashaRange: { fontSize: 12, color: '#6b7280', marginTop: 2, fontWeight: '500' },
  dashaBadge: { backgroundColor: '#f3e8ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dashaBadgeText: { fontSize: 10, color: '#7c3aed', fontWeight: '800' },

  breadcrumbPill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 50, backgroundColor: '#f3f4f6' },
  breadcrumbPillActive: { backgroundColor: '#f3e8ff', borderWidth: 1, borderColor: '#7c3aed' },
  breadcrumbText: { fontSize: 13, color: '#4b5563', fontWeight: '600' },
  breadcrumbTextActive: { color: '#7c3aed', fontWeight: '800' },
  breadcrumbArrow: { marginHorizontal: 6, color: '#9ca3af', fontSize: 16 },

  chartStyleBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 50, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  chartStyleBtnActive: { borderColor: '#7c3aed', backgroundColor: '#7c3aed' },
  chartStyleText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chartStyleTextActive: { color: '#fff' },

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
  ghatkaItem: { width: '31%', padding: 10, borderRadius: 10, backgroundColor: '#faf5ff', borderWidth: 1, borderColor: '#f3e8ff' },
  ghatkaLabel: { fontSize: 9, color: '#7c3aed', textTransform: 'uppercase', fontWeight: '700', marginBottom: 2 },
  ghatkaValue: { fontSize: 12, fontWeight: '700', color: '#1a0533' },

  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 10, fontWeight: '800' },
  pillRetro: { backgroundColor: '#fee2e2', color: '#ef4444' },
  pillCombust: { backgroundColor: '#fff7ed', color: '#f97316' },
  pillBenefic: { backgroundColor: '#dcfce7', color: '#10b981' },
  pillMalefic: { backgroundColor: '#f3f4f6', color: '#6b7280' },

  /* Planet Sub-Tabs */
  planetSubTabWrapper: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  planetSubTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planetSubTabActive: {
    backgroundColor: '#7c3aed',
  },
  planetSubTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  planetSubTabTextActive: {
    color: '#fff',
  },
  planetSubTabSubText: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 1,
    fontWeight: '500',
  },

  /* Planet Table */
  planetTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#7c3aed',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  planetTableCol: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'left',
  },
  planetTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'center',
  },
  planetTableCell: {
    fontSize: 12,
    color: '#4b5563',
    textAlign: 'left',
  },
});

