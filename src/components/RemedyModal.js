import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView
} from 'react-native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { remedyApi } from '../api/services';
import { colors } from '../theme/colors';

const CATEGORIES = ['Gemstone', 'Mantra', 'Puja', 'Daan', 'Other'];

const RemedyModal = ({ visible, onClose, target, onSuccess }) => {
  const { astrologer } = useSelector((s) => s.auth);
  const [category, setCategory] = useState('Gemstone');
  const [remedy, setRemedy] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSend = async () => {
    if (!remedy.trim()) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Please enter remedy details' });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        astrologerId: astrologer?.id,
        userId: target?.userId,
        category,
        remedy,
      };
      // Include chatRequestId or callId based on the target
      if (target?.chatRequestId) {
        payload.chatRequestId = target.chatRequestId;
      }
      if (target?.callId) {
        payload.callId = target.callId;
      }

      await remedyApi.send(payload);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Remedy sent successfully' });
      setCategory('Gemstone');
      setRemedy('');
      onSuccess?.();
      onClose();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error?.response?.data?.message || 'Failed to send remedy' });
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Suggest Remedy</Text>
              <Text style={styles.subtitle}>For {target?.name || 'User'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.label}>Category</Text>
            
            <View style={{ zIndex: 10 }}>
              <TouchableOpacity 
                style={styles.dropdownToggle}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={styles.dropdownToggleText}>{category}</Text>
                <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color={colors.text} />
              </TouchableOpacity>

              {showDropdown && (
                <View style={styles.dropdownList}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCategory(cat);
                        setShowDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        category === cat && styles.dropdownItemTextSelected
                      ]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Text style={styles.label}>Remedy Details</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Wear a 5-carat yellow sapphire on Thursday; chant Guru mantra 108 times daily."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={remedy}
              onChangeText={setRemedy}
              editable={!loading}
            />

            <TouchableOpacity 
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSend}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitBtnText}>Send Remedy</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RemedyModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
    marginTop: 4,
  },
  dropdownToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  dropdownToggleText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownList: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 999,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownItemTextSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#fff',
    minHeight: 100,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
