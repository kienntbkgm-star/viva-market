/**
 * Object Comparison & Cloning Utilities
 */

/**
 * So sánh 2 object có giống nhau không
 */
export function areObjectsEqual(obj1: any, obj2: any): boolean {
  try {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  } catch (e) {
    return false;
  }
}

/**
 * Clone object sâu
 */
export function deepClone<T>(obj: T): T {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.error('Error cloning object:', e);
    return obj;
  }
}

/**
 * Merge 2 objects
 */
export function mergeObjects<T>(obj1: Partial<T>, obj2: Partial<T>): T {
  return { ...obj1, ...obj2 } as T;
}

/**
 * Loại bỏ các property undefined từ object
 */
export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Lấy các khác biệt giữa 2 objects
 */
export function getDifferences<T extends Record<string, any>>(
  obj1: T,
  obj2: T
): Partial<T> {
  const result: any = {};
  Object.keys(obj2).forEach(key => {
    if (obj1[key] !== obj2[key]) {
      result[key] = obj2[key];
    }
  });
  return result;
}
