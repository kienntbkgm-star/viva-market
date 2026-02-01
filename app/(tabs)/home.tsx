// FILE: app/(tabs)/index.tsx (hoặc home.tsx)
// @ts-nocheck
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Alert,
    Dimensions,
    FlatList,
    ListRenderItem,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { COLORS, GlobalStyles } from '../../src/styles/GlobalStyles';

const { width } = Dimensions.get('window');

// Define types
interface ShopInfo {
    id: string | number;
    name: string;
    img?: string | null;
    address?: string;
    productCount?: number;
}

interface FoodItem {
    id: string | number;
    name: string;
    type: string;
    shopId?: string | number;
    img?: string;

    pricePromo: number;
    priceNormal: number;
    effectiveStatus?: string;
    isOutOfTime?: boolean;
    isResidentShopNotReady?: boolean;
    timeStart?: string | number;
    timeEnd?: string | number;
}

interface CartItem {
    quantity: number;
    [key: string]: any;
}

interface User {
    id: string | number;
    name: string;
    shopName?: string;
    imgShopSquare?: string;
    address?: string;
    isResidentShop?: boolean;
}

interface SystemInfo {
    nameStore?: string;
    address?: string;
}

const removeVietnameseTones = (str: string): string => {
    if (!str) return "";
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
};

const formatCurrency = (val: number): string => (val * 1000).toLocaleString('vi-VN');

export default function HomeScreen() {
    const router = useRouter();
    const foods = useAppStore((state) => state.foods) as FoodItem[];
    const system = useAppStore((state) => state.system) as SystemInfo;
    const cart = useAppStore((state) => state.cart) as CartItem[];
    const users = useAppStore((state) => state.users) as User[];
    
    const [currentHour, setCurrentHour] = useState<number>(new Date().getHours());
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('Tất cả');
    const [selectedShop, setSelectedShop] = useState<string | number>('all');
    const [showShopFilter, setShowShopFilter] = useState<boolean>(false);
    
    useFocusEffect(
        useCallback(() => {
            const now = new Date().getHours();
            setCurrentHour(now);
        }, [])
    );

    const totalItemsInCart = useMemo(() => {
        return cart.reduce((total, item) => total + (item.quantity || 0), 0);
    }, [cart]);

    const availableShops = useMemo((): ShopInfo[] => {
        if (!foods.length || !users.length) return [];
        const uniqueShopIds = [...new Set(foods.map(f => f.shopId).filter(id => id !== undefined && id !== null))];
        
        const shops = uniqueShopIds.map(shopId => {
            const shopUser = users.find(u => u.id === shopId);
            return {
                id: shopId,
                name: shopUser?.shopName || `Shop ${shopId}`,
                productCount: foods.filter(f => f.shopId === shopId).length,
                img: shopUser?.imgShopSquare
            };
        });
        
        shops.sort((a, b) => (b.productCount || 0) - (a.productCount || 0));
        
        return [
            { id: 'all', name: 'Tất cả cửa hàng', productCount: foods.length, img: null },
            ...shops
        ];
    }, [foods, users]);

    const filterTabs = useMemo(() => {
        // Generate filter tabs dynamically from foods data
        const types = new Set(foods.map(f => f.type).filter(Boolean));
        return ['Tất cả', ...Array.from(types).sort()];
    }, [foods]);
    
    const filteredData = useMemo(() => {
        return foods
            .filter(item => {
                const matchType = selectedType === 'Tất cả' || 
                        (selectedType === 'đồ ăn' && item.type === 'đồ ăn') ||
                        (selectedType === 'đồ uống' && (item.type === 'đồ uống' || item.type === '2'));
                const matchSearch = searchQuery.trim() === '' ||
                                removeVietnameseTones(item.name).includes(removeVietnameseTones(searchQuery));
                const matchShop = selectedShop === 'all' ||
                                item.shopId?.toString() === selectedShop.toString();
                return matchType && matchSearch && matchShop;
            })
            .map(item => {
                const start = Number(item.timeStart) || 0;
                const end = Number(item.timeEnd) || 24;
                let isExpired = false;

                if (start < end) {
                    if (currentHour < start || currentHour >= end) isExpired = true;
                } else if (start > end) {
                    if (currentHour >= end && currentHour < start) isExpired = true;
                }
                
                // Check if shop is resident and not ready
                const shopOwner = users.find(u => u.id === item.shopId);
                const isResidentShopNotReady = shopOwner?.isResidentShop && !shopOwner?.isReady;
                
                return { 
                    ...item, 
                    isOutOfTime: isExpired,
                    isResidentShopNotReady: isResidentShopNotReady 
                };
            })
            .sort((a, b) => {
                // Sắp xếp: món available trước, món disable sau
                const aDisabled = a.effectiveStatus === 'disable' || a.isOutOfTime || a.isResidentShopNotReady;
                const bDisabled = b.effectiveStatus === 'disable' || b.isOutOfTime || b.isResidentShopNotReady;
                
                if (aDisabled && !bDisabled) return 1;
                if (!aDisabled && bDisabled) return -1;
                return 0;
            });
    }, [foods, searchQuery, selectedType, selectedShop, currentHour, users]);

    const selectedShopInfo = useMemo((): ShopInfo => {
        if (selectedShop === 'all') {
            return { id: 'all', name: 'Tất cả cửa hàng', productCount: foods.length };
        }
        return availableShops.find(s => s.id.toString() === selectedShop.toString()) ||
            { id: selectedShop, name: `Shop ${selectedShop}`, productCount: 0 };
    }, [selectedShop, availableShops, foods]);

    const renderFoodItem: ListRenderItem<FoodItem> = ({ item }) => {
        const isDisable = item.effectiveStatus === 'disable' || item.isResidentShopNotReady;
        let statusLabel = "HẾT MÓN";
        if (item.isOutOfTime) statusLabel = "HẾT GIỜ BÁN";
        if (item.isResidentShopNotReady) statusLabel = "HẾT MÓN";

        // Check if shop is resident shop
        const shopInfo = users.find(u => u.id === item.shopId);
        const isResidentShop = shopInfo?.isResidentShop === true;

        return (
            <TouchableOpacity
                style={[styles.card, isDisable && { opacity: 0.5 }]}
                activeOpacity={isDisable ? 1 : 0.7}
                onPress={() => {
                    if (isDisable) {
                        let msg = "Món ăn này hiện đang tạm ngưng phục vụ.";
                        if (item.isOutOfTime) {
                            msg = `Món này chỉ bán từ ${item.timeStart || '?'}h đến ${item.timeEnd || '?'}h. Hiện đã hết giờ bán.`;
                        } else if (item.isResidentShopNotReady) {
                            msg = "Shop cư dân chưa mở cửa hôm nay.";
                        }
                        Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Thông báo", msg);
                        return;
                    }
                    router.push({ pathname: "/ItemDetail", params: { item: JSON.stringify(item) } });
                }}
            >
                <View style={{ position: 'relative' }}>
                    <Image
                        source={item.img || item.backupImg || 'https://via.placeholder.com/150'}
                        style={styles.cardImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                    />
                    {selectedShop === 'all' && (
                        <View style={styles.shopBadge}>
                            <Text style={styles.shopBadgeText}>
                                {availableShops.find(s => s.id === item.shopId)?.name || `Shop ${item.shopId}`}
                            </Text>
                        </View>
                    )}
                    {isResidentShop && (
                        <View style={styles.residentBadge}>
                            <Ionicons name="home" size={10} color="#fff" />
                            <Text style={styles.residentBadgeText}>Shop cư dân</Text>
                        </View>
                    )}
                    {(isDisable || item.isOutOfTime) && (
                        <View style={styles.soldOutOverlay}>
                            <Text style={styles.soldOutLabel}>{statusLabel}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.priceContainer}>
                        <Text style={styles.cardPrice}>{formatCurrency(item.pricePromo)}đ</Text>
                        {item.priceNormal > item.pricePromo && (
                            <Text style={styles.cardPriceOld}>{formatCurrency(item.priceNormal)}đ</Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    console.log('📱 HomeScreen: Rendering JSX... filteredData =', filteredData.length, 'items');

    return (
        <SafeAreaView style={GlobalStyles.container}>
            
            <View style={{ paddingTop: Platform.OS === 'android' ? 40 : 10, backgroundColor: '#fff' }}>
                
                {/* DÒNG FILTER GỘP: SHOP VÀ TABS TRÊN CÙNG MỘT HÀNG */}
                <View style={styles.combinedFilterRow}>
                    
                    {/* BÊN TRÁI: NÚT CHỌN CỬA HÀNG */}
                    <TouchableOpacity
                        style={styles.compactShopButton}
                        onPress={() => {
                            console.log('🏪 HomeScreen: Shop filter toggled');
                            setShowShopFilter(!showShopFilter);
                        }}
                    >
                        <Text style={styles.compactShopText} numberOfLines={1}>
                            {selectedShop === 'all' ? 'Cửa hàng' : selectedShopInfo.name}
                        </Text>
                        <Ionicons
                            name={showShopFilter ? "chevron-up" : "chevron-down"}
                            size={14}
                            color="#666"
                        />
                    </TouchableOpacity>

                    {/* ĐƯỜNG CHẶN DỌC (DIVIDER) */}
                    <View style={styles.verticalDivider} />

                    {/* BÊN PHẢI: DẢI TABS CUỘN NGANG */}
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 15 }}
                    >
                        {filterTabs.map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabItem, selectedType === tab && styles.tabItemActive]}
                                onPress={() => {
                                    console.log('📋 HomeScreen: Filter tab selected -', tab);
                                    setSelectedType(tab);
                                }}
                            >
                                <Text style={[styles.tabText, selectedType === tab && styles.tabTextActive]}>
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
                
                {/* SHOP DROPDOWN */}
                {showShopFilter && (
                    <View style={styles.shopDropdown}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shopScroll}>
                            {availableShops.map(shop => (
                                <TouchableOpacity
                                    key={shop.id.toString()}
                                    style={[
                                        styles.shopOption,
                                        selectedShop === shop.id && styles.shopOptionActive
                                    ]}
                                    onPress={() => {
                                        setSelectedShop(shop.id);
                                        setShowShopFilter(false);
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.shopOptionText,
                                            selectedShop === shop.id && styles.shopOptionTextActive
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {shop.name}
                                    </Text>
                                    {shop.id !== 'all' && (
                                        <Text style={styles.shopOptionCount}>{shop.productCount}</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
            
            {/* LIST CONTENT */}
            <FlatList
                key={`${selectedShop}-${selectedType}`}
                data={filteredData}
                numColumns={2}
                keyExtractor={(item) => item.id.toString()}
                columnWrapperStyle={styles.rowWrapper}
                renderItem={renderFoodItem}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <Text style={styles.resultCount}>
                        {filteredData.length} sản phẩm
                        {selectedShop !== 'all' && ` tại ${selectedShopInfo.name}`}
                    </Text>
                }
            />

            {/* FLOATING BOTTOM SEARCH BAR */}
            <View style={styles.bottomSearchContainer}>
                <View style={styles.bottomSearchWrapper}>
                    <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                    <TextInput
                        style={styles.bottomSearchInput}
                        placeholder="Tìm món ngon..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                
                <TouchableOpacity style={styles.bottomCartBtn} onPress={() => router.push('/cart')}>
                    <Ionicons name="cart" size={24} color={COLORS.primary} />
                    {totalItemsInCart > 0 && (
                        <View style={styles.bottomBadge}>
                            <Text style={styles.bottomBadgeText}>{totalItemsInCart}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // --- STYLES MỚI CHO GIAO DIỆN COMPACT ---
    combinedFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingLeft: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    compactShopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingRight: 10,
        maxWidth: 120, // Đảm bảo tên shop không đẩy tab đi quá xa
    },
    compactShopText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    verticalDivider: {
        width: 1,
        height: 20,
        backgroundColor: '#e0e0e0',
        marginHorizontal: 10,
    },

    // --- CÁC STYLES CŨ GIỮ NGUYÊN ---
    bottomSearchContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 30,
        padding: 8,
        paddingHorizontal: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 10,
        zIndex: 100,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    bottomSearchWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
    },
    bottomSearchInput: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        height: '100%',
        marginLeft: 8,
    },
    bottomCartBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F0F8FF',
        borderRadius: 20,
        marginLeft: 10,
    },
    bottomBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#FF4747',
        borderRadius: 10,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    bottomBadgeText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
    },
    searchIcon: {
        marginLeft: 5
    },
    shopDropdown: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 10, paddingHorizontal: 15, maxHeight: 120 },
    shopScroll: { flexGrow: 0 },
    shopOption: { flexDirection: 'row', alignItems: 'center', marginRight: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#f8f8f8' },
    shopOptionActive: { backgroundColor: COLORS.primary },
    shopOptionText: { fontSize: 11, color: '#666', fontWeight: '500' },
    shopOptionTextActive: { color: '#fff' },
    shopOptionCount: { backgroundColor: 'rgba(0,0,0,0.1)', color: '#666', fontSize: 9, fontWeight: 'bold', paddingHorizontal: 5, borderRadius: 9, marginLeft: 5 },
    tabItem: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 15, backgroundColor: '#f0f0f0', marginRight: 8 },
    tabItemActive: { backgroundColor: COLORS.primary },
    tabText: { color: '#666', fontWeight: '600', fontSize: 12 },
    tabTextActive: { color: '#fff' },
    resultCount: { paddingHorizontal: 15, paddingVertical: 10, color: '#666', fontSize: 12, backgroundColor: '#f9f9f9', marginBottom: 5 },
    listContent: { paddingHorizontal: 10, paddingBottom: 120 },
    rowWrapper: { justifyContent: 'space-between', paddingHorizontal: 5 },
    card: { backgroundColor: '#fff', borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, marginBottom: 16, flex: 0.485, maxWidth: '48.5%', overflow: 'hidden' },
    cardImage: { width: '100%', height: 130, borderTopLeftRadius: 15, borderTopRightRadius: 15 },
    shopBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    shopBadgeText: { color: '#fff', fontSize: 9, fontWeight: '500' },
    residentBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#27AE60', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
    residentBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
    cardInfo: { padding: 10 },
    cardName: { fontWeight: 'bold', fontSize: 14, color: '#333' },
    priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, gap: 5 },
    cardPrice: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
    cardPriceOld: { color: '#999', fontSize: 9, textDecorationLine: 'line-through' },
    soldOutOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    soldOutLabel: { backgroundColor: '#FF4747', color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }
});