// @ts-nocheck
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, arrayUnion, collection, doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
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

export default function ShipperTabScreen() {
  const router = useRouter();
  const { foodOrders, currentUser, system } = useAppStore();
  const [activeTab, setActiveTab] = useState('available');

  const shipperRatio = system?.money?.shipperShipRatio || 70;
  const adminRatio = 100 - shipperRatio;

  const availableOrders = foodOrders.filter(order => order.status === 'pending');
  const myOrders = foodOrders.filter(order => 
    order.status === 'processing' && order.shipperId === currentUser?.id
  );
  const completedOrders = foodOrders.filter(order => 
    order.status === 'completed' && order.shipperId === currentUser?.id
  );

  const handleReceiveOrder = async (item) => {
    try {
      const orderRef = doc(db, 'foodOrders', item.id || item.orderId);
      await updateDoc(orderRef, {
        status: 'processing',
        shipperId: currentUser.id,
        logs: arrayUnion({
          content: 'Shipper đã nhận đơn',
          status: 'processing',
          time: new Date().toISOString()
        })
      });
      if (Platform.OS === 'web') window.alert("Đã nhận đơn thành công!");
      else Alert.alert("Thành công", "Đã nhận đơn!");
      setActiveTab('my_orders');
    } catch (error) {
      Alert.alert("Lỗi", "Không thể nhận đơn");
    }
  };

  const handleCompleteOrder = async (item) => {
    try {
      const totalShip = (item.baseShip || 0) + (item.extraStepFee || 0);
      const adminShare = (totalShip * adminRatio) / 100;
      const discount = item.discount || 0;

      // SỬA LỖI SỐ THẬP PHÂN DÀI TẠI ĐÂY
      const netDebt = Math.round((adminShare - discount) * 1000) / 1000;

      const orderRef = doc(db, 'foodOrders', item.id || item.orderId);
      await updateDoc(orderRef, {
        status: 'completed',
        logs: arrayUnion({
          content: 'Shipper đã giao hàng thành công',
          status: 'completed',
          time: new Date().toISOString()
        })
      });

      if (item.paymentMethod === 'COD') {
        await addDoc(collection(db, 'transactions'), {
            userId: currentUser.id,
            userName: currentUser.name,
            type: 'DEBT',
            amount: netDebt,
            orderId: item.orderId || item.id,
            // LƯU FULL ID VÀO DESC
            desc: `Phí ship đơn #${item.orderId || item.id}`,
            createdAt: new Date().toISOString(),
            performedBy: 'system'
        });
      }

      if (Platform.OS === 'web') window.alert("Giao hàng thành công!");
      else Alert.alert("Thành công", "Đơn hàng đã hoàn thành.");
      
    } catch (error) {
      Alert.alert("Lỗi", "Cập nhật thất bại");
    }
  };

  const renderOrderItem = ({ item }) => {
    const isProcessing = activeTab === 'my_orders';
    const isCompleted = activeTab === 'completed';

    const totalShip = (item.baseShip || 0) + (item.extraStepFee || 0);
    const shipperEarn = (totalShip * shipperRatio) / 100;
    const adminShare = (totalShip * adminRatio) / 100;
    const debtAmount = adminShare - (item.discount || 0);

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => router.push({ 
            pathname: '/admin/order-detail', 
            params: { orderId: item.orderId || item.id } 
        })}
      >
        <View style={styles.orderHeader}>
          {/* HIỂN THỊ FULL ID TRÊN THẺ ĐƠN HÀNG */}
          <Text style={styles.orderId}>#{item.orderId || item.id}</Text>
          <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleTimeString('vi-VN')}</Text>
        </View>

        <View style={styles.addressBox}>
            <View style={styles.addressLine}>
                <Ionicons name="person-outline" size={14} color="#666"/>
                <Text style={styles.userName}>{item.userName} - {item.userPhone}</Text>
            </View>
            <View style={styles.addressLine}>
                <Ionicons name="location-outline" size={14} color={COLORS.primary}/>
                <Text style={styles.addressText} numberOfLines={2}>{item.address}</Text>
            </View>
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.totalPrice}>Thu khách: {((item.finalTotal || 0) * 1000).toLocaleString()}đ</Text>
            {(isProcessing || isCompleted) && (
                <View style={{marginTop: 4}}>
                    <Text style={styles.earningText}>Công: {(shipperEarn * 1000).toLocaleString()}đ</Text>
                    <Text style={{fontSize: 11, color: debtAmount >= 0 ? '#E67E22' : '#27AE60'}}>
                        {debtAmount >= 0 ? 'Nộp Admin: ' : 'Admin bù: '} 
                        {Math.abs(Math.round(debtAmount * 1000)).toLocaleString()}đ
                    </Text>
                </View>
            )}
          </View>

          {activeTab === 'available' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleReceiveOrder(item)}>
              <Text style={styles.btnText}>NHẬN ĐƠN</Text>
            </TouchableOpacity>
          )}

          {isProcessing && (
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#27AE60'}]} onPress={() => handleCompleteOrder(item)}>
              <Text style={styles.btnText}>ĐÃ GIAO</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <View>
            <Text style={styles.welcome}>Chào Shipper,</Text>
            <Text style={styles.name}>{currentUser?.name}</Text>
        </View>
        <TouchableOpacity style={styles.walletBtn} onPress={() => router.push('/shipper/finance')}>
            <MaterialCommunityIcons name="wallet-membership" size={26} color={COLORS.primary} />
            <Text style={styles.walletText}>Ví nợ</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {[
            {id: 'available', label: `Sảnh đơn (${availableOrders.length})`},
            {id: 'my_orders', label: `Đang giao (${myOrders.length})`},
            {id: 'completed', label: 'Lịch sử'}
        ].map((tab) => (
            <TouchableOpacity 
                key={tab.id} 
                style={[styles.tab, activeTab === tab.id && styles.activeTab]} 
                onPress={() => setActiveTab(tab.id)}
            >
                <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
            </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={activeTab === 'available' ? availableOrders : (activeTab === 'my_orders' ? myOrders : completedOrders)}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', alignItems: 'center' },
  welcome: { fontSize: 12, color: '#999' },
  name: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  walletBtn: { alignItems: 'center', backgroundColor: '#FFF4E5', padding: 10, borderRadius: 15 },
  walletText: { fontSize: 10, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontWeight: 'bold', color: '#999' },
  activeTabText: { color: COLORS.primary },
  orderCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 3 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderId: { fontWeight: 'bold', color: '#333' },
  timeText: { fontSize: 12, color: '#BBB' },
  addressBox: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12, gap: 8 },
  addressLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { fontSize: 13, fontWeight: '600', color: '#555' },
  addressText: { flex: 1, fontSize: 13, color: '#333' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  totalPrice: { fontSize: 18, fontWeight: 'bold' },
  earningText: { fontSize: 12, color: '#27AE60', fontWeight: 'bold' },
  actionBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 }
});