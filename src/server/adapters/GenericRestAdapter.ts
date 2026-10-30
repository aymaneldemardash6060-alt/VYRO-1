/**
 * VYRO Commerce — Generic REST Supplier Adapter
 * 
 * Supports future API suppliers with standard REST / JSON specifications
 * (e.g. customized 3PLs, Gulf Dropshipping hubs, Shopify B2B suppliers, etc.)
 */

import {
  SupplierAdapter,
  ConnectionTestResult,
  SupplierProductSyncItem,
  InventorySyncItem,
  PriceSyncItem,
  OrderSubmissionPayload,
  OrderSubmissionResult,
  OrderStatusResult,
  TrackingResult,
  FeatureUnsupportedError
} from './SupplierAdapter.ts';
import { SupplierConfig } from '../types.ts';

export class GenericRestAdapter extends SupplierAdapter {
  constructor(config: SupplierConfig) {
    super(config);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'VYRO-Provider-Agnostic-Core/1.0',
    };

    if (this.config.apiKeySecret) {
      if (this.config.authMethod === 'api_key_header') {
        headers['x-api-key'] = this.config.apiKeySecret;
      } else {
        headers['Authorization'] = `Bearer ${this.config.apiKeySecret}`;
      }
    }

    return headers;
  }

  private getBaseUrl(): string {
    return (this.config.baseUrl || '').replace(/\/$/, '');
  }

  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const baseUrl = this.getBaseUrl();

    if (!baseUrl) {
      return {
        success: false,
        statusCode: 400,
        message: 'No API Base URL configured for this supplier.',
        latencyMs: 0
      };
    }

    if (!this.config.apiKeySecret) {
      return {
        success: false,
        statusCode: 401,
        message: 'API Key or Bearer Token missing.',
        latencyMs: 0
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Connection verified via health endpoint.' : `Supplier returned HTTP ${response.status}`,
        latencyMs,
        serverTimestamp: new Date().toISOString()
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 503,
        message: `Connection failed: ${err.message}`,
        latencyMs: Date.now() - startTime
      };
    }
  }

  async fetchProducts(): Promise<SupplierProductSyncItem[]> {
    if (!this.config.capabilities.supportsProductSync) {
      throw new FeatureUnsupportedError(this.config.name, 'fetchProducts');
    }
    const response = await fetch(`${this.getBaseUrl()}/products`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.products || [];
  }

  async fetchProductDetails(externalId: string): Promise<SupplierProductSyncItem> {
    const response = await fetch(`${this.getBaseUrl()}/products/${encodeURIComponent(externalId)}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  async syncInventory(externalIds: string[]): Promise<InventorySyncItem[]> {
    if (!this.config.capabilities.supportsInventorySync) {
      throw new FeatureUnsupportedError(this.config.name, 'syncInventory');
    }
    const response = await fetch(`${this.getBaseUrl()}/inventory?ids=${externalIds.join(',')}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  async syncPricing(externalIds: string[]): Promise<PriceSyncItem[]> {
    if (!this.config.capabilities.supportsPricingSync) {
      throw new FeatureUnsupportedError(this.config.name, 'syncPricing');
    }
    const response = await fetch(`${this.getBaseUrl()}/pricing?ids=${externalIds.join(',')}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  async submitOrder(payload: OrderSubmissionPayload): Promise<OrderSubmissionResult> {
    if (!this.config.capabilities.supportsAutoOrderSubmission) {
      throw new FeatureUnsupportedError(this.config.name, 'submitOrder');
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/orders`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'X-Idempotency-Key': payload.idempotencyKey
        },
        body: JSON.stringify({
          order_id: payload.vyroOrderId,
          sub_order_id: payload.subOrderId,
          recipient: payload.shippingAddress,
          customer: payload.customer,
          line_items: payload.items,
          cod_amount: payload.codAmountToCollect,
          currency: payload.currency
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return {
          success: true,
          externalOrderId: data.order_id || data.id,
          supplierStatus: data.status || 'accepted',
          trackingNumber: data.tracking_number,
          trackingCarrier: data.carrier,
          message: 'Order accepted by supplier API.',
          rawResponse: data
        };
      } else {
        return {
          success: false,
          supplierStatus: 'failed',
          message: data.message || `Supplier order submission failed with HTTP ${response.status}`,
          rawResponse: data
        };
      }
    } catch (err: any) {
      return {
        success: false,
        supplierStatus: 'error',
        message: `Supplier network error: ${err.message}`
      };
    }
  }

  async getOrderStatus(externalOrderId: string): Promise<OrderStatusResult> {
    const response = await fetch(`${this.getBaseUrl()}/orders/${encodeURIComponent(externalOrderId)}`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return {
      externalOrderId,
      status: data.status,
      normalizedStatus: data.normalized_status || 'processing',
      trackingNumber: data.tracking_number,
      carrier: data.carrier
    };
  }

  async getShipmentTracking(externalOrderId: string): Promise<TrackingResult> {
    const response = await fetch(`${this.getBaseUrl()}/orders/${encodeURIComponent(externalOrderId)}/tracking`, {
      headers: this.getHeaders()
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  async cancelOrder(externalOrderId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.getBaseUrl()}/orders/${encodeURIComponent(externalOrderId)}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason })
    });
    const data = await response.json().catch(() => ({}));
    return {
      success: response.ok,
      message: data.message || (response.ok ? 'Order cancelled' : 'Failed to cancel')
    };
  }
}
