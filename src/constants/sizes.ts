/**
 * Size Ordering Constants
 * Thứ tự size từ nhỏ đến lớn
 */

export const SIZE_ORDER: Record<string, number> = {
  // Small sizes
  's': 1,
  'size s': 1,
  'small': 1,
  'nhỏ': 1,
  
  // Medium sizes
  'm': 2,
  'size m': 2,
  'medium': 2,
  'vừa': 2,
  
  // Large sizes
  'l': 3,
  'size l': 3,
  'large': 3,
  'to': 3,
  'lớn': 3,
  
  // Extra large sizes
  'xl': 4,
  'size xl': 4,
  'extra large': 4,
  'xlarge': 4,
  'rất to': 4,
} as const;

/**
 * Lấy thứ tự size
 */
export function getSizeOrder(size: string): number {
  const normalized = size?.toLowerCase().trim() || '';
  return SIZE_ORDER[normalized] || 0;
}

/**
 * So sánh 2 sizes
 */
export function compareSizes(size1: string, size2: string): number {
  return getSizeOrder(size2) - getSizeOrder(size1);
}
