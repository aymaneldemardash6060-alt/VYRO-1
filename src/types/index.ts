export * from '../server/types.ts';

export interface CartItem {
  productId: string;
  variantId?: string;
  title: string;
  titleAr: string;
  variantTitle?: string;
  sku: string;
  price: number;
  cost: number;
  image: string;
  quantity: number;
  supplierId: string;
  supplierName: string;
}

export type ViewMode = 'storefront' | 'catalog' | 'checkout' | 'order_tracking' | 'admin';

export type AdminTab = 
  | 'overview'
  | 'suppliers'
  | 'products'
  | 'orders'
  | 'financials'
  | 'logs'
  | 'migrations';
