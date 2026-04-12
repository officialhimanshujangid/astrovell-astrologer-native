import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl, ScrollView, Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pujaApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';

const BASE_IMG = 'https://astrology-i7c9.onrender.com/';

const PujaScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const [pujas,      setPujas]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({
    puja_title: '', puja_price: '', puja_place: '', short_description: '', long_description: '',
  });

  const load = async () => {
    try {
      const res = await pujaApi.getList({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setPujas(res.data?.recordList || res.data?.data || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleCreate = async () => {
    if (!form.puja_title.trim() || !form.puja_price) {
      Alert.alert('Error', 'Enter puja title and price'); return;
    }
    setSaving(true);
    try {
      await pujaApi.add({ ...form, astrologerId: astrologer?.id });
      Alert.alert('✅ Success', 'Puja created! Awaiting admin approval.');
      setShowCreate(false);
      setForm({ puja_title:'', puja_price:'', puja_place:'', short_description:'', long_description:'' });
      load();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create puja');
    }
    setSaving(false);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Puja', 'Delete this puja?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await pujaApi.delete({ id });
            setPujas(prev => prev.filter(p => p.id !== id));
          } catch (_) { Alert.alert('Error', 'Failed to delete'); }
        },
      },
    ]);
  };

  const getPujaImage = (p) => {
    try {
      if (!p.puja_images) return null;
      const imgs = typeof p.puja_images === 'string' ? JSON.parse(p.puja_images) : p.puja_images;
      const first = imgs[0];
      return first ? (first.startsWith('http') ? first : `${BASE_IMG}${first}`) : null;
    } catch { return null; }
  };

  const renderItem = ({ item }) => {
    const img = getPujaImage(item);
    const isApproved = item.isAdminApproved === 'Approved';

    return (
      <View style={styles.pujaCard}>
        {img ? (
          <Image source={{ uri: img }} style={styles.pujaImage} />
        ) : (
          <View style={styles.pujaImagePlaceholder}>
            <Text style={{ fontSize: 30 }}>🪔</Text>
          </View>
        )}
        <View style={styles.pujaInfo}>
          <View style={styles.pujaHeader}>
            <Text style={styles.pujaTitle} numberOfLines={2}>{item.puja_title}</Text>
            <Text style={styles.pujaPrice}>₹{parseFloat(item.puja_price || 0).toFixed(0)}</Text>
          </View>
          {item.puja_place ? <Text style={styles.pujaPlace}>📍 {item.puja_place}</Text> : null}
          <View style={styles.pujaFooter}>
            <View style={[styles.approvalBadge, { backgroundColor: isApproved ? colors.success + '20' : colors.warning + '20' }]}>
              <Text style={[styles.approvalText, { color: isApproved ? colors.success : colors.warning }]}>
                {isApproved ? '✅ Approved' : '⏳ Pending'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.delBtn}>
              <Text style={styles.delBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScreenHeader
        title="My Pujas"
        subtitle={`${pujas.length} pujas`}
        onBack={onBack}
        rightAction={{ icon: '➕', onPress: () => setShowCreate(true) }}
      />
      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={pujas}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🪔</Text>
              <Text style={styles.emptyText}>No pujas yet</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
                <Text style={styles.createBtnText}>Create Your First Puja</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Create Puja</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'puja_title', label: 'Puja Title *', placeholder: 'e.g., Ganesh Puja' },
                { key: 'puja_price', label: 'Price (₹) *', placeholder: '1100', keyboard: 'numeric' },
                { key: 'puja_place', label: 'Place/Location', placeholder: 'Online / Delhi' },
                { key: 'short_description', label: 'Short Description', placeholder: 'Brief description...' },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={v => update(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textMuted}
                    keyboardType={f.keyboard || 'default'}
                  />
                </View>
              ))}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Full Description</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={form.long_description}
                  onChangeText={v => update('long_description', v)}
                  placeholder="Detailed description..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                />
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleCreate} disabled={saving}
              >
                {saving ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.saveBtnText}>Create Puja</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PujaScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },
  pujaCard: {
    backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden',
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  pujaImage:            { width: '100%', height: 140, resizeMode: 'cover' },
  pujaImagePlaceholder: { height: 80, backgroundColor: colors.secondary + '15', alignItems: 'center', justifyContent: 'center' },
  pujaInfo: { padding: 14 },
  pujaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  pujaTitle: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '800', marginRight: 8 },
  pujaPrice: { color: colors.accent, fontSize: 16, fontWeight: '900' },
  pujaPlace: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  pujaFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  approvalBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  approvalText:  { fontSize: 11, fontWeight: '700' },
  delBtn: { padding: 6 },
  delBtnText: { fontSize: 18 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: colors.textMuted, fontSize: 14, marginBottom: 16 },
  createBtn: {
    backgroundColor: colors.secondary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  createBtnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
    borderTopWidth: 1, borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 16 },
  field: { marginBottom: 14 },
  fieldLabel: { color: colors.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontSize: 14,
  },
  saveBtn: {
    backgroundColor: colors.secondary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 10,
  },
  saveBtnText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  cancelBtn: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingVertical: 12, alignItems: 'center',
  },
  cancelBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
});
