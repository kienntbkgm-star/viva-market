// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, Platform,
  SafeAreaView, ScrollView, StyleSheet,
  Switch,
  Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

const IMGBB_API_KEY = '4be67bc1f9e424d0e25f23a35ab95c03';

export default function EditFoodScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const foods = useAppStore((state) => state.foods);

  const [uploading, setUploading] = useState(false);
  const [uploadingBackup, setUploadingBackup] = useState(false);
  const [options, setOptions] = useState([]);
  const [editingOption, setEditingOption] = useState(null);
  const [optionForm, setOptionForm] = useState({
    name: '',
    price: '',
    status: true, // Mặc định là true
    isDefault: false // Thêm trường này
  });

  const [formData, setFormData] = useState({
    id: null,
    name: '',
    img: '',
    backupImg: '',
    priceNormal: '',
    pricePromo: '',
    shopId: '',
    index: '0',
    status: 'enable',
    timeStart: '00',
    timeEnd: '23',
    type: 'đồ ăn',
    note: ''
  });

  useEffect(() => {
    if (id) {
      const f = foods.find(x => x.id.toString() === id.toString());
      if (f) {
        setFormData({
          id: f.id,
          name: f.name || '',
          img: f.img || '',
          backupImg: f.backupImg || '',
          priceNormal: f.priceNormal?.toString() || '',
          pricePromo: f.pricePromo?.toString() || '',
          shopId: f.shopId?.toString() || '',
          index: f.index?.toString() || '0',
          status: f.status || 'enable',
          timeStart: f.timeStart || '00',
          timeEnd: f.timeEnd || '23',
          type: f.type || 'đồ ăn',
          note: f.note || ''
        });
        
        // Load options từ dữ liệu food
        if (f.option && Array.isArray(f.option)) {
          setOptions([...f.option]);
        } else {
          setOptions([]);
        }
      }
    }
  }, [id, foods]);

  // --- UPLOAD IMGBB ---
  const handlePickAndUpload = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);
      const asset = result.assets[0];

      try {
        const formDataUpload = new FormData();
        formDataUpload.append('image', asset.base64);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formDataUpload,
        });

        const data = await response.json();

        if (data.success) {
          setFormData(prev => ({ ...prev, img: data.data.url }));
        } else {
          Alert.alert("Lỗi Upload", "ImgBB từ chối ảnh này.");
        }
      } catch (error) {
        Alert.alert("Lỗi Mạng", "Không thể kết nối ImgBB.");
      } finally {
        setUploading(false);
      }
    }
  };

  const handlePickAndUploadBackup = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploadingBackup(true);
      const asset = result.assets[0];

      try {
        const formDataUpload = new FormData();
        formDataUpload.append('image', asset.base64);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formDataUpload,
        });

        const data = await response.json();

        if (data.success) {
          setFormData(prev => ({ ...prev, backupImg: data.data.url }));
        } else {
          Alert.alert("Lỗi Upload", "ImgBB từ chối ảnh này.");
        }
      } catch (error) {
        Alert.alert("Lỗi Mạng", "Không thể kết nối ImgBB.");
      } finally {
        setUploadingBackup(false);
      }
    }
  };

  // --- OPTION HANDLERS ---
  const handleAddOption = () => {
    if (!optionForm.name.trim()) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên option");
      return;
    }
    
    if (!optionForm.price.trim() || isNaN(parseFloat(optionForm.price))) {
      Alert.alert("Lỗi", "Vui lòng nhập giá hợp lệ");
      return;
    }

    const newOption = {
      name: optionForm.name.trim(),
      price: parseFloat(optionForm.price),
      status: optionForm.status,
      isDefault: optionForm.isDefault, // Thêm trường isDefault
      index: options.length + 1
    };

    if (editingOption !== null) {
      // Edit existing option
      const updatedOptions = [...options];
      updatedOptions[editingOption] = newOption;
      setOptions(updatedOptions);
      setEditingOption(null);
    } else {
      // Add new option
      setOptions([...options, newOption]);
    }

    // Reset form
    setOptionForm({
      name: '',
      price: '',
      status: true,
      isDefault: false
    });
  };

  const handleEditOption = (index) => {
    const option = options[index];
    setOptionForm({
      name: option.name,
      price: option.price.toString(),
      status: option.status,
      isDefault: option.isDefault || false // Đảm bảo có giá trị mặc định
    });
    setEditingOption(index);
  };

  const handleDeleteOption = (index) => {
    Alert.alert(
      "Xác nhận xoá",
      "Bạn có chắc muốn xoá option này?",
      [
        { text: "Huỷ", style: "cancel" },
        { 
          text: "Xoá", 
          style: "destructive",
          onPress: () => {
            const updatedOptions = options.filter((_, i) => i !== index);
            // Update indexes
            const reindexedOptions = updatedOptions.map((opt, idx) => ({
              ...opt,
              index: idx + 1
            }));
            setOptions(reindexedOptions);
            if (editingOption === index) {
              setEditingOption(null);
              setOptionForm({ name: '', price: '', status: true, isDefault: false });
            }
          }
        }
      ]
    );
  };

  const handleCancelEditOption = () => {
    setEditingOption(null);
    setOptionForm({ name: '', price: '', status: true, isDefault: false });
  };

  // Tự động chọn một option làm mặc định nếu chọn isDefault
  const handleToggleIsDefault = (value) => {
    // Nếu chọn isDefault = true, đảm bảo tất cả options khác có isDefault = false
    if (value) {
      const updatedOptions = options.map(opt => ({
        ...opt,
        isDefault: false
      }));
      setOptions(updatedOptions);
    }
    setOptionForm({...optionForm, isDefault: value});
  };

  const handleSave = async () => {
    if (!formData.name || !formData.shopId || !formData.priceNormal) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập Tên, Shop ID và Giá gốc");
      return;
    }

    const start = parseInt(formData.timeStart);
    const end = parseInt(formData.timeEnd);

    if (isNaN(start) || isNaN(end) || start < 0 || start > 24 || end < 0 || end > 24) {
      Alert.alert("Lỗi thời gian", "Giờ phải từ 0-24");
      return;
    }
    if (start >= end) {
      Alert.alert("Lỗi thời gian", "Giờ mở cửa phải nhỏ hơn giờ đóng cửa");
      return;
    }

    try {
      const finalID = id ? Number(id) : Date.now();
      
      const payload = {
        id: finalID,
        name: formData.name,
        img: formData.img,
        priceNormal: Number(formData.priceNormal),
        pricePromo: Number(formData.pricePromo || formData.priceNormal),
        shopId: Number(formData.shopId),
        index: Number(formData.index || 0),
        status: formData.status,
        timeStart: start < 10 ? `0${start}` : `${start}`,
        timeEnd: end < 10 ? `0${end}` : `${end}`,
        type: formData.type,
        note: formData.note,
        option: options, // Thêm options vào payload (đã có isDefault)
        log: [],
        orderCount: id ? foods.find(f => f.id.toString() === id.toString())?.orderCount || 0 : 0,
        isOutOfTime: false,
        effectiveStatus: formData.status === 'enable' ? 'enable' : 'disable'
      };

      const docRef = doc(db, 'foods', finalID.toString());
      if (id) await updateDoc(docRef, payload);
      else await setDoc(docRef, payload);

      Alert.alert("Thành công", "Đã lưu món ăn", [{ text: "Xong", onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert("Lỗi", err.message);
    }
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <View style={{alignItems: 'center'}}>
            <Text style={styles.headerTitle}>{id ? 'Sửa món ăn' : 'Thêm món mới'}</Text>
            {id && <Text style={styles.idSubText}>ID: {id}</Text>}
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Lưu</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 15 }}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>THÔNG TIN HIỂN THỊ</Text>
            <Text style={styles.label}>Tên món ăn *</Text>
            <TextInput style={styles.input} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} placeholder="Nhập tên món..." />
            
            <Text style={styles.label}>Link hình ảnh (URL) *</Text>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput 
                style={[styles.input, { flex: 1 }]} 
                value={formData.img} 
                onChangeText={t => setFormData({...formData, img: t})} 
                placeholder="https://..." 
              />
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickAndUpload} disabled={uploading}>
                {uploading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />}
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
            
            <Text style={styles.label}>Mô tả / Ghi chú</Text>
            <TextInput style={[styles.input, {height: 60}]} multiline value={formData.note} onChangeText={t => setFormData({...formData, note: t})} placeholder="Thành phần, hương vị..." />
          </View>

          {/* Card TÀI CHÍNH & QUÁN - Đưa lên trên để gọn */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>TÀI CHÍNH & QUÁN</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Giá gốc (k)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={formData.priceNormal} onChangeText={t => setFormData({...formData, priceNormal: t})} />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Giá giảm (k)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={formData.pricePromo} onChangeText={t => setFormData({...formData, pricePromo: t})} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>ID Quán (ShopID) *</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={formData.shopId} onChangeText={t => setFormData({...formData, shopId: t})} />
              </View>
            </View>
          </View>

          {/* Card VẬN HÀNH & GIỜ BÁN */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>VẬN HÀNH & GIỜ BÁN</Text>
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Giờ mở (0-24)</Text>
                <TextInput style={styles.input} keyboardType="numeric" maxLength={2} value={formData.timeStart} onChangeText={t => setFormData({...formData, timeStart: t})} />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Giờ đóng (0-24)</Text>
                <TextInput style={styles.input} keyboardType="numeric" maxLength={2} value={formData.timeEnd} onChangeText={t => setFormData({...formData, timeEnd: t})} />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Thứ tự (Index)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={formData.index} onChangeText={t => setFormData({...formData, index: t})} />
              </View>
              
              <View style={styles.col}>
                <Text style={styles.label}>Phân loại</Text>
                <View style={styles.typeSelector}>
                    <TouchableOpacity 
                        style={[styles.typeBtn, formData.type === 'đồ ăn' && styles.typeBtnActive]}
                        onPress={() => setFormData({...formData, type: 'đồ ăn'})}
                    >
                        <Text style={[styles.typeText, formData.type === 'đồ ăn' && styles.typeTextActive]}>Đồ ăn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.typeBtn, formData.type === 'đồ uống' && styles.typeBtnActive]}
                        onPress={() => setFormData({...formData, type: 'đồ uống'})}
                    >
                        <Text style={[styles.typeText, formData.type === 'đồ uống' && styles.typeTextActive]}>Đồ uống</Text>
                    </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.label}>Trạng thái: </Text>
              <Text style={{fontWeight: 'bold', color: formData.status === 'enable' ? '#27AE60' : '#E74C3C'}}>
                {formData.status === 'enable' ? 'KÍCH HOẠT' : 'TẠM KHÓA'}
              </Text>
              <Switch 
                value={formData.status === 'enable'} 
                onValueChange={(v) => setFormData({...formData, status: v ? 'enable' : 'disable'})}
                trackColor={{ false: '#ccc', true: '#27AE60' }}
              />
            </View>
          </View>

          {/* Card TÙY CHỌN THÊM (OPTIONS) - Đưa xuống dưới cùng */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>TÙY CHỌN THÊM (OPTIONS)</Text>
            
            {/* Form thêm/sửa option */}
            <View style={styles.optionForm}>
              <Text style={styles.label}>Tên tùy chọn *</Text>
              <TextInput 
                style={styles.input} 
                value={optionForm.name} 
                onChangeText={t => setOptionForm({...optionForm, name: t})}
                placeholder="VD: Size L, Thêm trân châu..."
              />
              
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Giá thêm (k)</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric"
                    value={optionForm.price} 
                    onChangeText={t => setOptionForm({...optionForm, price: t})}
                    placeholder="0"
                  />
                </View>
              </View>
              
              <View style={styles.optionSettingsRow}>
                <View style={styles.optionSetting}>
                  <Text style={styles.optionSettingLabel}>Hiển thị</Text>
                  <Switch 
                    value={optionForm.status} 
                    onValueChange={(v) => setOptionForm({...optionForm, status: v})}
                    trackColor={{ false: '#ccc', true: '#27AE60' }}
                  />
                </View>
                
                <View style={styles.optionSetting}>
                  <Text style={styles.optionSettingLabel}>Mặc định</Text>
                  <Switch 
                    value={optionForm.isDefault} 
                    onValueChange={handleToggleIsDefault}
                    trackColor={{ false: '#ccc', true: '#FF6B6B' }}
                  />
                </View>
              </View>
              
              <View style={styles.optionButtons}>
                <TouchableOpacity 
                  style={[styles.optionBtn, styles.optionBtnPrimary]} 
                  onPress={handleAddOption}
                >
                  <Ionicons name={editingOption !== null ? "checkmark" : "add"} size={20} color="#fff" />
                  <Text style={styles.optionBtnText}>
                    {editingOption !== null ? 'Cập nhật' : 'Thêm tùy chọn'}
                  </Text>
                </TouchableOpacity>
                
                {editingOption !== null && (
                  <TouchableOpacity 
                    style={[styles.optionBtn, styles.optionBtnSecondary]} 
                    onPress={handleCancelEditOption}
                  >
                    <Ionicons name="close" size={20} color="#666" />
                    <Text style={[styles.optionBtnText, {color: '#666'}]}>Huỷ</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Danh sách options */}
            {options.length > 0 ? (
              <View style={styles.optionsList}>
                <Text style={[styles.label, {marginBottom: 10}]}>Danh sách tùy chọn ({options.length})</Text>
                {options.map((opt, index) => (
                  <View key={index} style={[
                    styles.optionItem,
                    opt.isDefault && styles.optionItemDefault
                  ]}>
                    <View style={styles.optionInfo}>
                      <View style={styles.optionHeader}>
                        <Text style={styles.optionName}>{opt.name}</Text>
                        {opt.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Ionicons name="star" size={12} color="#fff" />
                            <Text style={styles.defaultBadgeText}>Mặc định</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.optionPrice}>+{opt.price}k</Text>
                      <View style={styles.optionStatusRow}>
                        <View style={[
                          styles.optionStatusBadge,
                          { backgroundColor: opt.status ? '#27AE60' : '#E74C3C' }
                        ]}>
                          <Text style={styles.optionStatusText}>
                            {opt.status ? 'Hiện' : 'Ẩn'}
                          </Text>
                        </View>
                        <Text style={styles.optionIndex}>#{opt.index}</Text>
                      </View>
                    </View>
                    <View style={styles.optionActions}>
                      <TouchableOpacity 
                        style={styles.optionActionBtn} 
                        onPress={() => handleEditOption(index)}
                      >
                        <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.optionActionBtn} 
                        onPress={() => handleDeleteOption(index)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#E74C3C" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyOptions}>
                <Ionicons name="options-outline" size={40} color="#ddd" />
                <Text style={styles.emptyOptionsText}>Chưa có tùy chọn nào</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  idSubText: { fontSize: 10, color: '#999' },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10 },
  label: { fontSize: 11, color: '#666', marginBottom: 5, marginTop: 5 },
  input: { backgroundColor: '#F5F6F8', padding: 10, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#EAECEF' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  statusRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginTop: 15, 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderColor: '#eee' 
  },
  uploadBtn: { 
    height: 48, 
    width: 48, 
    backgroundColor: '#F0F8FF', 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#EAECEF' 
  },
  
  // Style cho nút chọn Loại
  typeSelector: { flexDirection: 'row', gap: 5, height: 48 },
  typeBtn: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  typeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeText: { fontSize: 12, color: '#666' },
  typeTextActive: { color: '#fff', fontWeight: 'bold' },
  
  // Styles for options
  optionForm: { 
    marginBottom: 15, 
    padding: 15, 
    backgroundColor: '#f9f9f9', 
    borderRadius: 8 
  },
  optionSettingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#eee'
  },
  optionSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  optionSettingLabel: {
    fontSize: 12,
    color: '#666'
  },
  optionButtons: { 
    flexDirection: 'row', 
    gap: 10, 
    marginTop: 15 
  },
  optionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 12, 
    borderRadius: 8, 
    flex: 1 
  },
  optionBtnPrimary: { 
    backgroundColor: COLORS.primary 
  },
  optionBtnSecondary: { 
    backgroundColor: '#f0f0f0', 
    borderWidth: 1, 
    borderColor: '#ddd' 
  },
  optionBtnText: { 
    color: '#fff', 
    marginLeft: 5, 
    fontWeight: 'bold' 
  },
  
  optionsList: { 
    marginTop: 10 
  },
  optionItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 12, 
    backgroundColor: '#fff', 
    borderRadius: 8, 
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#eee'
  },
  optionItemDefault: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5'
  },
  optionInfo: { 
    flex: 1 
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  optionName: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#333'
  },
  optionPrice: { 
    fontSize: 13, 
    color: COLORS.primary, 
    marginBottom: 4,
    fontWeight: '600'
  },
  optionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  optionStatusBadge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 4 
  },
  optionStatusText: { 
    color: '#fff', 
    fontSize: 10,
    fontWeight: 'bold'
  },
  optionIndex: {
    fontSize: 10,
    color: '#999'
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  optionActions: { 
    flexDirection: 'row', 
    gap: 10 
  },
  optionActionBtn: { 
    padding: 5 
  },
  
  emptyOptions: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 30,
    backgroundColor: '#f9f9f9',
    borderRadius: 8
  },
  emptyOptionsText: { 
    color: '#999', 
    marginTop: 10,
    fontSize: 12 
  }
});