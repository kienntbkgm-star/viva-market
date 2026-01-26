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

export default function AdminServiceOrderDetailScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const { serviceOrders, services, currentUser } = useAppStore();
  
  // Tìm đơn hàng trong store
  const order = useMemo(() => {
    return serviceOrders.find(o => String(o.orderId) === String(orderId) || String(o.id) === String(orderId));
  }, [orderId, serviceOrders]);

  // Lấy thông tin dịch vụ gốc để hiển thị ảnh
  const serviceInfo = useMemo(() => {
    if (order?.serviceId) {
      return services.find(s => String(s.id) === String(order.serviceId));
    }
    return null;
  }, [order, services]);

  const isAdmin = currentUser?.role === 'admin';

  const showAlert = (title, message, onPressOk) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}: ${message}`)) onPressOk();
    } else {
      Alert.alert(title, message, [
        { text: "Hủy", style: "cancel" },
        { text: "Đồng ý", onPress: onPressOk }
      ]);
    }
  };

  const updateStatus = async (newStatus, note) => {
    try {
      const orderRef = doc(db, 'serviceOrders', order.id || order.orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        logs: arrayUnion({
          content: note,
          status: newStatus,
          time: new Date().toISOString()
        })
      });
      
      const msg = "Đã cập nhật trạng thái đơn dịch vụ";
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert("Thành công", msg);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật đơn hàng");
    }
  };

  if (!order) {
    return (
      <SafeAreaView style={GlobalStyles.container}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28}/></TouchableOpacity>
            <Text style={styles.headerTitle}>Lỗi</Text>
        </View>
        <View style={styles.centered}><Text>Không tìm thấy đơn dịch vụ</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28}/></TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết Dịch vụ</Text>
        <View style={{width: 28}}/>
      </View>

      <ScrollView contentContainerStyle={{ padding: 15 }}>
        {/* THÔNG TIN CHUNG */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderIdText}>#{order.orderId}</Text>
            <Text style={[styles.statusText, { color: COLORS.primary }]}>{order.status?.toUpperCase()}</Text>
          </View>
          <Text style={styles.timeText}>{new Date(order.createdAt).toLocaleString('vi-VN')}</Text>
        </View>

        {/* THÔNG TIN KHÁCH HÀNG */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>KHÁCH HÀNG</Text>
          <Text style={styles.infoLine}><Ionicons name="person-outline" size={14} /> {order.userName}</Text>
          <Text style={styles.infoLine}><Ionicons name="call-outline" size={14} /> {order.userPhone}</Text>
          <Text style={styles.infoLine}><Ionicons name="location-outline" size={14} /> {order.userAddress || order.address}</Text>
        </View>

        {/* CHI TIẾT DỊCH VỤ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DỊCH VỤ YÊU CẦU</Text>
          <View style={styles.serviceItem}>
            <Image source={{ uri: serviceInfo?.image || 'https://via.placeholder.com/150' }} style={styles.serviceImg} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.serviceName}>{order.serviceName}</Text>
              <Text style={styles.shopName}>Đơn vị: {order.shopName}</Text>
              <Text style={styles.noteText}>Ghi chú: {order.note || 'Không có'}</Text>
            </View>
          </View>
          <View style={[styles.rowBetween, { marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 }]}>
            <Text style={styles.totalLabel}>TỔNG PHÍ DỰ KIẾN</Text>
            <Text style={styles.totalVal}>{(order.price || 0).toLocaleString()}đ</Text>
          </View>
        </View>

        {/* NHẬT KÝ */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>NHẬT KÝ XỬ LÝ</Text>
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

        {/* ADMIN ACTIONS */}
        {isAdmin && order.status !== 'completed' && order.status !== 'cancelled' && (
          <View style={styles.adminActions}>
            {order.status === 'pending' && (
               <TouchableOpacity 
                style={styles.btnAccept} 
                onPress={() => showAlert("Xác nhận", "Tiếp nhận và xử lý yêu cầu này?", () => updateStatus('processing', 'Admin đã tiếp nhận yêu cầu'))}
              >
                <Text style={styles.btnAcceptText}>TIẾP NHẬN</Text>
              </TouchableOpacity>
            )}
             {order.status === 'processing' && (
               <TouchableOpacity 
                style={styles.btnComplete} 
                onPress={() => showAlert("Xác nhận", "Hoàn thành dịch vụ này?", () => updateStatus('completed', 'Dịch vụ đã hoàn thành'))}
              >
                <Text style={styles.btnAcceptText}>HOÀN THÀNH</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.btnCancel} 
              onPress={() => showAlert("Xác nhận", "Hủy yêu cầu dịch vụ này?", () => updateStatus('cancelled', 'Admin đã hủy yêu cầu'))}
            >
              <Text style={styles.btnCancelText}>HỦY YÊU CẦU</Text>
            </TouchableOpacity>
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
  infoLine: { fontSize: 14, color: '#666', marginBottom: 8 },
  serviceItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  serviceImg: { width: 60, height: 60, borderRadius: 8 },
  serviceName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  shopName: { fontSize: 13, color: COLORS.primary, marginVertical: 2 },
  noteText: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  totalLabel: { fontSize: 15, fontWeight: 'bold' },
  totalVal: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  logItem: { flexDirection: 'row', marginBottom: 15 },
  logDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary, marginTop: 5, marginRight: 15 },
  logContent: { fontSize: 13, color: '#333' },
  logTime: { fontSize: 11, color: '#999', marginTop: 2 },
  adminActions: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  btnAccept: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#27AE60', alignItems: 'center' },
  btnComplete: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  btnAcceptText: { color: '#fff', fontWeight: 'bold' },
  btnCancel: { flex: 1, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#E74C3C', alignItems: 'center' },
  btnCancelText: { color: '#E74C3C', fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});