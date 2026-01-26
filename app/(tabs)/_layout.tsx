// @ts-nocheck
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS } from '../../src/styles/GlobalStyles';

export default function TabLayout() {  
 const cart = useAppStore((state) => state.cart);
 const currentUser = useAppStore((state) => state.currentUser);
 const foodOrders = useAppStore((state) => state.foodOrders);
 
 const totalItems = cart.reduce((total, item) => total + (item.quantity || 0), 0);
 const pendingOrdersCount = foodOrders.filter(order => order.status === 'pending').length;
 const userRole = currentUser?.role ? String(currentUser.role).toLowerCase().trim() : '';

 return (  
 <Tabs  
  screenOptions={{  
   tabBarActiveTintColor: COLORS.primary,  
   tabBarInactiveTintColor: '#999',  
   headerShown: false,  
   tabBarStyle: { height: 60, paddingBottom: 10, backgroundColor: '#fff' },  
  }}  
 >  
  {/* 1. TRANG CHỦ */}
  <Tabs.Screen name="home" options={{ title: 'Trang chủ', tabBarIcon: ({ color }) => <MaterialIcons name="home" size={28} color={color} /> }} />  
  
  {/* 2. DỊCH VỤ (MỚI TÍCH HỢP) */}
  <Tabs.Screen 
    name="services" 
    options={{ 
      title: 'Dịch vụ', 
      tabBarIcon: ({ color }) => <MaterialCommunityIcons name="hammer-wrench" size={26} color={color} /> 
    }} 
  />

  {/* 3. GIỎ HÀNG */}
  <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng', tabBarBadge: totalItems > 0 ? totalItems : null, tabBarBadgeStyle: { backgroundColor: '#FF4747', color: 'white', fontSize: 10 }, tabBarIcon: ({ color }) => <MaterialIcons name="shopping-cart" size={28} color={color} /> }} />  

  {/* 4. GIAO HÀNG (ẨN NẾU KHÔNG PHẢI SHIPPER) */}
  <Tabs.Screen 
    name="shipper" 
    options={{ 
      title: 'Giao hàng', 
      href: userRole === 'shipper' ? '/shipper' : null, 
      tabBarBadge: (userRole === 'shipper' && pendingOrdersCount > 0) ? pendingOrdersCount : null,
      tabBarBadgeStyle: { backgroundColor: '#FF4747', color: 'white', fontSize: 10 },
      tabBarIcon: ({ color }) => <Ionicons name="bicycle" size={26} color={color} /> 
    }} 
  />

  {/* 5. QUẢN LÝ ADMIN (ĐÃ ẨN KHỎI TABBAR) */}
  <Tabs.Screen 
    name="admin" 
    options={{ 
      title: 'Quản lý', 
      href: null, 
      tabBarIcon: ({ color }) => <MaterialIcons name="admin-panel-settings" size={28} color={color} /> 
    }} 
  />
  
  {/* 6. ĐƠN HÀNG (ĐÃ ẨN KHỎI TABBAR) */}
  <Tabs.Screen 
    name="orders" 
    options={{ 
      title: 'Đơn hàng', 
      href: null, 
      tabBarIcon: ({ color }) => <MaterialIcons name="assignment" size={28} color={color} /> 
    }} 
  />  
  
  {/* 7. CÁ NHÂN */}
  <Tabs.Screen name="profile" options={{ title: 'Cá nhân', tabBarIcon: ({ color }) => <MaterialIcons name="person" size={28} color={color} /> }} />  
 </Tabs>  
 );  
}