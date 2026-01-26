/**
 * Number & Currency Utilities
 * Xử lý các hàm liên quan đến số và tiền tệ
 */

/**
 * Format số tiền sang định dạng VND
 * Nhân với 1000 (vì hệ thống lưu là nghìn)
 */
export function formatCurrency(val: number): string {
  if (!val || isNaN(val)) return '0';
  return (val * 1000).toLocaleString('vi-VN');
}

/**
 * Fix số - chắc chắn trả về số hợp lệ
 */
export function fixNumber(num: any): number {
  const parsed = parseInt(num, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Làm tròn số đến N chữ số thập phân
 */
export function roundNumber(num: number, decimals: number = 0): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Format giá tiền theo định dạng người dùng đọc
 */
export function formatPrice(price: number | string): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '0đ';
  return formatCurrency(num) + 'đ';
}

/**
 * Chuyển giá từ đơn vị VND sang đơn vị lưu trữ (chia 1000)
 */
export function priceToStorageUnit(price: number): number {
  return Math.floor(price / 1000);
}
