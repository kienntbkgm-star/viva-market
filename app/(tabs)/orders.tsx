// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // Thêm router
import { arrayUnion, collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

const formatCurrency = (val) => {
  if (!val) return '0';
  return (val * 1000).toLocaleString('vi-VN');
};

// Tính realtime từ items array
const calculateOrderTotals = (order) => {
  if (!order.items || order.items.length === 0) {
    return { totalFood: 0, shopCount: 0, extraStepFee: 0, finalTotal: 0 };
  }
  
  // Filter active items only
  const activeItems = order.items.filter(item => !item.itemStatus || item.itemStatus === 'active');
  
  // Calculate totalFood from active items
  const totalFood = activeItems.reduce((sum, item) => {
    const basePrice = item.pricePromo || 0;
    const optionsPrice = (item.selectedOptions || []).reduce((s, opt) => s + (opt.price || 0), 0);
    return sum + (basePrice + optionsPrice) * item.quantity;
  }, 0);
  
  // Calculate shop count from active items
  const shopIds = new Set(activeItems.map(item => item.shopId));
  const shopCount = shopIds.size;
  
  // Calculate extraStepFee from multiShopFee rate
  const multiShopFee = order.multiShopFee || 0;
  const extraStepFee = shopCount > 1 ? (shopCount - 1) * multiShopFee : 0;
  
  // Calculate finalTotal
  const baseShip = order.baseShip || 0;
  const discount = order.discount || 0;
  const finalTotal = totalFood + baseShip + extraStepFee - discount;
  
  return { totalFood, shopCount, extraStepFee, finalTotal };
};

const getStatusColor = (status) => {
  const s = status?.toLowerCase();
  switch (s) {
    case 'pending': 
    case 'pendding': return '#F39C12'; 
    case 'confirmed': return '#3498DB';
    case 'shipping': return '#9B59B6';
    case 'completed': return '#27AE60';
    case 'cancelled': return '#E74C3C'; 
    default: return '#7F8C8D';
  }
};

const getStatusText = (status) => {
  const s = status?.toLowerCase();
  switch (s) {
    case 'pending': 
    case 'pendding': return 'Chờ xác nhận';
    case 'confirmed': return 'Đang chuẩn bị';
    case 'shipping': return 'Đang giao hàng';
    case 'completed': return 'Đã hoàn thành';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
};

export default function OrdersScreen() {
  const { currentUser } = useAppStore();
  const router = useRouter(); // Khởi tạo router
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const targetId = currentUser?.id;

    if (!targetId) {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }

    setLoading(true);
    try {
      // Query foodOrders
      const qFood = query(
        collection(db, 'foodOrders'),
        where('userId', '==', targetId),
        orderBy('createdAt', 'desc')
      );

      // Query serviceOrders
      const qService = query(
        collection(db, 'serviceOrders'),
        where('userId', '==', targetId),
        orderBy('createdAt', 'desc')
      );

      let foodData = [];
      let serviceData = [];

      // Listen to foodOrders
      const unsubscribeFood = onSnapshot(qFood, (snapshot) => {
        foodData = snapshot.docs.map(doc => ({
          id: doc.id,
          type: 'food',
          ...doc.data()
        }));
        mergeAndSetOrders();
      }, (error) => {
        console.error("Firestore Error (foodOrders):", error);
        setLoading(false);
      });

      // Listen to serviceOrders
      const unsubscribeService = onSnapshot(qService, (snapshot) => {
        serviceData = snapshot.docs.map(doc => ({
          id: doc.id,
          type: 'service',
          ...doc.data()
        }));
        mergeAndSetOrders();
      }, (error) => {
        console.error("Firestore Error (serviceOrders):", error);
        setLoading(false);
      });

      // Merge and sort both lists
      const mergeAndSetOrders = () => {
        const merged = [...foodData, ...serviceData];
        
        const sortedData = merged.sort((a, b) => {
          const priority = { 'pending': 1, 'pendding': 1, 'confirmed': 2, 'shipping': 3, 'completed': 4, 'cancelled': 5 };
          const pA = priority[a.status?.toLowerCase()] || 99;
          const pB = priority[b.status?.toLowerCase()] || 99;
          if (pA !== pB) return pA - pB;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        setOrders(sortedData);
        setLoading(false);
      };

      return () => {
        unsubscribeFood();
        unsubscribeService();
      };
    } catch (err) {
      console.error("Query Error:", err);
      setLoading(false);
    }
  }, [currentUser?.id]);

  const handleCancelOrder = (order) => {
    const s = order.status?.toLowerCase();
    if (s !== 'pending' && s !== 'pendding') return;

    const confirmMsg = "Bạn có chắc muốn hủy đơn này?";
    const proceedCancel = async () => {
      try {
        // Determine collection based on order type
        const collectionName = order.type === 'service' ? 'serviceOrders' : 'foodOrders';
        const orderRef = doc(db, collectionName, order.id);
        await updateDoc(orderRef, {
          status: 'cancelled',
          logs: arrayUnion({
            time: new Date().toISOString(),
            content: currentUser ? "Người dùng đã hủy đơn hàng" : "Khách vãng lai đã hủy đơn hàng",
            status: 'cancelled'
          })
        });
      } catch (error) {
        console.error("Cancel Error:", error);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) proceedCancel();
    } else {
      Alert.alert("Xác nhận", confirmMsg, [
        { text: "Quay lại", style: "cancel" },
        { text: "Hủy đơn", style: "destructive", onPress: proceedCancel }
      ]);
    }
  };

  const renderOrderItem = ({ item }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons 
              name={item.type === 'service' ? 'build' : 'fast-food'} 
              size={16} 
              color={item.type === 'service' ? '#9B59B6' : '#E67E22'} 
              style={{ marginRight: 6 }}
            />
            <Text style={styles.orderIdText}>Mã đơn: {item.orderId || String(item.id).substring(0,8)}</Text>
          </View>
          {(item.status?.toLowerCase() === 'pending' || item.status?.toLowerCase() === 'pendding') && (
            <TouchableOpacity onPress={() => handleCancelOrder(item)} style={styles.smallCancelBtn}>
              <Text style={styles.smallCancelText}>Hủy</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.orderTimeText}>
           {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'Không rõ thời gian'}
        </Text>
      </View>

      <View style={{ marginBottom: 10 }}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status), alignSelf: 'flex-start' }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      {/* Render different content for service vs food */}
      {item.type === 'service' ? (
        <View style={styles.itemSection}>
          <Text style={styles.foodNameText} numberOfLines={2}>
            🔧 {item.serviceName || 'Dịch vụ'}
          </Text>
          {item.note && (
            <Text style={styles.noteText} numberOfLines={2}>
              Ghi chú: {item.note}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.itemSection}>
          {item.items?.map((food, idx) => (
            <Text key={idx} style={styles.foodNameText} numberOfLines={1}>
              • {food.name} x{food.quantity}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.priceSection}>
        {item.type === 'service' ? (
          // Service order pricing
          <>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Giá dịch vụ:</Text>
              <Text>{formatCurrency(item.price / 1000)}đ</Text>
            </View>
            <View style={[styles.priceRow, {marginTop: 5}]}>
              <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
              <Text style={styles.totalValueText}>{formatCurrency(item.price / 1000)}đ</Text>
            </View>
          </>
        ) : (
          // Food order pricing
          (() => {
            const { totalFood, shopCount, extraStepFee, finalTotal } = calculateOrderTotals(item);
            return (
              <>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Tiền món:</Text>
                  <Text>{formatCurrency(totalFood)}đ</Text>
                </View>
                
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Phí vận chuyển gốc:</Text>
                  <Text>{formatCurrency(item.baseShip || 0)}đ</Text>
                </View>

                {(extraStepFee > 0) && (
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Phí thêm shop (+{shopCount - 1} shop):</Text>
                    <Text>+{formatCurrency(extraStepFee)}đ</Text>
                  </View>
                )}

                {item.discount > 0 && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceLabel, {color: 'green'}]}>Giảm giá:</Text>
                    <Text style={{color: 'green'}}>-{formatCurrency(item.discount)}đ</Text>
                  </View>
                )}
                <View style={[styles.priceRow, {marginTop: 5}]}>
                  <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
                  <Text style={styles.totalValueText}>{formatCurrency(finalTotal)}đ</Text>
                </View>
              </>
            );
          })()
        )}
      </View>

      <View style={styles.logSection}>
        <Text style={styles.logTitle}>Hành trình đơn hàng:</Text>
        {item.logs?.map((log, index) => (
          <View key={index} style={styles.logItem}>
            <View style={[styles.logDot, { backgroundColor: log.status === 'pending' || log.status === 'pendding' ? '#F39C12' : (log.status === 'cancelled' ? '#E74C3C' : (log.status === 'completed' ? '#27AE60' : '#ccc')) }]} />
            <View style={styles.logContent}>
              <Text style={styles.logTime}>{new Date(log.time).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</Text>
              <Text style={styles.logMsg}>{log.content}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{marginTop: 10, color: '#666'}}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={GlobalStyles.container}>
      {/* Cập nhật Header có nút Back */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="receipt-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>Bạn chưa có đơn hàng nào</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  backBtn: { 
    marginRight: 15 
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold' 
  },
  orderCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  orderHeader: { marginBottom: 10 },
  orderIdText: { fontWeight: 'bold', fontSize: 13, color: '#333' },
  orderTimeText: { fontSize: 11, color: '#999', marginTop: 2 },
  smallCancelBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#E74C3C' },
  smallCancelText: { color: '#E74C3C', fontSize: 11, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  itemSection: { borderBottomWidth: 1, borderColor: '#f0f0f0', paddingVertical: 8 },
  foodNameText: { fontSize: 13, color: '#555', marginBottom: 2 },
  noteText: { fontSize: 11, color: '#999', marginTop: 4, fontStyle: 'italic' },
  priceSection: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  priceLabel: { fontSize: 12, color: '#777' },
  totalLabel: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  totalValueText: { fontWeight: 'bold', fontSize: 16, color: COLORS.primary },
  logSection: { marginTop: 15, paddingTop: 10 },
  logTitle: { fontSize: 12, fontWeight: 'bold', color: '#444', marginBottom: 10 },
  logItem: { flexDirection: 'row', marginBottom: 12 },
  logDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, marginRight: 12 },
  logContent: { flex: 1 },
  logTime: { fontSize: 10, color: '#999' },
  logMsg: { fontSize: 12, color: '#666' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  emptyBox: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 }
});