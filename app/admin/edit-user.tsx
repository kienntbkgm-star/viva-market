// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import bcryptjs from 'bcryptjs';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView, Platform,
    SafeAreaView, ScrollView, StyleSheet, Text, TextInput,
    TouchableOpacity, View
} from 'react-native';
import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function EditUserScreen() {

  const IMGBB_API_KEY = '4be67bc1f9e424d0e25f23a35ab95c03';
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const users = useAppStore((state) => state.users);
  const [uploadingField, setUploadingField] = useState(null); // Theo dõi field nào đang upload

  const [formData, setFormData] = useState({
    id: null,
    uid: '',
    name: '',
    phone: '',
    password: '',
    address: '',
    role: 'user',
    status: 'enable',
    mustCheckIn: 'disable',
    checkInDate: '',
    point: '',
    index: 1,
    shopName: '',
    imgShop: '',
    imgShopSquare: '',
    expoToken: '',
    isReady: false,
    readyDate: '',
    isResidentShop: false,
    createdAt: '',
    log: []
  });

  useEffect(() => {
    if (id) {
      const u = users.find(x => x.id.toString() === id.toString());
      if (u) {
        setFormData({
          ...u,
          id: u.id,
          point: u.point?.toString() || '',
          index: u.index || 1,
        });
      }
    }
  }, [id, users]);

  const handleUpload = async (field) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: field === 'imgShop' ? [16, 9] : [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    setUploadingField(field);
    const imageUri = result.assets[0].uri;
    const data = new FormData();
    data.append('image', {
      uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
      type: 'image/jpeg',
      name: 'upload.jpg',
    });

    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: data,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const resJson = await response.json();
      if (resJson.success) {
        setFormData(prev => ({ ...prev, [field]: resJson.data.url }));
      } else {
        Alert.alert("Lỗi", "Không thể upload ảnh lên ImgBB");
      }
    } catch (err) {
      Alert.alert("Lỗi", "Quá trình upload thất bại");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.phone) {
      Alert.alert("Lỗi", "Tên và Số điện thoại không được để trống");
      return;
    }

    try {
      const userRef = doc(db, 'users', id.toString());
      const payload = {
        ...formData,
        id: Number(formData.id),
        index: Number(formData.index || 1),
      };

      await updateDoc(userRef, payload);
      Alert.alert("Thành công", `Đã cập nhật User #${id}`, [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (err) {
      Alert.alert("Lỗi cập nhật", err.message);
    }
  };

  const handleResetPassword = () => {
    Alert.alert(
      "Reset Password",
      `Bạn chắc chắn muốn reset password của ${formData.name} về "123456"?`,
      [
        { text: "Hủy", onPress: () => {}, style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              const hashedPassword = bcryptjs.hashSync('123456', 10);
              const userRef = doc(db, 'users', id.toString());
              await updateDoc(userRef, { password: hashedPassword });
              
              setFormData(prev => ({ ...prev, password: hashedPassword }));
              Alert.alert("Thành công", "Password đã reset về '123456'");
            } catch (err) {
              Alert.alert("Lỗi", "Không thể reset password: " + err.message);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const roles = ['user', 'admin', 'chủ shop', 'shipper', 'manager'];

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
          <View style={{alignItems: 'center'}}>
            <Text style={styles.headerTitle}>Hồ sơ người dùng</Text>
            <Text style={styles.idSubText}>ID: {id} | UID: {formData.uid || 'N/A'}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveText}>Lưu</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 15 }}>
          {/* SECTION TÀI KHOẢN & BẢO MẬT */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TÀI KHOẢN & BẢO MẬT</Text>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput style={styles.input} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} />
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={formData.phone} onChangeText={t => setFormData({...formData, phone: t})} />
            <TouchableOpacity style={styles.resetPasswordBtn} onPress={handleResetPassword}>
              <Text style={styles.resetPasswordText}>🔐 Reset Password về 123456</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Địa chỉ</Text>
            <TextInput style={styles.input} value={formData.address} onChangeText={t => setFormData({...formData, address: t})} />
          </View>

          {/* SECTION CẤU HÌNH HỆ THỐNG */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CẤU HÌNH HỆ THỐNG</Text>
            <Text style={styles.label}>Vai trò (Role)</Text>
            <View style={styles.roleGrid}>
              {roles.map(r => (
                <TouchableOpacity 
                  key={r} 
                  style={[styles.roleItem, formData.role === r && styles.roleActive]}
                  onPress={() => setFormData({...formData, role: r})}
                >
                  <Text style={[styles.roleText, formData.role === r && styles.roleTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Trạng thái</Text>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, formData.status === 'enable' ? styles.bgGreen : styles.bgRed]}
                        onPress={() => setFormData({...formData, status: formData.status === 'enable' ? 'disable' : 'enable'})}
                    >
                        <Text style={styles.toggleText}>Status: {formData.status === 'enable' ? '✓ Kích hoạt' : '✗ Khóa'}</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>Must Check-in</Text>
                    <TouchableOpacity 
                        style={[styles.toggleBtn, formData.mustCheckIn === 'enable' ? styles.bgGreen : styles.bgRed]}
                        onPress={() => setFormData({...formData, mustCheckIn: formData.mustCheckIn === 'enable' ? 'disable' : 'enable'})}
                    >
                        <Text style={styles.toggleText}>{formData.mustCheckIn === 'enable' ? '✓ Bật' : '✗ Tắt'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.row}>
                <View style={styles.col}>
                    <Text style={styles.label}>Điểm (Point)</Text>
                    <TextInput style={styles.input} value={formData.point} onChangeText={t => setFormData({...formData, point: t})} />
                </View>
                <View style={styles.col}>
                    <Text style={styles.label}>Thứ tự (Index)</Text>
                    <TextInput style={styles.input} keyboardType="numeric" value={formData.index.toString()} onChangeText={t => setFormData({...formData, index: t})} />
                </View>
            </View>

            {/* Trạng thái Ready cho Shipper/Shop */}
            {(formData.role === 'shipper' || formData.role === 'chủ shop') && (
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Sẵn sàng hôm nay</Text>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, formData.isReady ? styles.bgGreen : styles.bgRed]}
                    onPress={() => setFormData({...formData, isReady: !formData.isReady})}
                  >
                    <Text style={styles.toggleText}>{formData.isReady ? '✓ Có' : '✗ Không'}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Ready Date</Text>
                  <TextInput style={styles.input} value={formData.readyDate} onChangeText={t => setFormData({...formData, readyDate: t})} placeholder="YYYY-MM-DD" />
                </View>
              </View>
            )}

            {/* Resident Shop */}
            <Text style={styles.label}>Cửa hàng Resident</Text>
            <TouchableOpacity 
              style={[styles.toggleBtn, formData.isResidentShop ? styles.bgGreen : styles.bgRed]}
              onPress={() => setFormData({...formData, isResidentShop: !formData.isResidentShop})}
            >
              <Text style={styles.toggleText}>{formData.isResidentShop ? '✓ Có' : '✗ Không'}</Text>
            </TouchableOpacity>
          </View>

          {/* SECTION THÔNG TIN CỬA HÀNG - Đã đưa icon vào ngang hàng ô input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THÔNG TIN CỬA HÀNG</Text>
            <Text style={styles.label}>Tên Shop</Text>
            <TextInput style={styles.input} value={formData.shopName} onChangeText={t => setFormData({...formData, shopName: t})} />
            
            <Text style={styles.label}>Ảnh ngang (Landscape URL)</Text>
            <View style={styles.inputWithIcon}>
              <TextInput 
                style={[styles.input, {flex: 1}]} 
                value={formData.imgShop} 
                onChangeText={t => setFormData({...formData, imgShop: t})} 
              />
              <TouchableOpacity style={styles.iconInside} onPress={() => handleUpload('imgShop')}>
                {uploadingField === 'imgShop' ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="cloud-upload" size={22} color={COLORS.primary} />}
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Ảnh vuông (Square URL)</Text>
            <View style={styles.inputWithIcon}>
              <TextInput 
                style={[styles.input, {flex: 1}]} 
                value={formData.imgShopSquare} 
                onChangeText={t => setFormData({...formData, imgShopSquare: t})} 
              />
              <TouchableOpacity style={styles.iconInside} onPress={() => handleUpload('imgShopSquare')}>
                {uploadingField === 'imgShopSquare' ? <ActivityIndicator size="small" color="#E67E22" /> : <Ionicons name="image" size={22} color="#E67E22" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION THÔNG TIN KHÁC */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THÔNG TIN KHÁC</Text>
            <Text style={styles.infoLabel}>ExpoToken:</Text>
            <Text style={styles.infoValue}>{formData.expoToken || 'N/A'}</Text>
            
            <Text style={[styles.infoLabel, {marginTop: 10}]}>UID:</Text>
            <Text style={styles.infoValue}>{formData.uid || 'N/A'}</Text>
            
            <Text style={[styles.infoLabel, {marginTop: 10}]}>Ngày tạo:</Text>
            <Text style={styles.infoValue}>{formData.createdAt ? new Date(formData.createdAt).toLocaleString('vi-VN') : 'N/A'}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },
  idSubText: { fontSize: 9, color: '#999', marginTop: 2 },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  saveText: { color: '#fff', fontWeight: 'bold' },
  section: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 1 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10, letterSpacing: 0.5 },
  label: { fontSize: 11, color: '#666', marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: '#f5f7f9', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eef1f4', fontSize: 14 },
  infoLabel: { fontSize: 11, color: '#666', fontWeight: '600', marginTop: 8 },
  infoValue: { backgroundColor: '#f5f7f9', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eef1f4', fontSize: 12, color: '#333' },
  
  // Style mới để đưa icon ngang hàng với input
  inputWithIcon: { flexDirection: 'row', alignItems: 'center' },
  iconInside: { marginLeft: 10, padding: 5 },

  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 5 },
  roleItem: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', marginRight: 6, marginBottom: 6 },
  roleActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleText: { fontSize: 11, color: '#666' },
  roleTextActive: { color: '#fff', fontWeight: 'bold' },
  toggleBtn: { padding: 10, borderRadius: 8, alignItems: 'center' },
  bgGreen: { backgroundColor: '#27AE60' },
  bgRed: { backgroundColor: '#EB5757' },
  toggleText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  resetPasswordBtn: { backgroundColor: '#FF6B6B', paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  resetPasswordText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  tokenLabel: { fontSize: 9, color: '#ccc', textAlign: 'center', marginBottom: 30 }
});