// FILE: app/(tabs)/admin.tsx
// @ts-nocheck
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function AdminDashboard() {
  const router = useRouter();
  // Lấy thêm services từ store để đếm số liệu
  const { foods, foodOrders, serviceOrders, users, promos, services } = useAppStore();

  // --- LOGIC THỐNG KÊ DASHBOARD (GIỮ NGUYÊN CẤU TRÚC CŨ) ---
  const stats = useMemo(() => {
    const orders = foodOrders || [];
    const sOrders = serviceOrders || [];
    const now = new Date();
    const todayStr = now.toDateString();

    const foodRevenue = orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + ((o.finalTotal || 0) * 1000), 0);
    const serviceRevenue = sOrders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (o.price || 0), 0);
    
    const todayOrdersCount = orders.filter(o => {
        const d = o.createdAt || o.timeCreate;
        return d && new Date(d).toDateString() === todayStr;
    }).length + sOrders.filter(o => {
        const d = o.createdAt || o.timeCreate;
        return d && new Date(d).toDateString() === todayStr;
    }).length;

    return {
      revenue: foodRevenue + serviceRevenue,
      todayOrders: todayOrdersCount,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      pending: orders.filter(o => 
        o.status?.toLowerCase() === 'pending' || 
        o.status?.toLowerCase() === 'pendding'
      ).length + sOrders.filter(o => 
        o.status?.toLowerCase() === 'pending' || 
        o.status?.toLowerCase() === 'pendding'
      ).length,
      processing: orders.filter(o => o.status === 'processing').length,
      delayed: orders.filter(o => {
        if (o.status === 'completed' || o.status === 'cancelled') return false;
        const timeStr = o.createdAt || o.timeCreate;
        if (!timeStr) return false;
        
        const orderTime = new Date(timeStr);
        const diffInMinutes = (now.getTime() - orderTime.getTime()) / (1000 * 60);
        return diffInMinutes > 30;
      }).length,
      // Đếm tổng số dịch vụ đang có
      totalServices: services?.length || 0
    };
  }, [foodOrders, serviceOrders, services]);

  const activeFoods = foods.filter(f => f.status === 'enable').length;
  const totalUsers = users.length;
  const activePromos = promos ? promos.filter(p => p.enable).length : 0;

  // DANH SÁCH MENU ADMIN (CHÈN THÊM QUẢN LÝ DỊCH VỤ VÀO ĐÚNG VỊ TRÍ)
  const adminMenu = [
    { 
      id: 'products', 
      title: 'Quản lý Món ăn', 
      subtitle: `${activeFoods} món đang bán`, 
      icon: 'restaurant-menu', 
      color: '#E67E22', 
      path: '/admin/products' 
    },
    { 
      id: 'orders', 
      title: 'Quản lý Đơn hàng', 
      subtitle: `${stats.pending} đơn chờ duyệt`, 
      icon: 'receipt-long', 
      color: '#3498DB', 
      path: '/admin/orders' 
    },
    // --- MỚI THÊM: QUẢN LÝ DỊCH VỤ ---
    { 
      id: 'services', 
      title: 'Quản lý Dịch vụ', 
      subtitle: `${stats.totalServices} dịch vụ hệ thống`, 
      icon: 'build', // Icon cái búa/sửa chữa
      color: '#27AE60', // Màu xanh lá
      path: '/admin/services' 
    },
    // -------------------------------------
    { 
      id: 'promos', 
      title: 'Quản lý Khuyến mãi', 
      subtitle: `${activePromos} mã đang chạy`, 
      icon: 'local-offer', 
      color: '#E91E63', 
      path: '/admin/promos' 
    },
    { 
      id: 'users', 
      title: 'Quản lý Người dùng', 
      subtitle: `${totalUsers} tài khoản`, 
      icon: 'people', 
      color: '#9B59B6', 
      path: '/admin/users' 
    },
    { 
      id: 'finance', 
      title: 'Quản lý Tài chính', 
      subtitle: 'Đối soát công nợ Shipper', 
      icon: 'attach-money', 
      color: '#27AE60', 
      path: '/admin/finance' 
    },
    { 
      id: 'system', 
      title: 'Cài đặt', 
      subtitle: 'Cấu hình hệ thống', 
      icon: 'settings', 
      color: '#7F8C8D', 
      path: '/admin/system-config' 
    }
  ];

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Quản trị viên</Text>
          <Text style={styles.headerSub}>Hệ thống vận hành chung cư</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn}>
          <Ionicons name="person-circle" size={45} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* GIỮ NGUYÊN TẦNG DASHBOARD STATS 2x2 CỦA BẠN */}
        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { borderLeftColor: '#27AE60' }]}>
            <Text style={styles.statsValue}>{stats.revenue.toLocaleString()}đ</Text>
            <Text style={styles.statsLabel}>Doanh thu tổng</Text>
          </View>
          <View style={[styles.statsCard, { borderLeftColor: '#9B59B6' }]}>
            <Text style={styles.statsValue}>{stats.todayOrders}</Text>
            <Text style={styles.statsLabel}>Đơn hôm nay</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { borderLeftColor: '#E74C3C' }]}>
            <Text style={styles.statsValue}>{stats.cancelled}</Text>
            <Text style={styles.statsLabel}>Bị hủy</Text>
          </View>
          <View style={[styles.statsCard, { borderLeftColor: '#F1C40F' }]}>
            <Text style={styles.statsValue}>{stats.pending}</Text>
            <Text style={styles.statsLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { borderLeftColor: '#3498DB' }]}>
            <Text style={styles.statsValue}>{stats.processing}</Text>
            <Text style={styles.statsLabel}>Processing</Text>
          </View>
        </View>

        {/* DANH SÁCH MENU QUẢN LÝ GIỮ NGUYÊN UI CŨ */}
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