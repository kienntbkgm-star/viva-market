// @ts-nocheck
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, increment, updateDoc } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export default function CartScreen() {
  const router = useRouter();
  const { cart, system, promos, currentUser, isGuest, guestId, addToCart, removeFromCart, clearCart, getTotalPrice, users } = useAppStore();

  const [shipType, setShipType] = useState('normal');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [loading, setLoading] = useState(false); 
  const [isSuccess, setIsSuccess] = useState(false); 
  const [showConfirm, setShowConfirm] = useState(false);

  const [gName, setGName] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gAddress, setGAddress] = useState('');

  // SỬA LỖI: Tính tạm tính bao gồm cả giá món và giá Option
  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const itemPrice = (item.pricePromo || item.priceNormal) * 1000;
      const optionPrice = item.extraPrice || 0;
      return sum + (itemPrice + optionPrice) * item.quantity;
    }, 0) / 1000;
  }, [cart]);

  // Cấu hình phí ship từ dữ liệu hệ thống
  const shipConfig = system?.ship?.food;
  const normalShipPrice = shipConfig?.normalValue || 11;
  const atDoorShipPrice = shipConfig?.atDoorValue || 15;
  const stepPrice = shipConfig?.step || 5;

  const isShipTypeVisible = useMemo(() => {
    return normalShipPrice !== atDoorShipPrice;
  }, [normalShipPrice, atDoorShipPrice]);

  const getShopNameFromId = (shopId) => {
    if (!shopId) return 'Quán ăn';
    const shopData = users?.find(u => u.id === shopId || u.uid === shopId);
    return shopData?.shopName || `Quán #${shopId}`;
  };

  const baseShipFee = shipType === 'atDoor' ? atDoorShipPrice : normalShipPrice;
  
  const { uniqueShopsCount, extraStepFee } = useMemo(() => {
    if (!cart || cart.length === 0) return { uniqueShopsCount: 0, extraStepFee: 0 };
    const shopIds = new Set(cart.map(item => item.shopId));
    const count = shopIds.size;
    const fee = count > 1 ? (count - 1) * stepPrice : 0;
    return { uniqueShopsCount: count, extraStepFee: fee };
  }, [cart, stepPrice]);

  const totalShipFee = baseShipFee + extraStepFee;

  const discount = useMemo(() => {
    if (!appliedPromo) return 0;
    if (appliedPromo.type === 'percent') {
      return Math.min((subTotal * appliedPromo.value) / 100, appliedPromo.maxDiscount || 999);
    }
    if (appliedPromo.type === 'freeship') {
        return Math.min(totalShipFee, appliedPromo.value);
    }
    return appliedPromo.value;
  }, [appliedPromo, subTotal, totalShipFee]);

  const finalTotal = subTotal + totalShipFee - discount;

  const showAppAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const validatePhoneNumber = (phone) => {
    const vnf_regex = /((09|03|07|08|05)+([0-9]{8})\b)/g;
    return vnf_regex.test(phone.trim());
  };

  const handleOpenConfirm = () => {
    if (cart.length === 0) return;
    const isGuestUser = currentUser && !currentUser.password;
    if (isGuestUser || !currentUser) {
      if (!gName.trim() || !gPhone.trim() || !gAddress.trim()) {
        showAppAlert("Thông báo", "Vui lòng nhập đầy đủ thông tin giao hàng!");
        return;
      }
      if (!validatePhoneNumber(gPhone)) {
        showAppAlert("Lỗi", "Số điện thoại không đúng định dạng Việt Nam.");
        return;
      }
    } else {
      if (!currentUser.address || !currentUser.phone) {
        showAppAlert("Thông báo", "Vui lòng cập nhật SĐT và Địa chỉ trong hồ sơ.");
        return;
      }
    }
    setShowConfirm(true);
  };

  const handleConfirmOrder = async () => {
    setLoading(true);
    try {
      const isGuestUser = currentUser && !currentUser.password;
      const orderId = `FOOD-${Date.now()}`;
      const newOrder = {
        orderId: orderId,
        userId: currentUser ? currentUser.id : guestId, 
        userName: (isGuestUser || !currentUser) ? gName : currentUser.name,
        userPhone: (isGuestUser || !currentUser) ? gPhone : currentUser.phone,
        address: (isGuestUser || !currentUser) ? gAddress : currentUser.address,
        items: cart.map(item => ({...item, shopName: getShopNameFromId(item.shopId)})),
        totalFood: subTotal,
        baseShip: baseShipFee,
        extraStepFee: extraStepFee,
        shopCount: uniqueShopsCount,
        discount,
        finalTotal,
        shipType,
        status: 'pending',
        paymentMethod: 'COD',
        createdAt: new Date().toISOString(),
        isGuest: isGuestUser || !currentUser,
        promoCode: appliedPromo?.code || "",
        logs: [{ status: 'pending', time: new Date().toISOString(), content: (isGuestUser || !currentUser) ? 'Khách vãng lai đặt hàng' : 'Thành viên đặt hàng' }]
      };

      await addDoc(collection(db, 'foodOrders'), newOrder);
      if (currentUser?.id && !isGuestUser) {
        await updateDoc(doc(db, 'users', currentUser.id.toString()), { point: increment(Math.floor(finalTotal / 10)) });
      }
      setIsSuccess(true);
      clearCart();
    } catch (error) {
      showAppAlert("Lỗi", "Không thể gửi đơn hàng. Thử lại sau!");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  if (isSuccess) {
    return (
      <SafeAreaView style={[GlobalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="checkmark-circle" size={100} color="#27AE60" />
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginTop: 20 }}>ĐẶT HÀNG THÀNH CÔNG!</Text>
        <TouchableOpacity 
            style={[styles.checkoutBtn, { marginTop: 30, width: '80%' }]} 
            onPress={() => { setIsSuccess(false); router.replace('/(tabs)/home'); }}
        >
          <Text style={styles.checkoutText}>TIẾP TỤC MUA SẮM</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Giỏ hàng</Text>
        <TouchableOpacity onPress={clearCart}><Text style={{ color: '#FF4747', fontWeight: 'bold' }}>Xóa hết</Text></TouchableOpacity>
      </View>

      <FlatList
        data={cart}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <Image 
                source={{ uri: item.img || (Array.isArray(item.image) ? item.image[0] : item.image) }} 
                style={styles.itemImage} 
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.selectedOptions && item.selectedOptions.length > 0 && (
                <Text style={{ fontSize: 11, color: COLORS.primary, fontStyle: 'italic' }}>
                  {item.selectedOptions.map(o => o.name).join(', ')}
                </Text>
              )}
              <Text style={styles.itemPrice}>
                {formatCurrency((item.pricePromo || item.priceNormal) + (item.extraPrice || 0) / 1000)}đ
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <MaterialCommunityIcons name="store" size={12} color="#999" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 11, color: '#7f8c8d' }}>
                    {getShopNameFromId(item.shopId)}
                </Text>
              </View>
            </View>
            <View style={styles.quantityBox}>
              <TouchableOpacity onPress={() => removeFromCart(item.id, item.note)}><Ionicons name="remove-circle-outline" size={24} color={COLORS.primary} /></TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => addToCart(item, 1, item.note)}><Ionicons name="add-circle-outline" size={24} color={COLORS.primary} /></TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={{ alignItems: 'center', marginTop: 100 }}><Ionicons name="cart-outline" size={80} color="#CCC" /><Text style={{ color: '#999' }}>Giỏ hàng trống</Text></View>}
        contentContainerStyle={{ padding: 15 }}
      />

      {cart.length > 0 && (
        <ScrollView style={styles.summaryContainer} showsVerticalScrollIndicator={false}>
          {(currentUser && !currentUser.password || !currentUser) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
              <TextInput style={styles.guestInput} placeholder="Tên người nhận" value={gName} onChangeText={setGName} />
              <TextInput style={styles.guestInput} placeholder="SĐT liên hệ" value={gPhone} onChangeText={setGPhone} keyboardType="phone-pad" />
              <TextInput style={styles.guestInput} placeholder="Địa chỉ chi tiết" value={gAddress} onChangeText={setGAddress} />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ưu đãi dành cho bạn</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(promos || []).filter(p => p.enable).map((p) => (
                <TouchableOpacity 
                  key={p.id} 
                  onPress={() => setAppliedPromo(appliedPromo?.id === p.id ? null : p)}
                  style={[styles.promoTicket, appliedPromo?.id === p.id ? styles.promoTicketActive : styles.promoTicketInactive]}
                >
                  <View style={styles.promoLeft}>
                    <MaterialCommunityIcons name="ticket-percent" size={24} color={appliedPromo?.id === p.id ? '#fff' : COLORS.primary} />
                  </View>
                  <View style={styles.promoRight}>
                    <Text style={[styles.promoCode, appliedPromo?.id === p.id && {color: '#fff'}]}>{p.code}</Text>
                    <Text style={[styles.promoDesc, appliedPromo?.id === p.id && {color: '#fff'}]}>Giảm {formatCurrency(p.value)}đ</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {isShipTypeVisible && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hình thức nhận hàng</Text>
              <View style={styles.shipOptions}>
                <TouchableOpacity style={[styles.shipBtn, shipType === 'normal' && styles.shipActive]} onPress={() => setShipType('normal')}>
                  <Text style={[styles.shipText, shipType === 'normal' && styles.shipTextActive]}>Tại sảnh ({normalShipPrice}k)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.shipBtn, shipType === 'atDoor' && styles.shipActive]} onPress={() => setShipType('atDoor')}>
                  <Text style={[styles.shipText, shipType === 'atDoor' && styles.shipTextActive]}>Tại cửa ({atDoorShipPrice}k)</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={styles.priceContainer}>
            <View style={styles.priceRow}><Text>Tạm tính:</Text><Text>{formatCurrency(subTotal)}đ</Text></View>
            <View style={styles.priceRow}><Text>Phí ship:</Text><Text>{formatCurrency(baseShipFee)}đ</Text></View>
            
            {extraStepFee > 0 && (
                <View style={styles.priceRow}>
                    <Text style={{color: '#E67E22'}}>Phí thêm quán (mỗi quán thêm +{stepPrice}k):</Text>
                    <Text style={{color: '#E67E22'}}>{formatCurrency(extraStepFee)}đ</Text>
                </View>
            )}

            {discount > 0 && <View style={styles.priceRow}><Text style={{ color: '#27AE60' }}>Giảm giá:</Text><Text style={{ color: '#27AE60' }}>-{formatCurrency(discount)}đ</Text></View>}
            <View style={styles.totalRow}><Text style={styles.totalLabel}>TỔNG CỘNG:</Text><Text style={styles.totalValue}>{formatCurrency(finalTotal)}đ</Text></View>
          </View>

          <TouchableOpacity style={styles.checkoutBtn} onPress={handleOpenConfirm} disabled={loading}>
            <Text style={styles.checkoutText}>{loading ? "ĐANG XỬ LÝ..." : "ĐẶT HÀNG NGAY"}</Text>
          </TouchableOpacity>
          <View style={{ height: 50 }} />
        </ScrollView>
      )}

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmBox}>
            <Ionicons name="help-circle" size={50} color={COLORS.primary} />
            <Text style={styles.confirmTitle}>Xác nhận đặt hàng?</Text>
            
            {uniqueShopsCount > 1 && (
                <Text style={{ fontSize: 12, color: '#E67E22', textAlign: 'center', marginTop: 5 }}>
                    (Đơn hàng từ {uniqueShopsCount} quán khác nhau)
                </Text>
            )}

            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowConfirm(false)}><Text style={styles.btnCancelText}>HỦY</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirmOrder}><Text style={styles.btnConfirmText}>ĐỒNG Ý</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 15, marginBottom: 10, alignItems: 'center', elevation: 2 },
  itemImage: { width: 60, height: 60, borderRadius: 10 },
  itemName: { fontWeight: 'bold', fontSize: 14 },
  itemPrice: { color: COLORS.primary, fontWeight: 'bold' },
  quantityBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quantityText: { fontWeight: 'bold', fontSize: 16 },
  summaryContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 20, elevation: 10, maxHeight: '55%' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  promoTicket: { flexDirection: 'row', width: 180, height: 60, marginRight: 12, borderRadius: 8, borderWidth: 1.5, borderStyle: 'dashed', overflow: 'hidden' },
  promoTicketInactive: { borderColor: COLORS.primary, backgroundColor: '#fff' },
  promoTicketActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  promoLeft: { width: 50, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#eee', borderStyle: 'dashed' },
  promoRight: { flex: 1, justifyContent: 'center', paddingLeft: 10 },
  promoCode: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  promoDesc: { fontSize: 10, color: '#666' },
  shipOptions: { flexDirection: 'row', gap: 10 },
  shipBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee', alignItems: 'center' },
  shipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  shipText: { color: '#666', fontWeight: 'bold' },
  shipTextActive: { color: '#fff' },
  guestInput: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#eee' },
  priceContainer: { gap: 8, marginBottom: 20 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#eee', paddingTop: 10 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  checkoutBtn: { backgroundColor: COLORS.primary, padding: 18, borderRadius: 15, alignItems: 'center' },
  checkoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmBox: { width: 300, backgroundColor: '#fff', borderRadius: 20, padding: 25, alignItems: 'center' },
  confirmTitle: { fontSize: 18, fontWeight: 'bold' },
  confirmButtons: { flexDirection: 'row', gap: 15, marginTop: 20 },
  btnCancel: { flex: 1, padding: 12, backgroundColor: '#eee', borderRadius: 10, alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', color: '#666' },
  btnConfirm: { flex: 1, padding: 12, backgroundColor: COLORS.primary, borderRadius: 10, alignItems: 'center' },
  btnConfirmText: { fontWeight: 'bold', color: '#fff' }
});