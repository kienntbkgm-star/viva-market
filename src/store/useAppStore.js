// @ts-nocheck
import AsyncStorage from '@react-native-async-storage/async-storage';
import bcryptjs from 'bcryptjs';
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { create } from 'zustand';
import { db } from '../services/firebase';

/**
 * useAppStore - Quản lý dữ liệu toàn cục cho dự án VivaMarket
 */
export const useAppStore = create((set, get) => ({
  // =============================
  // USER DOC LISTENER (REALTIME STATUS)
  // =============================
  userDocUnsub: null,

  /**
   * Lắng nghe realtime document user của chính mình sau khi login thành công.
   * - Chỉ gọi sau khi đã xác thực (login).
   * - Nếu doc user bị đổi status sang 'disable' (bị admin khoá), sẽ tự động logout.
   * - Khi logout sẽ huỷ listener này để tránh rò rỉ bộ nhớ.
   */
  listenCurrentUserDoc: () => {
    const { currentUser, logout } = get();
    if (!currentUser || !currentUser.id) return;
    // Nếu đã có listener cũ thì huỷ trước khi tạo mới
    if (get().userDocUnsub) get().userDocUnsub();
    // Đặt listener cho doc users/{userId} của chính user
    const unsub = onSnapshot(doc(db, 'users', currentUser.id.toString()), (docSnap) => {
      if (!docSnap.exists()) return;
      const userData = { id: docSnap.id, ...docSnap.data() };
      set({ currentUser: userData });
      // Nếu bị khoá tài khoản thì tự động logout
      if (userData.status === 'disable') {
        alert('Tài khoản của bạn đã bị khoá!');
        logout();
      }
    });
    set({ userDocUnsub: unsub });
  },

  /**
   * Huỷ listener doc user khi logout hoặc đổi tài khoản.
   */
  clearCurrentUserDocListener: () => {
    if (get().userDocUnsub) {
      get().userDocUnsub();
      set({ userDocUnsub: null });
    }
  },
  // ==========================================
  // 1. KHO CHỨA DỮ LIỆU (STATE)
  // ==========================================
  foodOrders: [],
  foods: [],
  promos: [],
  serviceOrders: [],
  services: [],
  system: null,
  users: [],
  transactions: [],
  onlineLog: [],  // 🆕 Thêm onlineLog để track user online/offline
  
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

  // ==========================================
  // ONLINE/OFFLINE TRACKING
  // ==========================================

  logOnlineToLocal: async () => {
    try {
      const { currentUser } = get();
      if (!currentUser || !currentUser.id) return;
      
      const userId = currentUser.id.toString();
      const timestamp = Date.now();
      
      // Lưu timestamp online vào special key để tính duration sau
      const onlineTimestampKey = `last_online_timestamp_${userId}`;
      await AsyncStorage.setItem(onlineTimestampKey, timestamp.toString());
      
      // Update isOnline và lastOnlineTimestamp vào Firestore onlineLog
      const onlineLogRef = doc(db, 'onlineLog', userId);
      const docSnap = await getDoc(onlineLogRef);
      
      if (docSnap.exists()) {
        await updateDoc(onlineLogRef, {
          isOnline: true,
          lastOnlineTimestamp: timestamp
        });
      } else {
        await setDoc(onlineLogRef, {
          id: userId,
          isOnline: true,
          lastOnlineTimestamp: timestamp,
          log: []
        });
      }
      
      console.log(`[Online Log] 🟢 Online: ${timestamp} | isOnline=true`);
    } catch (error) {
      console.error('[Online Log] Lỗi ghi local:', error);
    }
  },

  logOfflineAndUpload: async () => {
    try {
      const { currentUser } = get();
      if (!currentUser || !currentUser.id) return;
      
      const userId = currentUser.id.toString();
      const offlineTimestamp = Date.now();
      
      // Lấy timestamp online
      const onlineTimestampKey = `last_online_timestamp_${userId}`;
      const onlineTimestampStr = await AsyncStorage.getItem(onlineTimestampKey);
      const onlineTimestamp = onlineTimestampStr ? Number(onlineTimestampStr) : null;
      
      if (!onlineTimestamp) {
        console.warn('[Offline Log] ⚠️ Không tìm thấy online timestamp');
        return;
      }
      
      // Tính duration (ms → s)
      const durationSeconds = Math.floor((offlineTimestamp - onlineTimestamp) / 1000);
      const logEntry = `${onlineTimestamp}-${durationSeconds}`;
      
      // Đọc logs hiện tại
      const storageKey = `pending_logs_${userId}`;
      const existingLogs = await AsyncStorage.getItem(storageKey);
      let logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Thêm log mới
      logs.push(logEntry);
      
      console.log(`[Offline Log] ⏸️ Session: ${onlineTimestamp}-${durationSeconds}s | Chuẩn bị upload ${logs.length} entries...`);
      
      // Trim logs: giữ 100 entry cuối, xóa cái cũ (FIFO)
      const MAX_LOGS = 100;
      if (logs.length > MAX_LOGS) {
        const trimmedLogs = logs.slice(-MAX_LOGS);
        console.log(`[Offline Log] ✂️ Trim logs: ${logs.length} → ${trimmedLogs.length} (xóa ${logs.length - MAX_LOGS} entries cũ)`);
        logs = trimmedLogs;
      }
      
      // Upload lên Firestore + set isOnline=false
      const docRef = doc(db, 'onlineLog', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Document đã tồn tại → append log + set offline
        await updateDoc(docRef, {
          log: arrayUnion(...logs),
          isOnline: false
        });
      } else {
        // Document chưa tồn tại → tạo mới
        await setDoc(docRef, {
          id: userId,
          isOnline: false,
          lastOnlineTimestamp: onlineTimestamp,
          log: logs
        });
      }
      
      console.log(`[Offline Log] ✅ Upload ${logs.length} entries | isOnline=false`);
      
      // Xóa local storage sau khi upload thành công
      await AsyncStorage.removeItem(storageKey);
      await AsyncStorage.removeItem(onlineTimestampKey);
      console.log('[Offline Log] 🗑️ Đã clear local storage');
      
    } catch (error) {
      console.error('[Offline Log] ❌ Lỗi upload (giữ logs local để retry):', error.message);
      // Không xóa local storage nếu upload lỗi → retry lần sau khi inactive
    }
  },

  checkCrashOnRestart: async () => {
    try {
      const { currentUser } = get();
      if (!currentUser || !currentUser.id) return;
      
      const userId = currentUser.id.toString();
      const onlineTimestampKey = `last_online_timestamp_${userId}`;
      const onlineTimestampStr = await AsyncStorage.getItem(onlineTimestampKey);
      
      if (!onlineTimestampStr) {
        console.log('[Crash Check] ✅ Không có crash (online timestamp = null)');
        return;
      }
      
      // Phát hiện crash! Online timestamp tồn tại nhưng ko có offline
      const onlineTimestamp = Number(onlineTimestampStr);
      const crashLogEntry = `${onlineTimestamp}-0`; // Duration = 0 = crash
      
      // Đọc logs hiện tại
      const storageKey = `pending_logs_${userId}`;
      const existingLogs = await AsyncStorage.getItem(storageKey);
      let logs = existingLogs ? JSON.parse(existingLogs) : [];
      
      // Thêm crash log
      logs.push(crashLogEntry);
      await AsyncStorage.setItem(storageKey, JSON.stringify(logs));
      
      console.log(`[Crash Check] 💥 CRASH DETECTED! Đã thêm: ${crashLogEntry} | Logs: ${logs.length} entries`);
      
    } catch (error) {
      console.error('[Crash Check] Lỗi kiểm tra crash:', error);
    }
  },

  // ==========================================
  // SHIPPER READY (reset mỗi ngày)
  // ==========================================

  ensureShipperReadyFresh: async () => {
    try {
      const { currentUser } = get();
      if (!currentUser || (currentUser.role !== 'shipper' && currentUser.role !== 'chủ shop')) return;

      const today = new Date().toISOString().slice(0, 10);
      const isStale = currentUser.isReady === true && currentUser.readyDate !== today;
      if (!isStale) return;

      const userRef = doc(db, 'users', currentUser.id.toString());
      await updateDoc(userRef, { isReady: false, readyDate: null });
      set((state) => ({ currentUser: { ...state.currentUser, isReady: false, readyDate: null } }));
      console.log('[Ready Status] Reset isReady=false do khác ngày');
    } catch (error) {
      console.error('[Ready Status] Lỗi reset ready:', error);
    }
  },

  setShipperReadyToday: async () => {
    try {
      const { currentUser } = get();
      if (!currentUser || (currentUser.role !== 'shipper' && currentUser.role !== 'chủ shop')) return { success: false };

      const today = new Date().toISOString().slice(0, 10);
      const userRef = doc(db, 'users', currentUser.id.toString());
      await updateDoc(userRef, { isReady: true, readyDate: today });
      set((state) => ({ currentUser: { ...state.currentUser, isReady: true, readyDate: today } }));
      console.log('[Ready Status] ✅ Đã bật ready cho hôm nay');
      return { success: true };
    } catch (error) {
      console.error('[Ready Status] Lỗi bật ready:', error);
      return { success: false, message: error.message };
    }
  },

  setShipperNotReady: async () => {
    try {
      const { currentUser } = get();
      if (!currentUser || (currentUser.role !== 'shipper' && currentUser.role !== 'chủ shop')) return { success: false };

      const userRef = doc(db, 'users', currentUser.id.toString());
      await updateDoc(userRef, { isReady: false, readyDate: null });
      set((state) => ({ currentUser: { ...state.currentUser, isReady: false, readyDate: null } }));
      console.log('[Ready Status] ⛔ Đã tắt sẵn sàng thủ công');
      return { success: true };
    } catch (error) {
      console.error('[Ready Status] Lỗi tắt ready:', error);
      return { success: false, message: error.message };
    }
  },

  initializeGuest: async () => {
    try {
      // Kiểm tra xem đã có guestId trong AsyncStorage chưa
      let guestUserId = await AsyncStorage.getItem('guest_user_id');
      const { users, expoToken } = get();
      
      // Nếu đã có ID, tìm user trong DB
      if (guestUserId) {
        const existingGuest = users.find(u => u.id === Number(guestUserId));
        if (existingGuest) {
          set({ currentUser: existingGuest, isGuest: true, guestId: null });
          return existingGuest;
        }
      }

      // Tạo Guest User mới với ID = timestamp
      const newGuestId = Date.now();
      const newGuestUser = {
        id: newGuestId,
        name: "",
        phone: "",
        address: "",
        password: "",
        role: "user",
        status: "enable",
        point: 0,
        expoToken: expoToken || "",
        createdAt: new Date().toISOString()
      };

      // Lưu vào Firestore
      await setDoc(doc(db, 'users', newGuestId.toString()), newGuestUser);
      
      // Lưu ID vào AsyncStorage
      await AsyncStorage.setItem('guest_user_id', newGuestId.toString());
      
      set({ currentUser: newGuestUser, isGuest: true, guestId: null });
      return newGuestUser;
    } catch (e) {
      console.error("Lỗi khởi tạo Guest User:", e);
    }
  },

  listenAllData: () => {
    const { currentUser } = get();
    const userRole = currentUser?.role || 'guest';
    const userId = currentUser?.id;

    console.log(`🎧 [listenAllData] Starting listeners with:`, { userId, userRole, userExists: !!currentUser });
    console.log(`🎧 [listenAllData] Role: ${userRole}, UserId: ${userId}`);

    const unsubscribers = [];

    // ===== COLLECTIONS LISTEN BỞI TẤT CẢ ROLE =====

    // foods - ALL roles
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
    unsubscribers.push(unsubFoods);

    // promos - ALL roles
    const unsubPromos = onSnapshot(query(collection(db, 'promos')), (snap) => {
      set({ promos: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    });
    unsubscribers.push(unsubPromos);

    // system - ALL roles
    const unsubSystem = onSnapshot(query(collection(db, 'system')), (snap) => {
      set({ system: snap.docs[0]?.data() || null });
    });
    unsubscribers.push(unsubSystem);

    // ===== USERS: FILTER BY ROLE =====
    let unsubUsers;
    if (userRole === 'admin') {
      // Admin: listen ALL users
      unsubUsers = onSnapshot(query(collection(db, 'users')), (snap) => {
        set({ users: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
      });
    } else if (userRole === 'guest') {
      // Guest (không login): không listen users
      console.log('🚫 Guest không listen users');
    } else {
      // Chủ Shop, Shipper: filter những shop/shipper/admin (để hiển thị)
      unsubUsers = onSnapshot(
        query(collection(db, 'users'), where('role', 'in', ['chủ shop', 'shipper', 'admin'])),
        (snap) => {
          set({ users: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
        }
      );
    }
    if (unsubUsers) unsubscribers.push(unsubUsers);

    // ===== SERVICES: ALL roles EXCEPT Admin =====
    let unsubServices;
      unsubServices = onSnapshot(query(collection(db, 'services')), (snap) => {
        set({ services: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
      });
      unsubscribers.push(unsubServices);
      unsubServices = onSnapshot(query(collection(db, 'services')), (snap) => {
        set({ services: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
      });
      unsubscribers.push(unsubServices);

    // ===== FOODORDERS: ROLE-BASED FILTERING =====
    let unsubFoodOrders;
    if (userRole === 'admin') {
      // Admin: ALL foodOrders
      unsubFoodOrders = onSnapshot(query(collection(db, 'foodOrders')), (snap) => {
        set({ foodOrders: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
      });
    } else if (userRole === 'chủ shop') {
      // Chủ Shop: userId == Me OR shopIds contains Me
      // Tách thành 2 listeners vì Firestore không hỗ trợ OR
      const unsubFoodOrdersAsCustomer = onSnapshot(
        query(collection(db, 'foodOrders'), where('userId', '==', userId)),
        (snap) => {
          const customerOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          // Lấy đơn của shop từ state (nếu đã set trước)
          const { foodOrders } = get();
          const shopOrders = foodOrders.filter(o => o.shopIds?.includes(userId));
          // Merge và remove duplicates
          const merged = [...customerOrders, ...shopOrders].reduce((acc, order) => {
            if (!acc.find(o => o.id === order.id)) acc.push(order);
            return acc;
          }, []);
          set({ foodOrders: merged });
        }
      );
      const unsubFoodOrdersAsShop = onSnapshot(
        query(collection(db, 'foodOrders'), where('shopIds', 'array-contains', userId)),
        (snap) => {
          const shopOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          const { foodOrders } = get();
          const customerOrders = foodOrders.filter(o => o.userId === userId);
          const merged = [...customerOrders, ...shopOrders].reduce((acc, order) => {
            if (!acc.find(o => o.id === order.id)) acc.push(order);
            return acc;
          }, []);
          set({ foodOrders: merged });
        }
      );
      unsubscribers.push(unsubFoodOrdersAsCustomer, unsubFoodOrdersAsShop);
    } else if (userRole === 'shipper') {
      // Shipper: userId == Me OR status == 'pending' OR shipperId == Me
      // Track từ 3 sources để merge (Firestore không hỗ trợ OR)
      const shipperFoodOrdersSources = {
        customer: [],
        pending: [],
        assigned: []
      };

      const mergeFoodOrders = () => {
        const all = [
          ...shipperFoodOrdersSources.customer,
          ...shipperFoodOrdersSources.pending,
          ...shipperFoodOrdersSources.assigned
        ];
        const merged = all.reduce((acc, order) => {
          if (!acc.find(o => o.id === order.id)) acc.push(order);
          return acc;
        }, []);
        set({ foodOrders: merged });
      };

      const unsubFoodOrdersAsCustomer = onSnapshot(
        query(collection(db, 'foodOrders'), where('userId', '==', userId)),
        (snap) => {
          shipperFoodOrdersSources.customer = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          mergeFoodOrders();
        }
      );
      const unsubFoodOrdersPending = onSnapshot(
        query(collection(db, 'foodOrders'), where('status', '==', 'pending')),
        (snap) => {
          shipperFoodOrdersSources.pending = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          mergeFoodOrders();
        }
      );
      const unsubFoodOrdersAssigned = onSnapshot(
        query(collection(db, 'foodOrders'), where('shipperId', '==', userId)),
        (snap) => {
          shipperFoodOrdersSources.assigned = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          mergeFoodOrders();
        }
      );
      unsubscribers.push(unsubFoodOrdersAsCustomer, unsubFoodOrdersPending, unsubFoodOrdersAssigned);
    } else {
      // Guest: userId == Me
      unsubFoodOrders = onSnapshot(
        query(collection(db, 'foodOrders'), where('userId', '==', userId || 0)),
        (snap) => {
          set({ foodOrders: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
        }
      );
      unsubscribers.push(unsubFoodOrders);
    }

    // ===== SERVICEORDERS: ROLE-BASED FILTERING =====
    let unsubServiceOrders;
    if (userRole === 'admin') {
      // Admin: ALL serviceOrders
      unsubServiceOrders = onSnapshot(query(collection(db, 'serviceOrders')), (snap) => {
        set({ serviceOrders: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
      });
    } else {
      // Guest, Chủ Shop, Shipper: userId == Me
      unsubServiceOrders = onSnapshot(
        query(collection(db, 'serviceOrders'), where('userId', '==', userId || 0)),
        (snap) => {
          set({ serviceOrders: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
        }
      );
    }
    unsubscribers.push(unsubServiceOrders);

    // ===== TRANSACTIONS: SHIPPER & ADMIN ONLY =====
    let unsubTransactions;
    if (userRole === 'admin') {
      // Admin: ALL transactions
      unsubTransactions = onSnapshot(query(collection(db, 'transactions')), (snap) => {
        set({ transactions: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
      });
      unsubscribers.push(unsubTransactions);
    } else if (userRole === 'shipper') {
      // Shipper: userId == Me (của mình)
      unsubTransactions = onSnapshot(
        query(collection(db, 'transactions'), where('userId', '==', userId)),
        (snap) => {
          set({ transactions: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
        }
      );
      unsubscribers.push(unsubTransactions);
    } else {
      console.log('🚫 Guest/Chủ Shop không listen transactions');
    }

    // ===== ONLINELOG: ADMIN ONLY =====
    let unsubOnlineLog;
    if (userRole === 'admin') {
      unsubOnlineLog = onSnapshot(query(collection(db, 'onlineLog')), (snap) => {
        set({ onlineLog: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
      });
      unsubscribers.push(unsubOnlineLog);
    } else {
      console.log('🚫 Non-admin không listen onlineLog');
    }

    // Return cleanup function
    return () => {
      unsubscribers.forEach(unsub => {
        if (unsub) unsub();
      });
    };
  },

  login: async (phoneNumber, password, expoToken) => {
    console.log('🔐 [Store] login() called with phone:', phoneNumber);
    
    // Query Firestore trực tiếp để tìm user (không rely vào state)
    console.log('📱 [Store] Querying Firestore for phone:', phoneNumber);
    const q = query(collection(db, 'users'), where('phone', '==', phoneNumber));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ [Store] User not found in Firestore!');
      return { success: false, message: 'Sai tài khoản hoặc mật khẩu!' };
    }
    
    const userFound = snapshot.docs[0].data();
    userFound.id = snapshot.docs[0].id; // Add document ID
    console.log('🔍 [Store] User found:', { id: userFound.id, phone: userFound.phone, role: userFound.role });
    
    // Tất cả password đã được hash trên server → dùng bcryptjs compare
    console.log('🔑 [Store] Checking password...');
    const isPasswordMatch = userFound.password ? bcryptjs.compareSync(password, userFound.password) : false;
    console.log('🔑 [Store] Password match:', isPasswordMatch);
    
    if (!isPasswordMatch) {
      console.log('❌ [Store] Password mismatch!');
      return { success: false, message: 'Sai tài khoản hoặc mật khẩu!' };
    }
    
    if (userFound.status === 'disable') {
      console.log('❌ [Store] Account disabled!');
      return { success: false, message: 'Tài khoản đã bị khóa!' };
    }
    
    console.log('✅ [Store] Setting currentUser:', { id: userFound.id, role: userFound.role });
    set({ currentUser: userFound, isGuest: false, guestId: null });
    
    // Lưu userId vào AsyncStorage để restore session
    await AsyncStorage.setItem('logged_user_id', userFound.id.toString());
    console.log('💾 [Store] Saved user ID to storage:', userFound.id);
    
    if (expoToken && userFound.expoToken !== expoToken) {
      try {
        console.log('📱 [Store] Updating expoToken...');
        await updateDoc(doc(db, 'users', userFound.id.toString()), { expoToken });
        console.log('✅ [Store] ExpoToken updated');
      } catch (err) { 
        console.error("⚠️ [Store] Error updating Token:", err); 
      }
    }
    
    // Ghi log online sau khi login thành công
    console.log('📝 [Store] Logging online...');
    get().logOnlineToLocal();

    // Sau khi login thành công, bắt đầu listen realtime doc user của chính mình
    // Điều này giúp app tự động phát hiện khi tài khoản bị khoá (status = 'disable')
    get().listenCurrentUserDoc();
    
    console.log('✅ [Store] Login complete!');
    return { success: true };
  },

  restoreSession: async () => {
    try {
      const savedUserId = await AsyncStorage.getItem('logged_user_id');
      if (!savedUserId) return false;
      
      const { users } = get();
      const userFound = users.find(u => u.id === Number(savedUserId));
      
      if (userFound && userFound.password && userFound.status === 'enable') {
        set({ currentUser: userFound, isGuest: false, guestId: null });
        return true;
      }
      
      // User không tồn tại hoặc là guest, xóa session
      await AsyncStorage.removeItem('logged_user_id');
      return false;
    } catch (e) {
      console.error("Lỗi restore session:", e);
      return false;
    }
  },

  logout: async () => {
    try {
      const { currentUser } = get();
      
      // Ghi log offline trước khi logout
      if (currentUser?.id) {
        await get().logOfflineAndUpload();
        
        // Nếu là shipper và đang ready, tắt trạng thái ready
        if (currentUser.role === 'shipper' && currentUser.isReady) {
          await updateDoc(doc(db, 'users', currentUser.id.toString()), { 
            expoToken: "",
            isReady: false,
            readyDate: null
          });
          console.log('[Logout] Đã tắt trạng thái ready cho shipper');
        } else {
          await updateDoc(doc(db, 'users', currentUser.id.toString()), { expoToken: "" }).catch(() => {});
        }
      }
      
      // Xóa session khỏi AsyncStorage
      await AsyncStorage.removeItem('logged_user_id');
      await AsyncStorage.removeItem('guest_user_id');
      
      set({ currentUser: null, cart: [], isGuest: false, guestId: null });
      // Khi logout, huỷ listener doc user để tránh rò rỉ bộ nhớ
      get().clearCurrentUserDocListener();
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
      
      // Hash password nếu có (guest không có password)
      let hashedPassword = userData.password || '';
      if (hashedPassword && hashedPassword.trim() !== '') {
        hashedPassword = bcryptjs.hashSync(userData.password, 10);
      }
      
      const newUser = {
        ...userData,
        password: hashedPassword,
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

  // Yêu cầu reset password - gửi notif admin
  requestPasswordReset: async (phoneNumber) => {
    try {
      const { users } = get();
      const userFound = users.find(u => u.phone === phoneNumber);
      
      if (!userFound) {
        return { success: false, message: 'Số điện thoại không tồn tại!' };
      }

      // Lưu request vào DB
      const resetRequest = {
        userId: userFound.id,
        userName: userFound.name,
        userPhone: phoneNumber,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'passwordResetRequests'), resetRequest);

      // Gửi notif đến admin
      const admins = users.filter(u => u.role === 'admin');
      const adminsWithToken = admins.filter(u => u.expoToken);
      
      if (adminsWithToken.length > 0) {
        try {
          const { sendNotificationToMultiple } = require('../components/Notification');
          const notifTitle = '🔐 Yêu cầu reset password';
          const notifBody = `${userFound.name} (${phoneNumber}) yêu cầu reset password`;
          
          await sendNotificationToMultiple(notifTitle, notifBody, adminsWithToken);
        } catch (notifErr) {
          console.error('Lỗi gửi notif admin:', notifErr);
          // Vẫn trả về success vì request đã được lưu
        }
      }

      return { 
        success: true, 
        message: 'Yêu cầu reset password đã được gửi đến admin. Vui lòng chờ xác nhận.' 
      };
    } catch (error) {
      console.error('Reset password error:', error);
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