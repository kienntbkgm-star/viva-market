/**
 * CENTRALIZED TYPE DEFINITIONS
 * Tất cả interfaces của dự án được định nghĩa ở đây
 */

// ============= PRODUCT TYPES =============

export interface ItemOption {
  name: string;
  price: number;
  status: boolean;
  isDefault?: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  type: 'đồ ăn' | 'đồ uống' | string;
  img?: string;
  image?: string[];
  priceNormal: number;
  pricePromo: number;
  shopId?: string | number;
  index?: number;
  status: 'enable' | 'disable';
  timeStart?: number;
  timeEnd?: number;
  note?: string;
  orderCount?: number;
  option?: string; // JSON string of options
  options?: ItemOption[];
  isOutOfTime?: boolean;
  effectiveStatus?: 'enable' | 'disable';
}

export interface Goods {
  id: string;
  name: string;
  img: string;
  price: number;
  quantity: number;
  shopId?: string | number;
  status: 'enable' | 'disable';
  note?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  img: string;
  shopId: string | number;
  shopName?: string;
  status: 'enable' | 'disable';
  moneyShare?: number;
}

// ============= CART TYPES =============

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  pricePromo: number;
  note?: string;
  shopId?: string | number;
  option?: string; // JSON string
  options?: ItemOption[];
}

export interface ShoppingCart {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

// ============= ORDER TYPES =============

export type OrderStatus = 'pendding' | 'manage' | 'accept' | 'finish' | 'cancel' | 'completed';
export type OrderType = 'food' | 'good' | 'service';

export interface OrderValue {
  items: number;
  ship: number;
  promo: number;
  total: number;
}

export interface OrderLog {
  time: number;
  content: string;
}

export interface FoodOrder {
  id: string;
  userId: string | number;
  managerId?: string | number;
  shipperId?: string | number;
  status: OrderStatus;
  orderItems: FoodItem[];
  value: OrderValue;
  shipType?: 'normal' | 'atDoor';
  type: 'food';
  note?: string;
  logs?: OrderLog[];
  createdAt: number;
}

export interface ServiceOrder {
  id: string;
  userId: string | number;
  managerId?: string | number;
  status: OrderStatus;
  service: Service;
  price: number;
  type: 'service';
  note?: string;
  logs?: OrderLog[];
  createdAt: number;
}

export type Order = FoodOrder | ServiceOrder;

// ============= USER TYPES =============

export type UserRole = 'admin' | 'manager' | 'shipper' | 'shop' | 'user';
export type UserStatus = 'enable' | 'disable' | 'offline';

export interface User {
  id: string | number;
  name: string;
  phone: string;
  password: string;
  email?: string;
  address?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  shopName?: string;
  imgShopSquare?: string;
  checkInDate?: string;
  point?: number;
  expoToken?: string;
  createdAt?: string;
  isResidentShop?: boolean;
}

// ============= SYSTEM CONFIG =============

export interface ShipConfig {
  food: {
    normalValue: number;
    atDoorValue: number;
    step: number;
  };
  good?: {
    normalValue: number;
    atDoorValue: number;
  };
}

export interface MoneyConfig {
  shipperShipRatio: number;
  managerShipRatio: number;
  managerGoodFee: number;
  refusePunish: number;
}

export interface TimeoutConfig {
  finish: number;
  cancel: number;
}

export interface SystemInfo {
  ship: ShipConfig;
  money: MoneyConfig;
  timeOut: TimeoutConfig;
  adminName?: string;
  adminPhone?: string;
}

// ============= TRANSACTION TYPES =============

export type TransactionStatus = 'done' | 'own' | 'pending';

export interface Transaction {
  id: string;
  from: string | number;
  to: string | number;
  value: number;
  orderId?: string | number;
  status: TransactionStatus;
  log?: string;
  createdAt?: number;
}

// ============= PROMO TYPES =============

export interface Promo {
  id: string;
  name: string;
  description?: string;
  discount: number;
  start: string; // "dd/mm/yyyy"
  expire: string; // "dd/mm/yyyy"
  itemIds?: string[];
  status: 'enable' | 'disable';
}

// ============= ITEM TYPE MAPPING =============

export interface ItemType {
  id: string;
  name: string;
  icon?: string;
}

// ============= NOTIFICATION TYPES =============

export interface NotificationPayload {
  expoToken: string;
  message: string;
  title?: string;
  data?: Record<string, any>;
}

// ============= API RESPONSE TYPES =============

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
}

// ============= SHOP INFO =============

export interface ShopInfo {
  id: string | number;
  name: string;
  productCount: number;
  img?: string;
}
