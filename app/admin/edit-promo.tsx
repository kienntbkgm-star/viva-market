// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
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

export default function EditPromoScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { promos, users } = useAppStore(); // Lấy thêm list users để đối chiếu usedBy

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    value: '',
    limit: '',
    maxPerUser: '1',
    durationDays: '30',
    enable: true,
    used: 0,
    usedBy: [], // Dữ liệu mẫu: []
    created: new Date().toISOString()
  });

  useEffect(() => {
    if (id && promos) {
      const promo = promos.find((p) => p.id.toString() === id.toString());
      if (promo) {
        setFormData({
          ...promo,
          value: promo.value.toString(),
          limit: promo.limit.toString(),
          maxPerUser: promo.maxPerUser.toString(),
          durationDays: promo.durationDays.toString(),
        });
      }
    }
  }, [id, promos]);

  const handleSave = async () => {
    if (!formData.code || !formData.value || !formData.limit) {
      Alert.alert("Lỗi", "Vui lòng nhập Mã, Giá trị và Giới hạn");
      return;
    }

    setLoading(true);
    try {
      const promoId = id || Date.now().toString();
      const promoRef = doc(db, 'promos', promoId);

      const finalData = {
        ...formData,
        id: promoId,
        code: formData.code.toUpperCase().trim(),
        value: Number(formData.value),
        limit: Number(formData.limit),
        maxPerUser: Number(formData.maxPerUser),
        durationDays: Number(formData.durationDays),
        enable: Boolean(formData.enable),
        created: formData.created,
        used: Number(formData.used || 0),
        usedBy: formData.usedBy || []
      };

      if (id) {
        await updateDoc(promoRef, finalData);
      } else {
        await setDoc(promoRef, finalData);
      }

      Alert.alert("Thành công", "Đã lưu mã khuyến mãi");
      router.back();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể lưu dữ liệu vào Firebase");
    } finally {
      setLoading(false);
    }
  };

  // Hàm lấy thông tin user từ ID trong usedBy
  const getUserInfo = (userId) => {
    return users.find(u => String(u.id) === String(userId));
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>{id ? 'Cập nhật mã' : 'Tạo mã mới'}</Text>
          {id && <Text style={styles.idSubText}>ID: {id}</Text>}
        </View>

        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveBtn, loading && { opacity: 0.5 }]}>Lưu</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.formContainer}>
          {/* PHẦN NHẬP LIỆU CHÍNH */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mã giảm giá (Code)</Text>
            <TextInput
              style={styles.input}
              value={formData.code}
              onChangeText={(t) => setFormData({ ...formData, code: t })}
              placeholder="FREESHIP02"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Giá trị giảm (%)</Text>
              <TextInput
                style={styles.input}
                value={formData.value}
                onChangeText={(t) => setFormData({ ...formData, value: t })}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Tổng lượt dùng (Limit)</Text>
              <TextInput
                style={styles.input}
                value={formData.limit}
                onChangeText={(t) => setFormData({ ...formData, limit: t })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Số ngày hiệu lực</Text>
              <TextInput
                style={styles.input}
                value={formData.durationDays}
                onChangeText={(t) => setFormData({ ...formData, durationDays: t })}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Lượt dùng/Người</Text>
              <TextInput
                style={styles.input}
                value={formData.maxPerUser}
                onChangeText={(t) => setFormData({ ...formData, maxPerUser: t })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.statusContainer}>
            <Text style={styles.label}>Trạng thái kích hoạt (enable)</Text>
            <Switch
              value={formData.enable}
              onValueChange={(v) => setFormData({ ...formData, enable: v })}
              trackColor={{ false: '#D1D1D1', true: '#27AE60' }}
            />
          </View>

          {/* DANH SÁCH NGƯỜI DÙNG ĐÃ XÀI (usedBy) */}
          <View style={styles.usedSection}>
            <View style={styles.usedHeader}>
                <Text style={styles.label}>Người dùng đã sử dụng ({formData.used})</Text>
                <Ionicons name="people-outline" size={16} color="#666" />
            </View>
            
            {formData.usedBy && formData.usedBy.length > 0 ? (
                <View style={styles.userList}>
                    {formData.usedBy.map((userId, index) => {
                        const user = getUserInfo(userId);
                        return (
                            <View key={index} style={styles.userItem}>
                                <View style={styles.userAvatar}>
                                    <Text style={styles.avatarText}>{user?.name?.charAt(0) || '?'}</Text>
                                </View>
                                <View>
                                    <Text style={styles.userName}>{user?.name || `User ID: ${userId}`}</Text>
                                    <Text style={styles.userPhone}>{user?.phone || 'Không có SĐT'}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            ) : (
                <Text style={styles.emptyText}>Chưa có người dùng nào sử dụng mã này.</Text>
            )}
          </View>

          <View style={styles.timeBox}>
            <Text style={styles.timeText}>Ngày tạo: {new Date(formData.created).toLocaleString('vi-VN')}</Text>
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
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9F9F9', padding: 15, borderRadius: 12, marginBottom: 20 },
  
  // Styles cho usedBy list
  usedSection: { marginTop: 10, padding: 15, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  usedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  userList: { gap: 12 },
  userItem: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#F2F2F2', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary },
  userName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  userPhone: { fontSize: 12, color: '#999' },
  emptyText: { fontSize: 13, color: '#BBB', fontStyle: 'italic', textAlign: 'center', marginVertical: 10 },

  timeBox: { marginTop: 25, alignItems: 'center' },
  timeText: { color: '#BBB', fontSize: 11 }
});