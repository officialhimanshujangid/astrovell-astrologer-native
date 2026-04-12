import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, ActivityIndicator, Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import apiClient from '../api/apiClient';
import { colors } from '../theme/colors';

const KundaliMatchingScreen = ({ onBack }) => {
  const { token, globalLang = 'en' } = useSelector(s => s.auth);
  const lang = globalLang;
  
  const boyDebounce = useRef(null);
  const girlDebounce = useRef(null);
  const [boyLoading, setBoyLoading] = useState(false);
  const [girlLoading, setGirlLoading] = useState(false);
  
  const [showPicker, setShowPicker] = useState({ visible: false, mode: 'date', targetObj: null, targetKey: '' });

  const onChangePicker = (event, selectedDate) => {
    const { mode, targetObj, targetKey } = showPicker;
    setShowPicker({ ...showPicker, visible: false });
    
    if (event.type === 'set' && selectedDate) {
      let val = '';
      if (mode === 'date') {
         val = selectedDate.toISOString().split('T')[0];
      } else {
         const hs = selectedDate.getHours().toString().padStart(2, '0');
         const ms = selectedDate.getMinutes().toString().padStart(2, '0');
         val = `${hs}:${ms}`;
      }
      
      if (targetObj === 'boy') setBoy(prev => ({ ...prev, [targetKey]: val }));
      else if (targetObj === 'girl') setGirl(prev => ({ ...prev, [targetKey]: val }));
    }
  };

  const geocodePlace = (place, setter, data, debounceRef, loadSetter) => {
    setter({ ...data, placeOfBirth: place, latitude: '', longitude: '' });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (place.length < 3) return;
    
    debounceRef.current = setTimeout(async () => {
      loadSetter(true);
      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
          { headers: { 'User-Agent': 'AstroJagatApp/1.0' } }
        );
        if (res.data && res.data.length > 0) {
          setter(prev => ({ ...prev, latitude: res.data[0].lat, longitude: res.data[0].lon }));
        }
      } catch (err) {}
      loadSetter(false);
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!boy.name || !boy.dateOfBirth || !boy.timeOfBirth || !boy.placeOfBirth ||
        !girl.name || !girl.dateOfBirth || !girl.timeOfBirth || !girl.placeOfBirth) {
      Alert.alert('Incomplete', 'Please fill all fields for both Boy and Girl');
      return;
    }
    if (!boy.latitude || !girl.latitude) {
      Alert.alert('Location Error', 'Location not found for one or both. Please try more specific place names.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // 1. Create Kundali records for both simultaneously
      const [boyRes, girlRes] = await Promise.all([
        apiClient.post('/customer/kundali/add', {
          kundali: [{ name: boy.name, gender: 'Male', birthDate: boy.dateOfBirth, birthTime: boy.timeOfBirth, birthPlace: boy.placeOfBirth, latitude: boy.latitude, longitude: boy.longitude, maritalStatus: 'Single', pdf_type: 'basic' }]
        }, { headers }),
        apiClient.post('/customer/kundali/add', {
          kundali: [{ name: girl.name, gender: 'Female', birthDate: girl.dateOfBirth, birthTime: girl.timeOfBirth, birthPlace: girl.placeOfBirth, latitude: girl.latitude, longitude: girl.longitude, maritalStatus: 'Single', pdf_type: 'basic' }]
        }, { headers })
      ]);

      const bData = boyRes.data?.data || boyRes.data;
      const gData = girlRes.data?.data || girlRes.data;
      const boyId = bData?.recordList?.[0]?.id || bData?.recordList?.id;
      const girlId = gData?.recordList?.[0]?.id || gData?.recordList?.id;

      if (!boyId || !girlId) {
        throw new Error('Failed to create kundali profiles.');
      }

      // 2. Get the compatibility match report
      const matchRes = await apiClient.post('/customer/KundaliMatching/report', {
        maleKundaliId: boyId, 
        femaleKundaliId: girlId, 
        match_type: 'North',
        lang: lang
      }, { headers });
      const d = matchRes.data?.data || matchRes.data;
      setResult(d);

    } catch (err) {
      console.log('--- Kundali Match Error ---', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to generate matching report');
    }
    setLoading(false);
  };

  const renderPersonForm = (label, data, setter, debounceRef, loadSetter) => (
    <View style={styles.personCard}>
      <Text style={styles.personHeader}>{label}'s Details</Text>
      
      <Text style={styles.label}>Full Name</Text>
      <TextInput 
        style={styles.input} placeholder={`Enter ${label}'s name`} placeholderTextColor={colors.textMuted}
        value={data.name} onChangeText={(v) => setter({...data, name: v})} 
      />

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Date of Birth</Text>
          <TouchableOpacity 
             style={styles.pickerBtn} 
             onPress={() => setShowPicker({ visible: true, mode: 'date', targetObj: label.toLowerCase(), targetKey: 'dateOfBirth' })}
          >
            <Text style={[styles.pickerText, !data.dateOfBirth && { color: colors.textMuted }]}>
              {data.dateOfBirth || 'YYYY-MM-DD'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Time of Birth</Text>
          <TouchableOpacity 
             style={styles.pickerBtn} 
             onPress={() => setShowPicker({ visible: true, mode: 'time', targetObj: label.toLowerCase(), targetKey: 'timeOfBirth' })}
          >
            <Text style={[styles.pickerText, !data.timeOfBirth && { color: colors.textMuted }]}>
              {data.timeOfBirth || 'HH:MM'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.label}>Place of Birth</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput 
          style={styles.input} placeholder="e.g. Mumbai, Maharashtra" placeholderTextColor={colors.textMuted}
          value={data.placeOfBirth} onChangeText={(v) => geocodePlace(v, setter, data, debounceRef, loadSetter)} 
        />
        {loadSetter === setBoyLoading ? boyLoading && <ActivityIndicator size="small" color={colors.gold} style={styles.placeStatus} /> : girlLoading && <ActivityIndicator size="small" color={colors.gold} style={styles.placeStatus} />}
        {!boyLoading && data.latitude && data.longitude && <Text style={styles.placeStatusCheck}>✓</Text>}
      </View>
      {data.latitude ? <Text style={styles.coordsText}>Lat: {data.latitude.slice(0,6)}, Lon: {data.longitude.slice(0,6)}</Text> : null}
    </View>
  );

  const matchData = result?.recordList;
  const boyManglik = result?.boyManaglikRpt;
  const girlManglik = result?.girlMangalikRpt;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerOrb} />
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kundali Matching</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.pageHero}>
          <Text style={styles.heroSub}>Check compatibility between two horoscopes based on Vedic astrology</Text>
        </View>

        <View style={{ flexDirection: 'column', gap: 16 }}>
          {renderPersonForm("Boy", boy, setBoy, boyDebounce, setBoyLoading)}
          {renderPersonForm("Girl", girl, setGirl, girlDebounce, setGirlLoading)}
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.submitBtnText}>Match Kundali</Text>}
        </TouchableOpacity>

        {/* ── Match Results ── */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Matching Report 💖</Text>

            {/* Profile Briefs */}
            {result.maleKundali && result.femaleKundali && (
              <View style={styles.profileSummaryRow}>
                <View style={styles.profileSummaryBox}>
                  <Text style={styles.profSumName}>{result.maleKundali.name}</Text>
                  <Text style={styles.profSumLocation}>{result.maleKundali.birthPlace?.split(',')[0]} • {result.maleKundali.birthDate}</Text>
                </View>
                <Text style={styles.hearts}>💕</Text>
                <View style={styles.profileSummaryBox}>
                  <Text style={styles.profSumName}>{result.femaleKundali.name}</Text>
                  <Text style={styles.profSumLocation}>{result.femaleKundali.birthPlace?.split(',')[0]} • {result.femaleKundali.birthDate}</Text>
                </View>
              </View>
            )}

            {matchData?.score !== undefined && (
              <View style={styles.scoreBoard}>
                <Text style={styles.scoreText}>
                  <Text style={styles.scoreBig}>{matchData.score}</Text>
                  <Text style={styles.scoreTotal}> / 36</Text>
                </Text>
                <Text style={styles.scoreLabel}>Guna Match (Ashtakoot)</Text>
              </View>
            )}

            {/* Ashtakoot Breakdown */}
            {matchData && typeof matchData === 'object' && (
              <View style={styles.breakdown}>
                {Object.keys(matchData).filter(k => typeof matchData[k] === 'object' && matchData[k].full_score !== undefined).map((key) => {
                  const val = matchData[key];
                  const received = val[key] || val.score || 0;
                  const total = val.full_score || '-';
                  const isGood = received >= (total / 2);
                  return (
                    <View key={key} style={styles.kootRow}>
                      <View style={{flex:1}}>
                        <Text style={styles.kootName}>{val.name || key}</Text>
                        {(val.boy_rasi_name || val.boy_tara || val.boy_varna || val.description) && (
                          <Text style={[styles.kootDesc, isGood ? { color: colors.success } : { color: colors.textMuted }]}>
                            {val.description || ''}
                          </Text>
                        )}
                      </View>
                      <View style={styles.kootScoreBox}>
                        <Text style={styles.kootScore}>{received}</Text>
                        <Text style={styles.kootTotal}> / {total}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Conclusion */}
            {matchData?.bot_response && (
              <View style={styles.conclusionBox}>
                <Text style={styles.conclusionText}>
                  <Text style={{fontWeight: '800', color: colors.gold}}>Conclusion: </Text>
                  {matchData.bot_response}
                </Text>
              </View>
            )}

            {/* Manglik Area */}
            {(boyManglik || girlManglik) && (
              <View style={styles.manglikBox}>
                <Text style={styles.manglikTitle}>Manglik Dosha Analysis</Text>
                <View style={styles.manglikGrid}>
                  {boyManglik && (
                    <View style={styles.manglikCard}>
                      <Text style={styles.manglikLabel}>Boy</Text>
                      <Text style={[styles.manglikVal, boyManglik.score > 20 ? {color: colors.error} : {color: colors.success}]}>
                        {boyManglik.score > 0 ? `${boyManglik.score}% Manglik` : 'Not Manglik'}
                      </Text>
                    </View>
                  )}
                  {girlManglik && (
                    <View style={styles.manglikCard}>
                      <Text style={styles.manglikLabel}>Girl</Text>
                      <Text style={[styles.manglikVal, girlManglik.score > 20 ? {color: colors.error} : {color: colors.success}]}>
                        {girlManglik.score > 0 ? `${girlManglik.score}% Manglik` : 'Not Manglik'}
                      </Text>
                    </View>
                  )}
                </View>
                {boyManglik?.bot_response && <Text style={styles.manglikDetails}>Boy Analysis: {boyManglik.bot_response}</Text>}
                {boyManglik?.aspects && boyManglik.aspects.length > 0 && (
                   <View style={styles.listContainer}>
                     {boyManglik.aspects.map((t, idx) => <Text key={`b-asp-${idx}`} style={styles.listItem}>• {t}</Text>)}
                     {boyManglik.factors?.map((t, idx) => <Text key={`b-fac-${idx}`} style={styles.listItem}>• {t}</Text>)}
                   </View>
                )}

                {girlManglik?.bot_response && <Text style={[styles.manglikDetails, { marginTop: 16 }]}>Girl Analysis: {girlManglik.bot_response}</Text>}
                {girlManglik?.aspects && girlManglik.aspects.length > 0 && (
                   <View style={styles.listContainer}>
                     {girlManglik.aspects.map((t, idx) => <Text key={`g-asp-${idx}`} style={styles.listItem}>• {t}</Text>)}
                     {girlManglik.factors?.map((t, idx) => <Text key={`g-fac-${idx}`} style={styles.listItem}>• {t}</Text>)}
                   </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {/* Date / Time Picker Overlay */}
      {showPicker.visible && (
        <DateTimePicker
          value={new Date()}
          mode={showPicker.mode}
          display="default"
          onChange={onChangePicker}
        />
      )}
    </View>
  );
};

export default KundaliMatchingScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  header: {
    paddingHorizontal: 20, paddingTop: 52, paddingBottom: 16,
    backgroundColor: colors.secondary, flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: colors.border, overflow: 'hidden', gap: 12
  },
  headerOrb:  { position: 'absolute', right: -50, top: -50, width: 140, height: 140, borderRadius: 70, backgroundColor: colors.gold, opacity: 0.05 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  backArrow:  { color: colors.text, fontSize: 18, fontWeight: '700' },
  headerTitle:{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '800' },

  scroll: { padding: 16 },
  pageHero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  heroSub: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 18, paddingRight: 10 },
  

  personCard: { backgroundColor: colors.surface, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  personHeader: { color: colors.gold, fontSize: 15, fontWeight: '800', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },

  label: { color: colors.textSub || '#c4b5fd', fontSize: 11, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    color: colors.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14
  },
  pickerBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 14, 
  },
  pickerText: { color: colors.text, fontSize: 14 },
  
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  placeStatus: { position: 'absolute', right: 14, top: 14 },
  placeStatusCheck: { position: 'absolute', right: 14, top: 14, color: colors.success, fontSize: 16, fontWeight: '800' },
  coordsText: { color: colors.success, fontSize: 10, marginTop: 6 },

  submitBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24, marginBottom: 12 },
  submitBtnText: { color: colors.primary, fontSize: 15, fontWeight: '800' },

  resultCard: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.borderGold, marginTop: 12 },
  resultTitle: { color: colors.gold, fontSize: 18, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  
  scoreBoard: { backgroundColor: 'rgba(245,200,66,0.1)', paddingVertical: 20, alignItems: 'center', borderRadius: 14, marginBottom: 20 },
  scoreText: { flexDirection: 'row', alignItems: 'baseline' },
  scoreBig: { color: colors.gold, fontSize: 42, fontWeight: '800' },
  scoreTotal: { color: colors.textSub || '#c4b5fd', fontSize: 20, fontWeight: '700' },
  scoreLabel: { color: 'rgba(245,200,66,0.8)', fontSize: 13, fontWeight: '600', marginTop: 4 },

  breakdown: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, marginBottom: 16 },
  kootRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  kootName: { color: colors.text, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' },
  kootDesc: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  kootScoreBox: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  kootScore: { color: colors.gold, fontSize: 15, fontWeight: '800' },
  kootTotal: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  conclusionBox: { backgroundColor: 'rgba(124,58,237,0.15)', borderWidth: 1, borderColor: 'rgba(124,58,237,0.4)', borderRadius: 12, padding: 16, marginBottom: 20 },
  conclusionText: { color: colors.text, fontSize: 14, lineHeight: 22 },

  manglikBox: { backgroundColor: colors.secondary, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border },
  manglikTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  manglikGrid: { flexDirection: 'row', gap: 12 },
  manglikCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 10, alignItems: 'center' },
  manglikLabel: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  manglikVal: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  manglikDetails: { color: colors.gold, fontSize: 13, marginTop: 16, fontWeight: '700' },
  listContainer: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 },
  listItem: { color: colors.textMuted, fontSize: 11, marginBottom: 4, lineHeight: 16 },

  profileSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, marginBottom: 20 },
  profileSummaryBox: { flex: 1, alignItems: 'center' },
  profSumName: { color: colors.gold, fontSize: 13, fontWeight: '800', textTransform: 'capitalize', textAlign: 'center' },
  profSumLocation: { color: colors.textSub || '#c4b5fd', fontSize: 9, marginTop: 4, textAlign: 'center' },
  hearts: { fontSize: 16, marginHorizontal: 8 }
});
