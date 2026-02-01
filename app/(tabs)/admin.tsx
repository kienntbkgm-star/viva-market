// @ts-nocheck
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { GlobalStyles } from '../../src/styles/GlobalStyles';

export default function AdminDashboard() {
  const router = useRouter();
  const { foods, foodOrders, serviceOrders, users, promos } = useAppStore();

  // --- LOGIC THỐNG KÊ DASHBOARD (BAO GỒM FOOD + SERVICE ORDERS) ---
  const stats = useMemo(() => {
    const allOrders = [...(foodOrders || []), ...(serviceOrders || [])];
    const now = new Date();

    return {
      // 1. Tổng số đơn hàng
      total: allOrders.length,
      
      // 2. Số đơn bị hủy
      cancelled: allOrders.filter(o => o.status === 'cancelled').length,
      
      // 3. Số đơn đang chờ (Tính cả pending và pendding)
      pending: allOrders.filter(o => 
        o.status?.toLowerCase() === 'pending' || 
        o.status?.toLowerCase() === 'pendding'
      ).length,
      
      // 4. Số đơn đang xử lý
      processing: allOrders.filter(o => o.status === 'processing').length,
      
      // 5. Số đơn bị chậm (>30p và chưa hoàn thành/hủy)
      delayed: allOrders.filter(o => {
        if (o.status === 'completed' || o.status === 'cancelled') return false;
        const timeStr = o.createdAt || o.timeCreate;
        if (!timeStr) return false;
        
        const orderTime = new Date(timeStr);
        const diffInMinutes = (now.getTime() - orderTime.getTime()) / (1000 * 60);
        return diffInMinutes > 30;
      }).length,
      
      // 6. Phân loại - chỉ đếm pending
      foodOrderCount: foodOrders?.filter(o => 
        o.status?.toLowerCase() === 'pending' || 
        o.status?.toLowerCase() === 'pendding'
      ).length || 0,
      serviceOrderCount: serviceOrders?.filter(o => 
        o.status?.toLowerCase() === 'pending' || 
        o.status?.toLowerCase() === 'pendding'
      ).length || 0
    };
  }, [foodOrders, serviceOrders]);

  const activeFoods = foods.filter(f => f.status === 'enable').length;
  const totalUsers = users.length;
  const readyShippers = users.filter(u => u.role === 'shipper' && u.isReady === true).length;
  const totalShippers = users.filter(u => u.role === 'shipper').length;

  const adminMenu = [
    { id: 'products', title: 'Quản lý Món ăn', subtitle: `${activeFoods} món đang bán`, icon: 'restaurant-menu', color: '#E67E22', path: '/admin/products' },
    { id: 'services', title: 'Quản lý Dịch vụ', subtitle: 'Danh sách dịch vụ', icon: 'build', color: '#9B59B6', path: '/admin/services' },
    { id: 'promos', title: 'Quản lý Khuyến mãi', subtitle: `${promos?.length || 0} khuyến mãi`, icon: 'local-offer', color: '#F39C12', path: '/admin/promos' },
    { id: 'food-orders', title: 'Đơn Món ăn', subtitle: `${stats.foodOrderCount} đơn mới`, icon: 'restaurant', color: '#E67E22', path: '/admin/orders' },
    { id: 'service-orders', title: 'Đơn Dịch vụ', subtitle: `${stats.serviceOrderCount} đơn mới`, icon: 'home-repair-service', color: '#9B59B6', path: '/admin/service-orders' },
    { id: 'users', title: 'Quản lý Người dùng', subtitle: `${totalUsers} tài khoản`, icon: 'people', color: '#16A085', path: '/admin/users' },
    { id: 'activity', title: 'Thống kê Hoạt động', subtitle: `${readyShippers} shippers sẵn sàng`, icon: 'analytics', color: '#1ABC9C', path: '/admin/activity-tracking' },
    { id: 'finance', title: 'Quản lý Tài chính', subtitle: 'Đối soát công nợ Shipper', icon: 'attach-money', color: '#27AE60', path: '/admin/finance' },
    { id: 'system', title: 'Cài đặt', subtitle: 'Cấu hình hệ thống', icon: 'settings', color: '#7F8C8D', path: '/admin/system-config' }
  ];

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản trị viên</Text>
          <Text style={styles.headerSub}>Hệ thống vận hành chung cư</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* TẦNG DASHBOARD STATS */}
        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { borderLeftColor: '#3498DB' }]}>
            <Text style={styles.statsValue}>{stats.total}</Text>
            <Text style={styles.statsLabel}>Tổng đơn</Text>
          </View>
          <View style={[styles.statsCard, { borderLeftColor: '#F1C40F' }]}>
            <Text style={styles.statsValue}>{stats.pending}</Text>
            <Text style={styles.statsLabel}>Chờ duyệt</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { borderLeftColor: '#E67E22' }]}>
            <Text style={styles.statsValue}>{stats.foodOrderCount}</Text>
            <Text style={styles.statsLabel}>Đơn món ăn</Text>
          </View>
          <View style={[styles.statsCard, { borderLeftColor: '#9B59B6' }]}>
            <Text style={styles.statsValue}>{stats.serviceOrderCount}</Text>
            <Text style={styles.statsLabel}>Đơn dịch vụ</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { borderLeftColor: '#E74C3C' }]}>
            <Text style={styles.statsValue}>{stats.cancelled}</Text>
            <Text style={styles.statsLabel}>Bị hủy</Text>
          </View>
          <View style={[styles.statsCard, { borderLeftColor: '#E67E22' }]}>
            <Text style={styles.statsValue}>{stats.delayed}</Text>
            <Text style={styles.statsLabel}>Chậm {'>'}30p</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { borderLeftColor: '#27AE60', flex: 1 }]}>
            <Text style={styles.statsValue}>{readyShippers}/{totalShippers}</Text>
            <Text style={styles.statsLabel}>Shipper sẵn sàng</Text>
          </View>
        </View>

        {/* MENU QUẢN LÝ */}
        {adminMenu.map((item) => (
          <TouchableOpacity key={item.id} style={styles.menuCard} onPress={() => router.push(item.path)}>
            <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
              <MaterialIcons name={item.icon} size={30} color={item.color} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerTitle: { fontSize: 22, fontWeight: 'bold' },
  headerSub: { fontSize: 14, color: '#999' },
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  statsCard: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 15, elevation: 2, borderLeftWidth: 5 },
  statsValue: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  statsLabel: { fontSize: 12, color: '#999', marginTop: 2 },
  menuCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 18, borderRadius: 20, marginBottom: 15, elevation: 3 },
  iconCircle: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardSub: { fontSize: 12, color: '#999' }
});