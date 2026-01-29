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
import { sendNotificationToMultiple } from '../../src/components/Notification';
import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function ShipperOrderDetailScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  
  const { foodOrders, currentUser, shops, users } = useAppStore();
  
  const order = useMemo(() => 
    foodOrders.find(o => String(o.orderId) === String(orderId) || String(o.id) === String(orderId))
  , [orderId, foodOrders]);

  // Kiểm tra shipper có quyền xem đơn này không (phải là shipper nhận đơn)
  const isMyOrder = order?.shipperId === currentUser?.id;
  const canEdit = order?.status === 'processing' && isMyOrder;

  // Tính realtime từ items array
  const orderTotals = useMemo(() => {
    if (!order || !order.items || order.items.length === 0) {
      return { totalFood: 0, shopCount: 0, extraStepFee: 0, finalTotal: 0, activeItems: [] };
    }
    
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
    const finalTotal = totalFood + baseShip + extraStepFee - discount;
    
    return { totalFood, shopCount, extraStepFee, finalTotal, activeItems };
  }, [order]);

  // Group items theo shop
  const shopGroups = useMemo(() => {
    if (!order || !order.items) return [];
    
    const groups = {};
    order.items.forEach(item => {
      if (!groups[item.shopId]) {
        const shopInfo = shops?.find(s => String(s.id) === String(item.shopId));
        groups[item.shopId] = {
          shopId: item.shopId,
          shopName: item.shopName,
          shopInfo: shopInfo,
          items: []
        };
      }
      groups[item.shopId].items.push(item);
    });
    
    return Object.values(groups);
  }, [order, shops]);

  const handleRemoveItem = async (itemIndex) => {
    if (!canEdit) {
      Alert.alert("Không thể xóa", "Bạn không có quyền sửa đơn hàng này");
      return;
    }

    const item = order.items[itemIndex];
    
    // Kiểm tra xem còn bao nhiêu món active
    const activeItems = order.items.filter(i => !i.itemStatus || i.itemStatus === 'active');
    const isLastItem = activeItems.length === 1;
    
    const confirmMsg = isLastItem
      ? `⚠️ ĐÂY LÀ MÓN CUỐI CÙNG!\n\nBỏ món "${item.name}" sẽ HỦY TOÀN BỘ ĐƠN HÀNG.\n\nBạn có chắc chắn?`
      : `Bạn chắc chắn muốn bỏ món "${item.name}" khỏi đơn hàng?\n\nLý do: Món hết hoặc quán đóng cửa`;
    
    const proceedRemove = async () => {
      try {
        const orderRef = doc(db, 'foodOrders', order.id);
        const updatedItems = [...order.items];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], itemStatus: 'removed' };
        
        const updateData = {
          items: updatedItems,
          logs: arrayUnion({
            content: isLastItem 
              ? `Shipper đã bỏ món cuối cùng: ${item.name} - Đơn hàng bị hủy`
              : `Shipper đã bỏ món: ${item.name} (${item.quantity}x)`,
            status: isLastItem ? 'cancelled' : order.status,
            time: new Date().toISOString()
          })
        };
        
        // Nếu là món cuối cùng, hủy đơn luôn
        if (isLastItem) {
          updateData.status = 'cancelled';
        }
        
        await updateDoc(orderRef, updateData);
        
        // 📢 GỬI NOTIFICATION: Shipper chỉnh sửa đơn -> Khách, Admin, Chủ shop
        console.log('🔔 Gửi notification: Shipper chỉnh sửa đơn hàng');
        try {
          const customer = users.find(u => u.id === order.userId);
          const admins = users.filter(u => u.role === 'admin');
          
          let recipients = [];
          let notifTitle = '';
          let notifBody = '';

          if (isLastItem) {
            // Shipper hủy đơn -> chỉ gửi cho admin & khách
            recipients = [
              ...(customer ? [customer] : []),
              ...admins
            ].filter(u => u.expoToken);
            
            notifTitle = '❌ Đơn hàng bị hủy';
            notifBody = `Shipper ${currentUser.name} đã hủy: ${item.name}`;
          } else {
            // Shipper bỏ món -> gửi cho khách, admin, chủ shop
            const uniqueShopIds = new Set(order.items.map(i => i.shopId));
            const shopOwners = Array.from(uniqueShopIds).map(shopId => 
              users.find(u => String(u.id) === String(shopId))
            ).filter(Boolean);

            recipients = [
              ...(customer ? [customer] : []),
              ...admins,
              ...shopOwners
            ].filter(u => u.expoToken);
            
            notifTitle = '📝 Đơn hàng được cập nhật';
            notifBody = `Shipper ${currentUser.name} đã bỏ: ${item.name} (${item.quantity}x)`;
          }

          if (recipients.length > 0) {
            await sendNotificationToMultiple(notifTitle, notifBody, recipients);
            console.log(`✅ Gửi notification cho ${recipients.length} người`);
          }
        } catch (notifError) {
          console.error('⚠️ Lỗi gửi notification nhưng đơn đã được cập nhật:', notifError);
          // Không dừng flow, đơn đã được cập nhật rồi
        }
        
        if (Platform.OS === 'web') {
          window.alert(isLastItem ? "Đã hủy đơn hàng" : "Đã bỏ món thành công");
        } else {
          Alert.alert("Thành công", isLastItem ? "Đã hủy đơn hàng" : "Đã bỏ món khỏi đơn hàng");
        }
        
        if (isLastItem) {
          // Quay lại trang trước sau khi hủy đơn
          setTimeout(() => router.back(), 500);
        }
      } catch (error) {
        console.error("Remove Item Error:", error);
        Alert.alert("Lỗi", "Không thể bỏ món");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) proceedRemove();
    } else {
      Alert.alert(
        isLastItem ? "⚠️ Cảnh báo" : "Xác nhận bỏ món", 
        confirmMsg, 
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: isLastItem ? "Hủy đơn" : "Bỏ món", 
            style: "destructive", 
            onPress: proceedRemove 
          }
        ]
      );
    }
  };

  const handleReturnOrder = async () => {
    if (!canEdit) {
      Alert.alert("Không thể bỏ đơn", "Bạn không có quyền bỏ đơn hàng này");
      return;
    }

    const confirmMsg = `Bạn chắc chắn muốn bỏ đơn này?

Đơn sẽ quay về sảnh để shipper khác nhận.`;
    
    const proceedReturn = async () => {
      try {
        const orderRef = doc(db, 'foodOrders', order.id);
        
        await updateDoc(orderRef, {
          status: 'pending',
          shipperId: null,
          logs: arrayUnion({
            content: `Shipper ${currentUser?.name} đã bỏ đơn`,
            status: 'pending',
            time: new Date().toISOString()
          })
        });
        
        if (Platform.OS === 'web') {
          window.alert("Đã bỏ đơn thành công");
        } else {
          Alert.alert("Thành công", "Đơn đã quay về sảnh");
        }
        
        // Quay lại trang trước
        setTimeout(() => router.back(), 500);
      } catch (error) {
        console.error("Return Order Error:", error);
        Alert.alert("Lỗi", "Không thể bỏ đơn");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) proceedReturn();
    } else {
      Alert.alert(
        "Xác nhận bỏ đơn", 
        confirmMsg, 
        [
          { text: "Hủy", style: "cancel" },
          { 
            text: "Bỏ đơn", 
            style: "destructive", 
            onPress: proceedReturn 
          }
        ]
      );
    }
  };

  if (!order) {
    return (
      <SafeAreaView style={GlobalStyles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lỗi</Text>
          <View style={{width: 28}}/>
        </View>
        <View style={styles.centered}>
          <Text>Không tìm thấy đơn hàng</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        {canEdit ? (
          <TouchableOpacity 
            style={styles.returnOrderBtn}
            onPress={handleReturnOrder}
          >
            <Ionicons name="return-up-back" size={18} color="#E74C3C" />
          </TouchableOpacity>
        ) : (
          <View style={{width: 28}}/>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 15 }}>
        {/* THÔNG TIN CHUNG & TRẠNG THÁI */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.orderIdText}>#{order.orderId}</Text>
            <Text style={[styles.statusText, { color: COLORS.primary }]}>
              {getStatusLabel(order.status)}
            </Text>
          </View>
          <Text style={styles.timeText}>
            {new Date(order.createdAt).toLocaleString('vi-VN')}
          </Text>
        </View>

        {/* THÔNG TIN KHÁCH HÀNG */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>THÔNG TIN KHÁCH HÀNG</Text>
          {!isMyOrder ? (
            <View style={styles.hiddenInfo}>
              <Ionicons name="lock-closed" size={16} color="#E67E22" />
              <Text style={styles.hiddenInfoText}>
                Nhận đơn để xem thông tin khách hàng
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.infoLine}>
                <Ionicons name="person-outline" size={14} /> {order.userName}
              </Text>
              <Text style={styles.infoLine}>
                <Ionicons name="call-outline" size={14} /> {order.userPhone}
              </Text>
              <Text style={styles.infoLine}>
                <Ionicons name="location-outline" size={14} /> {order.address}
              </Text>
            </>
          )}
        </View>

        {/* THÔNG TIN SHOP */}
        {isMyOrder && shopGroups.map((group, idx) => {
          const activeItems = group.items.filter(i => !i.itemStatus || i.itemStatus === 'active');
          if (activeItems.length === 0) return null;
          
          return (
            <View key={group.shopId} style={[styles.card, styles.shopCard]}>
              <View style={styles.shopHeader}>
                <Ionicons name="storefront" size={20} color={COLORS.primary} />
                <Text style={styles.shopTitle}>SHOP {idx + 1}: {group.shopName}</Text>
              </View>
              
              {group.shopInfo && (
                <>
                  {group.shopInfo.address && (
                    <Text style={styles.shopInfoLine}>
                      <Ionicons name="location" size={14} color="#666" /> {group.shopInfo.address}
                    </Text>
                  )}
                  {group.shopInfo.phone && (
                    <Text style={styles.shopInfoLine}>
                      <Ionicons name="call" size={14} color="#666" /> {group.shopInfo.phone}
                    </Text>
                  )}
                </>
              )}
              
              <View style={styles.shopItemsList}>
                <Text style={styles.shopItemsTitle}>Cần mua:</Text>
                {activeItems.map((item, itemIdx) => (
                  <Text key={itemIdx} style={styles.shopItemText}>
                    • {item.name} x{item.quantity}
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <Text style={{fontSize: 11, color: '#E67E22'}}>
                        {' '}({item.selectedOptions.map(opt => opt.name).join(', ')})
                      </Text>
                    )}
                  </Text>
                ))}
              </View>
            </View>
          );
        })}

        {/* DANH SÁCH MÓN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>DANH SÁCH MÓN</Text>
          {canEdit && (
            <Text style={styles.editHint}>
              💡 Nhấn vào món để bỏ nếu hết hoặc quán đóng cửa
            </Text>
          )}
          {order.items?.map((item, index) => {
            const isRemoved = item.itemStatus === 'removed';
            return (
              <TouchableOpacity
                key={index}
                style={[styles.foodItem, isRemoved && styles.removedItem]}
                onPress={() => {
                  if (canEdit && !isRemoved) {
                    handleRemoveItem(index);
                  }
                }}
                disabled={!canEdit || isRemoved}
              >
                <Image 
                  source={{ uri: item.img }} 
                  style={[styles.foodImg, isRemoved && styles.removedImg]} 
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.foodName, isRemoved && styles.removedText]}>
                    {item.name} {isRemoved && '(Đã bỏ)'}
                  </Text>
                  <Text style={[styles.foodQty, isRemoved && styles.removedText]}>
                    x{item.quantity}
                  </Text>
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <Text style={[styles.optionsText, isRemoved && styles.removedText]}>
                      {item.selectedOptions.map(opt => `${opt.name} (+${(opt.price * 1000).toLocaleString()}đ)`).join(', ')}
                    </Text>
                  )}
                  {item.note && (
                    <Text style={[styles.noteText, isRemoved && styles.removedText]}>
                      Ghi chú: {item.note}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.foodPrice, isRemoved && styles.removedText]}>
                    {((item.pricePromo || 0) * item.quantity * 1000).toLocaleString()}đ
                  </Text>
                  {item.selectedOptions && item.selectedOptions.length > 0 && (() => {
                    const optionsTotal = item.selectedOptions.reduce((s, opt) => s + (opt.price || 0), 0);
                    return (
                      <Text style={[styles.optionsPriceText, isRemoved && styles.removedText]}>
                        +{(optionsTotal * item.quantity * 1000).toLocaleString()}đ
                      </Text>
                    );
                  })()}
                  {canEdit && !isRemoved && (
                    <Ionicons name="close-circle" size={20} color="#E74C3C" style={{ marginTop: 5 }} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CHI TIẾT THANH TOÁN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>CHI TIẾT THANH TOÁN</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.priceLabel}>Tiền món</Text>
            <Text style={styles.priceVal}>
              {(orderTotals.totalFood * 1000).toLocaleString()}đ
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.priceLabel}>Phí vận chuyển gốc</Text>
            <Text style={styles.priceVal}>
              {(order.baseShip * 1000).toLocaleString()}đ
            </Text>
          </View>
          {orderTotals.extraStepFee > 0 && (
            <View style={styles.rowBetween}>
              <Text style={styles.priceLabel}>
                Phí thêm shop (+{orderTotals.shopCount - 1} shop)
              </Text>
              <Text style={styles.priceVal}>
                +{(orderTotals.extraStepFee * 1000).toLocaleString()}đ
              </Text>
            </View>
          )}
          {order.discount > 0 && (
            <View style={styles.rowBetween}>
              <Text style={[styles.priceLabel, { color: '#E74C3C' }]}>Khuyến mãi</Text>
              <Text style={[styles.priceVal, { color: '#E74C3C' }]}>
                -{(order.discount * 1000).toLocaleString()}đ
              </Text>
            </View>
          )}
          <View style={[styles.rowBetween, { marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 }]}>
            <Text style={styles.totalLabel}>TỔNG THU KHÁCH</Text>
            <Text style={styles.totalVal}>
              {(orderTotals.finalTotal * 1000).toLocaleString()}đ
            </Text>
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
                <Text style={styles.logTime}>
                  {new Date(log.time).toLocaleString('vi-VN')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 2
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  orderIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  timeText: {
    fontSize: 12,
    color: '#999'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    letterSpacing: 0.5
  },
  editHint: {
    fontSize: 11,
    color: '#E67E22',
    backgroundColor: '#FFF4E5',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    fontStyle: 'italic'
  },
  infoLine: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  removedItem: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 5
  },
  foodImg: {
    width: 60,
    height: 60,
    borderRadius: 8
  },
  removedImg: {
    opacity: 0.4
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  foodQty: {
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  optionsText: {
    fontSize: 11,
    color: '#E67E22',
    marginTop: 2
  },
  optionsPriceText: {
    fontSize: 12,
    color: '#E67E22',
    marginTop: 2,
    fontWeight: '600'
  },
  noteText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 2
  },
  foodPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary
  },
  removedText: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  priceLabel: {
    fontSize: 13,
    color: '#666'
  },
  priceVal: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  totalVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary
  },
  logItem: {
    flexDirection: 'row',
    marginBottom: 12
  },
  logDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 10,
    marginTop: 5
  },
  logContent: {
    fontSize: 13,
    color: '#333',
    marginBottom: 2
  },
  logTime: {
    fontSize: 11,
    color: '#999'
  },
  hiddenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4E5',
    padding: 12,
    borderRadius: 8,
    gap: 8
  },
  hiddenInfoText: {
    fontSize: 13,
    color: '#E67E22',
    fontStyle: 'italic'
  },
  returnOrderBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFEBEE'
  },
  shopCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  shopTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 0.5
  },
  shopInfoLine: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6
  },
  shopItemsList: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  shopItemsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6
  },
  shopItemText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 4,
    lineHeight: 20
  }
});
