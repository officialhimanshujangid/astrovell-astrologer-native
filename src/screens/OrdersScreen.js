import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import ChatHistoryScreen from './ChatHistoryScreen';
import CallHistoryScreen from './CallHistoryScreen';
import PujaOrdersScreen from './PujaOrdersScreen';

const OrdersScreen = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'Chat': return <ChatHistoryScreen isSubScreen={true} />;
      case 'Call': return <CallHistoryScreen isSubScreen={true} />;
      case 'AstroMall': return <PujaOrdersScreen isSubScreen={true} />;
      default: return <View style={styles.centered}><Text>Coming Soon</Text></View>;
    }
  };

  const TabItem = ({ label }) => (
    <TouchableOpacity 
      style={[styles.tabItem, activeTab === label && styles.activeTabItem]}
      onPress={() => setActiveTab(label)}
    >
      <Text style={[styles.tabLabel, activeTab === label && styles.activeTabLabel]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Orders</Text>
      </View>

      <View style={styles.tabBar}>
        <TabItem label="WaitList" />
        <TabItem label="Chat" />
        <TabItem label="Call" />
        <TabItem label="AstroMall" />
      </View>

      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={30} color={colors.white} />
        <Text style={styles.fabText}>Create default message</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OrdersScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  customHeader: { backgroundColor: '#fb9494', paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { color: colors.white, fontSize: 22, fontWeight: '500' },
  tabBar: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  activeTabItem: { borderBottomWidth: 2, borderBottomColor: '#fb9494' },
  tabLabel: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  activeTabLabel: { color: colors.text, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fab: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: '#fb9494', borderRadius: 12, height: 56,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 8,
  },
  fabText: { color: colors.white, fontSize: 16, fontWeight: '700', marginLeft: 8 },
});
