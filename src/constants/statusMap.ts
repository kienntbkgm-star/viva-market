/**
 * Status Mappings
 * Ánh xạ trạng thái sang tiếng Việt
 */

export const STATUS_MAP = [
  { key: 'pendding', value: 'Mới' },
  { key: 'manage', value: 'Đã quản lý' },
  { key: 'accept', value: 'Đã nhận' },
  { key: 'finish', value: 'Hoàn thành' },
  { key: 'cancel', value: 'Đã huỷ' },
  { key: 'completed', value: 'Hoàn thành' },
] as const;

export const ORDER_TYPE_MAP = [
  { key: 'food', value: 'Đơn ăn' },
  { key: 'good', value: 'Đơn hàng' },
  { key: 'service', value: 'Dịch vụ' },
] as const;

export const USER_ROLE_MAP = [
  { key: 'admin', value: 'Quản trị viên' },
  { key: 'manager', value: 'Quản lý' },
  { key: 'shipper', value: 'Giao hàng' },
  { key: 'shop', value: 'Cửa hàng' },
  { key: 'user', value: 'Khách hàng' },
] as const;

export const USER_STATUS_MAP = [
  { key: 'enable', value: 'Hoạt động' },
  { key: 'disable', value: 'Vô hiệu' },
  { key: 'offline', value: 'Offline' },
] as const;

/**
 * Lấy giá trị từ ánh xạ
 */
export function getStatusValue(key: string, map: readonly any[] = STATUS_MAP): string {
  return map.find(item => item.key === key)?.value || key;
}
