// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function AdminFinanceScreen() {
  const router = useRouter();
  const { users } = useAppStore();
  const [allTransactions, setAllTransactions] = useState([]);

  // Lắng nghe toàn bộ giao dịch để tính toán số dư thực tế
  useEffect(() => {
    const q = query(collection(db, 'transactions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAllTransactions(snapshot.docs.map(doc => doc.data()));
    });
    return () => unsubscribe();
  }, []);

  const shippers = users.filter(u => u.role === 'shipper').map(s => {
    // Tính toán logic: 
    // Trong DB: nợ là dương.
    // Hiển thị: Giữ nguyên số dương khi Shipper nợ Admin, đảo dấu thành âm khi Admin nợ Shipper.
    const rawDebt = allTransactions
        .filter(t => t.userId === s.id)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Nếu rawDebt dương: Shipper nợ Admin -> Hiển thị số dương (+) màu cam
    // Nếu rawDebt âm: Admin nợ Shipper -> Hiển thị số âm (-) màu xanh
    return { ...s, currentDebt: rawDebt };
  });

  const renderShipper = ({ item }) => (
    <TouchableOpacity 
        style={styles.userCard}
        onPress={() => router.push({ 
            pathname: '/admin/shipper-detail-finance', 
            params: { shipperId: item.id, name: item.name } 
        })}
    >
        <View style={styles.avatar}><Text style={styles.avatarText}>{item.name ? item.name[0] : 'S'}</Text></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
            {/* Logic màu sắc: Nợ Admin (>0) màu Cam, Admin nợ (<0) màu Xanh */}
            <Text style={[styles.money, { color: item.currentDebt >= 0 ? '#E67E22' : '#27AE60' }]}>
                {item.currentDebt > 0 ? '+' : ''}{(item.currentDebt * 1000).toLocaleString()}đ
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
        </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={GlobalStyles.container}>
       <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} /></TouchableOpacity>
        <Text style={styles.title}>Tài chính Shipper</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={shippers}
        keyExtractor={item => item.id.toString()}
        renderItem={renderShipper}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={<Text style={{textAlign: 'center', color: '#999', marginTop: 20}}>Không có shipper nào</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', alignItems: 'center' },
    title: { fontSize: 18, fontWeight: 'bold' },
    userCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, marginBottom: 10, borderRadius: 15, alignItems: 'center', elevation: 2 },
    avatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    name: { fontWeight: 'bold', fontSize: 15 },
    phone: { fontSize: 12, color: '#999' },
    money: { fontWeight: 'bold', fontSize: 16, marginBottom: 4 }
});