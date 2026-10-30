/**
 * VYRO Commerce — Supplier Adapter Registry & Dispatcher
 * 
 * Factory and runtime registry that manages supplier adapter instances,
 * routes execution to the appropriate supplier, and automatically logs
 * every external interaction to the integration audit trail.
 */

import { SupplierAdapter } from './SupplierAdapter.ts';
import { TaagerAdapter } from './TaagerAdapter.ts';
import { ManualFulfillmentAdapter } from './ManualFulfillmentAdapter.ts';
import { GenericRestAdapter } from './GenericRestAdapter.ts';
import { SupplierConfig, IntegrationLog } from '../types.ts';

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: Map<string, SupplierAdapter> = new Map();
  private logSubscriber?: (log: IntegrationLog) => Promise<void> | void;

  private constructor() {}

  public static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  public setLogSubscriber(subscriber: (log: IntegrationLog) => Promise<void> | void): void {
    this.logSubscriber = subscriber;
  }

  public register(supplier: SupplierConfig): SupplierAdapter {
    let adapter: SupplierAdapter;

    if (supplier.integrationType === 'manual') {
      adapter = new ManualFulfillmentAdapter(supplier);
    } else if (supplier.code.toLowerCase().includes('taager')) {
      adapter = new TaagerAdapter(supplier);
    } else {
      adapter = new GenericRestAdapter(supplier);
    }

    this.adapters.set(supplier.id, adapter);
    return adapter;
  }

  public getAdapter(supplier: SupplierConfig): SupplierAdapter {
    const existing = this.adapters.get(supplier.id);
    if (existing) {
      existing.updateConfig(supplier);
      return existing;
    }
    return this.register(supplier);
  }

  public async recordLog(log: Omit<IntegrationLog, 'id' | 'timestamp'>): Promise<void> {
    const completeLog: IntegrationLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...log
    };

    if (this.logSubscriber) {
      await this.logSubscriber(completeLog);
    }
  }
}
