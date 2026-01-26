/**
 * Order & Status Utilities
 * Xử lý các hàm liên quan đến đơn hàng và trạng thái
 */

export type OrderStatus = 'pendding' | 'manage' | 'accept' | 'finish' | 'cancel';

/**
 * Tính giá trị ưu tiên sắp xếp đơn hàng theo trạng thái
 */
export function getOrderStatusValue(status: string): number {
  const statusMap: Record<string, number> = {
    'pendding': 5,
    'manage': 4,
    'accept': 3,
    'finish': 2,
    'cancel': 1,
    'completed': 2,
  };
  return statusMap[status] || 0;
}

/**
 * Sắp xếp đơn hàng theo trạng thái (mới nhất trước, mới nhất theo ID)
 */
export function sortOrders(a: any, b: any): number {
  const statusA = getOrderStatusValue(a.status);
  const statusB = getOrderStatusValue(b.status);
  
  if (statusA !== statusB) return statusB - statusA;
  return (b.id || 0) - (a.id || 0);
}

/**
 * Sắp xếp item/food theo status và index
 */
export function sortItems(a: any, b: any): number {
  // Enable items trước
  if (a.status === 'enable' && b.status === 'disable') return -1;
  if (a.status === 'disable' && b.status === 'enable') return 1;
  
  // Cùng status thì sắp xếp theo index
  return (b.index || 0) - (a.index || 0);
}

/**
 * Chuyển trạng thái đơn hàng sang tiếng Việt
 */
export function translateOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pendding': 'Mới',
    'manage': 'Đã quản lý',
    'accept': 'Đã nhận',
    'finish': 'Hoàn thành',
    'cancel': 'Đã huỷ',
    'completed': 'Hoàn thành',
    'pending': 'Mới',
  };
  return statusMap[status] || status;
}

/**
 * Kiểm tra user có được check-in hôm nay không
 */
export function isCheckedInToday(user: any): boolean {
  if (!user?.checkInDate) return false;
  return user.checkInDate === new Date().toDateString();
}

/**
 * Tính tổng tiền đơn hàng
 */
export function calculateOrderTotal(order: any): number {
  if (!order?.value) return 0;
  const { items = 0, ship = 0, promo = 0 } = order.value;
  return items + ship - promo;
}

/**
 * Kiểm tra đơn hàng có thể thực hiện action không
 */
export function canPerformAction(order: any, action: string): boolean {
  const status = order?.status;
  
  const allowedActions: Record<string, string[]> = {
    'pendding': ['manage', 'cancel', 'delete-shipper'],
    'manage': ['accept', 'refuse', 'cancel'],
    'accept': ['finish', 'delete-shipper'],
    'finish': [],
    'cancel': [],
  };
  
  return (allowedActions[status] || []).includes(action);
}
