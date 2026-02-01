// FILE: app/admin/products.tsx
// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Platform,
    SafeAreaView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import * as XLSX from 'xlsx';

import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

const formatCurrency = (val) => {
  if (!val) return '0';
  return (val * 1000).toLocaleString('vi-VN');
};

export default function AdminProductsScreen() {
  const router = useRouter();
  const foods = useAppStore((state) => state.foods);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'enable' ? 'disable' : 'enable';
      const foodRef = doc(db, 'foods', id.toString());
      await updateDoc(foodRef, { status: newStatus });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái:", error);
    }
  };

  // =================================================================
  // 1. LOGIC XUẤT EXCEL (EXPORT) - HEADER CHUẨN DB
  // =================================================================
  const handleExportExcel = async () => {
    if (foods.length === 0) {
      Alert.alert("Thông báo", "Không có dữ liệu để xuất!");
      return;
    }
    try {
      setIsProcessing(true);

      const dataToExport = foods.map(item => {
        // Option vẫn giữ format string cho dễ sửa: "Size L (+8k), Thạch (+2k)"
        const optionsString = (item.option || [])
          .map(opt => `${opt.name} (+${opt.price}k)`)
          .join(', ');

        // RETURN OBJECT VỚI KEY GIỐNG HỆT FIREBASE
        return {
          id: item.id,
          name: item.name,
          type: item.type,
          priceNormal: item.priceNormal,
          pricePromo: item.pricePromo,
          shopId: item.shopId,
          status: item.status,          // Giữ nguyên enable/disable
          timeStart: item.timeStart,
          timeEnd: item.timeEnd,
          note: item.note || '',
          orderCount: item.orderCount || 0,
          index: item.index || 0,
          img: item.img || '',          // Ảnh chính (thumbnail)
          // image: imagesString,          // Album ảnh
          option: optionsString,        // Tùy chọn (đã format string)
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "MenuData");
      const fileName = `DB_Foods_${Date.now()}.xlsx`;

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, fileName);
        alert("✅ Đã tải file Excel xuống máy tính!");
      } else {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Lưu file Excel Menu',
            UTI: 'com.microsoft.excel.xlsx'
          });
        } else {
          Alert.alert("Lỗi", "Thiết bị không hỗ trợ chia sẻ file!");
        }
      }
    } catch (error) {
      console.error("Lỗi xuất Excel:", error);
      Alert.alert("Lỗi", "Không thể xuất file excel.");
    } finally {
      setIsProcessing(false);
    }
  };

  // =================================================================
  // 2. LOGIC NHẬP EXCEL (IMPORT) - HEADER CHUẨN DB
  // =================================================================
  const handleImportExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      setIsProcessing(true);
      const file = result.assets[0];
      let dataExcel = [];

      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        dataExcel = XLSX.utils.sheet_to_json(ws);
      } else {
        const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const wb = XLSX.read(b64, { type: 'base64' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        dataExcel = XLSX.utils.sheet_to_json(ws);
      }

      if (!dataExcel || dataExcel.length === 0) {
        Alert.alert("Lỗi", "File rỗng hoặc lỗi định dạng!");
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      dataExcel.forEach((row) => {
        // Lấy ID từ cột "id" (viết thường)
        const rawID = row["id"];
        const docId = (rawID && rawID.toString().trim() !== "") 
                      ? rawID.toString() 
                      : Date.now().toString() + Math.random().toString().substr(2, 5);
        
        const docRef = doc(db, "foods", docId);

          // Không còn xử lý image array, chỉ dùng img

        // Xử lý Options (Parse từ format "Tên (+Giá k)")
        let optionList = [];
        if (row["option"]) {
             const rawOpts = row["option"].toString().split(',');
             rawOpts.forEach((str, idx) => {
                 const match = str.trim().match(/^(.*)\s\(\+(\d+)k\)$/);
                 if (match) {
                     optionList.push({
                         name: match[1].trim(),
                         price: parseInt(match[2]),
                         status: true,
                         index: idx + 1
                     });
                 }
             });
        }

        // MAP DỮ LIỆU VÀO OBJECT FIREBASE (Dùng đúng tên cột DB)
        const payload = {
          id: Number(docId) || Date.now(),
          name: row["name"] || "Chưa đặt tên",
          type: row["type"] || 'đồ ăn',
          priceNormal: Number(row["priceNormal"]) || 0,
          pricePromo: Number(row["pricePromo"]) || 0,
          shopId: Number(row["shopId"]) || 0,
          status: row["status"] || 'enable',
          timeStart: Number(row["timeStart"]) || 0,
          timeEnd: Number(row["timeEnd"]) || 24,
          note: row["note"] || "",
          orderCount: Number(row["orderCount"]) || 0,
          index: Number(row["index"]) || 0,
          img: row["img"] || "",
            // image: imageList,
          option: optionList,
          effectiveStatus: row["status"] || 'enable', // Đồng bộ status
          isOutOfTime: false 
        };

        batch.set(docRef, payload, { merge: true });
        count++;
      });

      await batch.commit();
      
      const msg = `Đã nhập thành công ${count} món ăn (Header chuẩn DB)!`;
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert("Thành công", msg);

    } catch (error) {
      console.error("Lỗi nhập Excel:", error);
      Alert.alert("Lỗi nhập file", error.message);
    } finally {
      setIsProcessing(false);
    }
  };


  // =================================================================
  // RENDER UI (GIỮ NGUYÊN)
  // =================================================================
  const filteredFoods = foods.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toString().includes(searchQuery)
  );

  const renderProductItem = ({ item }) => {
    const isActive = item.effectiveStatus === 'enable';
    const isOutOfTime = item.isOutOfTime;

    return (
      <TouchableOpacity 
        style={[styles.productCard, !isActive && styles.disabledCard]}
        onPress={() => router.push({ pathname: '/admin/edit-food', params: { id: item.id } })}
      >
        <Image source={item.img || item.backupImg || 'https://via.placeholder.com/150'} style={styles.productImg} contentFit="cover" cachePolicy="memory-disk" />
        
        <View style={styles.productInfo}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.idTextInline}>#{item.id}</Text>
            </View>
            
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <Switch
                    value={item.status === 'enable'} 
                    onValueChange={() => handleToggleStatus(item.id, item.status)}
                    trackColor={{ false: '#D1D1D1', true: '#27AE60' }}
                    thumbColor={Platform.OS === 'ios' ? undefined : (item.status === 'enable' ? '#fff' : '#f4f3f4')}
                />
            </TouchableOpacity>
          </View>

          <Text style={styles.productPrice}>
            {formatCurrency(item.pricePromo)}đ 
            <Text style={styles.oldPrice}> {formatCurrency(item.priceNormal)}đ</Text>
          </Text>

          <Text style={styles.timeInfo}>
            <Ionicons name="time-outline" size={12} /> {item.timeStart}h - {item.timeEnd}h
            {isOutOfTime && <Text style={{color: '#E74C3C'}}> (Hết giờ)</Text>}
          </Text>
          
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: isActive ? '#27AE60' : '#EB5757' }]}>
              {isActive ? 'Đang bán' : (isOutOfTime ? 'Tạm nghỉ' : 'Đã ẩn')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Quản lý thực đơn</Text>
        
        {/* BUTTON GROUP */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Import */}
            <TouchableOpacity 
                style={[styles.iconBtn, { marginRight: 8, backgroundColor: '#2980B9' }]}
                onPress={handleImportExcel}
                disabled={isProcessing}
            >
                {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="cloud-upload-outline" size={20} color="#fff" />}
            </TouchableOpacity>

            {/* Export */}
            <TouchableOpacity 
                style={[styles.iconBtn, { marginRight: 8, backgroundColor: '#27AE60' }]}
                onPress={handleExportExcel}
                disabled={isProcessing}
            >
                {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="cloud-download-outline" size={20} color="#fff" />}
            </TouchableOpacity>

            {/* Add */}
            <TouchableOpacity 
                style={styles.addBtn}
                onPress={() => router.push('/admin/edit-food')}
            >
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          placeholder="Tìm tên món hoặc ID..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredFoods}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderProductItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#F2F2F2' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: COLORS.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F2', margin: 15, paddingHorizontal: 12, borderRadius: 12, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 12, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  disabledCard: { backgroundColor: '#F9F9F9', opacity: 0.8 },
  productImg: { width: 80, height: 80, borderRadius: 12 },
  productInfo: { flex: 1, marginLeft: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  idTextInline: { fontSize: 11, color: '#999', marginLeft: 6, fontWeight: 'normal' },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginTop: 2 },
  oldPrice: { fontSize: 11, color: '#999', textDecorationLine: 'line-through', fontWeight: 'normal' },
  timeInfo: { fontSize: 11, color: '#666', marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  statusLabel: { fontSize: 11, fontWeight: 'bold', marginRight: 10, width: 70 }
});