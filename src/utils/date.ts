/**
 * Date & Time Utilities
 * Xử lý các hàm liên quan đến ngày giờ
 */

/**
 * Chuyển timestamp (milliseconds) sang định dạng giờ:phút:giây
 */
export function timeStampToHMS(t: number): string {
  if (t < 0 || isNaN(t)) return '0 giờ : 0 phút : 0 giây';
  
  const interval = Math.floor(t / 1000);
  const h = Math.floor(interval / 3600).toString();
  const m = Math.floor((interval % 3600) / 60).toString();
  const s = Math.floor((interval % 3600) % 60).toString();
  
  return `${h} giờ : ${m} phút : ${s} giây`;
}

/**
 * Kiểm tra promo đã hết hạn hay chưa
 */
export function isPromoExpired(promo: any): boolean {
  if (!promo?.start || !promo?.expire) return true;
  
  try {
    const today = new Date();
    const startDate = parseDate(promo.start);
    const expireDate = parseDate(promo.expire);
    
    return !(today >= startDate && today <= expireDate);
  } catch (e) {
    console.error('Error checking promo:', e);
    return true;
  }
}

/**
 * Parse ngày từ format "dd/mm/yyyy"
 */
function parseDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  return date;
}

/**
 * Format ngày theo locale Việt Nam
 */
export function formatDate(date: Date | string, format: string = 'vi-VN'): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(format);
  } catch (e) {
    return '';
  }
}

/**
 * Format ngày giờ theo locale Việt Nam
 */
export function formatDateTime(date: Date | string | number): string {
  try {
    let d: Date;
    if (typeof date === 'number') {
      d = new Date(date);
    } else if (typeof date === 'string') {
      d = new Date(date);
    } else {
      d = date;
    }
    
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('vi-VN');
  } catch (e) {
    return '';
  }
}

/**
 * Lấy số ngày trong tháng
 */
export function getDaysInMonth(date: Date = new Date()): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
