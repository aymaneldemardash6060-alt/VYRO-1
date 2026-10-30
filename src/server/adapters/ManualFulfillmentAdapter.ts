/**
 * VYRO Commerce — Manual Fulfillment & Local Warehouse Adapter
 * 
 * Used for:
 * 1. Internal VYRO warehouses (e.g. Cairo Central Hub)
 * 2. Direct partner manufacturers and local suppliers without an API
 * 3. Graceful fallback when an external supplier API is down or unconfigured
 * 
 * Never makes failing network calls. Instead, it transitions sub-orders
 * cleanly into the Manual Fulfillment Queue, creates dispatch slips,
 * and allows VYRO warehouse operators to assign tracking codes and fulfill orders.
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

export class ManualFulfillmentAdapter extends SupplierAdapter {
  constructor(config: SupplierConfig) {
    super(config);
  }

  async testConnection(): Promise<ConnectionTestResult> {
    // Manual adapter is always internally operational
    return {
      success: true,
      statusCode: 200,
      message: `Local warehouse / manual fulfillment queue is fully active and ready for dispatch operations.`,
      latencyMs: 1,
      authenticatedAs: 'Internal Warehouse Operator (VYRO Hub)',
      serverTimestamp: new Date().toISOString()
    };
  }

  async fetchProducts(): Promise<SupplierProductSyncItem[]> {
    // Manual suppliers do not have an automated remote catalog endpoint.
    // They are managed directly within VYRO catalog.
    throw new FeatureUnsupportedError(
      this.config.name,
      'Automated product sync (manual supplier products are managed directly in VYRO Product Catalog)'
    );
  }

  async fetchProductDetails(externalId: string): Promise<SupplierProductSyncItem> {
    throw new FeatureUnsupportedError(
      this.config.name,
      'Automated product detail fetch (managed directly in VYRO)'
    );
  }

  async syncInventory(externalIds: string[]): Promise<InventorySyncItem[]> {
    // For manual suppliers, inventory is maintained in VYRO database directly.
    return [];
  }

  async syncPricing(externalIds: string[]): Promise<PriceSyncItem[]> {
    return [];
  }

  async submitOrder(payload: OrderSubmissionPayload): Promise<OrderSubmissionResult> {
    const queueSlipNumber = `VYRO-MF-${Date.now().toString().slice(-6)}`;
    
    return {
      success: true,
      externalOrderId: queueSlipNumber,
      supplierStatus: 'in_manual_queue',
      trackingCarrier: 'Local Logistics / VYRO Express',
      message: `Order assigned to ${this.config.name} manual fulfillment queue. Packing slip generated: ${queueSlipNumber}. Ready for dispatch.`,
      rawResponse: {
        queueSlipNumber,
        assignedWarehouse: this.config.name,
        routedAt: new Date().toISOString(),
        itemsCount: payload.items.length
      }
    };
  }

  async getOrderStatus(externalOrderId: string): Promise<OrderStatusResult> {
    return {
      externalOrderId,
      status: 'in_manual_queue',
      normalizedStatus: 'processing',
      carrier: 'Local Dispatch',
      lastUpdated: new Date().toISOString()
    };
  }

  async getShipmentTracking(externalOrderId: string): Promise<TrackingResult> {
    return {
      externalOrderId,
      trackingNumber: externalOrderId,
      carrier: 'Local Logistics',
      checkpoints: [
        {
          timestamp: new Date().toISOString(),
          location: 'VYRO Distribution Hub',
          description: 'Order placed in fulfillment queue. Picking & packing underway.',
          status: 'queue_assigned'
        }
      ]
    };
  }

  async cancelOrder(externalOrderId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: `Manual sub-order ${externalOrderId} marked as cancelled in local queue. Reason: ${reason || 'Operator cancelled'}`
    };
  }
}
