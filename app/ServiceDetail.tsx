// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { db } from '../src/services/firebase';
import { useAppStore } from '../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../src/styles/GlobalStyles';

export default function ServiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ item: string }>();

  // Parse dữ liệu dịch vụ từ params
  const service = useMemo(() => {
    try {
      const parsed = JSON.parse(params.item || '{}');
      return parsed.service ? parsed.service : parsed;
    } catch (error) {
      return {} as any;
    }
  }, [params.item]);

  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const isGuest = currentUser?.password === 'guest_no_password';

  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ảnh hiển thị
  const displayImage = useMemo(() => {
    return service.img || service.image || 'https://via.placeholder.com/300'; // Đã sửa để sử dụng service.image trực tiếp
  }, [service.img, service.image]);

  // Giá dịch vụ (ưu tiên pricePromo)
  const price = useMemo(() => {
    const promo = Number(service.pricePromo || 0) * 1000;
    const normal = Number(service.priceNormal || 0) * 1000;
    return promo > 0 ? promo : normal; // Giá hiển thị chính là giá khuyến mãi nếu có, không thì giá thường
  }, [service.pricePromo, service.priceNormal]);

  // Thông tin đơn vị cung cấp dịch vụ
  const shopData = useMemo(() => {
    const owner = users.find((u) => String(u.id) === String(service.shopId));
    return {
      name: owner?.shopName || owner?.name || `Đơn vị #${service.shopId || '?'}`,
      address: owner?.address || 'Đang cập nhật địa chỉ',
    };
  }, [users, service.shopId]);

  const formatCurrency = (val: number) => val.toLocaleString('vi-VN');

  const handleCreateServiceOrder = async () => {
    if (isSubmitting) return;
    if (!currentUser || isGuest) {
      Alert.alert('Thông báo', 'Vui lòng đăng nhập để đặt dịch vụ.');
      router.push('/login');
      return;
    }

    try {
      setIsSubmitting(true);
      const orderPayload = {
        orderId: Date.now().toString(),
        serviceId: service.id,
        serviceName: service.name,
        shopId: service.shopId,
        shopName: shopData.name,
        userId: currentUser.id,
        userName: currentUser.name,
        userPhone: currentUser.phone,
        userAddress: currentUser.address || '',
        price: price,
        note: note.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        logs: [{
          time: new Date().toISOString(),
          content: `Yêu cầu dịch vụ "${service.name}" đã được tạo bởi ${currentUser.name}.`,
          status: 'pending'
        }]
      };
      await addDoc(collection(db, 'serviceOrders'), orderPayload);
      Alert.alert('Thành công', 'Yêu cầu dịch vụ của bạn đã được gửi.');
      router.back();
    } catch (error) {
      console.error('Lỗi khi tạo đơn dịch vụ:', error);
      Alert.alert('Lỗi', 'Không thể gửi yêu cầu dịch vụ. Vui lòng thử lại sau.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: '#fff' }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Ảnh banner */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: displayImage }} style={styles.image} resizeMode="cover" />
        </View>

        {/* Khu vực thông tin cửa hàng + loại dịch vụ */}
        <View style={styles.content}>
          <View style={styles.shopSection}>
            <View style={styles.shopInfo}>
              <View style={styles.shopIconContainer}>
                <Ionicons name="build" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shopName}>{shopData.name}</Text>
                <View style={styles.addressRow}>
                  <Ionicons name="location-sharp" size={12} color="#888" style={{ marginRight: 4 }} />
                  <Text style={styles.shopAddress} numberOfLines={1}>{shopData.address}</Text>
                </View>
              </View>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>Dịch vụ</Text>
            </View>
          </View>

          {/* Tên dịch vụ */}
          <View style={styles.headerRow}>
            <Text style={styles.name}>{service.name || 'Dịch vụ chưa đặt tên'}</Text>
          </View>

          {/* Mô tả dịch vụ */}
          <Text style={styles.description}>
            {service.note || service.description || 'Chưa có mô tả cho dịch vụ này.'}
          </Text>
          {Number(service.priceNormal) * 1000 > price && ( // Chỉ hiển thị nếu có giảm giá
            <Text style={styles.discountNote}>
              Bạn được giảm{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {formatCurrency((Number(service.priceNormal) * 1000) - price)}đ
              </Text>{' '}
              cho dịch vụ này!
            </Text>
          )}

          {/* Ghi chú của khách hàng */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ghi chú cho đơn vị</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Ví dụ: thời gian mong muốn, yêu cầu chi tiết..."
              value={note}
              onChangeText={setNote}
              multiline
              placeholderTextColor="#999"
            />
          </View>
        </View>
      </ScrollView>

      {/* Footer đặt lịch */}
      <View style={styles.footer}>
        <View style={styles.priceSummary}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.totalLabel}>
              {Number(service.priceNormal) * 1000 > price ? 'Giá đã giảm:' : 'Giá:'}
            </Text>
          </View>
          <Text style={styles.totalPrice}>{formatCurrency(price)}đ</Text>
        </View>
        <TouchableOpacity style={[styles.orderBtn, { backgroundColor: '#ccc' }]} disabled={true}>
          {/* Logic đặt hàng đã bị loại bỏ */}
          <Text style={styles.orderBtnText}>CHỨC NĂNG ĐẶT LỊCH TẠM KHÓA</Text>
          {/* <ActivityIndicator size="small" color="#FFF" /> */}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageContainer: { width: '100%', height: 250 },
  image: { width: '100%', height: '100%' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 100,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  content: { padding: 20, backgroundColor: '#fff' },
  shopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  shopInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  shopIconContainer: { marginRight: 10, padding: 8, backgroundColor: '#F0F8FF', borderRadius: 10 },
  shopName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  shopAddress: { fontSize: 12, color: '#666' },
  typeBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }, // Giữ nguyên
  typeText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  headerRow: { marginBottom: 15 }, // Chỉ giữ margin bottom
  name: { fontSize: 22, fontWeight: 'bold' }, // Bỏ flex và marginRight
  // priceTag: { alignItems: 'flex-end' }, // Đã loại bỏ
  price: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  oldPrice: { fontSize: 14, color: '#999', textDecorationLine: 'line-through' },
  description: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 10 }, // Giảm margin bottom để gần discount note
  discountNote: { // Style mới cho chú thích giảm giá
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 25, // Đảm bảo khoảng cách với section tiếp theo
  },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  noteInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee', paddingBottom: Platform.OS === 'ios' ? 30 : 15 },
  priceSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  totalLabel: { fontSize: 16, color: '#666' },
  // priceNote đã bị loại bỏ
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  orderBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 15, alignItems: 'center' },
  orderBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});