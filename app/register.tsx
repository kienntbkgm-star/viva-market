// @ts-nocheck
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyButton, MyInput } from '../src/components/MyUI';
import { useAppStore } from '../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../src/styles/GlobalStyles';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, expoToken } = useAppStore(); // Lấy hàm register từ store

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    // 1. Kiểm tra nhập liệu cơ bản
    if (!name || !phone || !password) {
      return Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
    }
    if (phone.length < 10) {
      return Alert.alert("Lỗi", "Số điện thoại không hợp lệ");
    }

    // 2. Gọi hàm đăng ký từ Store
    // Truyền thêm expoToken để sau này Admin có thể gửi thông báo cho user này
    const result = await register(name, phone, password, expoToken);

    if (result.success) {
      Alert.alert("Thành công", "Tài khoản của bạn đã được tạo", [
        { text: "Đăng nhập ngay", onPress: () => router.replace('/login') }
      ]);
    } else {
      Alert.alert("Lỗi", result.message || "Đăng ký thất bại");
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <ScrollView contentContainerStyle={GlobalStyles.scrollContent}>
        
        {/* Nút quay lại kiểu link */}
        <TouchableOpacity 
          style={{ padding: 20 }} 
          onPress={() => router.back()}
        >
          <Text style={{ color: COLORS.text, fontSize: 16 }}>← Quay lại</Text>
        </TouchableOpacity>

        <Text style={GlobalStyles.bigTitle}>ĐĂNG KÝ</Text>

        <MyInput 
          placeholder="HỌ VÀ TÊN" 
          value={name} 
          onChangeText={setName} 
        />
        
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

        <MyButton title="TẠO TÀI KHOẢN" onPress={handleRegister} />

        <View style={GlobalStyles.linkContainer}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={GlobalStyles.linkText}>
              Đã có tài khoản? <Text style={GlobalStyles.linkHighlight}>Đăng nhập</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}