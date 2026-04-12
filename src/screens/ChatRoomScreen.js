import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Image, ScrollView, Modal,
} from 'react-native';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { chatApi, pujaApi } from '../api/services';
import { SOCKET_BASE } from '../api/apiClient';
import usePermissions from '../hooks/usePermissions';

const BASE_IMG = 'https://astrology-i7c9.onrender.com/';

const ChatRoomScreen = ({ route }) => {
  const { chatId } = route.params;
  const { astrologer, token } = useSelector(s => s.auth);
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();

  const [chatDetail, setChatDetail]     = useState(null);
  const [messages, setMessages]         = useState([]);
  const [newMsg, setNewMsg]             = useState('');
  const [loading, setLoading]           = useState(true);
  const [sending, setSending]           = useState(false);
  const [timeElapsed, setTimeElapsed]   = useState(0);
  const [typing, setTyping]             = useState(false);
  const [showPujaModal, setShowPujaModal] = useState(false);
  const [myPujas, setMyPujas]           = useState([]);
  const [recId, setRecId]               = useState(null); // recommending puja id

  const socketRef    = useRef(null);
  const timerRef     = useRef(null);
  const typingTimeout = useRef(null);
  const flatListRef  = useRef(null);

  const formatTimer = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const formatTime = (d) =>
    d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

  // ── Init ────────────────────────────────────────────────────────────────────
  const initChat = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, msgRes] = await Promise.allSettled([
        chatApi.getChatDetail({ chatRequestId: chatId }),
        chatApi.getMessages({ chatRequestId: chatId }),
      ]);
      if (detailRes.status === 'fulfilled') {
        const d = detailRes.value.data;
        setChatDetail(d?.recordList || d?.data || null);
      }
      if (msgRes.status === 'fulfilled') {
        const d = msgRes.value.data;
        const msgs = d?.recordList || d?.data || [];
        if (Array.isArray(msgs)) setMessages(msgs);
      }
      // Start elapsed timer
      timerRef.current = setInterval(() => setTimeElapsed(p => p + 1), 1000);
      connectSocket();
    } catch (_) {}
    setLoading(false);
  }, [chatId]);

  // ── Socket ──────────────────────────────────────────────────────────────────
  const connectSocket = useCallback(() => {
    if (!token) return;

    const socket = io(SOCKET_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Astro ChatRoom] Socket connected:', socket.id);
      socket.emit('join-chat', { chatRequestId: chatId });

      // Sync messages on reconnect to avoid gaps
      chatApi.getMessages({ chatRequestId: chatId }).then(res => {
        const msgs = res.data?.recordList || res.data?.data || [];
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs);
        }
      }).catch(() => {});
    });

    // ── New message ──────────────────────────────────────────────────────────
    socket.on('new-message', (msg) => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      // If message is from customer (other person), mark as delivered then read
      if (msg.senderType === 'user' && String(msg.senderId) !== String(astrologer?.id)) {
        socket.emit('message-delivered', { chatRequestId: parseInt(chatId), messageIds: [msg.id] });
        // Mark as read after 2 sec (chat screen is open)
        setTimeout(() => {
          if (socketRef.current?.connected) {
            socketRef.current.emit('message-read', { chatRequestId: parseInt(chatId), messageIds: [msg.id] });
          }
        }, 2000);
      }
    });

    // ── Message status updates (sent → delivered → read) ────────────────────
    socket.on('messages-status-update', ({ messageIds, status }) => {
      setMessages(prev => prev.map(m => messageIds.includes(m.id) ? { ...m, status } : m));
    });

    // ── Chat ended ───────────────────────────────────────────────────────────
    socket.on('chat-ended', (data) => {
      clearInterval(timerRef.current);
      Alert.alert('Chat Ended', data?.message || 'Chat session ended');
      setChatDetail(prev => ({ ...prev, chatStatus: 'Completed' }));
    });

    // ── Chat cancelled by customer ───────────────────────────────────────────
    socket.on('chat-cancelled', (data) => {
      Alert.alert('Chat Cancelled', data?.message || 'Customer cancelled the chat request');
      setChatDetail(prev => ({ ...prev, chatStatus: 'Cancelled' }));
      clearInterval(timerRef.current);
    });

    // ── Customer disconnected ────────────────────────────────────────────────
    socket.on('user-disconnected', (data) => {
      if (data?.userType !== 'astrologer') {
        Alert.alert(
          '⚠️ Customer Disconnected',
          'The customer lost connection. Waiting up to 30 seconds for reconnect...',
          [{ text: 'OK' }]
        );
      }
    });

    // ── Typing indicators (only show when customer is typing) ────────────────
    socket.on('user-typing', (data) => {
      if (data?.userType !== 'astrologer') setTyping(true);
    });
    socket.on('user-stop-typing', (data) => {
      if (data?.userType !== 'astrologer') setTyping(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[Astro ChatRoom] Socket error:', err.message);
    });

    socketRef.current = socket;
  }, [token, chatId]);

  useEffect(() => {
    initChat();
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(typingTimeout.current);
      socketRef.current?.disconnect();
    };
  }, [chatId]);

  // ── Send Message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    const txt = newMsg.trim();
    if (!txt) return;
    setNewMsg('');
    setSending(true);

    if (socketRef.current?.connected) {
      socketRef.current.emit('send-message', { chatRequestId: chatId, message: txt });
      socketRef.current.emit('stop-typing', { chatRequestId: chatId });
    } else {
      try {
        const res = await chatApi.sendMessage({ chatRequestId: chatId, message: txt });
        const d = res.data;
        if (d?.status === 200 && d?.recordList) {
          setMessages(prev => [...prev, d.recordList]);
        }
      } catch (_) {
        Alert.alert('Error', 'Failed to send message');
        setNewMsg(txt);
      }
    }
    setSending(false);
  };

  // ── Typing ───────────────────────────────────────────────────────────────
  const handleTyping = (v) => {
    setNewMsg(v);
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { chatRequestId: chatId });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socketRef.current?.emit('stop-typing', { chatRequestId: chatId });
      }, 2000);
    }
  };

  // ── End Chat ─────────────────────────────────────────────────────────────
  const handleEndChat = () => {
    Alert.alert('End Chat', 'End this consultation session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Chat', style: 'destructive', onPress: () => {
          socketRef.current?.emit('end-chat', { chatRequestId: chatId });
          clearInterval(timerRef.current);
          setChatDetail(prev => ({ ...prev, chatStatus: 'Completed' }));
        },
      },
    ]);
  };

  // ── Puja ─────────────────────────────────────────────────────────────────
  const loadPujas = async () => {
    // Guard: only accessible if chat_recommend_puja permission is enabled
    if (!can('chat_recommend_puja')) return;
    try {
      const res = await pujaApi.getList({ astrologerId: astrologer?.id });
      setMyPujas(res.data?.recordList || []);
    } catch (_) {}
    setShowPujaModal(true);
  };

  const recommendPuja = async (puja) => {
    setRecId(puja.id);
    try {
      await pujaApi.sendToUser({
        astrologerId: astrologer?.id,
        userId: chatDetail?.userId,
        puja_id: puja.id,
      });
      setMessages(prev => [...prev, {
        id: 'puja_' + Date.now(),
        senderType: 'system',
        message: '__PUJA_SENT__',
        pujaData: { pujaTitle: puja.puja_title, pujaPrice: puja.puja_price },
        created_at: new Date().toISOString(),
      }]);
      setShowPujaModal(false);
      Alert.alert('✅ Puja Recommended', `${puja.puja_title} sent to customer`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to recommend puja');
    }
    setRecId(null);
  };

  // ── Render Message ────────────────────────────────────────────────────────
  const renderMsg = ({ item }) => {
    // ── Puja sent card ───────────────────────────────────────────────────────
    if (item.message === '__PUJA_SENT__' && item.pujaData) {
      return (
        <View style={styles.pujaCard}>
          <Text style={styles.pujaCardBadge}>Puja Recommended 🙏</Text>
          <Text style={styles.pujaCardTitle}>{item.pujaData.pujaTitle}</Text>
          <Text style={styles.pujaCardPrice}>₹{item.pujaData.pujaPrice}</Text>
          <Text style={styles.pujaCardHint}>Waiting for customer response...</Text>
        </View>
      );
    }

    // ── Regular message ──────────────────────────────────────────────────────
    const isSent = item.senderType === 'astrologer';

    // Tick indicator (only for astrologer's own messages)
    const renderTick = () => {
      if (!isSent) return null;
      const tickColor = item.status === 'read'
        ? '#34d399'           // green = read
        : item.status === 'delivered'
        ? 'rgba(255,255,255,0.7)'
        : 'rgba(255,255,255,0.4)';
      const tickText = item.status === 'read' || item.status === 'delivered' ? '✓✓' : '✓';
      return (
        <Text style={[styles.tickText, { color: tickColor }]}>{tickText}</Text>
      );
    };

    return (
      <View style={[styles.bubble, isSent ? styles.bubbleSent : styles.bubbleReceived]}>
        <Text style={[styles.bubbleText, !isSent && styles.bubbleTextReceived]}>{item.message}</Text>
        <View style={styles.bubbleFooter}>
          <Text style={styles.bubbleTime}>{formatTime(item.created_at)}</Text>
          {renderTick()}
        </View>
      </View>
    );
  };

  const status = chatDetail?.chatStatus || 'Accepted';
  const isDone = status === 'Completed' || status === 'Cancelled';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerUser}>
          {chatDetail?.userProfile ? (
            <Image
              source={{
                uri: chatDetail.userProfile.startsWith('http')
                  ? chatDetail.userProfile
                  : `${BASE_IMG}${chatDetail.userProfile}`,
              }}
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Text style={styles.headerAvatarLetter}>
                {(chatDetail?.userName || 'U')[0].toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={styles.headerName}>{chatDetail?.userName || 'User'}</Text>
            <Text style={[styles.headerStatus, { color: isDone ? colors.textMuted : colors.success }]}>
              {status}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {can('chat') && !isDone && (
            <View style={[styles.timerWrap, timeElapsed > 1800 && { borderColor: colors.danger }]}>
              <Text style={[styles.timerText, timeElapsed > 1800 && { color: colors.danger }]}>
                {formatTimer(timeElapsed)}
              </Text>
            </View>
          )}
          {can('chat_recommend_puja') && !isDone && (
            <TouchableOpacity style={styles.pujaBtn} onPress={loadPujas} activeOpacity={0.8}>
              <Text style={styles.pujaBtnText}>🙏</Text>
            </TouchableOpacity>
          )}
          {can('chat') && !isDone && (
            <TouchableOpacity style={styles.endBtn} onPress={handleEndChat} activeOpacity={0.8}>
              <Text style={styles.endBtnText}>End</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.secondary} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, i) => String(item.id ?? i)}
            renderItem={renderMsg}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyMsgs}>
                <Text style={styles.emptyMsgsText}>Chat started! Say hello to the customer 👋</Text>
              </View>
            }
            ListFooterComponent={
              <>
                {typing && (
                  <Text style={styles.typingIndicator}>Customer is typing...</Text>
                )}
                {status === 'Cancelled' && (
                  <View style={styles.systemBanner}>
                    <Text style={styles.systemBannerText}>🚫 Customer cancelled the request.</Text>
                  </View>
                )}
              </>
            }
          />

          {/* ── Input ────────────────────────────────────────────────────── */}
          {!isDone && (
            <View style={[styles.inputRow, { paddingBottom: insets.bottom + 8 }]}>
              <TextInput
                style={styles.input}
                value={newMsg}
                onChangeText={handleTyping}
                placeholder="Type a message..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (!newMsg.trim() || sending) && { opacity: 0.5 }]}
                onPress={handleSend}
                disabled={!newMsg.trim() || sending}
                activeOpacity={0.8}
              >
                {sending
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <Text style={styles.sendBtnText}>➤</Text>}
              </TouchableOpacity>
            </View>
          )}

          {isDone && (
            <View style={[styles.doneBar, { paddingBottom: insets.bottom + 8 }]}>
              <Text style={styles.doneBarText}>This consultation has ended</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* ── Puja Modal ────────────────────────────────────────────────────── */}
      <Modal visible={showPujaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🙏 Recommend Puja</Text>
            {myPujas.length === 0 ? (
              <Text style={styles.modalEmpty}>No pujas created yet.</Text>
            ) : (
              <ScrollView>
                {myPujas.map(p => (
                  <View key={p.id} style={styles.pujaItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pujaItemTitle}>{p.puja_title}</Text>
                      <Text style={styles.pujaItemPrice}>₹{parseFloat(p.puja_price || 0).toFixed(0)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.pujaItemBtn, recId === p.id && { opacity: 0.6 }]}
                      onPress={() => recommendPuja(p)}
                      disabled={!!recId}
                    >
                      {recId === p.id
                        ? <ActivityIndicator color={colors.white} size="small" />
                        : <Text style={styles.pujaItemBtnText}>Send</Text>}
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowPujaModal(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ChatRoomScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerUser:              { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar:            { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.border },
  headerAvatarPlaceholder: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.secondary + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarLetter: { color: colors.secondary, fontSize: 18, fontWeight: '800' },
  headerName:         { color: colors.text, fontSize: 15, fontWeight: '700' },
  headerStatus:       { fontSize: 11, fontWeight: '600' },
  headerRight:        { flexDirection: 'row', alignItems: 'center', gap: 8 },

  timerWrap: {
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  timerText: { color: colors.accent, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },

  pujaBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.warning + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  pujaBtnText: { fontSize: 18 },

  endBtn: {
    backgroundColor: colors.danger + '20',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.danger + '50',
  },
  endBtnText: { color: colors.danger, fontSize: 12, fontWeight: '800' },

  loadingWrap:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { padding: 14, paddingBottom: 8 },

  bubble: {
    maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8,
  },
  bubbleSent: {
    backgroundColor: colors.secondary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: colors.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  bubbleText:         { color: colors.white, fontSize: 14 },
  bubbleTextReceived: { color: colors.text },
  bubbleFooter:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 3 },
  bubbleTime:         { color: 'rgba(255,255,255,0.6)', fontSize: 10 },
  tickText:           { fontSize: 11, fontWeight: '700', letterSpacing: -1 },

  pujaCard: {
    backgroundColor: colors.success + '15',
    borderWidth: 2, borderColor: colors.success,
    borderRadius: 14, padding: 14,
    alignItems: 'center', alignSelf: 'center',
    width: '82%', marginBottom: 8,
  },
  pujaCardBadge: {
    backgroundColor: colors.success, color: colors.white, fontSize: 11, fontWeight: '700',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6,
  },
  pujaCardTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  pujaCardPrice: { color: colors.accent, fontSize: 16, fontWeight: '900', marginBottom: 4 },
  pujaCardHint:  { color: colors.textMuted, fontSize: 11 },

  typingIndicator: {
    color: colors.textMuted, fontSize: 12,
    paddingHorizontal: 16, paddingBottom: 4, fontStyle: 'italic',
  },

  systemBanner: {
    margin: 16, padding: 12, borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  systemBannerText: { color: '#ef4444', fontSize: 13, fontStyle: 'italic' },

  emptyMsgs:     { alignItems: 'center', marginTop: 60, padding: 20 },
  emptyMsgsText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, backgroundColor: colors.card,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    color: colors.text, fontSize: 14, maxHeight: 100,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnText: { color: colors.white, fontSize: 18, marginLeft: 2 },

  doneBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 12, paddingHorizontal: 16, alignItems: 'center',
  },
  doneBarText: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },

  // ── Puja Modal ─────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '60%',
    borderTopWidth: 1, borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  modalEmpty: { color: colors.textMuted, textAlign: 'center', padding: 20 },
  pujaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingVertical: 12,
  },
  pujaItemTitle:    { color: colors.text, fontSize: 14, fontWeight: '700' },
  pujaItemPrice:    { color: colors.accent, fontSize: 13, marginTop: 2 },
  pujaItemBtn:      { backgroundColor: colors.secondary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  pujaItemBtnText:  { color: colors.white, fontWeight: '700', fontSize: 13 },
  modalClose: {
    marginTop: 16, backgroundColor: colors.surface,
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalCloseText: { color: colors.text, fontWeight: '700', fontSize: 14 },
});
