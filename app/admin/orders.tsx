// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

// Tính finalTotal realtime từ items array
const calculateFinalTotal = (order) => {
  if (!order.items || order.items.length === 0) return 0;
  
  const activeItems = order.items.filter(item => !item.itemStatus || item.itemStatus === 'active');
  
  const totalFood = activeItems.reduce((sum, item) => {
    const basePrice = item.pricePromo || 0;
    const optionsPrice = (item.selectedOptions || []).reduce((s, opt) => s + (opt.price || 0), 0);
    return sum + (basePrice + optionsPrice) * item.quantity;
  }, 0);
  
  const shopIds = new Set(activeItems.map(item => item.shopId));
  const shopCount = shopIds.size;
  const multiShopFee = order.multiShopFee || 0;
  const extraStepFee = shopCount > 1 ? (shopCount - 1) * multiShopFee : 0;
  
  const baseShip = order.baseShip || 0;
  const discount = order.discount || 0;
  
  return totalFood + baseShip + extraStepFee - discount;
};

export default function AdminOrdersScreen() {
  const router = useRouter();
  const { foodOrders } = useAppStore();
  
  const [filterStatus, setFilterStatus] = useState('pending');

  const statusList = [
    { id: 'pending', label: 'Chờ nhận' },
    { id: 'processing', label: 'Đang giao' },
    { id: 'completed', label: 'Thành công' },
    { id: 'cancelled', label: 'Đã hủy' }
  ];

  // Hàm chuẩn hóa status
  const normalizeStatus = (status: any) => {
    if (!status) return 'pending';
    const s = String(status).toLowerCase().trim();
    return s === 'pendding' ? 'pending' : s;
  };

  // Hàm đếm số lượng đơn món ăn PENDING
  const getPendingCount = () => {
    return foodOrders.filter(order => normalizeStatus(order.status) === 'pending').length;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#E67E22';
      case 'processing': return '#3498DB';
      case 'completed': return '#27AE60';
      case 'cancelled': return '#E74C3C';
      default: return '#7F8C8D';
    }
  };

  // Lọc danh sách đơn món ăn theo status
  const filteredOrders = useMemo(() => {
    return foodOrders
      .filter(order => normalizeStatus(order.status) === filterStatus)
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.timeCreate || 0).getTime();
        const timeB = new Date(b.createdAt || b.timeCreate || 0).getTime();
        return timeB - timeA;
      });
  }, [foodOrders, filterStatus]);

  const renderOrderItem = ({ item }) => {
    const normalizedStatus = normalizeStatus(item.status);
    
    return (
    <TouchableOpacity 
      style={[styles.orderCard, { borderLeftWidth: 4, borderLeftColor: '#E67E22' }]}
      onPress={() => {
        router.push({ pathname: '/admin/order-detail', params: { orderId: item.orderId || item.id } });
      }}
    >
      <View style={styles.orderHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.typeBadge, { backgroundColor: '#E67E22' }]}>
            <Ionicons name="fast-food" size={14} color="#fff" />
          </View>
          <Text style={styles.orderId}>#{String(item.orderId || item.id)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(normalizedStatus) }]}>
          <Text style={styles.statusText}>
            {statusList.find(s => s.id === normalizedStatus)?.label || item.status}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.userName}>{item.userName || "Khách hàng"}</Text>
        <Text style={styles.userPhone}>{item.userPhone || ""}</Text>
      </View>

      <Text style={styles.addressText} numberOfLines={1}>
        <Ionicons name="location" size={13} color="#999" /> {item.userAddress || item.address || "Chưa có địa chỉ"}
      </Text>

      <View style={styles.orderFooter}>
        <Text style={styles.timeText}>
          {item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : (item.timeCreate || 'N/A')}
        </Text>
        <Text style={styles.totalPrice}>
          {(calculateFinalTotal(item) * 1000).toLocaleString()}đ
        </Text>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn Món ăn</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.tabBarWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabBarScroll}
        >
          {statusList.map((st) => {
            const isActive = filterStatus === st.id;
            
            return (
              <TouchableOpacity 
                key={st.id}
                onPress={() => setFilterStatus(st.id)}
                style={[styles.tabItem, isActive && styles.activeTab]}
              >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {/* Chỉ hiển thị số lượng cho tab "Chờ nhận" */}
                  {st.id === 'pending' 
                    ? `${st.label} (${getPendingCount()})` 
                    : st.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => String(item.orderId || item.id)}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color="#DDD" />
            <Text style={styles.emptyText}>Không có đơn hàng nào</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  backBtn: { padding: 4 },
  tabBarWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#F2F2F2', height: 55 },
  tabBarScroll: { 
    paddingHorizontal: 10, 
    alignItems: 'center',
    paddingRight: 40
  },
  tabItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: '100%', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 13, color: '#999', fontWeight: 'bold' },
  activeTabText: { color: COLORS.primary },
  orderCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, elevation: 3 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typeBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  orderId: { fontWeight: 'bold', color: '#555', fontSize: 13 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  customerInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  userName: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  userPhone: { color: '#666', fontSize: 14 },
  addressText: { color: '#999', fontSize: 13, marginTop: 4 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderColor: '#F8F8F8' },
  timeText: { fontSize: 11, color: '#BBB' },
  totalPrice: { fontSize: 17, fontWeight: 'bold', color: COLORS.primary },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', color: '#BBB', marginTop: 10, fontSize: 14 }
});