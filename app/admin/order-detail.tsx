// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import React, { useMemo } from 'react';
import {
    Alert,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function AdminOrderDetailScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  
  const { foodOrders, users, currentUser } = useAppStore();
  
  const order = useMemo(() => 
    foodOrders.find(o => String(o.orderId) === String(orderId) || String(o.id) === String(orderId))
  , [orderId, foodOrders]);

  // Tính realtime từ items array
  const orderTotals = useMemo(() => {
    if (!order || !order.items || order.items.length === 0) {
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
  }, [order]);

  const shipperInfo = order?.shipperId ? users.find(u => String(u.id) === String(order.shipperId)) : null;

  const isAdmin = currentUser?.role === 'admin';

  // Hỗ trợ thông báo cho cả Web và Mobile
  const showAlert = (title, message, onPressOk) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`${title}: ${message}`);
      if (confirm) onPressOk();
    } else {
      Alert.alert(title, message, [
        { text: "Hủy", style: "cancel" },
        { text: "Đồng ý", onPress: onPressOk }
      ]);
    }
  };

  if (!order) {
    return (
      <SafeAreaView style={GlobalStyles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28}/></TouchableOpacity>
            <Text style={styles.headerTitle}>Lỗi</Text>
            <View style={{width: 28}}/>
        </View>
        <View style={styles.centered}><Text>Không tìm thấy đơn hàng</Text></View>
      </SafeAreaView>
    );
  }

  const updateStatus = async (newStatus, note, isReset = false) => {
    try {
      const orderRef = doc(db, 'foodOrders', order.id || order.orderId);
      const newLog = {
        content: note,
        status: newStatus,
        time: new Date().toISOString()
      };

      const updateData = {
        status: newStatus,
        logs: arrayUnion(newLog)
      };

      if (isReset) {
        updateData.shipperId = null; 
      }

      await updateDoc(orderRef, updateData);
      if (Platform.OS === 'web') window.alert("Thành công: Đã cập nhật đơn hàng");
      else Alert.alert("Thành công", "Đã cập nhật đơn hàng");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thực hiện thao tác");
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
        case 'pending': return 'CHỜ NHẬN';
        case 'processing': return 'ĐANG GIAO';
        case 'completed': return 'HOÀN THÀNH';
        case 'cancelled': return 'ĐÃ HỦY';
        default: return status?.toUpperCase();
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28}/></TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={{width: 28}}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 15 }}>
        {/* THÔNG TIN CHUNG & TRẠNG THÁI */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderIdText}>#{order.orderId}</Text>
            <Text style={[styles.statusText, { color: COLORS.primary }]}>{getStatusLabel(order.status)}</Text>
          </View>
          <Text style={styles.timeText}>{new Date(order.createdAt).toLocaleString('vi-VN')}</Text>
        </View>

        {/* THÔNG TIN KHÁCH HÀNG */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>KHÁCH HÀNG</Text>
          <Text style={styles.infoLine}><Ionicons name="person-outline" size={14} /> {order.userName}</Text>
          <Text style={styles.infoLine}><Ionicons name="call-outline" size={14} /> {order.userPhone}</Text>
          <Text style={styles.infoLine}><Ionicons name="location-outline" size={14} /> {order.address}</Text>
        </View>

        {/* THÔNG TIN SHIPPER */}
        {order.shipperId && (
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#27AE60' }]}>
            <Text style={styles.sectionTitle}>SHIPPER VẬN CHUYỂN</Text>
            {shipperInfo ? (
              <>
                <Text style={styles.infoLine}><Ionicons name="bicycle-outline" size={14} /> {shipperInfo.name}</Text>
                <Text style={styles.infoLine}><Ionicons name="call-outline" size={14} /> {shipperInfo.phone}</Text>
              </>
            ) : (
              <Text style={styles.infoLine}>ID Shipper: #{order.shipperId}</Text>
            )}
          </View>
        )}

        {/* DANH SÁCH MÓN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DANH SÁCH MÓN</Text>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.foodItem}>
              <Image source={{ uri: item.img }} style={styles.foodImg} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodQty}>x{item.quantity}</Text>
              </View>
              <Text style={styles.foodPrice}>{(item.pricePromo * 1000).toLocaleString()}đ</Text>
            </View>
          ))}
        </View>

        {/* CHI TIẾT THANH TOÁN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>CHI TIẾT THANH TOÁN</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.priceLabel}>Tiền món</Text>
            <Text style={styles.priceVal}>{(orderTotals.totalFood * 1000).toLocaleString()}đ</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.priceLabel}>Phí vận chuyển gốc</Text>
            <Text style={styles.priceVal}>{(order.baseShip * 1000).toLocaleString()}đ</Text>
          </View>
          {(orderTotals.extraStepFee > 0) && (
            <View style={styles.rowBetween}>
              <Text style={styles.priceLabel}>Phí thêm shop (+{orderTotals.shopCount - 1} shop)</Text>
              <Text style={styles.priceVal}>+{(orderTotals.extraStepFee * 1000).toLocaleString()}đ</Text>
            </View>
          )}
          {(order.discount > 0) && (
            <View style={styles.rowBetween}>
              <Text style={[styles.priceLabel, { color: '#E74C3C' }]}>Khuyến mãi</Text>
              <Text style={[styles.priceVal, { color: '#E74C3C' }]}>-{(order.discount * 1000).toLocaleString()}đ</Text>
            </View>
          )}
          <View style={[styles.rowBetween, { marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 }]}>
            <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
            <Text style={styles.totalVal}>{(orderTotals.finalTotal * 1000).toLocaleString()}đ</Text>
          </View>
        </View>

        {/* NHẬT KÝ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>NHẬT KÝ VẬN HÀNH</Text>
          {order.logs?.map((log, index) => (
            <View key={index} style={styles.logItem}>
              <View style={styles.logDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.logContent}>{log.content}</Text>
                <Text style={styles.logTime}>{new Date(log.time).toLocaleString('vi-VN')}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* NHÓM NÚT ĐIỀU KHIỂN - CHỈ DÀNH CHO ADMIN */}
        {isAdmin && order.status !== 'completed' && (
          <View style={styles.adminActions}>
            {(order.status !== 'pending' || order.shipperId) && (
              <TouchableOpacity 
                style={styles.btnReset} 
                onPress={() => showAlert("Xác nhận", "Reset đơn về trạng thái chờ và gỡ Shipper?", () => updateStatus('pending', 'Admin đã reset đơn hàng', true))}
              >
                <Ionicons name="refresh" size={18} color="#E67E22" />
                <Text style={styles.btnResetText}>RESET ĐƠN</Text>
              </TouchableOpacity>
            )}

            {order.status !== 'cancelled' && (
              <TouchableOpacity 
                style={styles.btnCancel} 
                onPress={() => showAlert("Xác nhận", "Bạn muốn hủy đơn này?", () => updateStatus('cancelled', 'Admin đã hủy đơn hàng'))}
              >
                <Ionicons name="close-circle-outline" size={18} color="#E74C3C" />
                <Text style={styles.btnCancelText}>HỦY ĐƠN</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 1 },
  orderIdText: { fontSize: 16, fontWeight: 'bold' },
  statusText: { fontSize: 14, fontWeight: 'bold' },
  timeText: { fontSize: 12, color: '#999', marginTop: 5 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary, paddingLeft: 10 },
  infoLine: { fontSize: 14, color: '#666', marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  foodItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  foodImg: { width: 45, height: 45, borderRadius: 8 },
  foodName: { fontSize: 14, fontWeight: '500' },
  foodQty: { fontSize: 12, color: '#999' },
  foodPrice: { fontSize: 14, fontWeight: 'bold' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  priceLabel: { fontSize: 14, color: '#666' },
  priceVal: { fontSize: 14, fontWeight: '500' },
  totalLabel: { fontSize: 15, fontWeight: 'bold' },
  totalVal: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  logItem: { flexDirection: 'row', marginBottom: 15 },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 5, marginRight: 15 },
  logContent: { fontSize: 13, color: '#333' },
  logTime: { fontSize: 11, color: '#999', marginTop: 2 },
  adminActions: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  btnReset: { flex: 1, flexDirection: 'row', gap: 5, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E67E22', alignItems: 'center', justifyContent: 'center' },
  btnResetText: { color: '#E67E22', fontWeight: 'bold' },
  btnCancel: { flex: 1, flexDirection: 'row', gap: 5, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E74C3C', alignItems: 'center', justifyContent: 'center' },
  btnCancelText: { color: '#E74C3C', fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});