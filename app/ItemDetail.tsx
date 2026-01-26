// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAppStore } from '../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../src/styles/GlobalStyles';

// --- Định nghĩa Types ---
interface ItemOption {
  name: string;
  index: number;
  price: number;
  status: any; 
  isDefault?: boolean;
}

interface FoodItem {
  id: number;
  name: string;
  description?: string;
  pricePromo: number;
  priceNormal: number;
  shopId: number;
  type: string;
  note?: string;
  option?: ItemOption[];
  isOutOfTime?: boolean;
  effectiveStatus?: string;
  timeStart?: number;
  timeEnd?: number;
  img?: string;
  image?: string[];
}

interface User {
  id: number;
  shopName?: string;
  name?: string;
  address?: string;
}

export default function ItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ item: string }>();
  
  const item: FoodItem = useMemo(() => {
    try {
      return JSON.parse(params.item || '{}');
    } catch (error) {
      console.error("Lỗi parse JSON:", error);
      return {} as FoodItem;
    }
  }, [params.item]);

  const users = useAppStore((state) => state.users) as User[];
  const addToCart = useAppStore((state) => state.addToCart);

  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');

  // Dictionary xác định thứ tự size (nhỏ -> lớn)
  const sizeOrder: Record<string, number> = {
    's': 1, 'size s': 1, 'small': 1,
    'm': 2, 'size m': 2, 'medium': 2,
    'l': 3, 'size l': 3, 'large': 3,
    'xl': 4, 'size xl': 4, 'x-large': 4,
    'xxl': 5, 'size xxl': 5, 'xx-large': 5
  };

  // Lọc các option hợp lệ
  const activeOptions = useMemo(() => {
    if (!item.option) return [];
    return item.option.filter(opt => 
      opt.status === true || 
      opt.status === 'true' || 
      opt.status === 'enable'
    );
  }, [item.option]);

  // --- LOGIC MỚI: Phân loại options ---
  const { sizeOptions, otherOptions } = useMemo(() => {
    const sizeOpts: ItemOption[] = [];
    const otherOpts: ItemOption[] = [];
    
    activeOptions.forEach(option => {
      const nameLower = option.name.toLowerCase();
      // Kiểm tra xem có phải là size không
      if (nameLower.includes('size') || 
          ['s', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'x-large', 'xx-large'].includes(nameLower)) {
        sizeOpts.push(option);
      } else {
        otherOpts.push(option);
      }
    });
    
    return { sizeOptions: sizeOpts, otherOptions: otherOpts };
  }, [activeOptions]);

  // Tìm size lớn nhất trong danh sách đã chọn
  const getLargestSize = (selectedSizeIndexes: number[]): number | null => {
    if (selectedSizeIndexes.length === 0) return null;
    
    let largestSize: ItemOption | null = null;
    selectedSizeIndexes.forEach(index => {
      const option = activeOptions.find(opt => opt.index === index);
      if (option) {
        const nameLower = option.name.toLowerCase().trim();
        const order = sizeOrder[nameLower] || 0;
        
        if (!largestSize || order > (sizeOrder[largestSize.name.toLowerCase().trim()] || 0)) {
          largestSize = option;
        }
      }
    });
    
    return largestSize ? largestSize.index : null;
  };

  // --- CẬP NHẬT: Logic khởi tạo selectedOptions với isDefault ---
  const [selectedOptions, setSelectedOptions] = useState<number[]>(() => {
    if (!item.option) return [];
    
    const defaultOptions: number[] = [];
    
    // 1. Xử lý size default: chỉ chọn size default lớn nhất
    const sizeDefaults = item.option.filter(opt => 
      opt.isDefault === true && 
      (opt.status === true || opt.status === 'true' || opt.status === 'enable')
    ).filter(opt => {
      const nameLower = opt.name.toLowerCase();
      return nameLower.includes('size') || 
             ['s', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'x-large', 'xx-large'].includes(nameLower);
    });
    
    if (sizeDefaults.length > 0) {
      // Tìm size default lớn nhất
      let largestSizeDefault: ItemOption | null = null;
      sizeDefaults.forEach(opt => {
        const nameLower = opt.name.toLowerCase().trim();
        const order = sizeOrder[nameLower] || 0;
        if (!largestSizeDefault || order > (sizeOrder[largestSizeDefault.name.toLowerCase().trim()] || 0)) {
          largestSizeDefault = opt;
        }
      });
      
      if (largestSizeDefault) {
        defaultOptions.push(largestSizeDefault.index);
      }
    }
    
    // 2. Xử lý other options default: chọn tất cả
    const otherDefaults = item.option.filter(opt => 
      opt.isDefault === true && 
      (opt.status === true || opt.status === 'true' || opt.status === 'enable')
    ).filter(opt => {
      const nameLower = opt.name.toLowerCase();
      return !(nameLower.includes('size') || 
              ['s', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'x-large', 'xx-large'].includes(nameLower));
    });
    
    otherDefaults.forEach(opt => {
      defaultOptions.push(opt.index);
    });
    
    return defaultOptions;
  });

  // Xử lý khi chọn/bỏ chọn option
  const handleToggleOption = (optionIndex: number, isSizeOption: boolean) => {
    setSelectedOptions(prev => {
      if (isSizeOption) {
        // Nếu là size: chỉ được chọn 1 size
        if (prev.includes(optionIndex)) {
          // Bỏ chọn size hiện tại
          return prev.filter(i => {
            const option = activeOptions.find(opt => opt.index === i);
            const nameLower = option?.name.toLowerCase() || '';
            const isSize = nameLower.includes('size') || 
                           ['s', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'x-large', 'xx-large'].includes(nameLower);
            return !isSize; // Giữ lại các option không phải size
          });
        } else {
          // Chọn size mới: bỏ tất cả size cũ, giữ các option khác
          const otherOptions = prev.filter(index => {
            const option = activeOptions.find(opt => opt.index === index);
            const nameLower = option?.name.toLowerCase() || '';
            return !(nameLower.includes('size') || 
                    ['s', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'x-large', 'xx-large'].includes(nameLower));
          });
          return [...otherOptions, optionIndex];
        }
      } else {
        // Nếu là topping/option khác: chọn/bỏ chọn tự do
        if (prev.includes(optionIndex)) {
          return prev.filter(i => i !== optionIndex);
        } else {
          return [...prev, optionIndex];
        }
      }
    });
  };

  // Kiểm tra xem option có đang được chọn không
  const isOptionSelected = (optionIndex: number): boolean => {
    return selectedOptions.includes(optionIndex);
  };

  const shopData = useMemo(() => {
    const owner = users.find(u => Number(u.id) === Number(item.shopId));
    return {
      name: owner?.shopName || owner?.name || `Quán #${item.shopId}`,
      address: owner?.address || "Đang cập nhật địa chỉ",
    };
  }, [users, item.shopId]);

  const extraPrice = useMemo(() => {
    if (activeOptions.length === 0 || selectedOptions.length === 0) return 0;
    
    // Tính giá size lớn nhất
    let total = 0;
    const selectedSizeIndexes = selectedOptions.filter(index => {
      const option = activeOptions.find(opt => opt.index === index);
      const nameLower = option?.name.toLowerCase() || '';
      return nameLower.includes('size') || 
             ['s', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'x-large', 'xx-large'].includes(nameLower);
    });
    
    // Chỉ tính giá của size lớn nhất
    const largestSizeIndex = getLargestSize(selectedSizeIndexes);
    if (largestSizeIndex) {
      const sizeOption = activeOptions.find(opt => opt.index === largestSizeIndex);
      if (sizeOption) {
        total += sizeOption.price * 1000;
      }
    }
    
    // Tính giá các option khác
    selectedOptions.forEach(index => {
      // Bỏ qua các size không phải là lớn nhất
      if (largestSizeIndex && index !== largestSizeIndex) {
        const option = activeOptions.find(opt => opt.index === index);
        const nameLower = option?.name.toLowerCase() || '';
        const isSize = nameLower.includes('size') || 
                       ['s', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'x-large', 'xx-large'].includes(nameLower);
        if (isSize) return; // Bỏ qua các size không phải lớn nhất
      }
      
      const option = activeOptions.find(opt => opt.index === index);
      if (option && index !== largestSizeIndex) {
        total += option.price * 1000;
      }
    });
    
    return total;
  }, [selectedOptions, activeOptions]);

  const totalPrice = useMemo(() => {
    return ((item.pricePromo * 1000) + extraPrice) * quantity;
  }, [item.pricePromo, quantity, extraPrice]);

  const isDisabled = item.effectiveStatus === 'disable' || item.isOutOfTime;
  const statusLabel = item.isOutOfTime ? "HẾT GIỜ BÁN" : "TẠM NGƯNG";

  const handleAddToCart = () => {
    if (isDisabled) {
      const msg = item.isOutOfTime
        ? `Món này chỉ bán từ ${item.timeStart || 0}h đến ${item.timeEnd || 24}h.`
        : "Món ăn này hiện đang tạm ngưng phục vụ.";
      Alert.alert("Thông báo", msg);
      return;
    }

    // Lọc các option đã chọn (chỉ lấy size lớn nhất + các topping khác)
    const selectedSizeIndexes = selectedOptions.filter(index => {
      const option = activeOptions.find(opt => opt.index === index);
      const nameLower = option?.name.toLowerCase() || '';
      return nameLower.includes('size') || 
             ['s', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'x-large', 'xx-large'].includes(nameLower);
    });
    
    const largestSizeIndex = getLargestSize(selectedSizeIndexes);
    const finalSelectedOptions = selectedOptions.filter(index => {
      if (!largestSizeIndex) return true;
      
      const option = activeOptions.find(opt => opt.index === index);
      const nameLower = option?.name.toLowerCase() || '';
      const isSize = nameLower.includes('size') || 
                     ['s', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'x-large', 'xx-large'].includes(nameLower);
      
      // Giữ size lớn nhất, bỏ các size khác
      if (isSize) {
        return index === largestSizeIndex;
      }
      return true;
    });

    const selectedOptionObjects = activeOptions.filter(opt => finalSelectedOptions.includes(opt.index));

    addToCart({
      ...item,
      selectedOptions: selectedOptionObjects,
      extraPrice: extraPrice
    }, quantity, note);

    Alert.alert("Thành công", `Đã thêm ${item.name} vào giỏ hàng`);
    router.back();
  };

  const formatCurrency = (val: number) => val.toLocaleString('vi-VN');

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: '#fff' }]}>
      <StatusBar barStyle="dark-content" />
      
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.img || (item.image && item.image[0]) || 'https://via.placeholder.com/300' }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.content}>
          <View style={styles.shopSection}>
            <View style={styles.shopInfo}>
              <View style={styles.shopIconContainer}>
                <Ionicons name="storefront" size={20} color={COLORS.primary} />
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
              <Text style={styles.typeText}>{item.type === 'đồ ăn' ? '🍽️ Đồ ăn' : '🥤 Đồ uống'}</Text>
            </View>
          </View>

          <View style={styles.headerRow}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.priceTag}>
              <Text style={styles.price}>{formatCurrency(item.pricePromo * 1000)}đ</Text>
              {item.priceNormal > item.pricePromo && (
                <Text style={styles.oldPrice}>{formatCurrency(item.priceNormal * 1000)}đ</Text>
              )}
            </View>
          </View>

          <Text style={styles.description}>
            {item.note || item.description || "Chưa có mô tả cho món ăn này."}
          </Text>

          {/* Hiển thị Size Options */}
          {sizeOptions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chọn Size (chọn 1)</Text>
              <View style={styles.optionsGrid}>
                {sizeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.index}
                    style={[
                      styles.optionButton, 
                      isOptionSelected(option.index) && styles.optionButtonActive
                    ]}
                    onPress={() => handleToggleOption(option.index, true)}
                  >
                    <Text style={[styles.optionName, isOptionSelected(option.index) && {color: '#fff'}]}>
                      {option.name}
                    </Text>
                    <Text style={[styles.optionPrice, isOptionSelected(option.index) && {color: '#fff'}]}>
                      +{formatCurrency(option.price * 1000)}đ
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Hiển thị Other Options */}
          {otherOptions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tuỳ chọn thêm (chọn nhiều)</Text>
              <View style={styles.optionsGrid}>
                {otherOptions.map((option) => (
                  <TouchableOpacity
                    key={option.index}
                    style={[
                      styles.optionButton, 
                      isOptionSelected(option.index) && styles.optionButtonActive
                    ]}
                    onPress={() => handleToggleOption(option.index, false)}
                  >
                    <Text style={[styles.optionName, isOptionSelected(option.index) && {color: '#fff'}]}>
                      {option.name}
                    </Text>
                    <Text style={[styles.optionPrice, isOptionSelected(option.index) && {color: '#fff'}]}>
                      +{formatCurrency(option.price * 1000)}đ
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ghi chú cho quán</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Ví dụ: Ít đường, không hành..."
              value={note}
              onChangeText={setNote}
              multiline
            />
          </View>

          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Số lượng</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
                <Ionicons name="remove" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceSummary}>
          <Text style={styles.totalLabel}>Tổng cộng:</Text>
          <Text style={styles.totalPrice}>{formatCurrency(totalPrice)}đ</Text>
        </View>
        <TouchableOpacity 
          style={[styles.addToCartBtn, isDisabled && {backgroundColor: '#ccc'}]} 
          onPress={handleAddToCart}
          disabled={isDisabled}
        >
          <Text style={styles.addToCartText}>{isDisabled ? statusLabel : "THÊM VÀO GIỎ HÀNG"}</Text>
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
    borderBottomColor: '#f0f0f0' 
  },
  shopInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  shopIconContainer: { marginRight: 10, padding: 8, backgroundColor: '#F0F8FF', borderRadius: 10 },
  shopName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  shopAddress: { fontSize: 12, color: '#666' },
  typeBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  typeText: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  name: { fontSize: 22, fontWeight: 'bold', flex: 1, marginRight: 10 },
  priceTag: { alignItems: 'flex-end' },
  price: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  oldPrice: { fontSize: 14, color: '#999', textDecorationLine: 'line-through' },
  description: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 25 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionButton: { 
    backgroundColor: '#F5F5F5', 
    borderRadius: 10, 
    padding: 12, 
    minWidth: '47%', 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  optionButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionName: { fontSize: 14, fontWeight: '500', color: '#333' },
  optionPrice: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  noteInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  quantitySection: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderTopWidth: 1, 
    borderColor: '#eee' 
  },
  quantityRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 20, padding: 5 },
  qtyBtn: { padding: 5 },
  qtyText: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20 },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  priceSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { fontSize: 16, color: '#666' },
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  addToCartBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 15, alignItems: 'center' },
  addToCartText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});