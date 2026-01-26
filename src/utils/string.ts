/**
 * String Utilities
 * Xử lý các hàm liên quan đến chuỗi ký tự
 */

/**
 * Loại bỏ dấu tiếng Việt và chuyển thành chữ thường
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Loại bỏ dấu tiếng Việt từ chuỗi
 */
function removeAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Tìm kiếm chuỗi (không phân biệt chữ hoa/thường, loại dấu)
 */
export function searchString(str: string, key: string): boolean {
  return removeAccents(str).toLowerCase().includes(removeAccents(key).toLowerCase());
}

/**
 * Cắt chuỗi nếu vượt quá độ dài
 */
export function truncateString(str: string, length: number = 50, suffix: string = '...'): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
}
