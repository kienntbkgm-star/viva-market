// @ts-nocheck
import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyButton, MyInput } from '../src/components/MyUI';
import { useAppStore } from '../src/store/useAppStore';
import { GlobalStyles } from '../src/styles/GlobalStyles'; // Giữ nguyên Style của bạn

export default function LoginScreen() {
  const router = useRouter();
  const { login, currentUser, initializeGuest, expoToken, requestPasswordReset } = useAppStore();
  
  const [phone, setPhone] = useState('0931837170');
  const [password, setPassword] = useState('Kien1234');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [isLoadingReset, setIsLoadingReset] = useState(false);

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

  const handleForgotPassword = async () => {
    if (forgotPhone.length < 10) {
      Alert.alert("Lỗi", "Số điện thoại không hợp lệ");
      return;
    }

    setIsLoadingReset(true);
    try {
      const result = await requestPasswordReset(forgotPhone);
      if (result.success) {
        Alert.alert("Thành công", result.message);
        setShowForgotModal(false);
        setForgotPhone('');
      } else {
        Alert.alert("Lỗi", result.message);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra, vui lòng thử lại");
    } finally {
      setIsLoadingReset(false);
    }
  };

  // CẬP NHẬT: Danh sách đăng nhập nhanh chuẩn theo dataFirebase.txt
  const quickLogins = [
    { label: 'ADMIN', phone: '0931837176', pass: 'Kien1234', color: '#E74C3C' },      // ID 205
    { label: 'VINMART', phone: '0838187343', pass: 'Kien1234', color: '#9B59B6' },    // ID 206 - Nguyễn Trường Giang
    { label: 'BÁCH HÓA XANH', phone: '0385756271', pass: 'Kien1234', color: '#27AE60' }, // ID 207 - Nguyễn Thị Nữ
    { label: 'GRABFOOD', phone: '0979934882', pass: 'Kien1234', color: '#E67E22' },   // ID 208 - Nguyễn Thị Diễm Phượng
    { label: 'NOWFOOD', phone: '0988276559', pass: 'Kien1234', color: '#16A085' },    // ID 209 - Nguyễn Văn Dũng
    { label: 'USER', phone: '0931837170', pass: 'Kien1234', color: '#3498DB' },       // ID 213
    { label: 'SHIPPER 1', phone: '0988276550', pass: 'Kien1234', color: '#1ABC9C' },  // ID 210
    { label: 'SHIPPER 2', phone: '0988276551', pass: 'Kien1234', color: '#2ECC71' },  // ID 211
    { label: 'SHIPPER 3', phone: '0988276552', pass: 'Kien1234', color: '#52C9A6' },  // ID 212
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

        {/* Nút Quên Password */}
        <TouchableOpacity 
          onPress={() => setShowForgotModal(true)}
          style={{ marginTop: 15, alignItems: 'center' }}
        >
          <Text style={{ color: '#3498DB', fontSize: 14, fontWeight: '600' }}>
            🔐 Quên mật khẩu?
          </Text>
        </TouchableOpacity>

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

      {/* Modal Quên Password */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔐 Yêu cầu Reset Mật khẩu</Text>
            
            <Text style={styles.modalDescription}>
              Nhập số điện thoại của bạn. Admin sẽ xử lý yêu cầu và gửi mật khẩu mới cho bạn.
            </Text>

            <MyInput
              placeholder="SỐ ĐIỆN THOẠI"
              value={forgotPhone}
              onChangeText={setForgotPhone}
              keyboard="phone-pad"
            />

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => {
                  setShowForgotModal(false);
                  setForgotPhone('');
                }}
                disabled={isLoadingReset}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitBtn, isLoadingReset && { opacity: 0.6 }]}
                onPress={handleForgotPassword}
                disabled={isLoadingReset}
              >
                {isLoadingReset ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Gửi Yêu cầu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
    },
    modalButtonGroup: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelBtn: {
        backgroundColor: '#E8E8E8',
    },
    cancelBtnText: {
        color: '#333',
        fontWeight: '600',
        fontSize: 14,
    },
    submitBtn: {
        backgroundColor: '#3498DB',
    },
    submitBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});