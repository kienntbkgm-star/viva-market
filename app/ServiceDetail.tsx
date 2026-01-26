// @ts-nocheck
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore'; // Import addDoc và collection
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'; // Thêm ActivityIndicator
import { db } from '../src/services/firebase'; // Import db
import { useAppStore } from '../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../src/styles/GlobalStyles';
 
const { width } = Dimensions.get('window');

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const users = useAppStore((state) => state.users);

  const { currentUser, isGuest } = useAppStore(); // Lấy thông tin người dùng hiện tại
  // LOGIC TRUY XUẤT DỮ LIỆU
  const itemData = useMemo(() => {
    if (params.item) {
      try {
        const parsed = JSON.parse(params.item);
        return parsed.service ? parsed.service : parsed;
      } catch (e) {
        console.error("Parse error", e);
        return null;
      }
    }
    return null;
  }, [params.item]);

  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Trạng thái để quản lý nút "ĐẶT LỊCH NGAY"

  // HIỂN THỊ ẢNH: Xử lý mảng ảnh và dùng resizeMode contain để không mất chi tiết
  const displayImage = useMemo(() => {
    const img = itemData?.image || itemData?.img;
    if (!img) return 'https://via.placeholder.com/400';
    return Array.isArray(img) ? img[0] : img;
  }, [itemData]);

  const shop = useMemo(() => {
    return users.find(u => Number(u.id) === Number(itemData?.shopId));
  }, [itemData, users]);

  const price = useMemo(() => {
    if (!itemData) return 0;
    return (itemData.pricePromo || itemData.priceNormal || 0) * 1000;
  }, [itemData]);

  // Hàm xử lý tạo đơn hàng dịch vụ
  const handleCreateServiceOrder = async () => {
    if (isSubmitting) return; // Ngăn chặn gửi nhiều lần

    if (isGuest || !currentUser) {
      Alert.alert("Thông báo", "Vui lòng đăng nhập để đặt dịch vụ.");
      router.push('/login'); // Chuyển hướng đến màn hình đăng nhập
      return;
    }

    if (!itemData) {
      Alert.alert("Lỗi", "Không thể tạo đơn hàng. Dữ liệu dịch vụ không hợp lệ.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        orderId: Date.now().toString(), // ID duy nhất cho đơn hàng
        serviceId: itemData.id,
        serviceName: itemData.name,
        shopId: itemData.shopId,
        shopName: shop?.shopName || shop?.name || `Shop #${itemData.shopId}`,
        userId: currentUser.id,
        userName: currentUser.name,
        userPhone: currentUser.phone,
        userAddress: currentUser.address || '', // Giả định currentUser có trường address
        price: price, // Sử dụng giá đã tính toán (đã nhân 1000)
        note: note.trim(),
        status: 'pending', // Trạng thái ban đầu
        createdAt: new Date().toISOString(),
        logs: [{
          time: new Date().toISOString(),
          content: `Yêu cầu dịch vụ "${itemData.name}" đã được tạo bởi ${currentUser.name}.`,
          status: 'pending'
        }]
      };

      await addDoc(collection(db, 'serviceOrders'), orderPayload);

      Alert.alert("Thành công", "Yêu cầu dịch vụ của bạn đã được gửi đến hệ thống. Chúng tôi sẽ liên hệ lại sớm nhất!");
      router.back(); // Quay lại màn hình trước sau khi đặt hàng thành công
    } catch (error) {
      console.error("Lỗi khi tạo đơn dịch vụ:", error);
      Alert.alert("Lỗi", "Không thể gửi yêu cầu dịch vụ. Vui lòng thử lại sau.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!itemData) {
    return (
      <SafeAreaView style={styles.loadingArea}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{marginTop: 10, color: '#666'}}>Đang tải thông tin dịch vụ...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={GlobalStyles.container}>
      {/* CUSTOM HEADER - Đã thay đổi nút X và Share thành nút Quay lại */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.navIcon}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>Chi tiết dịch vụ</Text>
        <View style={{ width: 40 }} /> {/* View trống để giữ tiêu đề ở giữa */}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 120}}>
        
        {/* BANNER ẢNH - resizeMode="contain" để hiển thị trọn vẹn dữ liệu ảnh */}
        <View style={styles.imageBox}>
          <Image 
            source={{ uri: displayImage }} 
            style={styles.imageContent} 
            resizeMode="contain" 
          />
          <View style={styles.badgeType}>
            <Text style={styles.badgeText}>{itemData.type?.toUpperCase() || 'DỊCH VỤ'}</Text>
          </View>
        </View>

        {/* THÔNG TIN CHÍNH */}
        <View style={styles.cardInfo}>
          <View style={styles.priceRow}>
            <Text style={styles.mainPrice}>{price.toLocaleString()}đ</Text>
            {itemData.priceNormal > itemData.pricePromo && (
              <Text style={styles.oldPrice}>{(itemData.priceNormal * 1000).toLocaleString()}đ</Text>
            )}
          </View>
          
          <Text style={styles.serviceName}>{itemData.name}</Text>
          
          <View style={styles.guaranteeRow}>
            <MaterialCommunityIcons name="shield-check" size={18} color="#27AE60" />
            <Text style={styles.guaranteeText}>Cam kết chất lượng & Bảo hành tận nơi</Text>
          </View>

          <View style={styles.divider} />
          
          <Text style={styles.sectionLabel}>Mô tả dịch vụ</Text>
          <Text style={styles.description}>
            {itemData.note || "Dịch vụ chuyên nghiệp với đội ngũ kỹ thuật viên giàu kinh nghiệm. Hỗ trợ nhanh chóng, minh bạch chi phí và tận tâm phục vụ quý khách."}
          </Text>
        </View>

        {/* THÔNG TIN ĐƠN VỊ CUNG CẤP */}
        {shop && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ĐƠN VỊ THỰC HIỆN</Text>
            <TouchableOpacity style={styles.shopCard} activeOpacity={0.8}>
              <Image source={{ uri: shop.imgShopSquare || 'https://via.placeholder.com/100' }} style={styles.shopLogo} />
              <View style={{flex: 1}}>
                <Text style={styles.shopName}>{shop.shopName || shop.name}</Text>
                <View style={styles.locRow}>
                  <Ionicons name="location" size={12} color={COLORS.primary} />
                  <Text style={styles.shopLoc} numberOfLines={1}>{shop.address || "Khu vực lân cận"}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </View>
        )}

        {/* PHẦN GHI CHÚ YÊU CẦU */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YÊU CẦU CỦA BẠN</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Mô tả tình trạng, thời gian mong muốn hoặc các yêu cầu riêng khác..."
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              placeholderTextColor="#AAA"
            />
          </View>
        </View>

      </ScrollView>

      {/* FOOTER THANH TOÁN */}
      <View style={styles.footer}>
        <View style={styles.totalArea}>
          <Text style={styles.totalLabel}>Phí dự kiến</Text>
          <Text style={styles.totalValue}>{price.toLocaleString()}đ</Text>
        </View>
        <TouchableOpacity
          style={styles.orderBtn}
          onPress={handleCreateServiceOrder} // Gọi hàm xử lý tạo đơn hàng
          disabled={isSubmitting} // Vô hiệu hóa nút khi đang gửi
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFF" /> // Hiển thị loading khi đang gửi
          ) : (
            <>
              <Text style={styles.orderBtnText}>ĐẶT LỊCH NGAY</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFF" style={{marginLeft: 5}} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingArea: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  navIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, textAlign: 'center' },

  imageBox: { width: '100%', height: 280, backgroundColor: '#F9F9F9', position: 'relative' },
  imageContent: { width: '100%', height: '100%' },
  badgeType: { position: 'absolute', top: 15, left: 15, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  cardInfo: { padding: 20, backgroundColor: '#FFF' },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mainPrice: { fontSize: 26, fontWeight: 'bold', color: COLORS.primary },
  oldPrice: { fontSize: 15, color: '#BBB', textDecorationLine: 'line-through', marginLeft: 12 },
  serviceName: { fontSize: 22, fontWeight: 'bold', color: '#222', marginBottom: 12 },
  guaranteeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 8, borderRadius: 8 },
  guaranteeText: { fontSize: 12, color: '#2E7D32', marginLeft: 6, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
  
  section: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 8, borderTopColor: '#F8F9FA' },
  sectionLabel: { fontSize: 11, fontWeight: 'bold', color: '#999', marginBottom: 15, letterSpacing: 1 },
  description: { fontSize: 14, color: '#666', lineHeight: 22 },

  shopCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  shopLogo: { width: 50, height: 50, borderRadius: 12, marginRight: 15 },
  shopName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  shopLoc: { fontSize: 12, color: '#777', marginLeft: 4, flex: 1 },

  inputWrapper: { backgroundColor: '#F9F9F9', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#EEE' },
  input: { fontSize: 14, color: '#333', minHeight: 80, textAlignVertical: 'top' },

  footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#EEE', paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  totalArea: { flex: 1 },
  totalLabel: { fontSize: 12, color: '#888' },
  totalValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  orderBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 25, paddingVertical: 15, borderRadius: 16, flexDirection: 'row', alignItems: 'center', elevation: 3 },
  orderBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});