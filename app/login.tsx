// @ts-nocheck
import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyButton, MyInput } from '../src/components/MyUI';
import { useAppStore } from '../src/store/useAppStore';
import { GlobalStyles } from '../src/styles/GlobalStyles'; // Giữ nguyên Style của bạn

export default function LoginScreen() {
  const router = useRouter();
  const { login, currentUser, initializeGuest, expoToken } = useAppStore();
  
  const [phone, setPhone] = useState('0931837170');
  const [password, setPassword] = useState('Kien1234');

  if (currentUser) return <Redirect href="/(tabs)/home" />;

  const handleLogin = async (customPhone, customPass) => {
    const finalPhone = customPhone || phone;
    const finalPass = customPass || password;

    if (finalPhone.length < 10) {
        return Alert.alert("Lỗi", "Số điện thoại không hợp lệ");
    }
    
    const result = await login(finalPhone, finalPass, expoToken);
    if (result.success) {
        router.replace('/(tabs)/home');
    } else {
        Alert.alert("Lỗi", result.message);
    }
  };

  const handleGuestAccess = async () => {
    await initializeGuest();
    router.replace('/(tabs)/home');
  };

  // CẬP NHẬT: Danh sách đăng nhập nhanh chuẩn theo dataFirebase.txt
  const quickLogins = [
    { label: 'ADMIN', phone: '0931837176', pass: 'Kien1234', color: '#E74C3C' },      // ID 205
    { label: 'SHIPPER', phone: '0988276552', pass: 'Kien1234', color: '#27AE60' },    // ID 212
    { label: 'CHỦ SHOP', phone: '0979934882', pass: 'Kien1234', color: '#F1C40F' },   // ID 208 (Thay thế User cũ)
    { label: 'USER', phone: '0931837170', pass: 'Kien1234', color: '#3498DB' },       // ID 213
  ];

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <ScrollView contentContainerStyle={GlobalStyles.scrollContent}>
        <View style={{ width: '100%', marginTop: 20 }}>
          <Image 
            source={require('../src/assets/onboardImage.png')} 
            style={{ width: '100%', height: 200, resizeMode: 'contain' }} 
          />
        </View>

        <Text style={GlobalStyles.bigTitle}>VIVA MARKET</Text>

        <MyInput 
          placeholder="SỐ ĐIỆN THOẠI" 
          value={phone} 
          onChangeText={setPhone} 
          keyboard="phone-pad" 
        />
        <MyInput 
          placeholder="MẬT KHẨU" 
          value={password} 
          onChangeText={setPassword} 
          isPass 
        />

        <MyButton title="ĐĂNG NHẬP" onPress={() => handleLogin()} />

        {/* PHỤC HỒI UI GỐC: Nút Đăng nhập nhanh 48% như file của bạn */}
        <View style={styles.quickLoginContainer}>
            <Text style={styles.quickTitle}>Đăng nhập nhanh cho Tester</Text>
            <View style={styles.buttonGrid}>
                {quickLogins.map((item, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={[styles.quickBtn, { backgroundColor: item.color }]} 
                        onPress={() => handleLogin(item.phone, item.pass)}
                    >
                        <Text style={styles.quickBtnText}>{item.label}</Text>
                        <Text style={styles.quickPhoneText}>{item.phone}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>

        <View style={GlobalStyles.linkContainer}>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={GlobalStyles.linkText}>
              Chưa có tài khoản? <Text style={GlobalStyles.linkHighlight}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleGuestAccess} style={{ marginTop: 15 }}>
            <Text style={GlobalStyles.linkText}>
              Hoặc <Text style={GlobalStyles.linkHighlight}>Bỏ qua đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// PHỤC HỒI HOÀN TOÀN STYLE GỐC CỦA BẠN
const styles = StyleSheet.create({
    quickLoginContainer: { marginTop: 30, padding: 15, backgroundColor: '#F8F9FA', borderRadius: 20 },
    quickTitle: { textAlign: 'center', color: '#666', marginBottom: 15, fontSize: 13, fontWeight: 'bold' },
    buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
    quickBtn: {
        width: '48%',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 2,
    },
    quickBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    quickPhoneText: { color: '#fff', fontSize: 10, marginTop: 2, opacity: 0.9 },
});