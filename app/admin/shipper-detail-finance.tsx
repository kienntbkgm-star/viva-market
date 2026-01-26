// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../src/services/firebase';
import { GlobalStyles } from '../../src/styles/GlobalStyles';

export default function ShipperDetailFinance() {
  const router = useRouter();
  const { shipperId, name } = useLocalSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [payAmount, setPayAmount] = useState('');

  useEffect(() => {
    if (!shipperId) return;

    // SỬA ĐỔI: Bỏ 'orderBy' trong query để tránh lỗi thiếu Index của Firestore
    // Chúng ta chỉ lọc theo userId, sau đó sẽ sắp xếp bằng Javascript bên dưới
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', Number(shipperId))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 1. Lấy dữ liệu về
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 2. Sắp xếp ngay tại đây (Mới nhất lên đầu)
      // Cách này an toàn tuyệt đối, không lo Firestore chặn
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setTransactions(data);
    });
    return () => unsubscribe();
  }, [shipperId]);

  const totalBalance = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

  const handleCollectMoney = async () => {
    // Kiểm tra đầu vào
    if (!payAmount || isNaN(payAmount)) {
        const msg = "Vui lòng nhập số tiền hợp lệ";
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert("Lỗi", msg);
        return;
    }

    try {
      const inputVal = Number(payAmount) / 1000;
      
      /**
       * LOGIC TỰ ĐỘNG ĐẢO DẤU:
       * - Nếu balance > 0 (Shipper nợ): Cần nạp số ÂM để giảm nợ.
       * - Nếu balance < 0 (Admin nợ): Cần nạp số DƯƠNG để giảm nợ.
       */
      const finalAmount = totalBalance >= 0 ? -inputVal : inputVal;

      await addDoc(collection(db, 'transactions'), {
        userId: Number(shipperId), // Đảm bảo lưu dạng Số để khớp với query
        userName: name,
        type: 'PAYMENT',
        // Làm tròn 3 chữ số thập phân để triệt tiêu sai số JS
        amount: Math.round(finalAmount * 1000) / 1000,
        desc: totalBalance >= 0 ? `Admin thu tiền mặt` : `Admin trả tiền bù (Voucher/Ship)`,
        createdAt: new Date().toISOString(),
        performedBy: 'admin'
      });

      setPayAmount('');
      
      const successMsg = "Đã cập nhật giao dịch tài chính thành công";
      if (Platform.OS === 'web') window.alert(successMsg);
      else Alert.alert("Thành công", successMsg);

    } catch (e) { 
      const errorMsg = "Không thể ghi nhận giao dịch";
      if (Platform.OS === 'web') window.alert(errorMsg);
      else Alert.alert("Lỗi", errorMsg);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.desc}>{item.desc}</Text>
        {item.orderId && <Text style={styles.debugId}>FULL ID: {item.orderId}</Text>}
        <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
      </View>
      <Text style={[styles.amount, { color: item.amount >= 0 ? '#E67E22' : '#27AE60' }]}>
        {item.amount >= 0 ? '+' : ''}{(item.amount * 1000).toLocaleString()}đ
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} /></TouchableOpacity>
        <Text style={styles.title}>Lịch sử nợ: {name}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Số dư nợ hiện tại (Dương: Shipper nợ | Âm: Admin nợ)</Text>
        <Text style={[styles.summaryValue, { color: totalBalance >= 0 ? '#E67E22' : '#27AE60' }]}>
            {(totalBalance * 1000).toLocaleString()}đ
        </Text>
      </View>

      <View style={styles.collectBox}>
        <TextInput 
            style={styles.input} 
            placeholder="Nhập số tiền mặt giao nhận" 
            keyboardType="numeric" 
            value={payAmount}
            onChangeText={setPayAmount}
        />
        <TouchableOpacity 
            style={[styles.collectBtn, { backgroundColor: totalBalance >= 0 ? '#E67E22' : '#27AE60' }]} 
            onPress={handleCollectMoney}
        >
            <Text style={styles.collectBtnText}>
                {totalBalance >= 0 ? 'THU NỢ' : 'TRẢ TIỀN'}
            </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: 'bold' },
  summary: { padding: 20, alignItems: 'center', backgroundColor: '#F8F9FA' },
  summaryLabel: { color: '#999', fontSize: 10, marginBottom: 5 },
  summaryValue: { fontSize: 28, fontWeight: 'bold' },
  collectBox: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', gap: 10, borderBottomWidth: 1, borderColor: '#EEE' },
  input: { flex: 1, backgroundColor: '#F2F2F2', padding: 12, borderRadius: 10 },
  collectBtn: { justifyContent: 'center', paddingHorizontal: 20, borderRadius: 10 },
  collectBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  itemRow: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F9F9F9', alignItems: 'center' },
  desc: { fontWeight: 'bold', fontSize: 14 },
  debugId: { fontSize: 10, color: '#BBB', marginTop: 2, fontFamily: 'monospace' },
  date: { fontSize: 11, color: '#999', marginTop: 4 },
  amount: { fontWeight: 'bold', fontSize: 15 }
});