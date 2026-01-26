// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    collection,
    doc,
    onSnapshot,
    query,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../services/firebase';

/**
 * useAppStore - Quản lý dữ liệu toàn cục cho dự án VivaMarket
 */
export const useAppStore = create((set, get) => ({
  // ==========================================
  // 1. KHO CHỨA DỮ LIỆU (STATE)
  // ==========================================
  foodOrders: [],
  foods: [],
  goodOrders: [],
  goods: [],
  itemType: [],
  promos: [],
  serviceOrders: [],
  services: [],
  system: null,
  users: [],
  transactions: [], 
  
  currentUser: null,
  isGuest: false, 
  guestId: null,  
  cart: [], 
  isLoading: true,
  expoToken: null,

  // ==========================================
  // 2. CÁC HÀM HỆ THỐNG & AUTH
  // ==========================================
  
  setExpoToken: (token) => set({ expoToken: token }),

  initializeGuest: async () => {
    try {
      let gId = await AsyncStorage.getItem('guest_id');
      if (!gId) {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 7);
        gId = `G-${timestamp}-${randomStr}`.toUpperCase();
        await AsyncStorage.setItem('guest_id', gId);
      }
      set({ guestId: gId, isGuest: true, currentUser: null });
      return gId;
    } catch (e) {
      console.error("Lỗi khởi tạo Guest ID:", e);
    }
  },

  listenAllData: () => {
    console.log("--- Kết nối Realtime Firestore (Full Collections) ---");

    const unsubFoods = onSnapshot(query(collection(db, 'foods')), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const currentHour = new Date().getHours();
      const processedData = data.map(item => {
        const isInSaleTime = currentHour >= (item.timeStart || 0) && currentHour < (item.timeEnd || 24);
        return {
          ...item,
          isOutOfTime: !isInSaleTime,
          effectiveStatus: (!isInSaleTime || item.status === 'disable') ? 'disable' : 'enable'
        };
      });
      const sortedData = processedData.sort((a, b) => {
        if (a.effectiveStatus !== b.effectiveStatus) return a.effectiveStatus === 'disable' ? 1 : -1;
        return (a.index || 0) - (b.index || 0);
      });
      set({ foods: sortedData, isLoading: false });
    });

    const unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
      set({ users: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });

    const unsubSystem = onSnapshot(query(collection(db, 'system')), (snap) => {
      set({ system: snap.docs[0]?.data() || null });
    });

    const unsubPromos = onSnapshot(query(collection(db, 'promos')), (snap) => {
      set({ promos: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });

    const unsubFoodOrders = onSnapshot(query(collection(db, 'foodOrders')), (snap) => {
      set({ foodOrders: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });

    const unsubGoods = onSnapshot(query(collection(db, 'goods')), (snap) => {
      set({ goods: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });

    const unsubGoodOrders = onSnapshot(query(collection(db, 'goodOrders')), (snap) => {
      set({ goodOrders: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });

    const unsubItemType = onSnapshot(query(collection(db, 'itemType')), (snap) => {
      set({ itemType: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });

    const unsubServices = onSnapshot(query(collection(db, 'services')), (snap) => {
      set({ services: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });

    const unsubServiceOrders = onSnapshot(query(collection(db, 'serviceOrders')), (snap) => {
      set({ serviceOrders: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });

    const unsubTransactions = onSnapshot(query(collection(db, 'transactions')), (snap) => {
        set({ transactions: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });

    return () => {
      unsubFoods(); unsubSystem(); unsubUsers(); unsubPromos();
      unsubFoodOrders(); unsubGoods(); unsubGoodOrders();
      unsubItemType(); unsubServices(); unsubServiceOrders();
      unsubTransactions();
    };
  },

  login: async (phoneNumber, password, expoToken) => {
    const allUsers = get().users;
    const userFound = allUsers.find(u => u.phone === phoneNumber && u.password === password);
    if (!userFound) return { success: false, message: 'Sai tài khoản hoặc mật khẩu!' };
    if (userFound.status === 'disable') return { success: false, message: 'Tài khoản đã bị khóa!' };
    set({ currentUser: userFound, isGuest: false, guestId: null });
    if (expoToken && userFound.expoToken !== expoToken) {
      try {
        await updateDoc(doc(db, 'users', userFound.id.toString()), { expoToken });
      } catch (err) { console.error("Lỗi cập nhật Token:", err); }
    }
    return { success: true };
  },

  logout: async () => {
    try {
      const { currentUser } = get();
      if (currentUser?.id) {
        updateDoc(doc(db, 'users', currentUser.id.toString()), { expoToken: "" }).catch(() => {});
      }
      set({ currentUser: null, cart: [], isGuest: false, guestId: null });
      return { success: true };
    } catch (err) {
      set({ currentUser: null, cart: [] });
      return { success: true };
    }
  },

  register: async (userData) => {
    try {
      const { users, expoToken } = get();
      const nextId = Math.max(...users.map(u => Number(u.id) || 0), 0) + 1;
      const newUser = {
        ...userData,
        id: nextId,
        role: 'user',
        status: 'enable',
        point: 0,
        expoToken: expoToken || '',
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'users', newUser.id.toString()), newUser);
      set({ currentUser: newUser, isGuest: false, guestId: null }); 
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  updateProfile: async (newName, newAddress) => {
    const { currentUser } = get();
    if (!currentUser) return { success: false, msg: "Chưa đăng nhập" };
    try {
      const userRef = doc(db, 'users', currentUser.id.toString());
      await updateDoc(userRef, { name: newName, address: newAddress });
      set((state) => ({
        currentUser: { ...state.currentUser, name: newName, address: newAddress }
      }));
      return { success: true, msg: "Cập nhật thành công" };
    } catch (error) {
      return { success: false, msg: "Lỗi kết nối server" };
    }
  },

  // ==========================================
  // 3. LOGIC GIỎ HÀNG (ĐÃ CẬP NHẬT)
  // ==========================================

  addToCart: (product, quantity = 1, note = "") => {
    const currentCart = get().cart;
    const cleanNote = note.trim();
    
    // Tạo khóa duy nhất cho món ăn dựa trên ID + Option được chọn + Ghi chú
    const optionKey = product.selectedOptions ? product.selectedOptions.map(o => o.index).sort().join('-') : '';
    const cartItemId = `${product.id}-${optionKey}-${cleanNote}`;

    const isExist = currentCart.find((item) => item.cartItemId === cartItemId);

    if (isExist) {
      const updatedCart = currentCart.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
      set({ cart: updatedCart });
    } else {
      // Lưu sản phẩm mới kèm cartItemId duy nhất
      set({ cart: [...currentCart, { ...product, cartItemId, quantity, note: cleanNote }] });
    }
  },

  removeFromCart: (cartItemId) => {
    const currentCart = get().cart;
    const updatedCart = currentCart.map((item) => {
      if (item.cartItemId === cartItemId) {
        return { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 0 };
      }
      return item;
    }).filter(item => item.quantity > 0);
    set({ cart: updatedCart });
  },

  clearCart: () => set({ cart: [] }),

  getTotalPrice: () => {
    const { cart } = get();
    return cart.reduce((total, item) => {
      const basePrice = (item.pricePromo ?? item.priceNormal ?? 0) * 1000;
      const extraPrice = item.extraPrice ?? 0;
      return total + ((basePrice + extraPrice) * item.quantity);
    }, 0);
  },
}));
