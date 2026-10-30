/**
 * VYRO Commerce — Core Domain Types
 * Independent Multi-Supplier Architecture
 */

export type Currency = 'EGP' | 'SAR' | 'AED' | 'USD';

export type IntegrationType = 'api' | 'manual' | 'webhook_only';

export type SupplierConnectionStatus = 'active' | 'degraded' | 'disconnected' | 'testing' | 'unconfigured';

export type SyncStatus = 'synced' | 'drift_detected' | 'desynced' | 'local_only' | 'pending';

export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'routed'
  | 'submitted_to_supplier'
  | 'supplier_confirmed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type FulfillmentStatus = 
  | 'pending_submission'
  | 'submitted'
  | 'in_manual_queue'
  | 'acknowledged'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'failed_submission'
  | 'cancelled';

export type SettlementStatus = 'pending' | 'reconciled' | 'settled' | 'disputed';

export interface SupplierCapabilities {
  supportsProductSync: boolean;
  supportsInventorySync: boolean;
  supportsPricingSync: boolean;
  supportsAutoOrderSubmission: boolean;
  supportsTrackingSync: boolean;
  supportsCancellation: boolean;
  supportsWebhooks: boolean;
}

export interface SupplierConfig {
  id: string;
  name: string;
  code: string; // e.g. 'taager', 'cairo_hub', 'gulf_logistics'
  integrationType: IntegrationType;
  baseUrl?: string;
  authMethod: 'bearer' | 'api_key_header' | 'basic' | 'none';
  apiKeyMasked?: string;
  apiKeySecret?: string; // Stored server-side only
  countryCode: string; // 'EGY', 'SAU', 'ARE', etc.
  currency: Currency;
  status: SupplierConnectionStatus;
  capabilities: SupplierCapabilities;
  settings: {
    autoSubmitOrders: boolean;
    autoSyncInventory: boolean;
    autoSyncPricing: boolean;
    syncIntervalMinutes: number;
    stockThreshold: number;
    markupPercentage: number;
    settlementCycleDays: number;
    codFeePercent: number;
  };
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  lastSyncAt?: string;
  lastHealthCheckAt?: string;
  lastHealthStatus?: 'ok' | 'error';
  lastHealthMessage?: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  titleAr: string;
  sku: string;
  supplierSku?: string;
  color?: string;
  size?: string;
  priceDelta: number;
  stock: number;
}

export interface Product {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  category: string;
  categoryAr: string;
  images: string[];
  sellingPrice: number;
  supplierCost: number;
  currency: Currency;
  supplierId: string;
  supplierName: string;
  supplierProductId?: string;
  supplierSku?: string;
  sku: string;
  variants: ProductVariant[];
  stockQuantity: number;
  syncStatus: SyncStatus;
  isActive: boolean;
  rating: number;
  reviewsCount: number;
  tags: string[];
  weightKg?: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  titleAr: string;
  variantTitle?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  totalPrice: number;
  totalCost: number;
  supplierId: string;
  supplierName: string;
  supplierProductId?: string;
  image: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  secondaryPhone?: string;
  country: string;
  governorateOrState: string;
  city: string;
  streetAddress: string;
  buildingNumber?: string;
  apartment?: string;
  postalCode?: string;
  notes?: string;
}

export interface FulfillmentSubOrder {
  id: string;
  orderId: string;
  supplierId: string;
  supplierName: string;
  status: FulfillmentStatus;
  externalOrderId?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  items: OrderItem[];
  subtotalCost: number;
  shippingCost: number;
  supplierEstimatedDelivery?: string;
  submissionAttempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  idempotencyKey: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  trackingCode: string;
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subOrders: FulfillmentSubOrder[];
  currency: Currency;
  subtotal: number;
  shippingFee: number;
  discount: number;
  codFee: number;
  totalAmount: number;
  paymentMethod: 'cod' | 'card';
  status: OrderStatus;
  financialMetrics: {
    totalSellingPrice: number;
    totalSupplierCost: number;
    shippingCostToVyro: number;
    expectedProfit: number;
    realizedProfit: number;
    codCollected: boolean;
    settlementStatus: SettlementStatus;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationLog {
  id: string;
  timestamp: string;
  supplierId: string;
  supplierName: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  action: 'test_connection' | 'fetch_products' | 'sync_inventory' | 'sync_pricing' | 'submit_order' | 'get_status' | 'get_tracking' | 'cancel_order' | 'webhook';
  statusCode: number;
  durationMs: number;
  status: 'success' | 'failure' | 'degraded';
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
  idempotencyKey?: string;
}

export interface SupplierSettlement {
  id: string;
  supplierId: string;
  supplierName: string;
  periodStart: string;
  periodEnd: string;
  ordersCount: number;
  totalProductCost: number;
  totalShippingCost: number;
  codFeesDeducted: number;
  netSettlementDue: number;
  status: SettlementStatus;
  payoutDate?: string;
  referenceNumber?: string;
  notes?: string;
}
