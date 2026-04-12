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
import KundaliChart from '../components/KundaliChart';

const KundaliScreen = ({ onBack }) => {
  const { token, globalLang = 'en' } = useSelector(s => s.auth);
  const [form, setForm] = useState({
    name: '', gender: 'Male', birthDate: '', birthTime: '',
    birthPlace: '', latitude: '', longitude: ''
  });
  
  const [kundaliRecord, setKundaliRecord] = useState(null);
  const [basicReport, setBasicReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  
  const debounceRef = useRef(null);

  const [showPicker, setShowPicker] = useState({ visible: false, mode: 'date', target: '' });

  const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const onChangePicker = (event, selectedDate) => {
    const { mode, target } = showPicker;
    setShowPicker({ ...showPicker, visible: false });
    
    if (event.type === 'set' && selectedDate) {
      if (mode === 'date') {
         // YYYY-MM-DD
         const ds = selectedDate.toISOString().split('T')[0];
         handleChange(target, ds);
      } else {
         // HH:MM:00 (some backends require seconds, else HH:MM)
         const hs = selectedDate.getHours().toString().padStart(2, '0');
         const ms = selectedDate.getMinutes().toString().padStart(2, '0');
         handleChange(target, `${hs}:${ms}`);
      }
    }
  };

  // Geocode with free Nominatim API
  const handlePlaceChange = (place) => {
    setForm(prev => ({ ...prev, birthPlace: place, latitude: '', longitude: '' }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (place.length < 3) return;

    debounceRef.current = setTimeout(async () => {
      setPlaceLoading(true);
      try {
        const res = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
          { headers: { 'User-Agent': 'AstroJagatApp/1.0' } }
        );
        if (res.data && res.data.length > 0) {
          setForm(prev => ({ ...prev, latitude: res.data[0].lat, longitude: res.data[0].lon }));
        }
      } catch (err) {
        // silently fail
      }
      setPlaceLoading(false);
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.birthDate || !form.birthTime || !form.birthPlace) {
      Alert.alert('Incomplete', 'Please fill all fields');
      return;
    }
    if (!form.latitude || !form.longitude) {
      Alert.alert('Location Error', 'Location not found. Please enter a more specific city Name.');
      return;
    }

    setLoading(true);
    setBasicReport(null);
    setKundaliRecord(null);

    try {
      // 1. Create Kundali Record
      const headers = { Authorization: `Bearer ${token}` };
      const addRes = await apiClient.post('/customer/kundali/add', {
        kundali: [{ 
          name: form.name, 
          gender: form.gender, 
          birthDate: form.birthDate, 
          birthTime: form.birthTime, 
          birthPlace: form.birthPlace, 
          latitude: form.latitude, 
          longitude: form.longitude, 
          maritalStatus: 'Single',
          pdf_type: 'basic' 
        }]
      }, { headers });
      
      const d = addRes.data?.data || addRes.data;
      const record = d?.recordList?.[0] || d?.recordList || null;
      setKundaliRecord(record);

      // 2. Fetch Report using generated ID
      if (record?.id) {
        const basicRes = await apiClient.post('/customer/kundali/basic', {
          kundaliId: record.id,
          dob: form.birthDate,
          tob: form.birthTime,
          lat: form.latitude,
          lon: form.longitude,
          tz: 5.5,
          lang: globalLang
        }, { headers });
        const bd = basicRes.data?.data || basicRes.data;
        setBasicReport(bd);
      }
    } catch (err) {
      console.log('--- Kundali Error ---', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to generate kundali');
    }
    setLoading(false);
  };

  // Convert array/obj of planets into an array for rendering
  const planetsObj = basicReport?.planetDetails || basicReport;
  const getPlanets = () => {
    if (!planetsObj) return [];
    if (typeof planetsObj === 'string') return [];
    return Array.isArray(planetsObj) ? planetsObj : Object.values(planetsObj).filter(p => typeof p === 'object' && p.name);
  };
  const planets = getPlanets();

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerOrb} />
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Free Janam Kundali</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        <View style={styles.card}>
          <Text style={styles.cardDesc}>Generate your birth chart based on Vedic astrology</Text>
          
          <Text style={styles.label}>Full Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your name" 
            placeholderTextColor={colors.textMuted}
            value={form.name} 
            onChangeText={(txt) => handleChange('name', txt)} 
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female'].map(g => (
                   <TouchableOpacity 
                     key={g} 
                     style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                     onPress={() => handleChange('gender', g)}
                   >
                     <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>{g}</Text>
                   </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.row}>
             <View style={styles.col}>
               <Text style={styles.label}>Date of Birth</Text>
               <TouchableOpacity 
                 style={styles.pickerBtn} 
                 onPress={() => setShowPicker({ visible: true, mode: 'date', target: 'birthDate' })}
               >
                 <Text style={[styles.pickerText, !form.birthDate && { color: colors.textMuted }]}>
                   {form.birthDate || 'YYYY-MM-DD'}
                 </Text>
               </TouchableOpacity>
             </View>
             <View style={styles.col}>
               <Text style={styles.label}>Time of Birth</Text>
               <TouchableOpacity 
                 style={styles.pickerBtn} 
                 onPress={() => setShowPicker({ visible: true, mode: 'time', target: 'birthTime' })}
               >
                 <Text style={[styles.pickerText, !form.birthTime && { color: colors.textMuted }]}>
                   {form.birthTime || 'HH:MM'}
                 </Text>
               </TouchableOpacity>
             </View>
          </View>

          <Text style={styles.label}>Place of Birth</Text>
          <View style={styles.placeContainer}>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. New Delhi, Mumbai" 
              placeholderTextColor={colors.textMuted}
              value={form.birthPlace} 
              onChangeText={handlePlaceChange} 
            />
            {placeLoading && <ActivityIndicator color={colors.gold} style={styles.placeStatus} size="small" />}
            {!placeLoading && form.latitude && form.longitude && <Text style={styles.placeStatusCheck}>✓</Text>}
          </View>
          {form.latitude ? <Text style={styles.coordsText}>Lat: {form.latitude.slice(0,6)}, Lon: {form.longitude.slice(0,6)}</Text> : null}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.submitBtnText}>Generate Kundali</Text>}
          </TouchableOpacity>
        </View>

        {/* Results */}
        {(kundaliRecord || basicReport != null) && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Your Kundali — {kundaliRecord?.name || form.name}</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoText}>DOB: {kundaliRecord?.birthDate}</Text>
              <Text style={styles.infoText}>TOB: {kundaliRecord?.birthTime}</Text>
              <Text style={styles.infoText}>Loc: {kundaliRecord?.birthPlace}</Text>
            </View>

            <View style={styles.tabBar}>
              <Text style={styles.tabActive}>Birth Chart (Lagna Kundali)</Text>
            </View>

            {basicReport && planets.length > 0 ? (
              <>
                <KundaliChart planetDetails={basicReport.planetDetails || basicReport} chartTheme="gold" />
                <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
                  <Text style={[styles.tabActive, { fontSize: 16, marginBottom: 12 }]}>Planetary Positions</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.th, { width: 80 }]}>Planet</Text>
                        <Text style={[styles.th, { width: 90 }]}>Sign</Text>
                        <Text style={[styles.th, { width: 60 }]}>Degree</Text>
                        <Text style={[styles.th, { width: 50 }]}>House</Text>
                        <Text style={[styles.th, { width: 100 }]}>Nakshatra (Pada)</Text>
                        <Text style={[styles.th, { width: 120 }]}>Status / Avastha</Text>
                      </View>
                      {planets.map((p, i) => {
                        const retroStr = p.retro ? ' [R]' : '';
                        const combustStr = p.is_combust ? ' [C]' : '';
                        return (
                          <View key={i} style={styles.tableRow}>
                            <Text style={[styles.tdStr, { width: 80 }]}>{p.full_name || p.name || p.planet || '-'}{retroStr}{combustStr}</Text>
                            <Text style={[styles.td, { width: 90 }]}>{p.zodiac || p.sign || '-'}</Text>
                            <Text style={[styles.td, { width: 60 }]}>
                               {p.fullDegree ? parseFloat(p.fullDegree).toFixed(2) + '°' : 
                                p.local_degree ? parseFloat(p.local_degree).toFixed(2) + '°' : 
                                p.degree ? p.degree : '-'}
                            </Text>
                            <Text style={[styles.td, { width: 50 }]}>{p.house || '-'}</Text>
                            <Text style={[styles.td, { width: 100 }]}>{p.nakshatra || '-'} ({p.nakshatra_pada || '-'})</Text>
                            <Text style={[styles.td, { width: 120 }]}>{p.lord_status || '-'} / {p.basic_avastha || '-'}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>

                {/* Additional Information from Kundali API */}
                {basicReport.rasi && (
                  <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
                    <Text style={[styles.tabActive, { fontSize: 16, marginBottom: 12 }]}>Astrological Details</Text>
                    <View style={styles.gridContainer}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Rasi (Moon Sign)</Text>
                        <Text style={styles.gridVal}>{basicReport.rasi}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Nakshatra</Text>
                        <Text style={styles.gridVal}>{basicReport.nakshatra} (Pada {basicReport.nakshatra_pada})</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Birth Dasa</Text>
                        <Text style={styles.gridVal}>{basicReport.birth_dasa}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Current Dasa</Text>
                        <Text style={styles.gridVal}>{basicReport.current_dasa}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {basicReport.panchang && (
                  <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
                    <Text style={[styles.tabActive, { fontSize: 16, marginBottom: 12 }]}>Panchang Info</Text>
                    <View style={styles.gridContainer}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Tithi</Text>
                        <Text style={styles.gridVal}>{basicReport.panchang.tithi}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Yoga / Karana</Text>
                        <Text style={styles.gridVal}>{basicReport.panchang.yoga} / {basicReport.panchang.karana}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Day Details</Text>
                        <Text style={styles.gridVal}>{basicReport.panchang.day_of_birth} (Lord: {basicReport.panchang.day_lord})</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Hora Lord</Text>
                        <Text style={styles.gridVal}>{basicReport.panchang.hora_lord}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Sunrise</Text>
                        <Text style={styles.gridVal}>{basicReport.panchang.sunrise_at_birth}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Sunset</Text>
                        <Text style={styles.gridVal}>{basicReport.panchang.sunset_at_birth}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Ayanamsa</Text>
                        <Text style={styles.gridVal}>{basicReport.panchang.ayanamsa_name} ({parseFloat(basicReport.panchang.ayanamsa).toFixed(2)})</Text>
                      </View>
                    </View>
                  </View>
                )}

                {basicReport.ghatka_chakra && (
                  <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
                    <Text style={[styles.tabActive, { fontSize: 16, marginBottom: 12 }]}>Ghatka Chakra (Inauspicious Elements)</Text>
                    <View style={styles.gridContainer}>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Inauspicious Month (Rasi)</Text>
                        <Text style={styles.gridVal}>{basicReport.ghatka_chakra.rasi}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Inauspicious Tithi</Text>
                        <Text style={styles.gridVal}>{basicReport.ghatka_chakra.tithi?.join(', ')}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Inauspicious Day / Nakshatra</Text>
                        <Text style={styles.gridVal}>{basicReport.ghatka_chakra.day} / {basicReport.ghatka_chakra.nakshatra}</Text>
                      </View>
                      <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Ghatka Lord</Text>
                        <Text style={styles.gridVal}>{basicReport.ghatka_chakra.lord} (Tatva: {basicReport.ghatka_chakra.tatva})</Text>
                      </View>
                    </View>
                  </View>
                )}

                {basicReport.lucky_gem && (
                  <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
                    <Text style={[styles.tabActive, { fontSize: 16, marginBottom: 12 }]}>Good Fortune / Lucky Info</Text>
                    <View style={styles.chipRow}>
                      {basicReport.lucky_gem?.map((v, i) => <View key={`gem-${i}`} style={styles.chip}><Text style={styles.chipText}>Gem: {v}</Text></View>)}
                      {basicReport.lucky_colors?.map((v, i) => <View key={`col-${i}`} style={styles.chip}><Text style={styles.chipText}>Color: {v}</Text></View>)}
                      {basicReport.lucky_num?.map((v, i) => <View key={`num-${i}`} style={styles.chip}><Text style={styles.chipText}>Num: {v}</Text></View>)}
                      {basicReport.lucky_letters?.map((v, i) => <View key={`let-${i}`} style={styles.chip}><Text style={styles.chipText}>Letter: {v}</Text></View>)}
                      {basicReport.lucky_name_start?.map((v, i) => <View key={`name-${i}`} style={styles.chip}><Text style={styles.chipText}>Name Start: {v}</Text></View>)}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>{typeof basicReport === 'string' ? basicReport : 'No planet data available'}</Text>
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

export default KundaliScreen;

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
  card: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 20 },
  
  label: { color: colors.textSub || '#c4b5fd', fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: 12 },
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
  
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  genderBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  genderText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  genderTextActive: { color: colors.primary, fontWeight: '800' },

  placeContainer: { justifyContent: 'center' },
  placeStatus: { position: 'absolute', right: 14 },
  placeStatusCheck: { position: 'absolute', right: 14, color: colors.success, fontSize: 18, fontWeight: '800' },
  coordsText: { color: colors.success, fontSize: 11, marginTop: 6 },

  submitBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: colors.primary, fontSize: 15, fontWeight: '800' },

  resultCard: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.borderGold },
  resultTitle: { color: colors.gold, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(245,200,66,0.1)', padding: 12, borderRadius: 10, marginBottom: 16 },
  infoText: { color: colors.textSub || '#c4b5fd', fontSize: 11, fontWeight: '600' },

  tabBar: { borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16, paddingBottom: 10 },
  tabActive: { color: colors.gold, fontWeight: '800', fontSize: 14 },

  tableHeader: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 10, borderRadius: 8, paddingHorizontal: 10, marginBottom: 8 },
  th: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, paddingHorizontal: 10 },
  tdStr: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  td: { color: colors.text, fontSize: 12 },
  
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: '47%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  gridLabel: { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', marginBottom: 4 },
  gridVal: { color: colors.text, fontSize: 13, fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: 'rgba(212, 175, 55, 0.1)', borderWidth: 1, borderColor: colors.borderGold, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipText: { color: colors.gold, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }
});
