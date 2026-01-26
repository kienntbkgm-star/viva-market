// FILE: app/admin/users.tsx
// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
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
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as XLSX from 'xlsx';

import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function AdminUsersScreen() {
  const router = useRouter();
  const users = useAppStore((state) => state.users);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Hàm khóa/mở tài khoản User trực tiếp
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'enable' ? 'disable' : 'enable';
      const userRef = doc(db, 'users', userId.toString());
      await updateDoc(userRef, { status: newStatus });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái người dùng");
    }
  };

  // =================================================================
  // 1. LOGIC XUẤT EXCEL (EXPORT) - HEADER CHUẨN DB
  // =================================================================
  const handleExportExcel = async () => {
    if (users.length === 0) {
      Alert.alert("Thông báo", "Không có dữ liệu người dùng để xuất!");
      return;
    }
    try {
      setIsProcessing(true);

      const dataToExport = users.map(user => {
        return {
          id: user.id,
          uid: user.uid || '',
          name: user.name,
          phone: user.phone,
          role: user.role,              // admin, shipper, manager, chủ shop, user
          status: user.status,          // enable, disable
          address: user.address || '',
          shopName: user.shopName || '',
          password: user.password || '', // Lưu ý: Export pass plaintext (cẩn thận bảo mật thực tế)
          expoToken: user.expoToken || '',
          point: user.point || 0,
          imgShop: user.imgShop || '',
          imgShopSquare: user.imgShopSquare || '',
          mustCheckIn: user.mustCheckIn || 'disable',
          checkInDate: user.checkInDate || '',
          index: user.index || 0
        };
      });

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "UsersData");
      const fileName = `DB_Users_${Date.now()}.xlsx`;

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
            dialogTitle: 'Lưu file Excel Users',
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
        // Lấy ID từ Excel hoặc tạo ID số ngẫu nhiên nếu thiếu
        const rawID = row["id"];
        const docId = (rawID && rawID.toString().trim() !== "") 
                      ? rawID.toString() 
                      : Math.floor(Date.now() + Math.random() * 1000).toString();
        
        const docRef = doc(db, "users", docId);

        const payload = {
          id: Number(docId),
          uid: row["uid"] || `user_${docId}`, // Fallback UID giả lập nếu thiếu
          name: row["name"] || "Người dùng mới",
          phone: row["phone"] || "",
          role: row["role"] || "user",
          status: row["status"] || "enable",
          address: row["address"] || "",
          shopName: row["shopName"] || "",
          password: row["password"] || "123456", // Pass mặc định nếu ko có
          expoToken: row["expoToken"] || "",
          point: row["point"] || "",
          imgShop: row["imgShop"] || "",
          imgShopSquare: row["imgShopSquare"] || "",
          mustCheckIn: row["mustCheckIn"] || "disable",
          checkInDate: row["checkInDate"] || "",
          index: Number(row["index"]) || 0,
          log: [] // Reset log hoặc giữ nguyên tuỳ logic (ở đây reset cho sạch)
        };

        batch.set(docRef, payload, { merge: true });
        count++;
      });

      await batch.commit();
      
      const msg = `Đã nhập thành công ${count} người dùng!`;
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
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.toString().includes(searchQuery) ||
    user.id?.toString().includes(searchQuery)
  );

  const renderUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => router.push({ pathname: '/admin/edit-user', params: { id: item.id } })}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.avatarText}>{item.name?.charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.userInfo}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.idTextInline}> #{item.id}</Text>
          </View>
          
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{item.role?.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.userSubText}><Ionicons name="call-outline" size={12} /> {item.phone}</Text>
        <Text style={styles.userSubText} numberOfLines={1}><Ionicons name="location-outline" size={12} /> {item.address}</Text>
        
        {item.shopName ? (
          <Text style={styles.shopNameText}><Ionicons name="business-outline" size={12} /> {item.shopName}</Text>
        ) : null}

        <View style={styles.statusRow}>
          <View style={styles.statusIndicator}>
            <View style={[styles.dot, { backgroundColor: item.status === 'enable' ? '#27AE60' : '#EB5757' }]} />
            <Text style={[styles.statusLabel, { color: item.status === 'enable' ? '#27AE60' : '#EB5757' }]}>
              {item.status === 'enable' ? 'Hoạt động' : 'Đã khóa'}
            </Text>
          </View>
          
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()} 
          >
            <Switch
                value={item.status === 'enable'} 
                onValueChange={() => handleToggleUserStatus(item.id, item.status)}
                trackColor={{ false: '#D1D1D1', true: '#27AE60' }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Quản lý người dùng</Text>
        
        {/* BUTTON GROUP: IMPORT - EXPORT */}
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
                style={[styles.iconBtn, { backgroundColor: '#27AE60' }]}
                onPress={handleExportExcel}
                disabled={isProcessing}
            >
                {isProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="cloud-download-outline" size={20} color="#fff" />}
            </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput
          placeholder="Tìm tên, SĐT hoặc ID..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderUserItem}
        contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
      />
    </SafeAreaView>
  );
}

const getRoleColor = (role) => {
  switch (role) {
    case 'admin': return '#E74C3C';
    case 'chủ shop': return '#E67E22';
    case 'manager': return '#3498DB';
    case 'shipper': return '#9B59B6';
    default: return '#7F8C8D';
  }
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#F2F2F2' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  // Style nút Icon Import/Export
  iconBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F2F2', margin: 15, paddingHorizontal: 12, borderRadius: 12, height: 45 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  userCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, padding: 12, marginBottom: 12, alignItems: 'flex-start', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userInfo: { flex: 1, marginLeft: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  userName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  idTextInline: { fontSize: 11, color: '#999', marginLeft: 4 },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  roleText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  userSubText: { fontSize: 12, color: '#666', marginTop: 2 },
  shopNameText: { fontSize: 12, color: COLORS.primary, fontWeight: 'bold', marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#F2F2F2' },
  statusIndicator: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusLabel: { fontSize: 12, fontWeight: 'bold' }
});