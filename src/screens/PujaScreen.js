import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, RefreshControl, ScrollView, Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { pujaApi } from '../api/services';
import { colors } from '../theme/colors';
import ScreenHeader from '../components/ScreenHeader';
import { BASE_URI } from '../api/apiClient';

const BASE_IMG = BASE_URI;

const PujaScreen = ({ onBack }) => {
  const { astrologer } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const [pujas, setPujas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPuja, setSelectedPuja] = useState(null);
  const [form, setForm] = useState({
    puja_title: '', puja_price: '', puja_place: '', short_description: '', long_description: '',
  });

  const load = async () => {
    try {
      const res = await pujaApi.getList({ astrologerId: astrologer?.id, startIndex: 0, fetchRecord: 50 });
      setPujas(res.data?.recordList || res.data?.data || []);
    } catch (_) { }
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
      setForm({ puja_title: '', puja_price: '', puja_place: '', short_description: '', long_description: '' });
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
            setSelectedPuja(null);
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
      <TouchableOpacity
        style={styles.pujaCard}
        activeOpacity={0.9}
        onPress={() => setSelectedPuja(item)}
      >
        {img ? (
          <Image source={{ uri: img }} style={styles.pujaImage} />
        ) : (
          <View style={styles.pujaImagePlaceholder}>
            <Text style={{ fontSize: 32 }}>🪔</Text>
            <Text style={styles.noImgText}>No Image Available</Text>
          </View>
        )}
        <View style={styles.pujaInfo}>
          <View style={styles.pujaHeader}>
            <Text style={styles.pujaTitle} numberOfLines={2}>{item.puja_title}</Text>
            <Text style={styles.pujaPrice}>₹{parseFloat(item.puja_price || 0).toFixed(0)}</Text>
          </View>
          {item.puja_place ? (
            <View style={styles.locationRow}>
              <Text style={styles.pujaPlace}>📍 {item.puja_place}</Text>
            </View>
          ) : null}
          <View style={styles.pujaFooter}>
            <View style={[styles.approvalBadge, { backgroundColor: isApproved ? colors.successBg : colors.goldBg }]}>
              <Text style={[styles.approvalText, { color: isApproved ? colors.success : colors.goldDark }]}>
                {isApproved ? 'Approved' : 'Pending Approval'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Pujas"
        subtitle={`${pujas.length} pujas`}
        onBack={onBack}
        rightAction={{ icon: '➕', onPress: () => setShowCreate(true) }}
      />
      {loading ? (
        <ActivityIndicator color={colors.goldDark} style={{ margin: 40 }} />
      ) : (
        <FlatList
          data={pujas}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
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

      {/* Details Modal */}
      <Modal visible={!!selectedPuja} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selectedPuja && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Puja Details</Text>
                  <TouchableOpacity onPress={() => setSelectedPuja(null)}>
                    <Ionicons name="close-circle" size={28} color={colors.textLight} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {getPujaImage(selectedPuja) ? (
                    <Image source={{ uri: getPujaImage(selectedPuja) }} style={styles.detailImage} />
                  ) : (
                    <View style={styles.detailImagePlaceholder}>
                      <Text style={{ fontSize: 50 }}>🪔</Text>
                    </View>
                  )}

                  <View style={styles.detailContent}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailTitle}>{selectedPuja.puja_title}</Text>
                      <Text style={styles.detailPrice}>₹{parseFloat(selectedPuja.puja_price || 0).toFixed(0)}</Text>
                    </View>

                    <View style={styles.detailMetaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={16} color={colors.goldDark} />
                        <Text style={styles.metaText}>{selectedPuja.puja_place || 'Not Specified'}</Text>
                      </View>
                      <View style={[styles.approvalBadge, { backgroundColor: selectedPuja.isAdminApproved === 'Approved' ? colors.successBg : colors.goldBg }]}>
                        <Text style={[styles.approvalText, { color: selectedPuja.isAdminApproved === 'Approved' ? colors.success : colors.goldDark }]}>
                          {selectedPuja.isAdminApproved || 'Pending'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.detailDescTitle}>Short Description</Text>
                    <Text style={styles.detailDescText}>{selectedPuja.short_description || 'No short description provided.'}</Text>

                    <Text style={styles.detailDescTitle}>Full Description</Text>
                    <Text style={styles.detailDescText}>{selectedPuja.long_description || 'No full description provided.'}</Text>
                  </View>

                  <View style={styles.detailActions}>
                    <TouchableOpacity
                      style={styles.detailDeleteBtn}
                      onPress={() => handleDelete(selectedPuja.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                      <Text style={styles.detailDeleteText}>Delete Puja</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.detailCloseBtn}
                      onPress={() => setSelectedPuja(null)}
                    >
                      <Text style={styles.detailCloseText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Puja</Text>
              <TouchableOpacity onPress={() => setShowCreate(false)}>
                <Ionicons name="close-circle" size={28} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { key: 'puja_title', label: 'Puja Title *', placeholder: 'e.g., Mahamrityunjaya Mantra' },
                { key: 'puja_price', label: 'Price (₹) *', placeholder: '2100', keyboard: 'numeric' },
                { key: 'puja_place', label: 'Place/Location', placeholder: 'Online / Haridwar' },
                { key: 'short_description', label: 'Short Description', placeholder: 'A brief summary...' },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={v => update(f.key, v)}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.textLight}
                    keyboardType={f.keyboard || 'default'}
                  />
                </View>
              ))}
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Detailed Description</Text>
                <TextInput
                  style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                  value={form.long_description}
                  onChangeText={v => update('long_description', v)}
                  placeholder="Tell customers about the benefits and process of this puja..."
                  placeholderTextColor={colors.textLight}
                  multiline
                />
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleCreate} disabled={saving}
              >
                {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.saveBtnText}>Submit Puja Request</Text>}
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
    backgroundColor: colors.surface, borderRadius: 20, overflow: 'hidden',
    marginBottom: 16, borderWidth: 1, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  pujaImage: { width: '100%', height: 160, resizeMode: 'cover' },
  pujaImagePlaceholder: { height: 120, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center', gap: 8 },
  noImgText: { color: colors.goldDark, fontSize: 12, fontWeight: '600' },
  pujaInfo: { padding: 16 },
  pujaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  pujaTitle: { flex: 1, color: colors.text, fontSize: 17, fontWeight: '800', marginRight: 8 },
  pujaPrice: { color: colors.goldDark, fontSize: 18, fontWeight: '900' },
  locationRow: { marginBottom: 12 },
  pujaPlace: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  pujaFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  approvalBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  approvalText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: colors.textMuted, fontSize: 15, marginBottom: 24, textAlign: 'center' },
  createBtn: {
    backgroundColor: colors.gold, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 5,
  },
  createBtnText: { color: colors.text, fontWeight: '800', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 24, maxHeight: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },

  // Detail Modal Specifics
  detailImage: { width: '100%', height: 200, borderRadius: 20, marginBottom: 16, resizeMode: 'cover' },
  detailImagePlaceholder: { width: '100%', height: 180, borderRadius: 20, backgroundColor: colors.goldBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  detailContent: { paddingHorizontal: 4 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  detailTitle: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '900', marginRight: 10 },
  detailPrice: { color: colors.goldDark, fontSize: 22, fontWeight: '900' },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  detailDescTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  detailDescText: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 30, marginBottom: 10 },
  detailDeleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.errorBg, borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)' },
  detailDeleteText: { color: colors.error, fontWeight: '800', fontSize: 14 },
  detailCloseBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  detailCloseText: { color: colors.text, fontWeight: '800', fontSize: 14 },

  field: { marginBottom: 16 },
  fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    color: colors.text, fontSize: 15,
  },
  saveBtn: {
    backgroundColor: colors.gold, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 12, marginBottom: 12,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  saveBtnText: { color: colors.text, fontWeight: '900', fontSize: 16 },
});
