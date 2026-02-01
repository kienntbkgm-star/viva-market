// @ts-nocheck
import { Image } from 'expo-image';
import { useRouter } from 'expo-router'; // Thêm router để điều hướng
import React from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

export default function ServicesScreen() {
    const { services } = useAppStore();
    const router = useRouter(); // Khởi tạo router

    const handlePressService = (item) => {
        // Điều hướng đến trang ServiceDetail và truyền dữ liệu item
        router.push({
            pathname: '/ServiceDetail',
            params: { item: JSON.stringify(item) }
        });
    };

    const renderServiceItem = ({ item }) => {
        const priceNormal = (item.priceNormal || 0) * 1000;
        const pricePromo = (item.pricePromo || 0) * 1000;
        const isDisabled = item.status !== 'enable';
        let statusLabel = 'TẠM NGƯNG';

        return (
            <TouchableOpacity
                style={[styles.serviceCard, isDisabled && { opacity: 0.5 }]}
                activeOpacity={isDisabled ? 1 : 0.7}
                onPress={() => {
                    if (isDisabled) {
                        alert('Dịch vụ này hiện đang tạm ngưng.');
                        return;
                    }
                    handlePressService(item);
                }}
            >
                <Image source={item.img || item.backupImg || 'https://via.placeholder.com/150'} style={styles.serviceImage} contentFit="cover" cachePolicy="memory-disk" />
                {isDisabled && (
                    <View style={styles.soldOutOverlay}>
                        <Text style={styles.soldOutLabel}>{statusLabel}</Text>
                    </View>
                )}
                <View style={styles.cardContent}>
                    <Text style={styles.serviceName} numberOfLines={2}>{item.name}</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.promoPrice}>{pricePromo.toLocaleString('vi-VN')}đ</Text>
                        {priceNormal > pricePromo && (
                            <Text style={styles.oldPrice}>{priceNormal.toLocaleString('vi-VN')}đ</Text>
                        )}
                    </View>
                    <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => {
                            if (isDisabled) {
                                alert('Dịch vụ này hiện đang tạm ngưng.');
                                return;
                            }
                            handlePressService(item);
                        }}
                        disabled={isDisabled}
                    >
                        <Text style={styles.bookBtnText}>Đặt ngay</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={GlobalStyles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Sửa chữa & Dọn dẹp</Text>
                <Text style={styles.headerSub}>Dịch vụ tận tâm cho ngôi nhà của bạn</Text>
            </View>
            
                        <FlatList
                                data={services.slice().sort((a, b) => {
                                    const aDisabled = a.status !== 'enable';
                                    const bDisabled = b.status !== 'enable';
                                    if (aDisabled && !bDisabled) return 1;
                                    if (!aDisabled && bDisabled) return -1;
                                    return 0;
                                })}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderServiceItem}
                                numColumns={2}
                                columnWrapperStyle={styles.row}
                                contentContainerStyle={styles.listPadding}
                                ListEmptyComponent={<Text style={styles.emptyText}>Hiện chưa có dịch vụ nào.</Text>}
                        />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    headerSub: { fontSize: 13, color: '#666', marginTop: 4 },
    listPadding: { padding: 10, paddingBottom: 100 },
    row: { justifyContent: 'space-between' },
    serviceCard: {
        width: '48%',
        backgroundColor: '#fff',
        borderRadius: 15,
        marginBottom: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        overflow: 'hidden'
    },
    serviceImage: { width: '100%', height: 120 },
    soldOutOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        borderRadius: 15,
    },
    soldOutLabel: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        backgroundColor: 'rgba(255,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    cardContent: { padding: 12 },
    serviceName: { fontSize: 14, fontWeight: 'bold', color: '#333', height: 40 },
    priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' },
    promoPrice: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
    oldPrice: { fontSize: 11, color: '#999', textDecorationLine: 'line-through', marginLeft: 5 },
    bookBtn: { backgroundColor: COLORS.primary, paddingVertical: 8, borderRadius: 8, marginTop: 12, alignItems: 'center' },
    bookBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});