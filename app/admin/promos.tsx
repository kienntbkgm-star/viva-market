// FILE: app/admin/promos.tsx
// @ts-nocheck
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
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
  TouchableOpacity,
  View
} from 'react-native';
import * as XLSX from 'xlsx';

import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function AdminPromosScreen() {
  const router = useRouter();
  const { promos } = useAppStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTogglePromo = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'promos', id.toString()), { enable: !currentStatus });
    } catch (error) { console.error(error); }
  };

  // =================================================================
  // 1. LOGIC XUẤT EXCEL (EXPORT) - HEADER CHUẨN DB
  // =================================================================
  const handleExportExcel = async () => {
    if (promos.length === 0) {
      Alert.alert("Thông báo", "Không có dữ liệu khuyến mãi để xuất!");
      return;
    }
    try {
      setIsProcessing(true);

      const dataToExport = promos.map(item => {
        // Chuyển mảng usedBy thành chuỗi để lưu vào 1 ô Excel
        const usedByString = (item.usedBy || []).join(', ');

        return {
          id: item.id,
          code: item.code,
          value: item.value,          // Giá trị giảm (%)
          limit: item.limit,          // Tổng số lượt phát hành
          used: item.used,            // Số lượt đã dùng
          maxPerUser: item.maxPerUser,
          durationDays: item.durationDays, // Số ngày hiệu lực
          created: item.created,      // Ngày tạo (ISO String)
          enable: item.enable,        // Trạng thái (true/false)
          usedBy: usedByString        // Danh sách user đã dùng
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PromosData");
      const fileName = `DB_Promos_${Date.now()}.xlsx`;

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
            dialogTitle: 'Lưu file Excel Promos',
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
        // Lấy ID từ Excel hoặc tạo mới
        const rawID = row["id"];
        const docId = (rawID && rawID.toString().trim() !== "") 
                      ? rawID.toString() 
                      : Date.now().toString() + Math.random().toString().substr(2, 3);
        
        const docRef = doc(db, "promos", docId);

        // Xử lý usedBy: Chuyển chuỗi "1, 2, 3" thành mảng [1, 2, 3]
        let usedByList = [];
        if (row["usedBy"]) {
            usedByList = row["usedBy"].toString().split(',').map(s => s.trim()).filter(Boolean);
            // Convert sang số nếu ID user là số (tuỳ logic app bạn)
            usedByList = usedByList.map(u => isNaN(Number(u)) ? u : Number(u));
        }

        const payload = {
          id: docId,
          code: row["code"] || `KM${Date.now()}`,
          value: Number(row["value"]) || 0,
          limit: Number(row["limit"]) || 100,
          used: Number(row["used"]) || 0,
          maxPerUser: Number(row["maxPerUser"]) || 1,
          durationDays: Number(row["durationDays"]) || 30,
          created: row["created"] || new Date().toISOString(),
          enable: row["enable"] === false ? false : true, // Mặc định là true nếu ko có
          usedBy: usedByList
        };

        batch.set(docRef, payload, { merge: true });
        count++;
      });

      await batch.commit();
      
      const msg = `Đã nhập thành công ${count} mã khuyến mãi!`;
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
  // RENDER UI
  // =================================================================
  const renderPromoItem = ({ item }) => {
    // Logic tính toán ngày hết hạn
    const createdDate = new Date(item.created);
    const expiryDate = new Date(createdDate.getTime() + item.durationDays * 24 * 60 * 60 * 1000);
    const isExpired = expiryDate < new Date();
    const isEnabled = item.enable === true;

    return (
      <TouchableOpacity 
        style={[styles.promoCard, (isExpired || !isEnabled) && styles.disabledCard]}
        onPress={() => router.push({ pathname: '/admin/edit-promo', params: { id: item.id } })}
      >
        <View style={styles.promoIcon}>
          <MaterialCommunityIcons name="ticket-percent" size={30} color={isEnabled && !isExpired ? COLORS.primary : '#999'} />
        </View>

        <View style={styles.promoInfo}>
          <View style={styles.rowBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.promoCode}>{item.code}</Text>
                <Text style={styles.idTextInline}> #{item.id}</Text>
            </View>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <Switch
                value={isEnabled}
                onValueChange={() => handleTogglePromo(item.id, item.enable)}
                trackColor={{ false: '#D1D1D1', true: COLORS.primary + '50' }}
              />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.promoTitle}>{item.limit - item.used} lượt dùng còn lại</Text>
          
          <View style={styles.rowBetween}>
            <Text style={styles.promoValue}>Giảm {item.value}%</Text>
            <Text style={[styles.expiryText, isExpired && { color: '#E74C3C', fontWeight: 'bold' }]}>
              {isExpired ? 'ĐÃ HẾT HẠN' : `Hết hạn: ${expiryDate.toLocaleDateString('vi-VN')}`}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color="#333" /></TouchableOpacity>
        
        <Text style={styles.headerTitle}>Quản lý Khuyến mãi</Text>
        
        {/* BUTTON GROUP: IMPORT - EXPORT - ADD */}
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
            <TouchableOpacity onPress={() => router.push('/admin/edit-promo')} style={styles.addBtn}>
                <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={promos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPromoItem}
        contentContainerStyle={{ padding: 15 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  // Style nút
  iconBtn: { width: 35, height: 35, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: COLORS.primary, width: 35, height: 35, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  promoCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 12, elevation: 3, alignItems: 'center' },
  disabledCard: { opacity: 0.6 },
  promoIcon: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#FDF2F2', justifyContent: 'center', alignItems: 'center' },
  promoInfo: { flex: 1, marginLeft: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promoCode: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  idTextInline: { fontSize: 11, color: '#999', marginLeft: 4, fontWeight: 'normal' },
  promoTitle: { fontSize: 13, color: '#666', marginVertical: 4 },
  promoValue: { fontSize: 13, fontWeight: 'bold', color: '#27AE60' },
  expiryText: { fontSize: 11, color: '#999' }
});