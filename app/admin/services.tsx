// FILE: app/admin/services.tsx
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
  TouchableOpacity,
  View
} from 'react-native';
import * as XLSX from 'xlsx';

import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function AdminServicesScreen() {
  const router = useRouter();
  const { services } = useAppStore(); 
  const [isProcessing, setIsProcessing] = useState(false);

  const handleToggleService = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'enable' ? 'disable' : 'enable';
      await updateDoc(doc(db, 'services', id.toString()), { status: newStatus });
    } catch (error) { 
      console.error("Lỗi cập nhật trạng thái:", error); 
    }
  };

  // =================================================================
  // 1. XUẤT EXCEL (EXPORT SERVICE)
  // =================================================================
  const handleExportExcel = async () => {
    if (!services || services.length === 0) {
      Alert.alert("Thông báo", "Không có dữ liệu dịch vụ để xuất!");
      return;
    }
    try {
      setIsProcessing(true);
      const dataToExport = services.map(item => ({
        id: item.id,
        name: item.name,
        priceNormal: item.priceNormal, 
        pricePromo: item.pricePromo,   
        moneyShare: item.moneyShare,   // Tỷ lệ % cho Admin
        img: item.img,             
        status: item.status,           
        index: item.index,
        shopId: item.shopId,
        note: item.note
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "ServicesData");
      const fileName = `DB_Services_${Date.now()}.xlsx`;

      if (Platform.OS === 'web') {
        XLSX.writeFile(wb, fileName);
      } else {
        const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const uri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xuất file excel.");
    } finally {
      setIsProcessing(false);
    }
  };

  // =================================================================
  // 2. NHẬP EXCEL (IMPORT SERVICE)
  // =================================================================
  const handleImportExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });

      if (result.canceled) return;
      setIsProcessing(true);
      const file = result.assets[0];
      let dataExcel = [];

      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const arrayBuffer = await (await response.blob()).arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        dataExcel = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      } else {
        const b64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        const wb = XLSX.read(b64, { type: 'base64' });
        dataExcel = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      }

      const batch = writeBatch(db);
      dataExcel.forEach((row) => {
        const docId = row["id"]?.toString() || Date.now().toString();
        const docRef = doc(db, "services", docId);
        batch.set(docRef, {
          id: isNaN(Number(docId)) ? docId : Number(docId),
          name: row["name"] || "Dịch vụ mới",
          priceNormal: Number(row["priceNormal"]) || 0,
          pricePromo: Number(row["pricePromo"]) || 0,
          moneyShare: Number(row["moneyShare"]) || 0,
          img: row["img"] || "",
          status: row["status"] || "enable",
          index: Number(row["index"]) || 0,
          shopId: Number(row["shopId"]) || 0,
          note: row["note"] || "",
          log: []
        }, { merge: true });
      });

      await batch.commit();
      Alert.alert("Thành công", "Đã cập nhật danh sách dịch vụ!");
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderServiceItem = ({ item }) => {
    const isEnabled = item.status === 'enable';
    return (
      <View style={[styles.card, !isEnabled && styles.disabledCard, { position: 'relative' }]}> 
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.7}
          onPress={() => router.push({ pathname: '/admin/edit-service', params: { id: item.id } })}
        >
          <Image source={item.img || item.backupImg || 'https://via.placeholder.com/150'} style={styles.serviceImg} contentFit="cover" cachePolicy="memory-disk" />
          <View style={styles.info}>
            <View style={styles.rowBetween}>
              <Text style={styles.serviceName} numberOfLines={1}>{item.name}</Text>
              {/* Switch sẽ được render bên ngoài TouchableOpacity */}
            </View>
            <Text style={styles.priceText}>Giá bán: {item.pricePromo}K <Text style={styles.oldPrice}>{item.priceNormal}K</Text></Text>
            <View style={styles.rowBetween}>
              <Text style={styles.shareText}>Admin: {item.moneyShare}%</Text>
              <Text style={styles.idText}>ID: {item.id}</Text>
            </View>
          </View>
        </TouchableOpacity>
        {/* Switch nằm ngoài TouchableOpacity, đặt ở góc phải trên card */}
        <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
          <Switch
            value={isEnabled}
            onValueChange={() => handleToggleService(item.id, item.status)}
            trackColor={{ false: '#D1D1D1', true: COLORS.primary + '50' }}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Quản lý Dịch vụ</Text>
        
        <View style={{ flexDirection: 'row' }}>
          {/* Nút Import */}
          <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: '#2980B9', marginRight: 8 }]} 
            onPress={handleImportExcel}
          >
            {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="cloud-upload-outline" size={20} color="#fff" />}
          </TouchableOpacity>

          {/* Nút Export */}
          <TouchableOpacity 
            style={[styles.iconBtn, { backgroundColor: '#27AE60', marginRight: 8 }]} 
            onPress={handleExportExcel}
          >
            <Ionicons name="cloud-download-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Nút Thêm mới - Đã sửa đường dẫn */}
          <TouchableOpacity 
            onPress={() => router.push('/admin/edit-service')} 
            style={styles.addBtn}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderServiceItem}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 50, color: '#BBB' }}>
            Không tìm thấy dịch vụ nào.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  iconBtn: { width: 35, height: 35, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  addBtn: { backgroundColor: COLORS.primary, width: 35, height: 35, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 12, elevation: 3, alignItems: 'center' },
  disabledCard: { opacity: 0.6 },
  serviceImg: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#f0f0f0' },
  info: { flex: 1, marginLeft: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 15, fontWeight: 'bold', color: '#333', flex: 1 },
  priceText: { fontSize: 13, color: COLORS.primary, fontWeight: 'bold', marginVertical: 2 },
  oldPrice: { fontSize: 11, color: '#999', textDecorationLine: 'line-through', fontWeight: 'normal' },
  shareText: { fontSize: 12, color: '#E74C3C', fontWeight: '700' },
  idText: { fontSize: 11, color: '#BBB' }
});