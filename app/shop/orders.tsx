// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { arrayUnion, doc, updateDoc } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
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

export default function ShopOrdersScreen() {
  const router = useRouter();
  const { foodOrders, currentUser } = useAppStore();
  const [activeTab, setActiveTab] = useState('pending');

  // Lấy các đơn hàng có chứa món từ shop của user hiện tại
  const myShopOrders = useMemo(() => {
    if (!currentUser?.id) return [];
    
    return foodOrders.filter(order => {
      // Kiểm tra xem đơn có món nào của shop mình không
      const hasMyItems = order.items?.some(item => 
        Number(item.shopId) === Number(currentUser.id)
      );
      return hasMyItems;
    });
  }, [foodOrders, currentUser?.id]);

  // Phân loại đơn theo status
  const pendingOrders = myShopOrders.filter(order => order.status === 'pending');
  const processingOrders = myShopOrders.filter(order => order.status === 'processing');
  const completedOrders = myShopOrders.filter(order => order.status === 'completed');

  // Xác nhận đơn (chỉ cho resident shop)
  const handleConfirmOrder = async (order) => {
    if (!order.isResidentShop) {
      if (Platform.OS === 'web') {
        window.alert('Chỉ đơn shop cư dân mới có thể xác nhận trực tiếp!');
      } else {
        Alert.alert('Thông báo', 'Chỉ đơn shop cư dân mới có thể xác nhận trực tiếp!');
      }
      return;
    }

    try {
      const orderRef = doc(db, 'foodOrders', order.id);
      await updateDoc(orderRef, {
        status: 'processing',
        logs: arrayUnion({
          content: 'Shop đã xác nhận và bắt đầu chuẩn bị',
          status: 'processing',
          time: new Date().toISOString()
        })
      });
      if (Platform.OS === 'web') window.alert("Đã xác nhận đơn!");
      else Alert.alert("Thành công", "Đã xác nhận đơn hàng!");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xác nhận đơn");
    }
  };

  // Hoàn thành đơn (chỉ cho resident shop)
  const handleCompleteOrder = async (order) => {
    if (!order.isResidentShop) {
      if (Platform.OS === 'web') {
        window.alert('Chỉ đơn shop cư dân mới có thể hoàn thành trực tiếp!');
      } else {
        Alert.alert('Thông báo', 'Chỉ đơn shop cư dân mới có thể hoàn thành trực tiếp!');
      }
      return;
    }

    try {
      const orderRef = doc(db, 'foodOrders', order.id);
      await updateDoc(orderRef, {
        status: 'completed',
        logs: arrayUnion({
          content: 'Shop đã giao hàng thành công',
          status: 'completed',
          time: new Date().toISOString()
        })
      });
      if (Platform.OS === 'web') window.alert("Đã hoàn thành đơn!");
      else Alert.alert("Thành công", "Đơn hàng đã hoàn thành!");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể hoàn thành đơn");
    }
  };

  const renderOrderItem = ({ item }) => {
    // Lọc các món thuộc shop mình
    const myItems = item.items?.filter(i => Number(i.shopId) === Number(currentUser?.id)) || [];
    const activeMyItems = myItems.filter(i => !i.itemStatus || i.itemStatus === 'active');
    
    // Tính tổng tiền món của shop mình
    const myTotal = activeMyItems.reduce((sum, i) => {
      const basePrice = i.pricePromo || 0;
      const optionsPrice = (i.selectedOptions || []).reduce((s, opt) => s + (opt.price || 0), 0);
      return sum + (basePrice + optionsPrice) * i.quantity;
    }, 0);

    const isResidentShop = item.isResidentShop || item.deliveryType === 'self-delivery';
    
    // Ẩn thông tin khách nếu đơn chưa xác nhận
    const isPending = item.status === 'pending';
    const maskedPhone = isPending && item.userPhone 
      ? item.userPhone.slice(0, -4) + '****' 
      : item.userPhone;
    const maskedName = isPending ? '******' : item.userName;
    const maskedAddress = isPending ? '******' : item.address;

    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => {
          // Có thể navigate đến trang chi tiết nếu cần
          // router.push({ pathname: '/shop/order-detail', params: { orderId: item.orderId || item.id } });
        }}
      >
        <View style={styles.orderHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.orderId}>#{item.orderId || item.id}</Text>
            {isResidentShop && (
              <View style={styles.residentBadge}>
                <Text style={styles.residentBadgeText}>🏠 Cư dân</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
        </View>

        <View style={styles.customerBox}>
          <View style={styles.customerLine}>
            <Ionicons name="person-outline" size={14} color="#666"/>
            <Text style={styles.customerName}>{maskedName} - {maskedPhone}</Text>
          </View>
          <View style={styles.customerLine}>
            <Ionicons name="location-outline" size={14} color={COLORS.primary}/>
            <Text style={styles.addressText} numberOfLines={2}>{maskedAddress}</Text>
          </View>
          {isPending && (
            <View style={styles.hintBox}>
              <Ionicons name="information-circle-outline" size={14} color="#666" />
              <Text style={styles.hintText}>Bấm nhận đơn để thấy thông tin khách</Text>
            </View>
          )}
        </View>

        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>Món của shop bạn:</Text>
          {activeMyItems.map((foodItem, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemText}>
                • {foodItem.name} x{foodItem.quantity}
                {foodItem.selectedOptions?.length > 0 && ` (+${foodItem.selectedOptions.length} tùy chọn)`}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={styles.totalPrice}>Doanh thu: {(myTotal * 1000).toLocaleString()}đ</Text>
            {!isResidentShop && (
              <Text style={styles.noteText}>Shipper sẽ đến lấy hàng</Text>
            )}
          </View>

          {/* Actions cho resident shop */}
          {isResidentShop && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {item.status === 'pending' && (
                <TouchableOpacity 
                  style={styles.actionBtn} 
                  onPress={() => handleConfirmOrder(item)}
                >
                  <Text style={styles.btnText}>XÁC NHẬN</Text>
                </TouchableOpacity>
              )}
              
              {item.status === 'processing' && (
                <TouchableOpacity 
                  style={[styles.actionBtn, {backgroundColor: '#27AE60'}]} 
                  onPress={() => handleCompleteOrder(item)}
                >
                  <Text style={styles.btnText}>ĐÃ GIAO</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Đơn hàng của shop</Text>
          <Text style={styles.shopName}>{currentUser?.shopName || currentUser?.name}</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {[
          {id: 'pending', label: `Chờ xử lý (${pendingOrders.length})`},
          {id: 'processing', label: `Đang giao (${processingOrders.length})`},
          {id: 'completed', label: 'Hoàn thành'}
        ].map((tab) => (
          <TouchableOpacity 
            key={tab.id} 
            style={[styles.tab, activeTab === tab.id && styles.activeTab]} 
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={
          activeTab === 'pending' ? pendingOrders : 
          activeTab === 'processing' ? processingOrders : 
          completedOrders
        }
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>Chưa có đơn hàng</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    padding: 20, 
    backgroundColor: '#fff', 
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  backBtn: { marginRight: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  shopName: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff' },
  tab: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderBottomWidth: 3, 
    borderBottomColor: 'transparent' 
  },
  activeTab: { borderBottomColor: COLORS.primary },
  tabText: { fontWeight: 'bold', color: '#999', fontSize: 13 },
  activeTabText: { color: COLORS.primary },
  orderCard: { 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    padding: 15, 
    marginBottom: 15, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  orderHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12 
  },
  orderId: { fontWeight: 'bold', color: '#333', fontSize: 15 },
  residentBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  residentBadgeText: {
    fontSize: 11,
    color: '#27AE60',
    fontWeight: '600',
  },
  timeText: { fontSize: 11, color: '#999' },
  customerBox: { 
    backgroundColor: '#F8F9FA', 
    padding: 10, 
    borderRadius: 10, 
    gap: 6,
    marginBottom: 12
  },
  customerLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerName: { fontSize: 13, fontWeight: '600', color: '#555', flex: 1 },
  addressText: { flex: 1, fontSize: 12, color: '#666' },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  hintText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },
  itemsSection: {
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12
  },
  itemsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6
  },
  itemRow: {
    marginBottom: 3
  },
  itemText: {
    fontSize: 13,
    color: '#333'
  },
  orderFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  totalPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  noteText: { fontSize: 11, color: '#666', marginTop: 3 },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10
  }
});
