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
import { Ionicons } from '@expo/vector-icons';
import { chatApi, pujaApi, kundaliApi, horoscopeApi } from '../api/services';
import { SOCKET_BASE, BASE_IMG } from '../api/apiClient';
import usePermissions from '../hooks/usePermissions';

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

  // ── Astro Tools State ──────────────────────────────────────────────────────
  const [showAstroTools, setShowAstroTools] = useState(false);
  const [activeTool, setActiveTool]         = useState('Kundali'); 
  const [kundaliSubTab, setKundaliSubTab]   = useState('Basic'); // 'Basic' | 'Planets' | 'Dasha'
  const [astroLoading, setAstroLoading]     = useState(false);
  const [kundaliData, setKundaliData]       = useState(null);
  const [matchResult, setMatchResult]       = useState(null);
  const [dailyHoro, setDailyHoro]           = useState(null);
  const [matchForm, setMatchForm]           = useState({ name: '', dob: '', time: '', place: '' });

  const socketRef    = useRef(null);
  const timerRef     = useRef(null);
  const typingTimeout = useRef(null);
  const flatListRef  = useRef(null);

  const formatTimer = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const formatTime = (d) =>
    d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

  const formatDashaDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

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

  // ── Astro Tools Actions ────────────────────────────────────────────────────
  const fetchQuickKundali = async () => {
    if (!chatDetail) return;
    setAstroLoading(true);
    try {
      const dob = chatDetail.intakeBirthDate || '1990-01-01';
      const tob = chatDetail.intakeBirthTime || '12:00:00';
      const lat = chatDetail.intakeLat || '28.6139';
      const lon = chatDetail.intakeLon || '77.2090';

      const payload = { dob, tob, lat, lon, tz: 5.5, name: chatDetail.intakeName || 'User' };

      const [basicRes, planetRes, dashaRes, panchangRes] = await Promise.all([
        kundaliApi.getBasicReport(payload),
        kundaliApi.getPlanetReport(payload),
        kundaliApi.getMahadashaList(payload),
        kundaliApi.getBirthPanchang(payload)
      ]);

      setKundaliData({ 
        basic: basicRes.data?.data || basicRes.data, 
        planets: planetRes.data?.recordList || planetRes.data?.data || [],
        dasha: dashaRes.data?.recordList || dashaRes.data?.data || [],
        panchang: panchangRes.data?.data || panchangRes.data,
        rashi: basicRes.data?.data?.moonSign || 'Aries',
        nakshatra: basicRes.data?.data?.nakshatra || 'N/A'
      });

      if (basicRes.data?.data?.moonSign) fetchHoroscope(basicRes.data?.data?.moonSign);
    } catch (e) {
      console.warn('[Astro Tools] Kundali Fetch Failed:', e.message);
    }
    setAstroLoading(false);
  };

  const fetchHoroscope = async (signName) => {
    try {
      const signsRes = await horoscopeApi.getSigns();
      const signs = signsRes.data?.recordList || [];
      
      // Try to find matching sign
      const target = signName?.toLowerCase();
      const matchedSign = signs.find(s => s.signName?.toLowerCase() === target || s.signName_hi?.toLowerCase() === target) 
                          || signs[0];

      if (matchedSign) {
        const daily = await horoscopeApi.getDaily({ sign: matchedSign.signName });
        const prediction = daily.data?.recordList?.[0] || daily.data;
        setDailyHoro({ ...prediction, signName: matchedSign.signName });
      }
    } catch (e) {
      console.warn('[Astro Tools] Horoscope Fetch Failed:', e.message);
    }
  };

  const handleMatch = async () => {
    if (!matchForm.dob) {
      Alert.alert('Missing Info', 'Please enter partner DOB');
      return;
    }
    setAstroLoading(true);
    try {
      const payload = {
        m_name: chatDetail.intakeName || chatDetail.userName,
        m_dob: chatDetail.intakeBirthDate || '1990-01-01',
        m_tob: chatDetail.intakeBirthTime || '12:00:00',
        m_lat: chatDetail.intakeLat || '28.6139',
        m_lon: chatDetail.intakeLon || '77.2090',
        f_name: matchForm.name || 'Partner',
        f_dob: matchForm.dob,
        f_tob: matchForm.time || '12:00:00',
        f_lat: '28.6139', f_lon: '77.2090',
        tz: 5.5
      };
      const res = await kundaliApi.matchReport(payload);
      const data = res.data?.data || res.data;
      setMatchResult(data);
    } catch (e) {
      console.warn('[Astro Tools] Matching Failed:', e.message);
    }
    setAstroLoading(false);
  };

  const shareToChat = (text) => {
    if (!text) return;
    setNewMsg(text);
    handleSend();
    setShowAstroTools(false);
    Alert.alert('✅ Shared', 'Report shared with customer');
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
        ? colors.success      // green = read
        : colors.textSecondary;
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
          {!isDone && (
            <TouchableOpacity 
              style={styles.astroToolBtn} 
              onPress={() => {
                setShowAstroTools(true);
                if (!kundaliData) fetchQuickKundali();
              }}
            >
              <Text style={{ fontSize: 20 }}>🔮</Text>
            </TouchableOpacity>
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

          {/* ── Astro Workspace (Inline) ──────────────────────────────────── */}
          {showAstroTools && !isDone && (
            <View style={styles.astroWorkspaceInline}>
              <View style={styles.astroWorkspaceContent}>
                {astroLoading ? (
                  <View style={styles.astroCenter}>
                    <ActivityIndicator color={colors.goldDark} />
                  </View>
                ) : (
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {activeTool === 'Kundali' && (
                      <View>
                        <View style={styles.kundaliSubTabs}>
                          {['Basic', 'Planets', 'Dasha'].map(st => (
                            <TouchableOpacity 
                              key={st} 
                              style={[styles.kundaliSubTab, kundaliSubTab === st && styles.kundaliSubTabActive]}
                              onPress={() => setKundaliSubTab(st)}
                            >
                              <Text style={[styles.kundaliSubTabText, kundaliSubTab === st && styles.kundaliSubTabTextActive]}>{st}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <View style={{ padding: 12 }}>
                          {kundaliSubTab === 'Basic' && (
                            <View>
                              <Text style={styles.astroCardTitleMini}>Birth Panchang</Text>
                              <View style={styles.astroQuickInfo}>
                                <DetailItem label="Tithi" value={kundaliData?.panchang?.tithi} />
                                <DetailItem label="Karan" value={kundaliData?.panchang?.karan} />
                                <DetailItem label="Yog" value={kundaliData?.panchang?.yog} />
                                <DetailItem label="Nakshatra" value={kundaliData?.nakshatra} />
                                <DetailItem label="Sunrise" value={kundaliData?.panchang?.sunrise} />
                                <DetailItem label="Sunset" value={kundaliData?.panchang?.sunset} />
                              </View>
                              <TouchableOpacity style={styles.shareReportBtnMini} onPress={() => shareToChat(`Kundali Basic Detail:\nTithi: ${kundaliData?.panchang?.tithi}\nNakshatra: ${kundaliData?.nakshatra}\nRashi: ${kundaliData?.rashi}`)}>
                                <Text style={styles.shareReportTextMini}>Share Basic Details</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {kundaliSubTab === 'Planets' && (
                            <View>
                               <Text style={styles.astroCardTitleMini}>Planet Positions</Text>
                               <View style={styles.planetsTable}>
                                  {kundaliData?.planets?.slice(0, 10).map((p, idx) => (
                                    <View key={idx} style={styles.planetRow}>
                                       <Text style={styles.planetName}>{p.name}</Text>
                                       <Text style={styles.planetDegree}>{p.fullDegree?.toFixed(2)}°</Text>
                                       <Text style={styles.planetRashi}>{p.rasi?.substring(0,3)}</Text>
                                    </View>
                                  ))}
                               </View>
                               <TouchableOpacity style={styles.shareReportBtnMini} onPress={() => shareToChat(`I've checked your planet positions. Your Moon is at ${kundaliData?.planets?.find(p=>p.name==='Moon')?.fullDegree?.toFixed(2)}° in ${kundaliData?.rashi}.`)}>
                                 <Text style={styles.shareReportTextMini}>Share Planet Summary</Text>
                               </TouchableOpacity>
                            </View>
                          )}

                          {kundaliSubTab === 'Dasha' && (
                            <View>
                               <Text style={styles.astroCardTitleMini}>Vimshottari Mahadasha</Text>
                               <View style={styles.dashaList}>
                                  {kundaliData?.dasha?.slice(0, 5).map((d, idx) => (
                                    <View key={idx} style={styles.dashaRow}>
                                       <Text style={styles.dashaLord}>{d.planet}</Text>
                                       <Text style={styles.dashaDate}>{formatDashaDate(d.start)} - {formatDashaDate(d.end)}</Text>
                                    </View>
                                  ))}
                               </View>
                               <TouchableOpacity style={styles.shareReportBtnMini} onPress={() => shareToChat(`Current Dasha Analysis: You are currently in ${kundaliData?.dasha?.[0]?.planet} Mahadasha until ${formatDashaDate(kundaliData?.dasha?.[0]?.end)}.`)}>
                                 <Text style={styles.shareReportTextMini}>Share Dasha Detail</Text>
                               </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                    {activeTool === 'Matching' && (
                      <View style={{ padding: 12 }}>
                        {!matchResult ? (
                          <View>
                            <Text style={styles.toolSubTitle}>Enter Partner Details</Text>
                            <TextInput 
                              style={styles.astroInputMini} 
                              placeholder="Name" 
                              value={matchForm.name} 
                              onChangeText={v => setMatchForm(p => ({ ...p, name: v }))} 
                            />
                            <TextInput 
                              style={styles.astroInputMini} 
                              placeholder="DOB (YYYY-MM-DD)" 
                              value={matchForm.dob} 
                              onChangeText={v => setMatchForm(p => ({ ...p, dob: v }))} 
                            />
                            <TextInput 
                              style={styles.astroInputMini} 
                              placeholder="Time (HH:MM:SS)" 
                              value={matchForm.time} 
                              onChangeText={v => setMatchForm(p => ({ ...p, time: v }))} 
                            />
                            <TouchableOpacity style={styles.matchSubmitBtnMini} onPress={handleMatch}>
                               <Text style={styles.matchSubmitTextMini}>Calculate Match Score</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View>
                             <View style={styles.matchResultHeader}>
                               <Text style={styles.matchScoreTextMini}>{matchResult.totalPoints || 0} / 36</Text>
                               <Text style={styles.matchPointsLabel}>Guna Milan Points</Text>
                             </View>
                             <Text style={styles.matchConclusionMini}>{matchResult.conclusion || 'Compatibility analysis complete.'}</Text>
                             <TouchableOpacity 
                                style={styles.shareReportBtnMini} 
                                onPress={() => shareToChat(`Kundali Matching Report:\n❤️ Compatibility Score: ${matchResult.totalPoints}/36\n📝 Conclusion: ${matchResult.conclusion}\nThis score reflects your overall Guna Milan compatibility.`)}
                             >
                               <Text style={styles.shareReportTextMini}>📤 Share Match Result</Text>
                             </TouchableOpacity>
                             <TouchableOpacity onPress={() => setMatchResult(null)} style={{ marginTop: 12 }}>
                               <Text style={{ color: colors.goldDark, textAlign: 'center', fontSize: 12, fontWeight: '700' }}>Reset & Try Another</Text>
                             </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    )}

                    {activeTool === 'Horoscope' && (
                      <View style={{ padding: 12 }}>
                         <Text style={styles.astroCardTitleMini}>Daily Horoscope: {dailyHoro?.signName || 'Rashi'}</Text>
                         {dailyHoro ? (
                           <>
                             <Text style={styles.horoTextMini}>{dailyHoro.prediction || dailyHoro.horoscope || 'Prediction loading...'}</Text>
                             <TouchableOpacity 
                               style={styles.shareReportBtnMini} 
                               onPress={() => shareToChat(`Daily Horoscope for ${dailyHoro.signName}:\n🔮 Insight: ${dailyHoro.prediction || dailyHoro.horoscope}\nHave a blessed day!`)}
                             >
                               <Text style={styles.shareReportTextMini}>📤 Share Horoscope</Text>
                             </TouchableOpacity>
                           </>
                         ) : (
                           <Text style={styles.emptyAstroText}>No prediction data available.</Text>
                         )}
                      </View>
                    )}
                  </ScrollView>
                )}
              </View>
            </View>
          )}

          {/* ── Input ────────────────────────────────────────────────────── */}
          {!isDone && (
            <View style={styles.inputAreaWrap}>
              <View style={styles.inputRow}>
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

              {/* ── Astro Workspace Bar ──────────────────────────────────── */}
              {showAstroTools && (
                <View style={styles.astroToolBar}>
                  <View style={styles.toolTabsMini}>
                    {['Kundali', 'Matching', 'Horoscope'].map(t => (
                      <TouchableOpacity 
                        key={t} 
                        style={[styles.toolTabMini, activeTool === t && styles.toolTabActiveMini]}
                        onPress={() => {
                          setActiveTool(t);
                          if (t === 'Horoscope' && !dailyHoro) fetchHoroscope();
                        }}
                      >
                        <Text style={[styles.toolTabTextMini, activeTool === t && styles.toolTabTextActiveMini]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity onPress={() => setShowAstroTools(false)} style={styles.closeToolBtn}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
              )}
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
    backgroundColor: colors.gold,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleReceived: {
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  bubbleText:         { color: colors.text, fontSize: 14 },
  bubbleTextReceived: { color: colors.text },
  bubbleFooter:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 3 },
  bubbleTime:         { color: colors.textSecondary, fontSize: 10, opacity: 0.7 },
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
    flex: 1, backgroundColor: colors.white,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    color: colors.text, fontSize: 14, maxHeight: 100,
    borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnText: { color: colors.text, fontSize: 18, marginLeft: 2, fontWeight: '800' },

  doneBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 12, paddingHorizontal: 16, alignItems: 'center',
  },
  doneBarText: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },

  // ── Puja Modal ─────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: colors.surface,
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
  pujaItemBtn:      { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  pujaItemBtnText:  { color: colors.text, fontWeight: '700', fontSize: 13 },
  modalClose: {
    marginTop: 16, backgroundColor: colors.surface,
    borderRadius: 12, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  modalCloseText: { color: colors.text, fontWeight: '700', fontSize: 14 },

  // ── Astro Tools Styles ─────────────────────────────────────────────────────
  astroToolBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.goldBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.borderGold,
  },
  astroModalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  toolTabs: { flex: 1, flexDirection: 'row', gap: 8, paddingLeft: 8 },
  toolTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  toolTabActive: { backgroundColor: colors.goldBg },
  toolTabText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  toolTabTextActive: { color: colors.goldDark },
  astroCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  astroLoadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14 },
  astroDataCard: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  astroCardTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  chartPlaceholder: { height: 120, backgroundColor: colors.surface, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
  shareReportBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  shareReportText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  astroDetailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  astroDetailLabel: { color: colors.textSecondary, fontSize: 13 },
  astroDetailValue: { color: colors.text, fontSize: 13, fontWeight: '700' },
  astroInput: { backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 10, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  matchSubmitBtn: { backgroundColor: colors.text, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  matchSubmitText: { color: colors.white, fontWeight: '800' },
  matchScoreText: { fontSize: 24, fontWeight: '900', color: colors.goldDark, textAlign: 'center', marginVertical: 10 },
  matchConclusion: { color: colors.textSecondary, textAlign: 'center', fontSize: 13, fontStyle: 'italic', marginBottom: 16 },
  horoText: { color: colors.text, fontSize: 14, lineHeight: 22, marginBottom: 16 },

  // ── Integrated Workspace Styles ──────────────────────────────────────────
  inputAreaWrap: {
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  astroWorkspaceInline: {
    backgroundColor: colors.primary,
    borderTopWidth: 1, borderTopColor: colors.border,
    height: 320, // Increased height for full detail
  },
  astroWorkspaceContent: { flex: 1 },
  kundaliSubTabs: {
    flexDirection: 'row', backgroundColor: colors.surface,
    paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  kundaliSubTab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
  kundaliSubTabActive: { backgroundColor: colors.gold + '20' },
  kundaliSubTabText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  kundaliSubTabTextActive: { color: colors.goldDark },

  planetsTable: { backgroundColor: colors.white, borderRadius: 12, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  planetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  planetName: { flex: 1, color: colors.text, fontSize: 12, fontWeight: '700' },
  planetDegree: { flex: 1, color: colors.textSecondary, fontSize: 11, textAlign: 'center' },
  planetRashi: { flex: 0.5, color: colors.goldDark, fontSize: 11, fontWeight: '800', textAlign: 'right' },

  dashaList: { backgroundColor: colors.white, borderRadius: 12, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  dashaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + '50' },
  dashaLord: { color: colors.text, fontSize: 12, fontWeight: '700' },
  dashaDate: { color: colors.textSecondary, fontSize: 11 },
  astroToolBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  toolTabsMini: { flex: 1, flexDirection: 'row', gap: 6 },
  toolTabMini: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  toolTabActiveMini: { backgroundColor: colors.goldBg },
  toolTabTextMini: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  toolTabTextActiveMini: { color: colors.goldDark },
  closeToolBtn: { padding: 4 },
  
  astroCardTitleMini: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  chartPlaceholderMini: { height: 70, backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border },
  quickStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  quickStatBox: { flex: 1, alignItems: 'center' },
  quickStatLabel: { color: colors.textMuted, fontSize: 10 },
  quickStatValue: { color: colors.text, fontSize: 11, fontWeight: '700' },
  shareReportBtnMini: { backgroundColor: colors.gold, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  shareReportTextMini: { color: colors.text, fontSize: 11, fontWeight: '800' },
  astroInputMini: { backgroundColor: colors.white, borderRadius: 8, padding: 8, marginBottom: 6, color: colors.text, fontSize: 12, borderWidth: 1, borderColor: colors.border },
  matchSubmitBtnMini: { backgroundColor: colors.text, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  matchSubmitTextMini: { color: colors.white, fontSize: 12, fontWeight: '800' },
  matchScoreTextMini: { fontSize: 20, fontWeight: '900', color: colors.goldDark, textAlign: 'center', marginVertical: 4 },
  matchConclusionMini: { color: colors.textSecondary, textAlign: 'center', fontSize: 11, fontStyle: 'italic', marginBottom: 8 },
  horoTextMini: { color: colors.text, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  astroQuickInfo: { backgroundColor: colors.white, borderRadius: 12, padding: 8, marginBottom: 10, borderWidth: 1, borderColor: colors.borderGold + '40' },
  toolSubTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  matchResultHeader: { alignItems: 'center', marginBottom: 8 },
  matchPointsLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  emptyAstroText: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 20 },
});

const QuickStat = ({ label, value }) => (
  <View style={styles.quickStatBox}>
    <Text style={styles.quickStatLabel}>{label}</Text>
    <Text style={styles.quickStatValue}>{value || '-'}</Text>
  </View>
);

const DetailItem = ({ label, value }) => (
  <View style={styles.astroDetailRow}>
    <Text style={styles.astroDetailLabel}>{label}</Text>
    <Text style={styles.astroDetailValue}>{value || 'N/A'}</Text>
  </View>
);
