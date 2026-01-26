// @ts-nocheck
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function ShipperFinanceScreen() {
  const router = useRouter();
  const { currentUser, isGuest, guestId } = useAppStore();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const targetId = currentUser?.id || (isGuest ? guestId : null);
    if (!targetId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', targetId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
      setLoading(false);
    }, (error) => {
      console.error("Lỗi Firestore:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser?.id, isGuest, guestId]);

  // LOGIC CỐT LÕI: 
  // Trong DB: nợ là dương. 
  // Để hiển thị: Đảo ngược lại để Shipper nợ Admin là SỐ ÂM.
  const rawBalance = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const displayBalance = rawBalance * -1; // Đảo dấu: Nợ Admin thành số âm

  const renderItem = ({ item }) => {
    // Mỗi giao dịch cũng đảo dấu để nhất quán: Thu nhập (+) / Nợ (-)
    const displayAmount = (item.amount || 0) * -1;
    const isDebtToAdmin = displayAmount < 0; 
    
    return (
      <View style={styles.itemRow}>
        <View style={[styles.iconBox, { backgroundColor: isDebtToAdmin ? '#FFF4E5' : '#EAFAF1' }]}>
          <MaterialCommunityIcons 
              name={isDebtToAdmin ? 'receipt' : 'cash-check'} 
              size={20} 
              color={isDebtToAdmin ? '#E67E22' : '#27AE60'} 
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.desc}>
            {item.type === 'DEBT' ? `Đơn #${item.orderId || item.id}` : item.desc}
          </Text>
          {item.customerName && (
            <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Khách: {item.customerName}</Text>
          )}
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
        </View>
        <Text style={[styles.amountText, { color: isDebtToAdmin ? '#E67E22' : '#27AE60' }]}>
          {displayAmount > 0 ? '+' : ''}{(displayAmount * 1000).toLocaleString()}đ
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{marginTop: 10, color: '#999'}}>Đang nạp dữ liệu...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Ví Công Nợ</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Hiển thị số âm khi nợ Admin, số dương khi có tiền dư */}
      <View style={[styles.balanceCard, { backgroundColor: displayBalance < 0 ? '#E67E22' : '#27AE60' }]}>
        <Text style={styles.balanceLabel}>Số dư ví hiện tại</Text>
        <Text style={styles.balanceValue}>
            {(displayBalance * 1000).toLocaleString()}đ
        </Text>
        <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
                {displayBalance < 0 ? 'BẠN ĐANG NỢ ADMIN' : 'ADMIN ĐANG NỢ BẠN'}
            </Text>
        </View>
      </View>

      <Text style={styles.listTitle}>Lịch sử biến động</Text>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Chưa có lịch sử giao dịch</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold' },
  balanceCard: { margin: 15, padding: 30, borderRadius: 25, alignItems: 'center', elevation: 5 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  balanceValue: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginVertical: 10 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  listTitle: { marginLeft: 20, fontSize: 15, fontWeight: 'bold', color: '#666', marginBottom: 5 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  iconBox: { width: 45, height: 45, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  desc: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  dateText: { fontSize: 11, color: '#BBB', marginTop: 4 },
  amountText: { fontWeight: 'bold', fontSize: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999', fontStyle: 'italic' }
});