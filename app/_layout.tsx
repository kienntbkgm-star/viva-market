// FILE: app/_layout.tsx
// @ts-nocheck
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; // Bổ sung StatusBar
import React, { useEffect, useState } from 'react'; // Bổ sung React
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import NotificationProcess from '../src/components/Notification';
import { useAppStore } from '../src/store/useAppStore';

// KÍCH THƯỚC CHUẨN ĐỂ TÍNH TỶ LỆ (iPhone 14 Pro Max)
const PHONE_WIDTH = 430;
const PHONE_HEIGHT = 932;

export default function RootLayout() {
  const listenAllData = useAppStore((state) => state.listenAllData);
  
  // Lấy kích thước trình duyệt
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true); // Đánh dấu đã mount để tránh lỗi render lần đầu
    const unsubscribe = listenAllData();
    return () => unsubscribe && unsubscribe();
  }, []);

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