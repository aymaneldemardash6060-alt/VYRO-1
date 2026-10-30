/**
 * VYRO Commerce — Standardized Supplier Adapter Interface
 * 
 * Defines the contract that every supplier integration must fulfill.
 * If a supplier does not support an operation, it must throw a FeatureUnsupportedError
 * or return an explicit unsupported capability indicator rather than faking execution.
 */

import {
  SupplierConfig,
  SupplierCapabilities,
  Product,
  OrderItem,
  ShippingAddress,
  FulfillmentSubOrder
} from '../types.ts';

export interface ConnectionTestResult {
  success: boolean;
  statusCode: number;
  message: string;
  latencyMs: number;
  authenticatedAs?: string;
  serverTimestamp?: string;
}

export interface SupplierProductSyncItem {
  supplierProductId: string;
  supplierSku: string;
  title: string;
  description: string;
  cost: number;
  currency: string;
  stock: number;
  images: string[];
  variants?: {
    supplierVariantId: string;
    sku: string;
    title: string;
    cost: number;
    stock: number;
    color?: string;
    size?: string;
  }[];
}

export interface InventorySyncItem {
  supplierProductId: string;
  supplierSku?: string;
  availableStock: number;
  inStock: boolean;
}

export interface PriceSyncItem {
  supplierProductId: string;
  supplierSku?: string;
  supplierCost: number;
  currency: string;
  suggestedSellingPrice?: number;
}

export interface OrderSubmissionPayload {
  vyroOrderId: string;
  subOrderId: string;
  idempotencyKey: string;
  shippingAddress: ShippingAddress;
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
  items: OrderItem[];
  codAmountToCollect: number;
  currency: string;
  notes?: string;
}

export interface OrderSubmissionResult {
  success: boolean;
  externalOrderId?: string;
  supplierStatus: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  message?: string;
  rawResponse?: any;
}

export interface OrderStatusResult {
  externalOrderId: string;
  status: string;
  normalizedStatus: 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  trackingNumber?: string;
  carrier?: string;
  lastUpdated?: string;
  rawResponse?: any;
}

export interface TrackingResult {
  externalOrderId: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl?: string;
  checkpoints: {
    timestamp: string;
    location?: string;
    description: string;
    status: string;
  }[];
}

export class FeatureUnsupportedError extends Error {
  constructor(supplierName: string, feature: string) {
    super(`Supplier "${supplierName}" does not support operation: ${feature}`);
    this.name = 'FeatureUnsupportedError';
  }
}

export abstract class SupplierAdapter {
  protected config: SupplierConfig;

  constructor(config: SupplierConfig) {
    this.config = config;
  }

  public getConfig(): SupplierConfig {
    return this.config;
  }

  public updateConfig(config: SupplierConfig): void {
    this.config = config;
  }

  public getCapabilities(): SupplierCapabilities {
    return this.config.capabilities;
  }

  /**
   * Healthcheck & authentication validation
   */
  abstract testConnection(): Promise<ConnectionTestResult>;

  /**
   * Fetch catalog products from supplier API
   */
  abstract fetchProducts(params?: { page?: number; limit?: number; search?: string }): Promise<SupplierProductSyncItem[]>;

  /**
   * Fetch detailed product specifications from supplier
   */
  abstract fetchProductDetails(externalId: string): Promise<SupplierProductSyncItem>;

  /**
   * Synchronize inventory levels for product IDs
   */
  abstract syncInventory(externalIds: string[]): Promise<InventorySyncItem[]>;

  /**
   * Synchronize pricing / cost updates
   */
  abstract syncPricing(externalIds: string[]): Promise<PriceSyncItem[]>;

  /**
   * Submit an order directly to the supplier's fulfillment system
   */
  abstract submitOrder(payload: OrderSubmissionPayload): Promise<OrderSubmissionResult>;

  /**
   * Query status of an order already submitted to supplier
   */
  abstract getOrderStatus(externalOrderId: string): Promise<OrderStatusResult>;

  /**
   * Retrieve shipment tracking updates
   */
  abstract getShipmentTracking(externalOrderId: string): Promise<TrackingResult>;

  /**
   * Request order cancellation at the supplier
   */
  abstract cancelOrder(externalOrderId: string, reason?: string): Promise<{ success: boolean; message: string }>;
}
