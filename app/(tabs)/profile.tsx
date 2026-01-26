// @ts-nocheck
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { MyInput } from '../../src/components/MyUI';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function ProfileScreen() {
    const { currentUser, isGuest, guestId, logout, updateProfile, foods, toggleFoodStatus } = useAppStore();
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(currentUser?.name || '');
    const [address, setAddress] = useState(currentUser?.address || '');

    // CHECK ROLE - Guest check bằng password trống
    const isGuestUser = currentUser && !currentUser.password;
    const isAdmin = !isGuestUser && currentUser?.role === 'admin';
    const isShopOwner = !isGuestUser && (currentUser?.role === 'chủ shop' || currentUser?.role === 'admin');
    const isShipper = !isGuestUser && currentUser?.role === 'shipper';

    const myFoods = foods.filter(f => f.shopId === currentUser?.id);

    const handleToggleFood = async (food) => {
        const result = await toggleFoodStatus(food.id, food.status);
        if (!result.success) {
            console.log("Lỗi cập nhật trạng thái");
        }
    };

    const handleSaveProfile = async () => {
        if (isGuestUser) return; 
        
        const res = await updateProfile({ name, address });
        if (res.success) {
            setIsEditing(false);
        } else {
            console.log("Cập nhật thất bại");
        }
    };

    const handleAuthAction = async () => {
        await logout();
        router.replace('/login');
    };

    return (
        <SafeAreaView style={GlobalStyles.container}>
            <View style={styles.header}>
                <View style={[styles.avatarContainer, isGuestUser && { backgroundColor: '#CCC' }]}>
                    <Text style={styles.avatarText}>
                        {isGuestUser ? "?" : currentUser?.name?.charAt(0)?.toUpperCase()}
                    </Text>
                </View>
                <View style={{ marginLeft: 15 }}>
                    <Text style={styles.nameText}>{isGuestUser ? "Khách vãng lai" : currentUser?.name}</Text>
                    <Text style={styles.phoneText}>{isGuestUser ? `ID: ${currentUser?.id}` : currentUser?.phone}</Text>
                    
                    {!isGuestUser && (
                        <View style={styles.pointTag}>
                            <Ionicons name="ribbon" size={14} color={COLORS.primary} />
                            <Text style={styles.pointText}>{currentUser?.point || 0} điểm</Text>
                        </View>
                    )}
                    <Text style={styles.roleText}>
                        Vai trò: {isGuestUser ? "NGƯỜI DÙNG CHƯA ĐĂNG KÝ" : currentUser?.role?.toUpperCase()}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                
                {isGuestUser && (
                    <View style={styles.guestNotice}>
                        <Ionicons name="information-circle" size={20} color={COLORS.primary} />
                        <Text style={styles.guestNoticeText}>
                            Bạn đang sử dụng quyền truy cập khách. Đăng ký tài khoản để tích điểm và nhận ưu đãi!
                        </Text>
                    </View>
                )}

                {/* 1. THÔNG TIN CÁ NHÂN */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
                        {!isGuest && (
                            <TouchableOpacity onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)}>
                                <Text style={styles.editLink}>{isEditing ? "LƯU" : "SỬA"}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {isEditing ? (
                        <View style={{ gap: 10 }}>
                            <MyInput value={name} onChangeText={setName} placeholder="Họ tên" />
                            <MyInput value={address} onChangeText={setAddress} placeholder="Địa chỉ" />
                        </View>
                    ) : (
                        <View>
                            <View style={styles.infoRow}>
                                <Ionicons name="person-outline" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    {isGuest ? "Chưa có thông tin" : currentUser?.name}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    {isGuest ? "Vui lòng nhập khi đặt hàng" : (currentUser?.address || 'Chưa cập nhật địa chỉ')}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* 2. LỊCH SỬ ĐƠN HÀNG */}
                <TouchableOpacity 
                    style={[styles.card, { marginTop: 15 }]} 
                    onPress={() => router.push('/orders')}
                >
                    <View style={styles.menuItem}>
                        <View style={[styles.menuIconBox, { backgroundColor: '#E3F2FD' }]}>
                            <MaterialCommunityIcons name="clipboard-list-outline" size={22} color="#1976D2" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.menuTitle}>Lịch sử đơn hàng</Text>
                            <Text style={styles.menuSub}>Xem lại các đơn hàng bạn đã đặt</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </View>
                </TouchableOpacity>

                {/* 3. TRANG QUẢN TRỊ (CHỈ DÀNH CHO ADMIN) */}
                {isAdmin && (
                    <TouchableOpacity 
                        style={[styles.card, { marginTop: 15, borderLeftWidth: 4, borderLeftColor: '#2E7D32' }]} 
                        onPress={() => router.push('/admin')}
                    >
                        <View style={styles.menuItem}>
                            <View style={[styles.menuIconBox, { backgroundColor: '#E8F5E9' }]}>
                                <MaterialIcons name="admin-panel-settings" size={22} color="#2E7D32" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.menuTitle}>Quản trị hệ thống</Text>
                                <Text style={styles.menuSub}>Quản lý người dùng, cửa hàng và báo cáo</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#CCC" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* 4. GÓC SHIPPER (CHỈ HIỆN VỚI SHIPPER) */}
                {isShipper && (
                    <View style={[styles.card, { marginTop: 15, borderLeftWidth: 4, borderLeftColor: '#E67E22' }]}>
                         <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Góc Shipper</Text>
                        </View>
                        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/shipper/finance')}>
                            <View style={styles.menuIconBox}>
                                <MaterialCommunityIcons name="wallet-outline" size={22} color="#E67E22" />
                            </View>
                            <View style={{flex: 1, marginLeft: 12}}>
                                <Text style={styles.menuTitle}>Ví công nợ & Tài chính</Text>
                                <Text style={styles.menuSub}>Xem nợ cần nộp và tiền KM được bù</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#CCC" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 5. QUẢN LÝ THỰC ĐƠN (Chủ shop hoặc Admin) */}
                {isShopOwner && (
                    <View style={[styles.card, { marginTop: 15 }]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Quản lý thực đơn ({myFoods.length} món)</Text>
                        </View>
                        {myFoods.length === 0 ? (
                            <Text style={{ color: '#999', fontStyle: 'italic' }}>Bạn chưa có món ăn nào.</Text>
                        ) : (
                            myFoods.map((food) => {
                                const priceNormal = (food.priceNormal || 0) * 1000;
                                const pricePromo = (food.pricePromo || 0) * 1000;
                                const hasPromo = priceNormal > pricePromo;

                                return (
                                    <View key={food.id} style={styles.foodRow}>
                                        <Image
                                            source={{ uri: food.img || 'https://via.placeholder.com/150' }}
                                            style={styles.foodImage}
                                        />
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={styles.foodName}>{food.name}</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={[styles.foodPrice, { color: COLORS.primary, fontWeight: 'bold' }]}>
                                                    {pricePromo.toLocaleString('vi-VN')}đ
                                                </Text>
                                                {hasPromo && (
                                                    <Text style={styles.foodPriceOld}>
                                                        {priceNormal.toLocaleString('vi-VN')}đ
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                        <Switch
                                            trackColor={{ false: "#767577", true: COLORS.primary }}
                                            thumbColor={food.status === 'enable' ? "#fff" : "#f4f3f4"}
                                            onValueChange={() => handleToggleFood(food)}
                                            value={food.status === 'enable'}
                                        />
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.logoutBtn, isGuest && { backgroundColor: '#E8F5E9' }]} 
                    onPress={handleAuthAction}
                >
                    <Ionicons 
                        name={isGuest ? "log-in-outline" : "log-out-outline"} 
                        size={20} 
                        color={isGuest ? "#2E7D32" : "#FF4747"} 
                    />
                    <Text style={[styles.logoutText, isGuest && { color: '#2E7D32' }]}>
                        {isGuest ? "ĐĂNG NHẬP NGAY" : "ĐĂNG XUẤT"}
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    avatarContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    nameText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    phoneText: { fontSize: 13, color: '#666' },
    pointTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#Fdf2f2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
    pointText: { marginLeft: 5, fontSize: 12, color: COLORS.primary, fontWeight: '600' },
    roleText: { marginTop: 5, fontSize: 12, color: '#666', fontStyle: 'italic' },
    content: { padding: 20 },
    guestNotice: { flexDirection: 'row', backgroundColor: '#FFF4E5', padding: 15, borderRadius: 15, marginBottom: 15, alignItems: 'center' },
    guestNoticeText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#663C00', lineHeight: 18 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    editLink: { color: COLORS.primary, fontWeight: 'bold' },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    infoText: { marginLeft: 10, fontSize: 14, color: '#444' },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    menuIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF4E5', justifyContent: 'center', alignItems: 'center' },
    menuTitle: { fontSize: 14, fontWeight: '600', color: '#333' },
    menuSub: { fontSize: 11, color: '#999', marginTop: 2 },
    foodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    foodImage: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
    foodName: { fontSize: 14, fontWeight: '500' },
    foodPrice: { fontSize: 12, marginRight: 5 },
    foodPriceOld: { fontSize: 11, color: '#999', textDecorationLine: 'line-through', marginLeft: 8 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, padding: 15, borderRadius: 15, backgroundColor: '#FFF0F0', marginBottom: 50 },
    logoutText: { marginLeft: 10, color: '#FF4747', fontWeight: 'bold', fontSize: 14 }
});