// @ts-nocheck
import React from 'react';
import {
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  selectedOptions?: string[];
}

interface ResidentOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  shopName: string;
  items: OrderItem[];
  totalPrice: number;
}

export default function ResidentOrderModal({
  visible,
  onClose,
  onConfirm,
  shopName,
  items,
  totalPrice,
}: ResidentOrderModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>🏠</Text>
            <Text style={styles.headerTitle}>Xác nhận đặt hàng</Text>
            <Text style={styles.headerSubtitle}>Shop cư dân - Miễn phí ship</Text>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Shop Info */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Cửa hàng</Text>
              <Text style={styles.shopName}>{shopName}</Text>
            </View>

            {/* Items List */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Sản phẩm đã chọn</Text>
              {items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <Text style={styles.itemOptions}>
                        {item.selectedOptions.join(', ')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.itemRight}>
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                    <Text style={styles.itemPrice}>
                      {item.price.toLocaleString()}₫
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalPrice}>{totalPrice.toLocaleString()}₫</Text>
            </View>

            {/* Note */}
            <View style={styles.noteBox}>
              <Text style={styles.noteIcon}>ℹ️</Text>
              <Text style={styles.noteText}>
                Đơn hàng sẽ được chủ shop cư dân giao tận nơi trong chung cư.
              </Text>
            </View>

            {/* Footer Buttons - Inside ScrollView */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmButtonText}>Xác nhận đặt hàng</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  header: {
    backgroundColor: '#27AE60',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemOptions: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#27AE60',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: '#27AE60',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#27AE60',
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  noteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#27AE60',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
});
