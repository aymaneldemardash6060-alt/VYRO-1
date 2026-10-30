/**
 * VYRO Commerce — Taager Supplier Adapter
 * 
 * Implements the standardized SupplierAdapter for Taager dropshipping platform.
 * Conforms to Taager B2B API architecture:
 * - Base URL: https://api.taager.com (or supplier configured base URL)
 * - Auth: Bearer Token authentication
 * - Handles country specific catalog (EGY / SAU / ARE)
 * - Real server-side HTTP calls with timeout and error classification
 * - Graceful error fallbacks when offline or unauthenticated
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

export class TaagerAdapter extends SupplierAdapter {
  constructor(config: SupplierConfig) {
    super(config);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'VYRO-Commerce-Adapter/1.0',
    };

    const token = this.config.apiKeySecret;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private getBaseUrl(): string {
    return (this.config.baseUrl || 'https://api.taager.com').replace(/\/$/, '');
  }

  /**
   * Test connection to Taager API
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const token = this.config.apiKeySecret;

    if (!token || token.trim() === '') {
      return {
        success: false,
        statusCode: 401,
        message: 'No Taager API token configured. Set a valid Bearer token in Supplier Settings.',
        latencyMs: 0,
      };
    }

    const url = `${this.getBaseUrl()}/api/v1/auth/verify`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // Non-JSON response
      }

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          message: 'Connection to Taager API verified successfully.',
          latencyMs,
          authenticatedAs: data?.user?.email || data?.seller_id || 'Taager Merchant',
          serverTimestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          statusCode: response.status,
          message: data?.message || data?.error || `Taager API returned status ${response.status} (${response.statusText})`,
          latencyMs
        };
      }
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        statusCode: isTimeout ? 504 : 503,
        message: isTimeout 
          ? 'Taager API connection timed out after 6000ms.' 
          : `Network error connecting to Taager API (${err.message || 'Host unreachable'}). Check baseUrl and internet connectivity.`,
        latencyMs
      };
    }
  }

  /**
   * Fetch products from Taager catalog
   */
  async fetchProducts(params?: { page?: number; limit?: number; search?: string }): Promise<SupplierProductSyncItem[]> {
    if (!this.config.capabilities.supportsProductSync) {
      throw new FeatureUnsupportedError(this.config.name, 'fetchProducts');
    }

    const token = this.config.apiKeySecret;
    if (!token) {
      throw new Error('Taager API token not configured.');
    }

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const country = this.config.countryCode || 'EGY';
    const query = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      country: country,
    });
    if (params?.search) {
      query.append('search', params.search);
    }

    const url = `${this.getBaseUrl()}/api/v1/products?${query.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Taager API error (${response.status}): ${text}`);
      }

      const data = await response.json();
      const rawProducts = Array.isArray(data) ? data : (data.products || data.data || []);

      return rawProducts.map((item: any) => ({
        supplierProductId: String(item.id || item.product_id),
        supplierSku: item.sku || `TG-${item.id}`,
        title: item.name || item.title || 'Taager Product',
        description: item.description || '',
        cost: Number(item.price || item.cost || item.taager_price || 0),
        currency: this.config.currency || 'EGP',
        stock: Number(item.stock || item.quantity || 0),
        images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
        variants: Array.isArray(item.variants) ? item.variants.map((v: any) => ({
          supplierVariantId: String(v.id),
          sku: v.sku || `${item.sku}-${v.id}`,
          title: v.name || v.title || 'Variant',
          cost: Number(v.price || item.price || 0),
          stock: Number(v.stock || 0),
          color: v.color,
          size: v.size
        })) : []
      }));
    } catch (err: any) {
      throw new Error(`Failed to fetch Taager products: ${err.message}`);
    }
  }

  /**
   * Fetch single product details
   */
  async fetchProductDetails(externalId: string): Promise<SupplierProductSyncItem> {
    const token = this.config.apiKeySecret;
    if (!token) {
      throw new Error('Taager API token not configured.');
    }

    const url = `${this.getBaseUrl()}/api/v1/products/${encodeURIComponent(externalId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Taager product ${externalId}: ${response.statusText}`);
    }

    const data = await response.json();
    const item = data.product || data.data || data;

    return {
      supplierProductId: String(item.id || externalId),
      supplierSku: item.sku || `TG-${externalId}`,
      title: item.name || item.title,
      description: item.description || '',
      cost: Number(item.price || item.cost || 0),
      currency: this.config.currency || 'EGP',
      stock: Number(item.stock || 0),
      images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : [])
    };
  }

  /**
   * Sync inventory levels
   */
  async syncInventory(externalIds: string[]): Promise<InventorySyncItem[]> {
    if (!this.config.capabilities.supportsInventorySync) {
      throw new FeatureUnsupportedError(this.config.name, 'syncInventory');
    }

    const token = this.config.apiKeySecret;
    if (!token || externalIds.length === 0) {
      return [];
    }

    const url = `${this.getBaseUrl()}/api/v1/products/inventory?ids=${externalIds.join(',')}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Inventory sync HTTP ${response.status}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.items || data.data || []);

      return items.map((item: any) => ({
        supplierProductId: String(item.id || item.product_id),
        supplierSku: item.sku,
        availableStock: Number(item.stock || item.quantity || 0),
        inStock: Number(item.stock || item.quantity || 0) > (this.config.settings.stockThreshold || 0)
      }));
    } catch (err: any) {
      throw new Error(`Taager inventory sync error: ${err.message}`);
    }
  }

  /**
   * Sync pricing from Taager
   */
  async syncPricing(externalIds: string[]): Promise<PriceSyncItem[]> {
    if (!this.config.capabilities.supportsPricingSync) {
      throw new FeatureUnsupportedError(this.config.name, 'syncPricing');
    }

    const token = this.config.apiKeySecret;
    if (!token || externalIds.length === 0) {
      return [];
    }

    const url = `${this.getBaseUrl()}/api/v1/products/pricing?ids=${externalIds.join(',')}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        throw new Error(`Pricing sync HTTP ${response.status}`);
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : (data.items || data.data || []);

      return items.map((item: any) => {
        const cost = Number(item.price || item.cost || 0);
        const markup = this.config.settings.markupPercentage || 25;
        const suggestedSellingPrice = Math.round(cost * (1 + markup / 100));

        return {
          supplierProductId: String(item.id || item.product_id),
          supplierSku: item.sku,
          supplierCost: cost,
          currency: this.config.currency || 'EGP',
          suggestedSellingPrice
        };
      });
    } catch (err: any) {
      throw new Error(`Taager pricing sync error: ${err.message}`);
    }
  }

  /**
   * Submit dropshipping order to Taager
   * Formats the request strictly matching Taager order submission payload
   */
  async submitOrder(payload: OrderSubmissionPayload): Promise<OrderSubmissionResult> {
    if (!this.config.capabilities.supportsAutoOrderSubmission) {
      throw new FeatureUnsupportedError(this.config.name, 'submitOrder');
    }

    const token = this.config.apiKeySecret;
    if (!token) {
      return {
        success: false,
        supplierStatus: 'rejected',
        message: 'Order submission rejected: Taager API credentials not configured. Moved to manual fulfillment queue.'
      };
    }

    const taagerPayload = {
      order_number: payload.vyroOrderId,
      external_reference: payload.subOrderId,
      customer_name: payload.shippingAddress.fullName,
      customer_phone: payload.shippingAddress.phone,
      customer_alt_phone: payload.shippingAddress.secondaryPhone || '',
      shipping_address: `${payload.shippingAddress.streetAddress}, ${payload.shippingAddress.buildingNumber || ''}`.trim(),
      city: payload.shippingAddress.city,
      province: payload.shippingAddress.governorateOrState,
      country: this.config.countryCode || 'EGY',
      payment_type: payload.codAmountToCollect > 0 ? 'cod' : 'prepaid',
      cash_on_delivery: payload.codAmountToCollect,
      notes: payload.notes || 'Order fulfilled via VYRO Independent Storefront',
      products: payload.items.map(item => ({
        product_id: item.supplierProductId,
        sku: item.sku,
        quantity: item.quantity,
        selling_price: item.unitPrice
      }))
    };

    const url = `${this.getBaseUrl()}/api/v1/orders`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'X-Idempotency-Key': payload.idempotencyKey
        },
        body: JSON.stringify(taagerPayload)
      });

      const responseData = await response.json().catch(() => ({}));

      if (response.ok) {
        return {
          success: true,
          externalOrderId: String(responseData.order_id || responseData.id || `TG-${Date.now()}`),
          supplierStatus: responseData.status || 'received',
          trackingNumber: responseData.tracking_number,
          trackingCarrier: responseData.courier || 'Taager Express',
          trackingUrl: responseData.tracking_url,
          estimatedDelivery: responseData.estimated_delivery,
          message: 'Order accepted by Taager B2B fulfillment system.',
          rawResponse: responseData
        };
      } else {
        return {
          success: false,
          supplierStatus: 'failed',
          message: responseData.message || responseData.error || `Taager order submission failed with HTTP ${response.status}`,
          rawResponse: responseData
        };
      }
    } catch (err: any) {
      return {
        success: false,
        supplierStatus: 'network_error',
        message: `Network error submitting order to Taager: ${err.message}. Queued for manual retry.`
      };
    }
  }

  /**
   * Get order status from Taager
   */
  async getOrderStatus(externalOrderId: string): Promise<OrderStatusResult> {
    const url = `${this.getBaseUrl()}/api/v1/orders/${encodeURIComponent(externalOrderId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Taager order ${externalOrderId}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawStatus = (data.status || '').toLowerCase();

    let normalizedStatus: OrderStatusResult['normalizedStatus'] = 'processing';
    if (['shipped', 'in_transit', 'out_for_delivery'].includes(rawStatus)) {
      normalizedStatus = 'shipped';
    } else if (['delivered', 'completed'].includes(rawStatus)) {
      normalizedStatus = 'delivered';
    } else if (['cancelled', 'rejected'].includes(rawStatus)) {
      normalizedStatus = 'cancelled';
    } else if (['returned', 'rto'].includes(rawStatus)) {
      normalizedStatus = 'returned';
    }

    return {
      externalOrderId,
      status: rawStatus,
      normalizedStatus,
      trackingNumber: data.tracking_number,
      carrier: data.courier,
      lastUpdated: data.updated_at,
      rawResponse: data
    };
  }

  /**
   * Get tracking checkpoints
   */
  async getShipmentTracking(externalOrderId: string): Promise<TrackingResult> {
    if (!this.config.capabilities.supportsTrackingSync) {
      throw new FeatureUnsupportedError(this.config.name, 'getShipmentTracking');
    }

    const url = `${this.getBaseUrl()}/api/v1/orders/${encodeURIComponent(externalOrderId)}/tracking`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Taager tracking: ${response.statusText}`);
    }

    const data = await response.json();
    const checkpoints = Array.isArray(data.checkpoints) ? data.checkpoints : [];

    return {
      externalOrderId,
      trackingNumber: data.tracking_number || '',
      carrier: data.courier || 'Taager Express',
      trackingUrl: data.tracking_url,
      checkpoints: checkpoints.map((cp: any) => ({
        timestamp: cp.timestamp || cp.date || new Date().toISOString(),
        location: cp.location || cp.city,
        description: cp.message || cp.description || cp.status,
        status: cp.status
      }))
    };
  }

  /**
   * Cancel order on Taager
   */
  async cancelOrder(externalOrderId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    if (!this.config.capabilities.supportsCancellation) {
      throw new FeatureUnsupportedError(this.config.name, 'cancelOrder');
    }

    const url = `${this.getBaseUrl()}/api/v1/orders/${encodeURIComponent(externalOrderId)}/cancel`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason: reason || 'Customer request on VYRO' })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      return {
        success: true,
        message: data.message || 'Order successfully cancelled with Taager.'
      };
    } else {
      return {
        success: false,
        message: data.message || `Taager cancellation failed (${response.status})`
      };
    }
  }
}
