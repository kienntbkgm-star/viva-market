// FILE: app/_layout.tsx
// @ts-nocheck
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; // Bổ sung StatusBar
import React, { useEffect, useRef, useState } from 'react'; // Bổ sung React
import { Alert, AppState, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import NotificationProcess from '../src/components/Notification';
import { useAppStore } from '../src/store/useAppStore';

// KÍCH THƯỚC CHUẨN ĐỂ TÍNH TỶ LỆ (iPhone 14 Pro Max)
const PHONE_WIDTH = 430;
const PHONE_HEIGHT = 932;

export default function RootLayout() {
  const router = useRouter();
  const listenAllData = useAppStore((state) => state.listenAllData);
  const currentUser = useAppStore((state) => state.currentUser);
  const checkCrashOnRestart = useAppStore((state) => state.checkCrashOnRestart);
  const logOnlineToLocal = useAppStore((state) => state.logOnlineToLocal);
  const logOfflineAndUpload = useAppStore((state) => state.logOfflineAndUpload);
  const ensureShipperReadyFresh = useAppStore((state) => state.ensureShipperReadyFresh);
  
  // Lấy kích thước trình duyệt
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);
  const appState = useRef(AppState.currentState);
  const hasAlerted = useRef(false); // Track để tránh alert 2 lần

  useEffect(() => {
    setMounted(true); // Đánh dấu đã mount để tránh lỗi render lần đầu
    const unsubscribe = listenAllData();
    return () => unsubscribe && unsubscribe();
  }, []);

  // Reset trạng thái ready của shipper và shop owner mỗi ngày khi app mở
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'shipper' && currentUser.role !== 'chủ shop')) return;
    if (hasAlerted.current) return; // Đã alert rồi thì không alert nữa
    
    const checkAndAlert = async () => {
      await ensureShipperReadyFresh();
      
      // Đợi một chút để state cập nhật sau khi reset
      setTimeout(() => {
        if (!currentUser.isReady && !hasAlerted.current) {
          hasAlerted.current = true; // Đánh dấu đã alert
          
          if (Platform.OS === 'web') {
            if (window.confirm('Bạn chưa bật trạng thái "Sẵn sàng" hôm nay. Đi đến Hồ sơ để bật?')) {
              router.push('/(tabs)/profile');
            }
          } else {
            Alert.alert(
              'Chưa bật sẵn sàng',
              'Bạn chưa bật trạng thái "Sẵn sàng" hôm nay. Vui lòng vào Hồ sơ để bật trước khi nhận đơn.',
              [
                { text: 'Để sau', style: 'cancel' },
                { text: 'Đi đến Hồ sơ', onPress: () => {
                  router.push('/(tabs)/profile');
                }}
              ]
            );
          }
        }
      }, 500);
    };
    
    checkAndAlert();
  }, [currentUser?.id]);

  // Setup online/offline tracking
  useEffect(() => {
    if (!currentUser || !currentUser.id) {
      console.log('[AppState] No currentUser or ID, skip tracking');
      return;
    }

    console.log(`[AppState] 🟢 Setup tracking for user: ${currentUser.id}`);

    // Kiểm tra crash khi app restart
    checkCrashOnRestart();

    // Ghi log online khi app khởi động
    logOnlineToLocal();

    // Setup AppState listener
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const timestamp = new Date().toLocaleTimeString('vi-VN');
      
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log(`[AppState] ✅ ${timestamp} | State: ${appState.current} → ${nextAppState} | ACTION: logOnlineToLocal()`);
        logOnlineToLocal();
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log(`[AppState] ⏸️ ${timestamp} | State: ${appState.current} → ${nextAppState} | ACTION: logOfflineAndUpload()`);
        logOfflineAndUpload();
      } else {
        console.log(`[AppState] ℹ️ ${timestamp} | State: ${appState.current} → ${nextAppState} | (No action)`);
      }
      
      appState.current = nextAppState;
    });

    return () => {
      console.log('[AppState] 🔴 Cleanup tracking');
      subscription.remove();
    };
  }, [currentUser]);

  const AppContent = (
    <>
      <StatusBar style="dark" />
      <NotificationProcess />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ServiceDetail" /> {/* Thêm màn hình ServiceDetail */}
        <Stack.Screen name="itemDetail" />
        <Stack.Screen name="index" /> 
        <Stack.Screen name="login" />
        <Stack.Screen 
          name="register" 
          options={{ animation: 'slide_from_right', gestureEnabled: true }} 
        />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        
        {/* Các màn hình Admin */}
        <Stack.Screen name="admin/products" />
        <Stack.Screen name="admin/promos" />
        <Stack.Screen name="admin/users" />
        <Stack.Screen name="admin/service-order-detail" />
      </Stack>
    </>
  );

  // ============================================================
  // LOGIC WEB THÔNG MINH: PHÂN BIỆT MOBILE BROWSER & PC
  // ============================================================
  if (Platform.OS === 'web') {
    if (!mounted) return null;

    // 1. Kiểm tra xem trình duyệt có phải đang chạy trên thiết bị di động không
    const isMobileBrowser = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 2. TRƯỜNG HỢP MOBILE WEB: Hiển thị Full màn hình (Bỏ qua scale)
    if (isMobileBrowser) {
        return (
            <View style={styles.mobileWebContainer}>
                {AppContent}
            </View>
        );
    }

    // 3. TRƯỜNG HỢP PC WEB: Hiển thị giả lập khung điện thoại (Scale & Center)
    const scaleHeight = (windowHeight - 20) / PHONE_HEIGHT;
    const scaleWidth = (windowWidth - 20) / PHONE_WIDTH;
    
    let finalScale = Math.min(scaleHeight, scaleWidth);

    // Safety Check: Không cho scale quá bé
    if (finalScale < 0.4) {
        finalScale = 0.5; 
    }

    return (
      <View style={styles.pcWebContainer}>
        <View 
            style={[
                styles.scaleWrapper, 
                { 
                    width: PHONE_WIDTH, 
                    height: PHONE_HEIGHT,
                    transform: [{ scale: finalScale }] 
                }
            ]}
        >
           <View style={styles.mobileContent}>
              {AppContent}
           </View>
        </View>
      </View>
    );
  }

  // Native App (Android/iOS)
  return AppContent;
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  // Style cho trình duyệt trên điện thoại (Full màn hình)
  mobileWebContainer: {
    flex: 1,
    height: '100vh', // Ép chiều cao bằng viewport
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },

  // Style cho trình duyệt trên PC (Căn giữa, nền xám)
  pcWebContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5', // Màu nền PC xám nhẹ
    alignItems: 'center',       
    justifyContent: 'center',   
    height: '100vh', 
    width: '100%',
    overflow: 'hidden',
  },

  scaleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },

  mobileContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 0,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden',
  }
});