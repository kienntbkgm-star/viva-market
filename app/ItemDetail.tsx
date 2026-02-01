// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { sendNotificationToMultiple } from '../src/components/Notification';
import ResidentOrderModal from '../src/components/ResidentOrderModal';
import { db } from '../src/services/firebase';
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
  const foods = useAppStore((state) => state.foods) as FoodItem[];
  const addToCart = useAppStore((state) => state.addToCart);
  const currentUser = useAppStore((state) => state.currentUser);

  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  
  // State cho các món phụ: { [foodId]: { quantity, selectedOptions, extraCost } }
  const [sideItems, setSideItems] = useState<Record<number, { quantity: number; selectedOpts: number[]; extraCost: number }>>({});
  
  // State cho modal xác nhận đặt hàng shop cư dân
  const [showResidentModal, setShowResidentModal] = useState(false);
  
  // State cho guest user info (khi đặt hàng shop cư dân)
  const [gName, setGName] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gAddress, setGAddress] = useState('');

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
      isResidentShop: owner?.isResidentShop || false,
    };
  }, [users, item.shopId]);

  // Lấy các món khác cùng shop
  const sameShopItems = useMemo(() => {
    return foods.filter(f => 
      Number(f.shopId) === Number(item.shopId) && 
      Number(f.id) !== Number(item.id) &&
      f.effectiveStatus !== 'disable'
    ).slice(0, 5); // Giới hạn 5 món
  }, [foods, item.shopId, item.id]);

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
    // Giá món chính
    const mainItemTotal = ((item.pricePromo * 1000) + extraPrice) * quantity;
    
    // Giá các món phụ
    const sideItemsTotal = Object.entries(sideItems).reduce((sum, [foodId, data]) => {
      if (data.quantity === 0) return sum;
      const foodItem = foods.find(f => Number(f.id) === Number(foodId));
      if (!foodItem) return sum;
      return sum + ((foodItem.pricePromo * 1000) + data.extraCost) * data.quantity;
    }, 0);
    
    return mainItemTotal + sideItemsTotal;
  }, [item.pricePromo, quantity, extraPrice, sideItems, foods]);

  // Kiểm tra xem có món nào được chọn không
  const hasAnyItem = useMemo(() => {
    const hasMainItem = quantity > 0;
    const hasSideItems = Object.values(sideItems).some(data => data.quantity > 0);
    return hasMainItem || hasSideItems;
  }, [quantity, sideItems]);

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

    // Kiểm tra shop owner không được đặt hàng của chính mình
    if (currentUser && currentUser.role === 'chủ shop' && Number(currentUser.id) === Number(item.shopId)) {
      if (Platform.OS === 'web') {
        window.alert('❌ Shop owner không được tự đặt hàng của shop mình!');
      } else {
        Alert.alert('Thông báo', '❌ Shop owner không được tự đặt hàng của shop mình!');
      }
      return;
    }

    // Nếu là shop cư dân → Đặt hàng trực tiếp (chưa implement thật)
    if (shopData.isResidentShop) {
      handleResidentShopOrder();
      return;
    }

    // Shop thường → Thêm vào giỏ hàng như bình thường
    handleAddToCartNormal();
  };

  // Logic đặt hàng cho shop cư dân
  const handleResidentShopOrder = () => {
    // Kiểm tra nếu là guest user, cần điền đầy đủ thông tin
    const isGuestUser = currentUser && !currentUser.password;
    if (isGuestUser || !currentUser) {
      if (!gName.trim() || !gPhone.trim() || !gAddress.trim()) {
        if (Platform.OS === 'web') {
          window.alert('Vui lòng điền đầy đủ thông tin giao hàng (Tên, SĐT, Địa chỉ)');
        } else {
          Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin giao hàng (Tên, SĐT, Địa chỉ)');
        }
        return;
      }
    }
    
    // Mở modal xác nhận
    setShowResidentModal(true);
  };
  
  // Xử lý khi xác nhận đặt hàng từ modal
  const handleConfirmResidentOrder = async () => {
    setShowResidentModal(false);
    
    try {
      const isGuestUser = currentUser && !currentUser.password;
      const orderId = `RESIDENT-${Date.now()}`;
      
      // Chuẩn bị danh sách items
      const orderItems = [];
      
      // Main item (nếu có)
      if (quantity > 0) {
        orderItems.push({
          id: item.id,
          name: item.name,
          pricePromo: item.pricePromo,
          priceNormal: item.priceNormal,
          quantity: quantity,
          shopId: item.shopId,
          shopName: shopData.name,
          img: item.img,
          selectedOptions: selectedOptions.length > 0
            ? selectedOptions.map(idx => {
                const opt = activeOptions.find(o => o.index === idx);
                return { name: opt?.name || '', price: opt?.price || 0 };
              })
            : [],
          note: note || "",
          itemStatus: "active"
        });
      }
      
      // Side items
      Object.entries(sideItems).forEach(([foodId, data]) => {
        if (data.quantity > 0) {
          const foodItem = foods.find(f => Number(f.id) === Number(foodId));
          if (foodItem) {
            orderItems.push({
              id: foodItem.id,
              name: foodItem.name,
              pricePromo: foodItem.pricePromo,
              priceNormal: foodItem.priceNormal,
              quantity: data.quantity,
              shopId: foodItem.shopId,
              shopName: shopData.name,
              img: foodItem.img,
              selectedOptions: data.selectedOpts.length > 0
                ? data.selectedOpts.map(idx => {
                    const opt = foodItem.option?.find(o => o.index === idx);
                    return { name: opt?.name || '', price: opt?.price || 0 };
                  })
                : [],
              note: "",
              itemStatus: "active"
            });
          }
        }
      });
      
      // Tạo đơn hàng
      const newOrder = {
        orderId: orderId,
        shopIds: [...new Set(orderItems.map(i => Number(i.shopId)))],
        userId: currentUser ? currentUser.id : Date.now(),
        userName: (isGuestUser || !currentUser) ? gName : currentUser.name,
        userPhone: (isGuestUser || !currentUser) ? gPhone : currentUser.phone,
        address: (isGuestUser || !currentUser) ? gAddress : currentUser.address,
        items: orderItems,
        baseShip: 0,  // Miễn phí ship
        multiShopFee: 0,
        discount: 0,
        shipType: 'self-delivery',  // Tự giao
        deliveryType: 'self-delivery',  // Trường phân biệt cho shipper
        isResidentShop: true,  // Đánh dấu là shop cư dân
        status: 'pending',
        paymentMethod: 'COD',
        createdAt: new Date().toISOString(),
        promoCode: "",
        logs: [{ 
          status: 'pending', 
          time: new Date().toISOString(),
          note: 'Shop cư dân - Tự giao hàng'
        }]
      };
      
      // Lưu vào Firebase
      await addDoc(collection(db, 'foodOrders'), newOrder);

      // 📢 GỬI NOTIFICATION: Khách đặt đơn -> Shipper, Admin, Chủ shop
      console.log('🔔 Gửi notification: Khách đặt đơn mới');
      try {
        const shippers = users.filter(u => u.role === 'shipper');
        const admins = users.filter(u => u.role === 'admin');
        const shopOwner = users.find(u => String(u.id) === String(shopData.id || orderItems[0]?.shopId));

        const recipients = [
          ...shippers,
          ...admins,
          ...(shopOwner ? [shopOwner] : [])
        ].filter(u => u.expoToken);

        if (recipients.length > 0) {
          const itemNames = orderItems.map(item => item.name).join(', ');
          const notifTitle = '🛒 Đơn hàng mới';
          const notifBody = `Khách ${newOrder.userName} đặt: ${itemNames} - ${(newOrder.items.reduce((sum, item) => sum + (item.quantity * (item.pricePromo || item.priceNormal)), 0) * 1000).toLocaleString('vi-VN')}đ`;

          await sendNotificationToMultiple(notifTitle, notifBody, recipients);
        }
      } catch (notifError) {
        console.error('⚠️ Lỗi gửi notification nhưng đơn đã được tạo:', notifError);
        // Không dừng flow, đơn đã được tạo rồi
      }
      
      // Hiển thị thành công
      setTimeout(() => {
        if (Platform.OS === 'web') {
          window.alert("✅ Đã đặt hàng thành công!\n\nShop cư dân sẽ giao hàng cho bạn trong chúng cư.");
        } else {
          Alert.alert(
            "Thành công",
            "✅ Đã đặt hàng thành công!\n\nShop cư dân sẽ giao hàng cho bạn trong chúng cư.",
            [{ text: "OK" }]
          );
        }
        router.back();
      }, 300);
      
    } catch (error) {
      console.error("Lỗi tạo đơn hàng:", error);
      if (Platform.OS === 'web') {
        window.alert("❌ Lỗi không thể tạo đơn hàng. Vui lòng thử lại!");
      } else {
        Alert.alert("Lỗi", "Không thể tạo đơn hàng. Vui lòng thử lại!");
      }
    }
  };

  // Logic thêm vào giỏ hàng bình thường
  const handleAddToCartNormal = () => {

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

    // Thêm món chính nếu quantity > 0
    if (quantity > 0) {
      addToCart({
        ...item,
        selectedOptions: selectedOptionObjects,
        extraPrice: extraPrice
      }, quantity, note);
    }

    // Thêm các món phụ có số lượng > 0
    Object.entries(sideItems).forEach(([foodId, data]) => {
      if (data.quantity > 0) {
        const foodItem = foods.find(f => Number(f.id) === Number(foodId));
        if (foodItem) {
          const itemOpts = (foodItem.option || []).filter(opt => 
            opt.status === true || opt.status === 'true' || opt.status === 'enable'
          );
          const selectedOpts = itemOpts.filter(opt => data.selectedOpts.includes(opt.index));
          addToCart({
            ...foodItem,
            selectedOptions: selectedOpts,
            extraPrice: data.extraCost
          }, data.quantity, '');
        }
      }
    });

    const totalItems = quantity + Object.values(sideItems).reduce((sum, d) => sum + d.quantity, 0);
    Alert.alert("Thành công", `Đã thêm ${totalItems} món vào giỏ hàng`);
    router.back();
  };

  const formatCurrency = (val: number) => val.toLocaleString('vi-VN');

  // Component mini cho món ăn cùng shop
  const QuickAddItem = ({ foodItem }: { foodItem: FoodItem }) => {
    const itemData = sideItems[foodItem.id] || { quantity: 0, selectedOpts: [], extraCost: 0 };
    const [showOptions, setShowOptions] = useState(false);

    const itemOptions = useMemo(() => {
      if (!foodItem.option) return [];
      return foodItem.option.filter(opt => 
        opt.status === true || opt.status === 'true' || opt.status === 'enable'
      );
    }, [foodItem.option]);

    const extraCost = useMemo(() => {
      return itemData.selectedOpts.reduce((sum, idx) => {
        const opt = itemOptions.find(o => o.index === idx);
        return sum + (opt?.price || 0) * 1000;
      }, 0);
    }, [itemData.selectedOpts, itemOptions]);

    const updateSideItem = (updates: Partial<typeof itemData>) => {
      setSideItems(prev => ({
        ...prev,
        [foodItem.id]: { ...itemData, ...updates, extraCost }
      }));
    };

    const handleQtyChange = (newQty: number) => {
      if (newQty < 0) return;
      updateSideItem({ quantity: newQty });
    };

    const handleToggleOption = (optIndex: number) => {
      const newOpts = itemData.selectedOpts.includes(optIndex)
        ? itemData.selectedOpts.filter(i => i !== optIndex)
        : [...itemData.selectedOpts, optIndex];
      updateSideItem({ selectedOpts: newOpts });
    };

    return (
      <View style={styles.quickItem}>
        <Image 
          source={{ uri: foodItem.img || foodItem.backupImg || 'https://via.placeholder.com/80' }}
          style={styles.quickItemImage}
        />
        <View style={styles.quickItemInfo}>
          <Text style={styles.quickItemName} numberOfLines={1}>{foodItem.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.quickItemPrice}>
              {formatCurrency(foodItem.pricePromo * 1000)}đ
            </Text>
            {foodItem.priceNormal > foodItem.pricePromo && (
              <Text style={styles.quickItemPriceOld}>
                {formatCurrency(foodItem.priceNormal * 1000)}đ
              </Text>
            )}
          </View>
          
          {itemOptions.length > 0 && (
            <TouchableOpacity onPress={() => setShowOptions(!showOptions)}>
              <Text style={styles.optionToggle}>
                {showOptions ? '▼' : '▶'} Có {itemOptions.length} tùy chọn
              </Text>
            </TouchableOpacity>
          )}

          {showOptions && itemOptions.length > 0 && (
            <View style={styles.quickOptions}>
              {itemOptions.map(opt => (
                <TouchableOpacity
                  key={opt.index}
                  style={[styles.quickOptionBtn, itemData.selectedOpts.includes(opt.index) && styles.quickOptionBtnActive]}
                  onPress={() => handleToggleOption(opt.index)}
                >
                  <Text style={[styles.quickOptionText, itemData.selectedOpts.includes(opt.index) && styles.quickOptionTextActive]}>
                    {opt.name} +{formatCurrency(opt.price * 1000)}đ
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.quickActions}>
          <View style={styles.miniQtyRow}>
            <TouchableOpacity onPress={() => handleQtyChange(itemData.quantity - 1)} style={styles.miniQtyBtn}>
              <Ionicons name="remove" size={16} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.miniQtyText}>{itemData.quantity}</Text>
            <TouchableOpacity onPress={() => handleQtyChange(itemData.quantity + 1)} style={styles.miniQtyBtn}>
              <Ionicons name="add" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: '#fff' }]}>
      <StatusBar barStyle="dark-content" />
      
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image
            source={item.img || item.backupImg || 'https://via.placeholder.com/300'}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
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
          </View>

          <Text style={styles.description}>
            {item.note || item.description || "Chưa có mô tả cho món ăn này."}
          </Text>
          {item.priceNormal > item.pricePromo && (
            <Text style={styles.discountNote}>
              Bạn được giảm{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {formatCurrency((item.priceNormal - item.pricePromo) * 1000)}đ
              </Text>{' '}
              cho món này!
            </Text>
          )}

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

          {/* Thông tin giao hàng cho guest user (chỉ hiện khi shop cư dân) */}
          {shopData.isResidentShop && (!currentUser || (currentUser && !currentUser.password)) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin giao hàng</Text>
              <TextInput
                style={styles.guestInput}
                placeholder="Tên người nhận"
                value={gName}
                onChangeText={setGName}
              />
              <TextInput
                style={styles.guestInput}
                placeholder="SĐT liên hệ"
                value={gPhone}
                onChangeText={setGPhone}
                keyboardType="phone-pad"
              />
              <TextInput
                style={styles.guestInput}
                placeholder="Địa chỉ chi tiết (trong chung cư)"
                value={gAddress}
                onChangeText={setGAddress}
              />
            </View>
          )}

          <View style={styles.quantitySection}>
            <Text style={styles.sectionTitle}>Số lượng</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity onPress={() => setQuantity(Math.max(0, quantity - 1))} style={styles.qtyBtn}>
                <Ionicons name="remove" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
                <Ionicons name="add" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Món khác cùng shop */}
          {sameShopItems.length > 0 && (
            <View style={styles.sameShopSection}>
              <View style={styles.sameShopHeader}>
                <Ionicons name="restaurant" size={20} color={COLORS.primary} />
                <Text style={styles.sameShopTitle}>
                  Các món khác từ {shopData.name}
                </Text>
              </View>
              {sameShopItems.map(foodItem => (
                <QuickAddItem key={foodItem.id} foodItem={foodItem} />
              ))}
              
              {/* Summary các món phụ đã chọn */}
              {Object.entries(sideItems).some(([_, data]) => data.quantity > 0) && (
                <View style={styles.summarySection}>
                  <Text style={styles.summaryTitle}>Tổng kết món thêm:</Text>
                  {Object.entries(sideItems).map(([foodId, data]) => {
                    if (data.quantity === 0) return null;
                    const foodItem = foods.find(f => Number(f.id) === Number(foodId));
                    if (!foodItem) return null;
                    const itemTotal = (foodItem.pricePromo * 1000 + data.extraCost) * data.quantity;
                    return (
                      <View key={foodId} style={styles.summaryItem}>
                        <Text style={styles.summaryItemText}>
                          {foodItem.name} x{data.quantity}
                          {data.selectedOpts.length > 0 && ` (+${data.selectedOpts.length} tùy chọn)`}
                        </Text>
                        <Text style={styles.summaryItemPrice}>{formatCurrency(itemTotal)}đ</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer - Fixed at bottom */}
      <View style={styles.footer}>
        <View style={styles.priceSummary}>
          <View>
            <Text style={styles.totalLabel}>
              {item.priceNormal > item.pricePromo ? 'Giá đã giảm:' : 'Giá:'}
            </Text>
            {shopData.isResidentShop && (
              <Text style={styles.residentNote}>🏠 Shop cư dân - Miễn phí ship</Text>
            )}
          </View>
          <Text style={styles.totalPrice}>{formatCurrency(totalPrice)}đ</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.addToCartBtn, 
            shopData.isResidentShop && styles.residentOrderBtn,
            (isDisabled || !hasAnyItem) && {backgroundColor: '#ccc'}
          ]} 
          onPress={handleAddToCart}
          disabled={isDisabled || !hasAnyItem}
        >
          <Text style={styles.addToCartText}>
            {isDisabled 
              ? statusLabel 
              : !hasAnyItem 
                ? "CHỌN ÍT NHẤT 1 MÓN" 
                : shopData.isResidentShop
                  ? "🏠 ĐẶT HÀNG NGAY"
                  : "THÊM VÀO GIỎ HÀNG"
            }
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal xác nhận đặt hàng shop cư dân */}
      <ResidentOrderModal
        visible={showResidentModal}
        onClose={() => setShowResidentModal(false)}
        onConfirm={handleConfirmResidentOrder}
        shopName={shopData.name}
        items={[
          // Main item
          ...(quantity > 0 ? [{
            name: item.name,
            quantity: quantity,
            price: (item.pricePromo * 1000 + extraPrice) * quantity,
            selectedOptions: selectedOptions.length > 0 
              ? selectedOptions.map(idx => {
                  const opt = activeOptions.find(o => o.index === idx);
                  return opt?.name || '';
                }).filter(Boolean)
              : undefined,
          }] : []),
          // Side items
          ...Object.entries(sideItems)
            .filter(([_, data]) => data.quantity > 0)
            .map(([foodId, data]) => {
              const foodItem = foods.find(f => Number(f.id) === Number(foodId));
              if (!foodItem) return null;
              return {
                name: foodItem.name,
                quantity: data.quantity,
                price: (foodItem.pricePromo * 1000 + data.extraCost) * data.quantity,
                selectedOptions: data.selectedOpts.length > 0
                  ? data.selectedOpts.map(idx => {
                      const opt = foodItem.option?.find(o => o.index === idx);
                      return opt?.name || '';
                    }).filter(Boolean)
                  : undefined,
              };
            })
            .filter(Boolean) as any,
        ]}
        totalPrice={totalPrice}
      />
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
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 }, // Giữ nguyên
  shopAddress: { fontSize: 12, color: '#666' },
  typeBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
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
  guestInput: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
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
  residentOrderBtn: { backgroundColor: '#27AE60' },
  residentNote: { fontSize: 11, color: '#27AE60', marginTop: 2, fontWeight: '600' },
  addToCartText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  // Styles cho section món cùng shop
  sameShopSection: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#eee' },
  sameShopHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8 },
  sameShopTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  quickItem: { flexDirection: 'row', backgroundColor: '#F8F9FA', borderRadius: 12, padding: 10, marginBottom: 12 },
  quickItemImage: { width: 70, height: 70, borderRadius: 8 },
  quickItemInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  quickItemName: { fontSize: 14, fontWeight: '600', color: '#333' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  quickItemPrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  quickItemPriceOld: { fontSize: 11, color: '#999', textDecorationLine: 'line-through' },
  optionToggle: { fontSize: 11, color: '#666', marginTop: 4 },
  quickOptions: { marginTop: 6, gap: 4 },
  quickOptionBtn: { backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#ddd' },
  quickOptionBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickOptionText: { fontSize: 11, color: '#666' },
  quickOptionTextActive: { color: '#fff', fontWeight: '600' },
  quickActions: { alignItems: 'center', justifyContent: 'space-between', marginLeft: 8 },
  miniQtyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, padding: 3, marginBottom: 6 },
  miniQtyBtn: { padding: 3 },
  miniQtyText: { fontSize: 13, fontWeight: 'bold', marginHorizontal: 8 },
  quickAddBtn: { backgroundColor: COLORS.primary, padding: 8, borderRadius: 20 },
  
  summarySection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#ddd', backgroundColor: '#FFF9E6', borderRadius: 8, padding: 12 },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  summaryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  summaryItemText: { fontSize: 13, color: '#666', flex: 1 },
  summaryItemPrice: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
});