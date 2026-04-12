import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { walletApi } from '../api/services';
import { colors } from '../theme/colors';

const WithdrawModal = ({ visible, balance, astrologerId, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    amount: '', paymentMethod: 'bank',
    accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { Alert.alert('Error', 'Enter valid amount'); return; }
    if (parseFloat(form.amount) > balance) { Alert.alert('Error', 'Insufficient balance'); return; }
    if (form.paymentMethod === 'bank') {
      if (!form.accountNumber || !form.ifscCode || !form.accountHolderName) {
        Alert.alert('Error', 'Fill all bank details'); return;
      }
    } else {
      if (!form.upiId) { Alert.alert('Error', 'Enter UPI ID'); return; }
    }
    setSubmitting(true);
    try {
      await walletApi.sendWithdrawRequest({
        astrologerId,
        amount: form.amount,
        paymentMethod: form.paymentMethod,
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode,
        accountHolderName: form.accountHolderName,
        upiId: form.upiId,
      });
      Alert.alert('✅ Success', 'Withdrawal request submitted!');
      setForm({ amount: '', paymentMethod: 'bank', accountNumber: '', ifscCode: '', accountHolderName: '', upiId: '' });
      onSuccess();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit request');
    }
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Withdraw Request</Text>
          <Text style={styles.available}>Available: ₹{parseFloat(balance).toFixed(2)}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={form.amount}
                onChangeText={v => update('amount', v)}
                placeholder="Enter amount"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodRow}>
                {['bank', 'upi'].map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodBtn, form.paymentMethod === m && styles.methodBtnActive]}
                    onPress={() => update('paymentMethod', m)}
                  >
                    <Text style={[styles.methodBtnText, form.paymentMethod === m && styles.methodBtnTextActive]}>
                      {m === 'bank' ? '🏦 Bank Transfer' : '📱 UPI'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {form.paymentMethod === 'bank' && (
              <>
                {[
                  { key: 'accountNumber', label: 'Account Number', keyboard: 'number-pad' },
                  { key: 'ifscCode', label: 'IFSC Code' },
                  { key: 'accountHolderName', label: 'Account Holder Name' },
                ].map(f => (
                  <View style={styles.field} key={f.key}>
                    <Text style={styles.label}>{f.label} *</Text>
                    <TextInput
                      style={styles.input}
                      value={form[f.key]}
                      onChangeText={v => update(f.key, v)}
                      placeholder={f.label}
                      placeholderTextColor={colors.textMuted}
                      keyboardType={f.keyboard || 'default'}
                    />
                  </View>
                ))}
              </>
            )}

            {form.paymentMethod === 'upi' && (
              <View style={styles.field}>
                <Text style={styles.label}>UPI ID *</Text>
                <TextInput
                  style={styles.input}
                  value={form.upiId}
                  onChangeText={v => update('upiId', v)}
                  placeholder="name@upi"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={colors.primary} />
                : <Text style={styles.submitBtnText}>Submit Request</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default WithdrawModal;

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  box: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  title:     { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  available: { color: colors.success, fontSize: 13, fontWeight: '600', marginBottom: 18 },

  field: { marginBottom: 14 },
  label: { color: colors.textSub, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.5 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },

  methodRow: { flexDirection: 'row', gap: 10 },
  methodBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  methodBtnActive:     { borderColor: colors.secondary, backgroundColor: colors.secondary + '20' },
  methodBtnText:       { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  methodBtnTextActive: { color: colors.secondary },

  submitBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '800' },

  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
