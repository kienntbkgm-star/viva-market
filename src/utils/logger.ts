/**
 * Console Logging Utility
 */

/**
 * Log message (có thể disable trong production)
 */
export function debugLog(message: any, ...args: any[]): void {
  if (__DEV__) {  // Chỉ log trong development
    console.log('[DEBUG]', message, ...args);
  }
}

/**
 * Log error
 */
export function errorLog(message: any, error?: any): void {
  console.error('[ERROR]', message, error);
}

/**
 * Log warning
 */
export function warningLog(message: any, ...args: any[]): void {
  console.warn('[WARNING]', message, ...args);
}

/**
 * Alias cho console.log (tiện cho từng chỗ không cần refactor)
 */
export function log(text: any): void {
  console.log(text);
}
