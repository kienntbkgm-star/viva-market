import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Clipboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { sendNotification } from '../src/components/Notification';
import { db } from '../src/services/firebase';
import { useAppStore } from '../src/store/useAppStore';
import { COLORS, GlobalStyles, VALUES } from '../src/styles/GlobalStyles';

// --- THÔNG TIN JSONBIN ---
const MASTER_KEY = '$2a$10$Z2592l1Fa5Nci41xttPiH.1GAoFIHH5m6pghbiCZBet/UEyP.SLG6';
const BIN_ID = '696a127c43b1c97be9345fb0';

// Danh sách các collections với tên hiển thị
const COLLECTIONS = [
  { id: 'system', name: 'System', icon: '⚙️' },
  { id: 'promos', name: 'Promotions', icon: '🎯' },
  { id: 'itemType', name: 'Item Types', icon: '🏷️' },
  { id: 'foods', name: 'Foods', icon: '🍔' },
  { id: 'goods', name: 'Goods', icon: '🛍️' },
  { id: 'services', name: 'Services', icon: '💼' },
  { id: 'users', name: 'Users', icon: '👥' },
  { id: 'foodOrders', name: 'Food Orders', icon: '📝' },
  { id: 'goodOrders', name: 'Good Orders', icon: '📦' },
  { id: 'serviceOrders', name: 'Service Orders', icon: '📋' },
  { id: 'transactions', name: 'Transactions', icon: '💰' }
];

export default function DebugDataScreen() {
  const router = useRouter();
  const [selectedCollection, setSelectedCollection] = useState<string>('system');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string>('');
  const [copyFullSuccess, setCopyFullSuccess] = useState<string>('');
  const [testActionStatus, setTestActionStatus] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [notificationStatus, setNotificationStatus] = useState<string>('');

  const {
    foodOrders,
    foods,
    goodOrders,
    goods,
    itemType,
    promos,
    serviceOrders,
    services,
    system,
    users,
    transactions,
    isLoading,
    currentUser,
    restoreSession
  } = useAppStore();

  // --- HÀM ĐẶT READY DATE = TODAY CHO TẤT CẢ USER (ĐỂ TEST) ---
  const handleSetAllUsersReady = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      setTestActionStatus('⏳ Đang cập nhật...');
      
      // Update tất cả users
      const updatePromises = users.map(user => {
        const userRef = doc(db, 'users', user.id.toString());
        return updateDoc(userRef, {
          isReady: true,
          readyDate: today
        });
      });
      
      await Promise.all(updatePromises);
      setTestActionStatus(`✅ Đã set ready cho ${users.length} users!`);
      
      setTimeout(() => setTestActionStatus(''), 3000);
    } catch (error) {
      console.error('Lỗi set ready:', error);
      setTestActionStatus('❌ Lỗi cập nhật!');
    }
  };

  // Check và điều hướng thông minh khi load xong
  const handleNavigateToApp = async () => {
    // Thử restore session từ AsyncStorage
    const restored = await restoreSession();
    
    if (restored) {
      // Luôn vào home trước
      router.replace('/(tabs)/home');
    } else {
      // Guest hoặc chưa login → vào Login
      router.replace('/login');
    }
  };

  // Hàm lấy dữ liệu cho collection đã chọn
  const getSelectedCollectionData = () => {
    switch (selectedCollection) {
      case 'system': return system;
      case 'promos': return promos;
      case 'itemType': return itemType;
      case 'foods': return foods;
      case 'goods': return goods;
      case 'services': return services;
      case 'users': return users;
      case 'foodOrders': return foodOrders;
      case 'goodOrders': return goodOrders;
      case 'serviceOrders': return serviceOrders;
      case 'transactions': return transactions;
      default: return null;
    }
  };

  // Lấy số lượng item trong collection
  const getCollectionCount = (collectionId: string): number => {
    const data = getCollectionDataById(collectionId);
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === 'object') return Object.keys(data).length;
    return 0;
  };

  const getCollectionDataById = (id: string) => {
    switch (id) {
      case 'system': return system;
      case 'promos': return promos;
      case 'itemType': return itemType;
      case 'foods': return foods;
      case 'goods': return goods;
      case 'services': return services;
      case 'users': return users;
      case 'foodOrders': return foodOrders;
      case 'goodOrders': return goodOrders;
      case 'serviceOrders': return serviceOrders;
      case 'transactions': return transactions;
      default: return null;
    }
  };

  // --- HÀM COPY TO CLIPBOARD (SINGLE COLLECTION) ---
  const handleCopyToClipboard = async () => {
    const data = getSelectedCollectionData();
    const jsonString = JSON.stringify(data, null, 2);
    
    try {
      if (Platform.OS === 'web') {
        // Web: Sử dụng navigator.clipboard
        await navigator.clipboard.writeText(jsonString);
      } else {
        // React Native: Sử dụng Clipboard API (cần import)
        Clipboard.setString(jsonString);
      }
      
      console.log('JSON copied to clipboard');
      setCopySuccess('✅ Collection Copied!');
      setCopyFullSuccess(''); // Xóa thông báo copy full
      
      // Tự động xóa thông báo sau 3 giây
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      setCopySuccess('❌ Copy Failed!');
    }
  };

  // --- HÀM COPY FULL DATABASE (11 COLLECTIONS) ---
  const handleCopyFullDatabase = async () => {
    const fullDatabase = {
      system,
      promos,
      itemType,
      foods,
      goods,
      services,
      users,
      foodOrders,
      goodOrders,
      serviceOrders,
      transactions
    };

    const jsonString = JSON.stringify(fullDatabase, null, 2);
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(jsonString);
      } else {
        Clipboard.setString(jsonString);
      }
      
      console.log('Full database copied to clipboard');
      setCopyFullSuccess('✅ Full Database Copied!');
      setCopySuccess(''); // Xóa thông báo copy collection
      
      // Tự động xóa thông báo sau 3 giây
      setTimeout(() => setCopyFullSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to copy full database:', error);
      setCopyFullSuccess('❌ Copy Failed!');
    }
  };

  // --- HÀM SAO LƯU TOÀN BỘ DỮ LIỆU (FULL BACKUP 11 DANH MỤC) ---
  const handleFullBackup = async () => {
    const dataToBackup = {
      system,
      promos,
      itemType,
      foods,
      goods,
      services,
      users,
      foodOrders,
      goodOrders,
      serviceOrders,
      transactions
    };

    try {
      setIsBackingUp(true);
      // setBackupStatus('Đang thực hiện backup...'); // Bỏ thông báo
      
      console.log("--- Đang thực hiện Full Backup 11 Collections ---");
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': MASTER_KEY
        },
        body: JSON.stringify(dataToBackup)
      });

      if (response.ok) {
        console.log('Backup thành công!');
        // setBackupStatus('Backup thành công!'); // Bỏ thông báo
        // if (Platform.OS === 'web') window.alert("Full Backup 11 Collection Thành Công!"); // Bỏ alert
      } else {
        console.log('Backup thất bại!');
        // setBackupStatus('Backup thất bại!'); // Bỏ thông báo
      }
    } catch (error) {
      console.error("Lỗi Backup:", error);
      // setBackupStatus('Lỗi khi backup!'); // Bỏ thông báo
    } finally {
      setIsBackingUp(false);
    }
  };

  // Tự động backup khi dữ liệu đã tải xong và hợp lệ
  useEffect(() => {
    if (!isLoading && system && foods.length > 0) {
      handleFullBackup();
    }
  }, [isLoading, system, foods]);

  // Gửi notification test
  const handleSendNotification = async () => {
    if (!selectedUser) {
      setNotificationStatus('❌ Vui lòng chọn user!');
      setTimeout(() => setNotificationStatus(''), 3000);
      return;
    }
    
    try {
      setNotificationStatus('⏳ Đang gửi...');
      const user = users.find(u => u.id.toString() === selectedUser);
      
      if (!user) {
        setNotificationStatus('❌ User không tìm thấy!');
        setTimeout(() => setNotificationStatus(''), 3000);
        return;
      }

      if (!user.expoToken) {
        setNotificationStatus('❌ User không có Expo Token!');
        setTimeout(() => setNotificationStatus(''), 3000);
        return;
      }

      console.log("📱 Gửi notification cho user:", user.name, "Token:", user.expoToken.substring(0, 20) + "...");
      
      await sendNotification('Test Notification', 'Đây là thông báo test từ admin!', user.expoToken);
      setNotificationStatus(`✅ Đã gửi thành công cho ${user.name}!`);
      setTimeout(() => setNotificationStatus(''), 3000);
    } catch (error) {
      console.error('Lỗi gửi notification:', error);
      setNotificationStatus(`❌ Lỗi: ${error.message || 'Gửi thất bại'}`);
      setTimeout(() => setNotificationStatus(''), 5000);
    }
  };

  return (
    <View style={GlobalStyles.container}>
      <Text style={styles.header}>HỆ THỐNG ĐỐI SOÁT DỮ LIỆU</Text>
      <Text style={styles.subHeader}>11 Collections</Text>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: '#999', marginTop: 10 }}>Đang nạp 11 collection từ Firestore...</Text>
        </View>
      ) : (
        <>
          {/* Collection Selector */}
          <View style={styles.collectionSelector}>
            <Text style={styles.selectorTitle}>Chọn Collection:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.collectionScroll}
            >
              {COLLECTIONS.map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  style={[
                    styles.collectionButton,
                    selectedCollection === collection.id && styles.collectionButtonActive
                  ]}
                  onPress={() => {
                    setSelectedCollection(collection.id);
                    setCopySuccess('');
                    setCopyFullSuccess('');
                  }}
                >
                  <Text style={styles.collectionIcon}>{collection.icon}</Text>
                  <Text style={[
                    styles.collectionName,
                    selectedCollection === collection.id && styles.collectionNameActive
                  ]}>
                    {collection.name}
                  </Text>
                  <View style={styles.collectionCount}>
                    <Text style={styles.collectionCountText}>
                      {getCollectionCount(collection.id)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Collection Info & Copy Buttons */}
          <View style={styles.collectionHeader}>
            <View style={styles.collectionInfo}>
              <Text style={styles.collectionInfoTitle}>
                {COLLECTIONS.find(c => c.id === selectedCollection)?.name}
                <Text style={styles.collectionInfoCount}>
                  ({getCollectionCount(selectedCollection)} items)
                </Text>
              </Text>
            </View>
            
            <View style={styles.copyButtonsContainer}>
              <TouchableOpacity
                style={[styles.copyButton, styles.copyCollectionButton]}
                onPress={handleCopyToClipboard}
              >
                <Text style={styles.copyButtonText}>📋 Copy Collection</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.copyButton, styles.copyFullButton]}
                onPress={handleCopyFullDatabase}
              >
                <Text style={styles.copyButtonText}>📊 Copy Full DB</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Copy Success Messages */}
          {(copySuccess || copyFullSuccess) ? (
            <View style={styles.copySuccessContainer}>
              <Text style={styles.copySuccessText}>{copySuccess || copyFullSuccess}</Text>
            </View>
          ) : null}

          {/* JSON Data Viewer */}
          <View style={[styles.jsonWrapper, { borderRadius: VALUES.borderRadius }]}>
            <ScrollView style={styles.scroll}>
              <Text selectable={true} style={styles.jsonText}>
                {JSON.stringify(getSelectedCollectionData(), null, 2)}
              </Text>
            </ScrollView>
          </View>

          {/* Notification Section */}
          <View style={styles.notificationSection}>
            <Text style={styles.sectionTitle}>Gửi Notification Test</Text>
            <Picker
              selectedValue={selectedUser}
              onValueChange={(itemValue) => setSelectedUser(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="Chọn user..." value="" />
              {users.filter(u => u.expoToken).map(user => (
                <Picker.Item 
                  key={user.id} 
                  label={`${user.name} (${user.phone}) - ${user.role}${user.shopName ? ` - ${user.shopName}` : ''}`} 
                  value={user.id.toString()} 
                />
              ))}
            </Picker>
            <TouchableOpacity
              style={[styles.actionButton, styles.notificationButton]}
              onPress={handleSendNotification}
            >
              <Text style={styles.actionButtonText}>📲 Gửi Notif</Text>
            </TouchableOpacity>
            {notificationStatus ? (
              <Text style={[
                styles.backupStatus,
                notificationStatus.includes('✅') ? styles.backupSuccess : styles.backupError
              ]}>
                {notificationStatus}
              </Text>
            ) : null}
          </View>

          {/* Backup Status and Actions */}
          <View style={styles.footer}>
            {/* Test Action Status */}
            {testActionStatus ? (
              <Text style={[
                styles.backupStatus,
                testActionStatus.includes('✅') ? styles.backupSuccess : styles.backupError
              ]}>
                {testActionStatus}
              </Text>
            ) : null}
            
            {/* Sẽ không hiển thị status text vì state rỗng */}
            {backupStatus ? (
              <Text style={[
                styles.backupStatus,
                backupStatus.includes('thành công') ? styles.backupSuccess : styles.backupError
              ]}>
                {backupStatus}
              </Text>
            ) : null}
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.testButton]}
                onPress={handleSetAllUsersReady}
              >
                <Text style={styles.actionButtonText}>🧪 SET ALL READY</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.backupButton]}
                onPress={handleFullBackup}
                disabled={isBackingUp}
              >
                {isBackingUp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.actionButtonText}>BACKUP NOW</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.continueButton]}
                onPress={handleNavigateToApp}
              >
                <Text style={styles.actionButtonText}>CONTINUE TO APP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginTop: 50, 
    color: COLORS.primary
  },
  subHeader: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  // Collection Selector
  collectionSelector: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  collectionScroll: {
    flexGrow: 0,
  },
  collectionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    marginRight: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#eee',
  },
  collectionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  collectionIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  collectionName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  collectionNameActive: {
    color: '#fff',
  },
  collectionCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  collectionCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Collection Header with Copy Buttons
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  collectionInfo: {
    flex: 1,
  },
  collectionInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  collectionInfoCount: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
    marginLeft: 5,
  },
  copyButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyCollectionButton: {
    backgroundColor: '#2196F3',
  },
  copyFullButton: {
    backgroundColor: '#9C27B0',
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  
  // Copy Success Message
  copySuccessContainer: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 15,
    marginTop: 5,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  copySuccessText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // JSON Viewer
  jsonWrapper: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  scroll: {
    flex: 1,
  },
  jsonText: {
    color: '#00FF00',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
  },
  
  // Footer
  footer: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  backupStatus: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    padding: 8,
    borderRadius: 6,
  },
  backupSuccess: {
    backgroundColor: '#E8F5E9',
    color: '#2E7D32',
  },
  backupError: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backupButton: {
    backgroundColor: '#4CAF50',
  },
  continueButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  
  // Notification Section
  notificationSection: {
    marginHorizontal: 15,
    marginVertical: 10,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  picker: {
    height: 50,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  notificationButton: {
    backgroundColor: '#FF9800',
  },
});