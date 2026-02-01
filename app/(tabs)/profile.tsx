// @ts-nocheck
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import bcryptjs from 'bcryptjs';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MyInput } from '../../src/components/MyUI';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function ProfileScreen() {
    const { currentUser, logout, updateProfile, foods, toggleFoodStatus, ensureShipperReadyFresh, setShipperReadyToday, setShipperNotReady } = useAppStore();
    const router = useRouter();

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(currentUser?.name || '');
    const [address, setAddress] = useState(currentUser?.address || '');
    const [readyLoading, setReadyLoading] = useState(false);
    
    const [showChangePassModal, setShowChangePassModal] = useState(false);
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // CHECK ROLE - Guest check bằng password trống
    const isGuestUser = currentUser && !currentUser.password;
    const isAdmin = !isGuestUser && currentUser?.role === 'admin';
    const isShopOwner = !isGuestUser && (currentUser?.role === 'chủ shop' || currentUser?.role === 'admin');
    const isShipper = !isGuestUser && currentUser?.role === 'shipper';

    const myFoods = foods.filter(f => f.shopId === currentUser?.id);

    useEffect(() => {
        if (isShipper || isShopOwner) {
            ensureShipperReadyFresh();
        }
    }, [isShipper]);

    const handleToggleFood = async (food) => {
        const result = await toggleFoodStatus(food.id, food.status);
        if (!result.success) {
            console.log("Lỗi cập nhật trạng thái");
        }
    };

    const handleToggleReady = async () => {
        setReadyLoading(true);
        await ensureShipperReadyFresh(); // Đồng bộ trạng thái trước khi thao tác
        const action = currentUser?.isReady ? setShipperNotReady : setShipperReadyToday;
        const result = await action();
        if (!result?.success) {
            console.log('Cập nhật trạng thái sẵn sàng thất bại');
        }
        setReadyLoading(false);
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

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword || !confirmPassword) {
            Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert("Lỗi", "Mật khẩu mới không khớp");
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }

        setIsChangingPassword(true);
        try {
            const isOldPasswordCorrect = bcryptjs.compareSync(oldPassword, currentUser.password);
            if (!isOldPasswordCorrect) {
                Alert.alert("Lỗi", "Mật khẩu hiện tại không chính xác");
                setIsChangingPassword(false);
                return;
            }

            const hashedNewPassword = bcryptjs.hashSync(newPassword, 10);
            const result = await updateProfile({ 
                name: currentUser.name, 
                address: currentUser.address,
                password: hashedNewPassword 
            });

            if (result.success) {
                Alert.alert("Thành công", "Đã thay đổi mật khẩu", [
                    { text: "OK", onPress: () => {
                        setShowChangePassModal(false);
                        setOldPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                    }}
                ]);
            } else {
                Alert.alert("Lỗi", "Không thể đổi mật khẩu");
            }
        } catch (error) {
            Alert.alert("Lỗi", "Có lỗi xảy ra: " + error.message);
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <SafeAreaView style={GlobalStyles.container}>
            <View style={styles.header}>
                <View style={[styles.avatarContainer, isGuestUser && { backgroundColor: '#CCC' }]}>
                    <Text style={styles.avatarText}>
                        {isGuestUser ? "?" : currentUser?.name?.charAt(0)?.toUpperCase()}
                    </Text>
                </View>
                <View style={{ marginLeft: 15, flex: 1 }}>
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
                <TouchableOpacity 
                    style={styles.headerLogoutBtn}
                    onPress={handleAuthAction}
                >
                    <Ionicons 
                        name={isGuestUser ? "log-in-outline" : "log-out-outline"} 
                        size={32} 
                        color={isGuestUser ? "#2E7D32" : "#FF4747"} 
                    />
                </TouchableOpacity>
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
                        {!isGuestUser && (
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
                                    {isGuestUser ? "Chưa có thông tin" : currentUser?.name}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Ionicons name="location-outline" size={16} color="#666" />
                                <Text style={styles.infoText}>
                                    {isGuestUser ? "Vui lòng nhập khi đặt hàng" : (currentUser?.address || 'Chưa cập nhật địa chỉ')}
                                </Text>
                            </View>
                        </View>
                    )}

                    {!isGuestUser && !isEditing && (
                        <TouchableOpacity 
                            style={styles.changePasswordBtn}
                            onPress={() => setShowChangePassModal(true)}
                        >
                            <Ionicons name="key-outline" size={16} color="#fff" />
                            <Text style={styles.changePasswordText}>Đổi mật khẩu</Text>
                        </TouchableOpacity>
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
                        <View style={styles.readyRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.menuTitle}>Trạng thái sẵn sàng hôm nay</Text>
                                <Text style={[styles.menuSub, { color: currentUser?.isReady ? '#2E7D32' : '#999' }]}>
                                    {currentUser?.isReady ? '✅ Đang nhận đơn' : '⏸️ Chưa bật'}
                                </Text>
                                {currentUser?.readyDate && (
                                    <Text style={styles.menuSub}>Ngày: {currentUser?.readyDate}</Text>
                                )}
                            </View>
                            <Switch
                                trackColor={{ false: "#E0E0E0", true: "#81C784" }}
                                thumbColor={currentUser?.isReady ? "#2E7D32" : "#9E9E9E"}
                                onValueChange={handleToggleReady}
                                value={currentUser?.isReady || false}
                                disabled={readyLoading}
                            />
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

                {/* 5. QUẢN LÝ ĐỐN HÀNG (Chủ shop hoặc Admin) */}
                {isShopOwner && (
                    <View style={[styles.card, { marginTop: 15, borderLeftWidth: 4, borderLeftColor: COLORS.primary }]}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>Góc Chủ Shop</Text>
                        </View>
                        
                        {/* Trạng thái sẵn sàng */}
                        <View style={styles.readyRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.menuTitle}>Trạng thái sẵn sàng hôm nay</Text>
                                <Text style={[styles.menuSub, { color: currentUser?.isReady ? '#2E7D32' : '#999' }]}>
                                    {currentUser?.isReady ? '✅ Đang nhận đơn' : '⏸️ Chưa bật'}
                                </Text>
                                {currentUser?.readyDate && (
                                    <Text style={styles.menuSub}>Ngày: {currentUser?.readyDate}</Text>
                                )}
                            </View>
                            <Switch
                                trackColor={{ false: "#E0E0E0", true: "#81C784" }}
                                thumbColor={currentUser?.isReady ? "#2E7D32" : "#9E9E9E"}
                                onValueChange={handleToggleReady}
                                value={currentUser?.isReady || false}
                                disabled={readyLoading}
                            />
                        </View>

                        {/* Quản lý đơn hàng */}
                        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/shop/orders')}>
                            <View style={[styles.menuIconBox, { backgroundColor: '#FFF4E5' }]}>
                                <MaterialCommunityIcons name="receipt-text-outline" size={22} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.menuTitle}>Quản lý đơn hàng</Text>
                                <Text style={styles.menuSub}>Xem và xử lý đơn hàng của shop bạn</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#CCC" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 6. QUẢN LÝ THỰC ĐƠN (Chủ shop hoặc Admin) */}
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
                                            source={food.img || food.backupImg || 'https://via.placeholder.com/150'}
                                            style={styles.foodImage}
                                            contentFit="cover"
                                            cachePolicy="memory-disk"
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

            </ScrollView>

            {/* Modal Đổi Password */}
            <Modal
                visible={showChangePassModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowChangePassModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>🔐 Đổi Mật khẩu</Text>
                        
                        <View style={{ gap: 12, marginVertical: 15 }}>
                            <View>
                                <Text style={styles.modalLabel}>Mật khẩu hiện tại</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Nhập mật khẩu hiện tại"
                                    secureTextEntry
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                    editable={!isChangingPassword}
                                />
                            </View>

                            <View>
                                <Text style={styles.modalLabel}>Mật khẩu mới</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                                    secureTextEntry
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    editable={!isChangingPassword}
                                />
                            </View>

                            <View>
                                <Text style={styles.modalLabel}>Xác nhận mật khẩu mới</Text>
                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Xác nhận mật khẩu mới"
                                    secureTextEntry
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    editable={!isChangingPassword}
                                />
                            </View>
                        </View>

                        <View style={styles.modalButtonGroup}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalCancelBtn]}
                                onPress={() => {
                                    setShowChangePassModal(false);
                                    setOldPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                }}
                                disabled={isChangingPassword}
                            >
                                <Text style={styles.modalCancelText}>Hủy</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalSubmitBtn, isChangingPassword && { opacity: 0.6 }]}
                                onPress={handleChangePassword}
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <Text style={styles.modalSubmitText}>Đổi mật khẩu</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    avatarContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    nameText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    phoneText: { fontSize: 13, color: '#666' },
    pointTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#Fdf2f2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
    pointText: { marginLeft: 5, fontSize: 12, color: COLORS.primary, fontWeight: '600' },
    roleText: { marginTop: 5, fontSize: 12, color: '#666', fontStyle: 'italic' },
    headerLogoutBtn: { padding: 8 },
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
    readyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    readyButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFE0B2', borderWidth: 1, borderColor: '#E67E22' },
    readyButtonText: { fontSize: 12, fontWeight: '700', color: '#E67E22' },
    foodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f0f0f0' },
    foodImage: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
    foodName: { fontSize: 14, fontWeight: '500' },
    foodPrice: { fontSize: 12, marginRight: 5 },
    foodPriceOld: { fontSize: 11, color: '#999', textDecorationLine: 'line-through', marginLeft: 8 },
    changePasswordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, padding: 10, borderRadius: 10, marginTop: 15 },
    changePasswordText: { color: '#fff', fontWeight: '600', marginLeft: 8, fontSize: 14 },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '100%', maxWidth: 400 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 5 },
    modalLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 5 },
    modalInput: { backgroundColor: '#f5f7f9', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eef1f4', fontSize: 14 },
    modalButtonGroup: { flexDirection: 'row', gap: 10, marginTop: 20 },
    modalButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    modalCancelBtn: { backgroundColor: '#E8E8E8' },
    modalCancelText: { color: '#333', fontWeight: '600', fontSize: 14 },
    modalSubmitBtn: { backgroundColor: COLORS.primary },
    modalSubmitText: { color: '#fff', fontWeight: '600', fontSize: 14 }
});