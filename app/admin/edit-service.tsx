// FILE: app/admin/edit-service.tsx
// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function EditServiceScreen() {
  const [uploadingBackup, setUploadingBackup] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Hàm upload ảnh backupImg
  const handlePickAndUploadBackup = async () => {
    try {
      setUploadingBackup(true);
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Upload lên imgbb hoặc server của bạn ở đây
        // Ví dụ upload lên imgbb:
        const formDataImg = new FormData();
        formDataImg.append('image', {
          uri: result.assets[0].uri,
          name: 'backupImg.jpg',
          type: 'image/jpeg',
        });
        const res = await fetch('https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY', {
          method: 'POST',
          body: formDataImg,
        });
        const data = await res.json();
        if (data && data.data && data.data.url) {
          setFormData({ ...formData, backupImg: data.data.url });
        } else {
          Alert.alert('Lỗi', 'Không upload được ảnh dự phòng');
        }
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không upload được ảnh dự phòng: ' + e.message);
    } finally {
      setUploadingBackup(false);
    }
  };

  // Hàm upload ảnh chính
  const handlePickAndUploadImg = async () => {
    try {
      setUploadingImg(true);
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const formDataUpload = new FormData();
        formDataUpload.append('image', asset.base64);
        const res = await fetch('https://api.imgbb.com/1/upload?key=YOUR_IMGBB_API_KEY', {
          method: 'POST',
          body: formDataUpload,
        });
        const data = await res.json();
        if (data && data.data && data.data.url) {
          setFormData({ ...formData, img: data.data.url });
        } else {
          Alert.alert('Lỗi', 'Không upload được ảnh');
        }
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không upload được ảnh: ' + e.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { services } = useAppStore(); // Lấy list services từ store

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    priceNormal: '',
    pricePromo: '',
    moneyShare: '20', // Mặc định % admin là 20
    img: '',
    backupImg: '',
    status: 'enable',
    index: '0',
    shopId: '209', // Mặc định shopId dịch vụ
    note: ''
  });

  useEffect(() => {
    if (id && services) {
      const service = services.find((s) => s.id.toString() === id.toString());
      if (service) {
        setFormData({
          ...service,
          priceNormal: service.priceNormal?.toString() || '',
          pricePromo: service.pricePromo?.toString() || '',
          moneyShare: service.moneyShare?.toString() || '0',
          index: service.index?.toString() || '0',
          shopId: service.shopId?.toString() || '209',
        });
      }
    }
  }, [id, services]);

  const handleSave = async () => {
    if (!formData.name || !formData.pricePromo || !formData.img) {
      Alert.alert("Lỗi", "Vui lòng nhập Tên, Giá bán và Link ảnh dịch vụ");
      return;
    }

    setLoading(true);
    try {
      const serviceId = id || Date.now().toString();
      const serviceRef = doc(db, 'services', serviceId);

      const finalData = {
        ...formData,
        id: isNaN(Number(serviceId)) ? serviceId : Number(serviceId),
        name: formData.name.trim(),
        priceNormal: Number(formData.priceNormal),
        pricePromo: Number(formData.pricePromo),
        moneyShare: Number(formData.moneyShare), // % cho Admin
        index: Number(formData.index),
        shopId: Number(formData.shopId),
        status: formData.status,
        log: []
      };

      if (id) {
        await updateDoc(serviceRef, finalData);
      } else {
        await setDoc(serviceRef, finalData, { merge: true });
      }

      Alert.alert("Thành công", "Đã lưu thông tin dịch vụ");
      router.back();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{id ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ mới'}</Text>
          {id && <Text style={styles.idSubText}>ID: {id}</Text>}
        </View>

        <TouchableOpacity onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveBtn}>Lưu</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tên dịch vụ</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(t) => setFormData({ ...formData, name: t })}
              placeholder="VD: Thay lõi lọc nước"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Link hình ảnh (URL) *</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                value={formData.img} 
                onChangeText={t => setFormData({...formData, img: t})} 
                placeholder="https://..." 
              />
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickAndUploadImg} disabled={uploadingImg}>
                {uploadingImg ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />}
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Link ảnh dự phòng (Backup Image URL)</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                value={formData.backupImg} 
                onChangeText={t => setFormData({...formData, backupImg: t})} 
                placeholder="https://..." 
              />
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickAndUploadBackup} disabled={uploadingBackup}>
                {uploadingBackup ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Giá gốc (K)</Text>
              <TextInput
                style={styles.input}
                value={formData.priceNormal}
                onChangeText={(t) => setFormData({ ...formData, priceNormal: t })}
                keyboardType="numeric"
                placeholder="50"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Giá bán (K)</Text>
              <TextInput
                style={styles.input}
                value={formData.pricePromo}
                onChangeText={(t) => setFormData({ ...formData, pricePromo: t })}
                keyboardType="numeric"
                placeholder="40"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>% Cho Admin (moneyShare)</Text>
              <TextInput
                style={styles.input}
                value={formData.moneyShare}
                onChangeText={(t) => setFormData({ ...formData, moneyShare: t })}
                keyboardType="numeric"
                placeholder="20"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Số thứ tự hiển thị</Text>
              <TextInput
                style={styles.input}
                value={formData.index}
                onChangeText={(t) => setFormData({ ...formData, index: t })}
                keyboardType="numeric"
                placeholder="1"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ghi chú dịch vụ</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={formData.note}
              onChangeText={(t) => setFormData({ ...formData, note: t })}
              placeholder="Mô tả chi tiết dịch vụ..."
              multiline
            />
          </View>

          <View style={styles.statusContainer}>
            <Text style={styles.label}>Kích hoạt dịch vụ</Text>
            <Switch
              value={formData.status === 'enable'}
              onValueChange={(v) => setFormData({ ...formData, status: v ? 'enable' : 'disable' })}
              trackColor={{ false: '#D1D1D1', true: '#27AE60' }}
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  idSubText: { fontSize: 11, color: '#999', marginTop: 2 },
  saveBtn: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  formContainer: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: 'bold', color: '#555', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderRadius: 12, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row' },
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, marginBottom: 40 },
});