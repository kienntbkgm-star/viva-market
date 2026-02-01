// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
    StyleSheet,
    Switch,
    Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { db } from '../../src/services/firebase';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function SystemConfigScreen() {
  const router = useRouter();
  const system = useAppStore((state) => state.system);

  const [formData, setFormData] = useState({
    ...system,
    adminPhone: system.adminPhone || '',
    money: {
      adminShipRatio: system.money?.adminShipRatio?.toString() || '0',
      managerGoodFee: system.money?.managerGoodFee?.toString() || '0',
      managerShipRatio: system.money?.managerShipRatio?.toString() || '0',
      refusePunish: system.money?.refusePunish?.toString() || '0',
      shipperShipRatio: system.money?.shipperShipRatio?.toString() || '0',
    },
    ship: {
      food: {
        atDoorValue: system.ship?.food?.atDoorValue?.toString() || '0',
        normalValue: system.ship?.food?.normalValue?.toString() || '0',
        step: system.ship?.food?.step?.toString() || '0',
      },
      selectEnable: system.ship?.selectEnable || false
    },
    timeOut: {
      finish: system.timeOut?.finish?.toString() || '60',
      food: system.timeOut?.food?.toString() || '3600',
      good: system.timeOut?.good?.toString() || '3600',
      service: system.timeOut?.service?.toString() || '3600',
    },
    maxShop: {
      food: system.maxShop?.food?.toString() || '2',
      good: system.maxShop?.good?.toString() || '2'
    },
    promo: {
        enable: system.promo?.enable || false,
        freeShipCode: system.promo?.freeShipCode || ''
    },
    welcomeImage: system.welcomeImage || []
  });

  const handleSave = async () => {
    try {
      const systemRef = doc(db, 'system', 'config');
      
      const payload = {
        ...formData,
        money: {
          adminShipRatio: Number(formData.money.adminShipRatio),
          managerGoodFee: Number(formData.money.managerGoodFee),
          managerShipRatio: Number(formData.money.managerShipRatio),
          refusePunish: Number(formData.money.refusePunish),
          shipperShipRatio: Number(formData.money.shipperShipRatio),
        },
        ship: {
          ...formData.ship,
          food: {
            atDoorValue: Number(formData.ship.food.atDoorValue),
            normalValue: Number(formData.ship.food.normalValue),
            step: Number(formData.ship.food.step),
          }
        },
        timeOut: {
          finish: Number(formData.timeOut.finish),
          food: Number(formData.timeOut.food),
          good: Number(formData.timeOut.good),
          service: Number(formData.timeOut.service),
        },
        maxShop: {
          food: Number(formData.maxShop.food),
          good: Number(formData.maxShop.good)
        },
        logDate: new Date().toLocaleString('en-US'),
      };

      await updateDoc(systemRef, payload);
      Alert.alert("Thành công", "Cấu hình hệ thống đã được cập nhật");
    } catch (error) {
      Alert.alert("Lỗi", error.message);
    }
  };

  const updateWelcomeImage = (index, value) => {
    const newImages = [...formData.welcomeImage];
    newImages[index] = value;
    setFormData({ ...formData, welcomeImage: newImages });
  };

  return (
    <SafeAreaView style={GlobalStyles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : null} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Cấu hình hệ thống</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}><Text style={styles.saveText}>Lưu</Text></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 15 }}>
          
          {/* 1. THÔNG TIN CHUNG */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THÔNG TIN CHUNG</Text>
            <Text style={styles.label}>Số điện thoại Admin</Text>
            <TextInput style={styles.input} value={formData.adminPhone} onChangeText={t => setFormData({...formData, adminPhone: t})} />
            
            <View style={styles.statusRow}>
                <Text style={styles.labelBold}>Bật mã giảm giá</Text>
                <Switch value={formData.promo.enable} onValueChange={v => setFormData({...formData, promo: {...formData.promo, enable: v}})} />
            </View>
            <Text style={styles.label}>Mã FreeShip hiện tại</Text>
            <TextInput style={styles.input} value={formData.promo.freeShipCode} onChangeText={t => setFormData({...formData, promo: {...formData.promo, freeShipCode: t}})} />
          </View>

          {/* 2. TÀI CHÍNH & TỶ LỆ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TÀI CHÍNH & TỶ LỆ CHIA SẺ (%)</Text>
            <View style={styles.row}>
                <View style={styles.col}><Text style={styles.label}>Admin hưởng</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.money.adminShipRatio} onChangeText={t => setFormData({...formData, money: {...formData.money, adminShipRatio: t}})} /></View>
                <View style={styles.col}><Text style={styles.label}>Shipper hưởng</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.money.shipperShipRatio} onChangeText={t => setFormData({...formData, money: {...formData.money, shipperShipRatio: t}})} /></View>
            </View>
            <View style={styles.row}>
                <View style={styles.col}><Text style={styles.label}>Manager hưởng</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.money.managerShipRatio} onChangeText={t => setFormData({...formData, money: {...formData.money, managerShipRatio: t}})} /></View>
                <View style={styles.col}><Text style={styles.label}>Phí quản lý hàng</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.money.managerGoodFee} onChangeText={t => setFormData({...formData, money: {...formData.money, managerGoodFee: t}})} /></View>
            </View>
          </View>

          {/* 3. CÀI ĐẶT VẬN CHUYỂN */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>VẬN CHUYỂN & GIỚI HẠN</Text>
            <View style={styles.statusRow}>
                <Text style={styles.labelBold}>Cho phép chọn Shipper</Text>
                <Switch value={formData.ship.selectEnable} onValueChange={v => setFormData({...formData, ship: {...formData.ship, selectEnable: v}})} />
            </View>
            <View style={styles.row}>
                <View style={styles.col}><Text style={styles.label}>Ship thường (k)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.ship.food.normalValue} onChangeText={t => setFormData({...formData, ship: {food: {...formData.ship.food, normalValue: t}}})} /></View>
                <View style={styles.col}><Text style={styles.label}>Tận cửa (k)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.ship.food.atDoorValue} onChangeText={t => setFormData({...formData, ship: {food: {...formData.ship.food, atDoorValue: t}}})} /></View>
            </View>
          </View>

          {/* 4. THỜI GIAN CHỜ (TIMEOUT - GIÂY) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>THỜI GIAN CHỜ (TIMEOUT)</Text>
            <View style={styles.row}>
                <View style={styles.col}><Text style={styles.label}>Đồ ăn (s)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.timeOut.food} onChangeText={t => setFormData({...formData, timeOut: {...formData.timeOut, food: t}})} /></View>
                <View style={styles.col}><Text style={styles.label}>Dịch vụ (s)</Text><TextInput style={styles.input} keyboardType="numeric" value={formData.timeOut.service} onChangeText={t => setFormData({...formData, timeOut: {...formData.timeOut, service: t}})} /></View>
            </View>
            <Text style={styles.label}>Tự động hoàn thành (s)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={formData.timeOut.finish} onChangeText={t => setFormData({...formData, timeOut: {...formData.timeOut, finish: t}})} />
          </View>

          {/* 5. HÌNH ẢNH CHÀO MỪNG */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HÌNH ẢNH CHÀO MỪNG (WELCOME)</Text>
            {formData.welcomeImage.map((img, index) => (
                <View key={index} style={{marginBottom: 10}}>
                    <Text style={styles.label}>Ảnh {index + 1} (URL)</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Image source={{ uri: img }} style={{ width: 60, height: 60, borderRadius: 8, marginRight: 8 }} contentFit="cover" cachePolicy="memory-disk" />
                        <TextInput style={styles.input} value={img} onChangeText={t => updateWelcomeImage(index, t)} />
                      </View>
                </View>
            ))}
          </View>

          <Text style={styles.logText}>Cập nhật lần cuối: {formData.logDate}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  saveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10 },
  saveText: { color: '#fff', fontWeight: 'bold' },
  section: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 1 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10, letterSpacing: 0.5 },
  label: { fontSize: 11, color: '#666', marginTop: 8, marginBottom: 4 },
  labelBold: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  input: { backgroundColor: '#f5f7f9', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eef1f4', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { width: '48%' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 5 },
  logText: { fontSize: 10, color: '#ccc', textAlign: 'center', marginBottom: 30 }
});