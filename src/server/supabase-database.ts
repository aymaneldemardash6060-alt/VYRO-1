import { createHash, createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AdapterRegistry } from './adapters/AdapterRegistry.ts';
import type {
  Currency,
  FulfillmentSubOrder,
  IntegrationLog,
  Order,
  OrderItem,
  Product,
  ProductVariant,
  SettlementStatus,
  SupplierConfig,
  SupplierSettlement
} from './types.ts';

export type CreatedOrder = Pick<Order, 'orderNumber' | 'trackingCode' | 'status' | 'totalAmount' | 'createdAt'>;

export interface TrackingOrder {
  orderNumber: string;
  trackingCode: string;
  status: Order['status'];
  createdAt: string;
  customer: { fullName: string };
  shippingAddress: { fullName: string; city: string; governorateOrState: string; country: string };
  subOrders: Array<Pick<FulfillmentSubOrder, 'id' | 'status' | 'trackingNumber' | 'trackingCarrier' | 'trackingUrl'> & {
    items: Array<Pick<OrderItem, 'id' | 'title' | 'titleAr' | 'variantTitle' | 'quantity' | 'unitPrice' | 'image'>>;
  }>;
  paymentMethod: 'cod';
  totalAmount: number;
  financialMetrics: { codCollected: boolean };
}

type SupabaseErrorLike = { code?: string; message?: string; details?: string; hint?: string };
type ProductFilter = { category?: string; supplierId?: string; search?: string; activeOnly?: boolean };
type SubOrderUpdates = {
  trackingNumber?: string;
  carrier?: string;
  trackingUrl?: string;
  externalOrderId?: string;
  supplierEstimatedDelivery?: string;
  lastError?: string;
  notes?: string;
  submissionAttempts?: number;
  lastAttemptAt?: string;
};

const ADMIN_PRODUCT_SELECT = '*, product_variants(*)';
const PUBLIC_PRODUCT_SELECT = [
  'id', 'sku', 'title', 'title_ar', 'description', 'description_ar', 'category', 'category_ar', 'images',
  'selling_price', 'currency', 'supplier_id', 'supplier_name', 'stock_quantity', 'sync_status', 'is_active',
  'rating', 'reviews_count', 'tags', 'weight_kg', 'created_at', 'updated_at',
  'product_variants(id,product_id,sku,title,title_ar,color,size,price_delta,stock,is_active,created_at)'
].join(',');

let publicClientCache: { url: string; key: string; client: SupabaseClient } | undefined;
let adminClientCache: { url: string; key: string; client: SupabaseClient } | undefined;

function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false }
  });
}

function getPublicClient(): SupabaseClient {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
  ).trim();
  if (!url || !key) throw new Error('Supabase public configuration is missing on the server.');
  if (!publicClientCache || publicClientCache.url !== url || publicClientCache.key !== key) {
    publicClientCache = { url, key, client: createSupabaseClient(url, key) };
  }
  return publicClientCache.client;
}

function getAdminClient(): SupabaseClient {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) {
    throw new Error('Server-side database access is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment only.');
  }
  if (!adminClientCache || adminClientCache.url !== url || adminClientCache.key !== key) {
    adminClientCache = { url, key, client: createSupabaseClient(url, key) };
  }
  return adminClientCache.client;
}

function failDatabase(error: SupabaseErrorLike, operation: string): never {
  const safeCodes = new Set(['22023', '23503', '23505', '23514', 'P0001', 'P0002', '42501']);
  if (error.code && safeCodes.has(error.code) && error.message) throw new Error(error.message);
  // Keep database diagnostics server-side so production logs reveal the actual
  // PostgREST failure without returning schema details to storefront visitors.
  const diagnostic = {
    code: error.code || 'unknown',
    message: String(error.message || '').slice(0, 240),
    details: String(error.details || '').slice(0, 240),
    hint: String(error.hint || '').slice(0, 160)
  };
  console.error(`[Vyro Supabase] ${operation} failed`, diagnostic);
  throw new Error(`Could not ${operation}. Check the server configuration and try again.`);
}

function ensureNoError(error: SupabaseErrorLike | null, operation: string): void {
  if (error) failDatabase(error, operation);
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function encryptionKey(): Buffer {
  const configured = (process.env.SUPPLIER_CREDENTIALS_ENCRYPTION_KEY || '').trim();
  if (!configured) throw new Error('Set SUPPLIER_CREDENTIALS_ENCRYPTION_KEY on the server before saving supplier credentials.');
  return createHash('sha256').update(configured).digest();
}

function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const [version, ivText, tagText, encryptedText] = value.split(':');
  if (version !== 'v1' || !ivText || !tagText || !encryptedText) throw new Error('Stored supplier credential has an unsupported format.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64')), decipher.final()]).toString('utf8');
}

function maskSecret(value: string): string {
  if (value.length <= 8) return `${value.slice(0, 2)}••••${value.slice(-2)}`;
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

function validateSupplierUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error('Supplier URL must be a valid HTTPS URL.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Supplier URL must be a valid HTTPS URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) {
    throw new Error('Supplier API URLs must use HTTPS and must not include embedded credentials.');
  }
  const host = url.hostname.toLowerCase();
  const ipVersion = isIP(host);
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      host === '127.0.0.1' || host === '::1' || (ipVersion === 4 && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(host))) {
    throw new Error('Private and local supplier URLs are not allowed.');
  }
  return url.toString().replace(/\/$/, '');
}

function supplierFromRow(row: any, includeSecret = false): SupplierConfig {
  const result: SupplierConfig = {
    id: row.id,
    name: row.name,
    code: row.code,
    integrationType: row.integration_type,
    baseUrl: optionalString(row.base_url),
    authMethod: row.auth_method,
    apiKeyMasked: optionalString(row.api_key_masked),
    countryCode: row.country_code,
    currency: row.currency as Currency,
    status: row.status,
    capabilities: row.capabilities || {},
    settings: row.settings || {},
    contactEmail: optionalString(row.contact_email),
    contactPhone: optionalString(row.contact_phone),
    notes: optionalString(row.notes),
    lastSyncAt: optionalString(row.last_sync_at),
    lastHealthCheckAt: optionalString(row.last_health_check_at),
    lastHealthStatus: row.last_health_status || undefined,
    lastHealthMessage: optionalString(row.last_health_message)
  };
  if (includeSecret && row.api_key_encrypted) result.apiKeySecret = decryptSecret(row.api_key_encrypted);
  return result;
}

function variantFromRow(row: any): ProductVariant {
  return {
    id: row.id,
    title: row.title,
    titleAr: row.title_ar,
    sku: row.sku,
    supplierSku: optionalString(row.supplier_sku),
    color: optionalString(row.color),
    size: optionalString(row.size),
    priceDelta: numberValue(row.price_delta),
    stock: numberValue(row.stock)
  };
}

function productFromRow(row: any): Product {
  const variants = (row.product_variants || []).filter((v: any) => v.is_active !== false).map(variantFromRow);
  return {
    id: row.id,
    title: row.title,
    titleAr: row.title_ar,
    description: row.description || '',
    descriptionAr: row.description_ar || '',
    category: row.category,
    categoryAr: row.category_ar,
    images: row.images || [],
    sellingPrice: numberValue(row.selling_price),
    supplierCost: numberValue(row.supplier_cost),
    currency: row.currency as Currency,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name || '',
    supplierProductId: optionalString(row.supplier_product_id),
    supplierSku: optionalString(row.supplier_sku),
    sku: row.sku,
    variants,
    stockQuantity: numberValue(row.stock_quantity),
    syncStatus: row.sync_status,
    isActive: Boolean(row.is_active),
    rating: numberValue(row.rating, 5),
    reviewsCount: numberValue(row.reviews_count),
    tags: row.tags || [],
    weightKg: row.weight_kg === null || row.weight_kg === undefined ? undefined : numberValue(row.weight_kg),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function itemFromRow(row: any): OrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: optionalString(row.variant_id),
    title: row.title,
    titleAr: row.title_ar,
    variantTitle: optionalString(row.variant_title),
    sku: row.sku,
    quantity: numberValue(row.quantity),
    unitPrice: numberValue(row.unit_price),
    unitCost: numberValue(row.unit_cost),
    totalPrice: numberValue(row.total_price),
    totalCost: numberValue(row.total_cost),
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    supplierProductId: optionalString(row.supplier_product_id),
    image: row.image || ''
  };
}

function orderFromRows(row: any, itemRows: any[], suborderRows: any[]): Order {
  const items = itemRows.map(itemFromRow);
  const subOrders: FulfillmentSubOrder[] = suborderRows.map((s) => ({
    id: s.id,
    orderId: s.order_id,
    supplierId: s.supplier_id,
    supplierName: s.supplier_name,
    status: s.status,
    externalOrderId: optionalString(s.external_order_id),
    trackingNumber: optionalString(s.tracking_number),
    trackingCarrier: optionalString(s.tracking_carrier),
    trackingUrl: optionalString(s.tracking_url),
    items: itemRows.filter((i) => i.fulfillment_suborder_id === s.id).map(itemFromRow),
    subtotalCost: numberValue(s.subtotal_cost),
    shippingCost: numberValue(s.shipping_cost),
    supplierEstimatedDelivery: optionalString(s.supplier_estimated_delivery),
    submissionAttempts: numberValue(s.submission_attempts),
    lastAttemptAt: optionalString(s.last_attempt_at),
    lastError: optionalString(s.last_error),
    idempotencyKey: s.idempotency_key,
    notes: optionalString(s.notes),
    createdAt: s.created_at,
    updatedAt: s.updated_at
  }));
  return {
    id: row.id,
    orderNumber: row.order_number,
    trackingCode: row.tracking_code,
    customer: { fullName: row.customer_name, phone: row.customer_phone, email: row.customer_email || '' },
    shippingAddress: {
      fullName: row.customer_name,
      phone: row.customer_phone,
      secondaryPhone: optionalString(row.shipping_secondary_phone),
      country: row.shipping_country,
      governorateOrState: row.shipping_governorate,
      city: row.shipping_city,
      streetAddress: row.shipping_address_line,
      buildingNumber: optionalString(row.shipping_building_number),
      apartment: optionalString(row.shipping_apartment),
      postalCode: optionalString(row.shipping_postal_code),
      notes: optionalString(row.shipping_notes)
    },
    items,
    subOrders,
    currency: row.currency as Currency,
    subtotal: numberValue(row.subtotal),
    shippingFee: numberValue(row.shipping_fee),
    discount: numberValue(row.discount),
    codFee: numberValue(row.cod_fee),
    totalAmount: numberValue(row.total_amount),
    paymentMethod: row.payment_method,
    status: row.status,
    financialMetrics: {
      totalSellingPrice: numberValue(row.total_selling_price),
      totalSupplierCost: numberValue(row.total_supplier_cost),
      shippingCostToVyro: numberValue(row.shipping_cost_to_vyro),
      expectedProfit: numberValue(row.expected_profit),
      realizedProfit: numberValue(row.realized_profit),
      codCollected: Boolean(row.cod_collected),
      settlementStatus: row.settlement_status as SettlementStatus
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function safeLogText(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  return value
    .replace(/(authorization|api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .slice(0, 500);
}

function safeEndpoint(value: unknown): string {
  if (typeof value !== 'string') return 'unknown';
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return value.split('?')[0].slice(0, 500);
  }
}

function settlementFromRow(row: any): SupplierSettlement {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    ordersCount: numberValue(row.orders_count),
    totalProductCost: numberValue(row.total_product_cost),
    totalShippingCost: numberValue(row.total_shipping_cost),
    codFeesDeducted: numberValue(row.cod_fees_deducted),
    netSettlementDue: numberValue(row.net_settlement_due),
    status: row.status,
    payoutDate: optionalString(row.payout_date),
    referenceNumber: optionalString(row.reference_number),
    notes: optionalString(row.notes)
  };
}

function productPayload(value: any): Record<string, unknown> {
  return {
    id: value.id,
    title: String(value.title || '').trim(),
    titleAr: String(value.titleAr || '').trim(),
    description: String(value.description || ''),
    descriptionAr: String(value.descriptionAr || ''),
    category: String(value.category || 'Other'),
    categoryAr: String(value.categoryAr || 'أخرى'),
    images: Array.isArray(value.images) ? value.images.filter((x: unknown) => typeof x === 'string') : [],
    sellingPrice: numberValue(value.sellingPrice, -1),
    supplierCost: numberValue(value.supplierCost, -1),
    currency: value.currency || 'EGP',
    supplierId: String(value.supplierId || ''),
    supplierProductId: value.supplierProductId || null,
    supplierSku: value.supplierSku || null,
    sku: String(value.sku || '').trim(),
    variants: Array.isArray(value.variants) ? value.variants : [],
    stockQuantity: numberValue(value.stockQuantity, -1),
    syncStatus: value.syncStatus || 'local_only',
    isActive: value.isActive !== false,
    rating: numberValue(value.rating, 5),
    reviewsCount: numberValue(value.reviewsCount),
    tags: Array.isArray(value.tags) ? value.tags.filter((x: unknown) => typeof x === 'string') : [],
    weightKg: value.weightKg ?? null
  };
}

export class SupabaseDatabase {
  constructor() {
    AdapterRegistry.getInstance().setLogSubscriber((log) => this.addLog(log));
  }

  async getSuppliers(): Promise<SupplierConfig[]> {
    const { data, error } = await getAdminClient().from('suppliers').select('*').order('name', { ascending: true }).limit(1000);
    ensureNoError(error, 'load suppliers');
    return (data || []).map((row: any) => {
      const supplier = supplierFromRow(row, false);
      AdapterRegistry.getInstance().register(supplier);
      return supplier;
    });
  }

  async getSupplierById(id: string): Promise<SupplierConfig | undefined> {
    const { data, error } = await getAdminClient().from('suppliers').select('*').eq('id', id).maybeSingle();
    ensureNoError(error, 'load supplier');
    if (!data) return undefined;
    const supplier = supplierFromRow(data, true);
    AdapterRegistry.getInstance().register(supplier);
    return supplier;
  }

  async updateSupplier(id: string, updates: Partial<SupplierConfig>): Promise<SupplierConfig> {
    const current = await this.getSupplierById(id);
    if (!current) throw new Error(`Supplier ${id} not found.`);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) patch.name = String(updates.name).trim();
    if (updates.code !== undefined) patch.code = String(updates.code).trim();
    if (updates.integrationType !== undefined) patch.integration_type = updates.integrationType;
    if (updates.baseUrl !== undefined) patch.base_url = validateSupplierUrl(updates.baseUrl) || null;
    if (updates.authMethod !== undefined) patch.auth_method = updates.authMethod;
    if (updates.countryCode !== undefined) patch.country_code = updates.countryCode;
    if (updates.currency !== undefined) patch.currency = updates.currency;
    if (updates.status !== undefined) patch.status = updates.status;
    if (updates.capabilities !== undefined) patch.capabilities = updates.capabilities;
    if (updates.settings !== undefined) patch.settings = { ...current.settings, ...updates.settings };
    if (updates.contactEmail !== undefined) patch.contact_email = updates.contactEmail || null;
    if (updates.contactPhone !== undefined) patch.contact_phone = updates.contactPhone || null;
    if (updates.notes !== undefined) patch.notes = updates.notes || null;
    if (updates.lastSyncAt !== undefined) patch.last_sync_at = updates.lastSyncAt || null;
    if (updates.lastHealthCheckAt !== undefined) patch.last_health_check_at = updates.lastHealthCheckAt || null;
    if (updates.lastHealthStatus !== undefined) patch.last_health_status = updates.lastHealthStatus || null;
    if (updates.lastHealthMessage !== undefined) patch.last_health_message = safeLogText(updates.lastHealthMessage) || null;
    if (updates.apiKeySecret) {
      patch.api_key_encrypted = encryptSecret(updates.apiKeySecret);
      patch.api_key_masked = maskSecret(updates.apiKeySecret);
    }
    const { data, error } = await getAdminClient().from('suppliers').update(patch).eq('id', id).select('*').single();
    ensureNoError(error, 'update supplier');
    const updated = supplierFromRow(data, false);
    AdapterRegistry.getInstance().register({ ...updated, apiKeySecret: updates.apiKeySecret || current.apiKeySecret });
    return updated;
  }

  async createSupplier(supplierData: Omit<SupplierConfig, 'id'>): Promise<SupplierConfig> {
    const secret = supplierData.apiKeySecret || '';
    const id = `sup-${randomUUID().replace(/-/g, '').slice(0, 18)}`;
    const row = {
      id,
      code: String(supplierData.code || '').trim(),
      name: String(supplierData.name || '').trim(),
      integration_type: supplierData.integrationType,
      base_url: validateSupplierUrl(supplierData.baseUrl) || null,
      auth_method: supplierData.authMethod || 'none',
      api_key_encrypted: secret ? encryptSecret(secret) : null,
      api_key_masked: secret ? maskSecret(secret) : null,
      country_code: supplierData.countryCode || 'EGY',
      currency: supplierData.currency || 'EGP',
      status: supplierData.status || 'unconfigured',
      capabilities: supplierData.capabilities || {},
      settings: {
        ...(supplierData.settings || {}),
        autoSubmitOrders: Boolean(supplierData.settings?.autoSubmitOrders),
        autoSyncInventory: Boolean(supplierData.settings?.autoSyncInventory),
        autoSyncPricing: Boolean(supplierData.settings?.autoSyncPricing)
      },
      contact_email: supplierData.contactEmail || null,
      contact_phone: supplierData.contactPhone || null,
      notes: supplierData.notes || null,
      last_sync_at: supplierData.lastSyncAt || null,
      last_health_check_at: supplierData.lastHealthCheckAt || null,
      last_health_status: supplierData.lastHealthStatus || null,
      last_health_message: safeLogText(supplierData.lastHealthMessage) || null
    };
    if (!row.code || !row.name) throw new Error('Supplier name and code are required.');
    const { data, error } = await getAdminClient().from('suppliers').insert(row).select('*').single();
    ensureNoError(error, 'create supplier');
    const created = supplierFromRow(data, false);
    AdapterRegistry.getInstance().register({ ...created, apiKeySecret: secret || undefined });
    return created;
  }

  async getProducts(filter?: ProductFilter): Promise<Product[]> {
    const isAdminQuery = filter?.activeOnly === false;
    const client = isAdminQuery ? getAdminClient() : getPublicClient();
    const select = isAdminQuery ? ADMIN_PRODUCT_SELECT : PUBLIC_PRODUCT_SELECT;
    let query = client.from('products').select(select).order('created_at', { ascending: false }).limit(1000);
    if (!isAdminQuery) query = query.eq('is_active', true);
    if (filter?.supplierId && filter.supplierId !== 'all') query = query.eq('supplier_id', filter.supplierId);
    const { data, error } = await query;
    ensureNoError(error, 'load products');
    let products = (data || []).map(productFromRow);
    if (filter?.activeOnly) products = products.filter((p) => p.isActive);
    if (filter?.category && filter.category !== 'all') {
      products = products.filter((p) => p.category.toLowerCase() === filter.category!.toLowerCase() || p.categoryAr === filter.category);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      products = products.filter((p) => p.title.toLowerCase().includes(q) || p.titleAr.includes(q) || p.sku.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return products;
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const { data, error } = await getPublicClient().from('products').select(PUBLIC_PRODUCT_SELECT).eq('id', id).eq('is_active', true).maybeSingle();
    ensureNoError(error, 'load product');
    return data ? productFromRow(data) : undefined;
  }

  private async getAdminProductById(id: string): Promise<Product | undefined> {
    const { data, error } = await getAdminClient().from('products').select(ADMIN_PRODUCT_SELECT).eq('id', id).maybeSingle();
    ensureNoError(error, 'load product');
    return data ? productFromRow(data) : undefined;
  }

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const payload = productPayload(data);
    if (numberValue(payload.sellingPrice, -1) < 0 || numberValue(payload.supplierCost, -1) < 0 || numberValue(payload.stockQuantity, -1) < 0) {
      throw new Error('Product prices and stock must be non-negative.');
    }
    const { data: id, error } = await getAdminClient().rpc('save_vyro_product', { p_product: payload });
    ensureNoError(error, 'save product');
    const product = await this.getAdminProductById(String(id));
    if (!product) throw new Error('The product was saved but could not be reloaded.');
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const current = await this.getAdminProductById(id);
    if (!current) throw new Error(`Product ${id} not found.`);
    const merged = productPayload({ ...current, ...updates, id });
    if (numberValue(merged.sellingPrice, -1) < 0 || numberValue(merged.supplierCost, -1) < 0 || numberValue(merged.stockQuantity, -1) < 0) {
      throw new Error('Product prices and stock must be non-negative.');
    }
    const { error } = await getAdminClient().rpc('save_vyro_product', { p_product: merged });
    ensureNoError(error, 'update product');
    const product = await this.getAdminProductById(id);
    if (!product) throw new Error('The product was updated but could not be reloaded.');
    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const { data, error } = await getAdminClient().from('products').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id).select('id');
    ensureNoError(error, 'deactivate product');
    return Boolean(data?.length);
  }

  async createOrder(payload: {
    customer: { fullName: string; phone: string; email: string };
    shippingAddress: Order['shippingAddress'];
    cartItems: { productId: string; variantId?: string; quantity: number }[];
    paymentMethod: 'cod';
    couponCode?: string;
  }, idempotencyKey?: string): Promise<CreatedOrder> {
    const key = String(idempotencyKey || randomUUID()).slice(0, 128);
    const { data, error } = await getPublicClient().rpc('create_vyro_order', {
      p_customer: payload.customer,
      p_shipping: payload.shippingAddress,
      p_cart_items: payload.cartItems,
      p_coupon_code: payload.couponCode || null,
      p_idempotency_key: key
    });
    ensureNoError(error, 'place order');
    if (!data || typeof data !== 'object') throw new Error('Order service returned an invalid response.');
    return {
      orderNumber: String((data as any).orderNumber),
      trackingCode: String((data as any).trackingCode),
      status: (data as any).status,
      totalAmount: numberValue((data as any).totalAmount),
      createdAt: String((data as any).createdAt)
    };
  }

  async getOrders(): Promise<Order[]> {
    const client = getAdminClient();
    const { data, error } = await client.from('orders').select('*').order('created_at', { ascending: false }).limit(1000);
    ensureNoError(error, 'load orders');
    return this.loadOrderRows(data || [], client);
  }

  private async loadOrderRows(rows: any[], client: SupabaseClient): Promise<Order[]> {
    if (!rows.length) return [];
    const ids = rows.map((r) => r.id);
    const [itemsResult, subordersResult] = await Promise.all([
      client.from('order_items').select('*').in('order_id', ids),
      client.from('fulfillment_suborders').select('*').in('order_id', ids).order('created_at', { ascending: true })
    ]);
    ensureNoError(itemsResult.error, 'load order items');
    ensureNoError(subordersResult.error, 'load fulfillment records');
    const items = itemsResult.data || [];
    const suborders = subordersResult.data || [];
    return rows.map((row) => orderFromRows(row, items.filter((i: any) => i.order_id === row.id), suborders.filter((s: any) => s.order_id === row.id)));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const client = getAdminClient();
    let row: any;
    for (const column of ['id', 'order_number', 'tracking_code']) {
      const result = await client.from('orders').select('*').eq(column, id).maybeSingle();
      ensureNoError(result.error, 'load order');
      if (result.data) { row = result.data; break; }
    }
    if (!row) return undefined;
    const orders = await this.loadOrderRows([row], client);
    return orders[0];
  }

  async getOrderByTracking(code: string, phone?: string): Promise<TrackingOrder | undefined> {
    if (!phone || phone.replace(/\D/g, '').length < 10) return undefined;
    const { data, error } = await getPublicClient().rpc('track_vyro_order', { p_code: code, p_phone: phone });
    ensureNoError(error, 'track order');
    return data ? data as TrackingOrder : undefined;
  }

  async updateSubOrderStatus(
    orderId: string,
    subOrderId: string,
    status: FulfillmentSubOrder['status'],
    tracking?: SubOrderUpdates
  ): Promise<Order> {
    const allowed = new Set<FulfillmentSubOrder['status']>(['pending_submission', 'submitted', 'in_manual_queue', 'acknowledged', 'processing', 'shipped', 'delivered', 'failed_submission', 'cancelled']);
    if (!allowed.has(status)) throw new Error('Invalid fulfillment status.');
    const client = getAdminClient();
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (tracking?.trackingNumber !== undefined) patch.tracking_number = tracking.trackingNumber || null;
    if (tracking?.carrier !== undefined) patch.tracking_carrier = tracking.carrier || null;
    if (tracking?.trackingUrl !== undefined) patch.tracking_url = tracking.trackingUrl || null;
    if (tracking?.externalOrderId !== undefined) patch.external_order_id = tracking.externalOrderId || null;
    if (tracking?.supplierEstimatedDelivery !== undefined) patch.supplier_estimated_delivery = tracking.supplierEstimatedDelivery || null;
    if (tracking?.lastError !== undefined) patch.last_error = safeLogText(tracking.lastError) || null;
    if (tracking?.notes !== undefined) patch.notes = safeLogText(tracking.notes) || null;
    if (tracking?.submissionAttempts !== undefined) patch.submission_attempts = Math.max(0, Math.floor(tracking.submissionAttempts));
    if (tracking?.lastAttemptAt !== undefined) patch.last_attempt_at = tracking.lastAttemptAt || null;
    const { data: sub, error } = await client.from('fulfillment_suborders').update(patch).eq('id', subOrderId).eq('order_id', orderId).select('id').maybeSingle();
    ensureNoError(error, 'update fulfillment status');
    if (!sub) throw new Error(`Sub-order ${subOrderId} not found.`);
    const { data: suborders, error: subsError } = await client.from('fulfillment_suborders').select('status').eq('order_id', orderId);
    ensureNoError(subsError, 'refresh fulfillment status');
    const statuses = (suborders || []).map((x: any) => x.status);
    const orderPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (statuses.length && statuses.every((x: string) => x === 'delivered')) {
      const order = await this.getOrderById(orderId);
      if (!order) throw new Error(`Order ${orderId} not found.`);
      orderPatch.status = 'delivered';
      orderPatch.realized_profit = order.financialMetrics.expectedProfit;
      orderPatch.cod_collected = true;
    } else if (statuses.some((x: string) => x === 'shipped' || x === 'delivered')) {
      orderPatch.status = 'shipped';
    }
    const { error: orderError } = await client.from('orders').update(orderPatch).eq('id', orderId);
    ensureNoError(orderError, 'update order status');
    const updated = await this.getOrderById(orderId);
    if (!updated) throw new Error(`Order ${orderId} not found.`);
    return updated;
  }

  async getLogs(limit = 50, supplierId?: string): Promise<IntegrationLog[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.floor(Number(limit) || 50)));
    let query = getAdminClient().from('integration_logs')
      .select('id,supplier_id,supplier_name,endpoint,method,action,status_code,duration_ms,status,error_message,idempotency_key,created_at')
      .order('created_at', { ascending: false }).limit(safeLimit);
    if (supplierId && supplierId !== 'all') query = query.eq('supplier_id', supplierId);
    const { data, error } = await query;
    ensureNoError(error, 'load integration logs');
    return (data || []).map((row: any) => ({
      id: row.id,
      timestamp: row.created_at,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      endpoint: row.endpoint,
      method: row.method,
      action: row.action,
      statusCode: numberValue(row.status_code),
      durationMs: numberValue(row.duration_ms),
      status: row.status,
      errorMessage: optionalString(row.error_message),
      idempotencyKey: optionalString(row.idempotency_key)
    }));
  }

  async addLog(log: IntegrationLog): Promise<void> {
    const { error } = await getAdminClient().from('integration_logs').insert({
      id: log.id || `log-${randomUUID().replace(/-/g, '')}`,
      supplier_id: log.supplierId,
      supplier_name: log.supplierName,
      endpoint: safeEndpoint(log.endpoint),
      method: log.method,
      action: log.action,
      status_code: log.statusCode,
      duration_ms: Math.max(0, Math.floor(log.durationMs)),
      status: log.status,
      // Do not retain request/response bodies: they can contain credentials or customer data.
      request_payload: null,
      response_payload: null,
      error_message: safeLogText(log.errorMessage) || null,
      idempotency_key: log.idempotencyKey || null,
      created_at: log.timestamp || new Date().toISOString()
    });
    ensureNoError(error, 'save integration log');
  }

  async getSettlements(): Promise<SupplierSettlement[]> {
    const { data, error } = await getAdminClient().from('supplier_settlements').select('*').order('created_at', { ascending: false }).limit(1000);
    ensureNoError(error, 'load settlements');
    return (data || []).map(settlementFromRow);
  }

  async createSettlement(data: Omit<SupplierSettlement, 'id'>): Promise<SupplierSettlement> {
    const row = {
      id: `set-${randomUUID().replace(/-/g, '')}`,
      supplier_id: data.supplierId,
      supplier_name: data.supplierName,
      period_start: data.periodStart,
      period_end: data.periodEnd,
      orders_count: Math.max(0, Math.floor(numberValue(data.ordersCount))),
      total_product_cost: numberValue(data.totalProductCost),
      total_shipping_cost: numberValue(data.totalShippingCost),
      cod_fees_deducted: numberValue(data.codFeesDeducted),
      net_settlement_due: numberValue(data.netSettlementDue),
      status: data.status,
      payout_date: data.payoutDate || null,
      reference_number: data.referenceNumber || null,
      notes: data.notes || null
    };
    const { data: created, error } = await getAdminClient().from('supplier_settlements').insert(row).select('*').single();
    ensureNoError(error, 'create settlement');
    return settlementFromRow(created);
  }

  async updateSettlementStatus(id: string, status: SupplierSettlement['status'], ref?: string): Promise<SupplierSettlement> {
    const allowed = new Set<SettlementStatus>(['pending', 'reconciled', 'settled', 'disputed']);
    if (!allowed.has(status)) throw new Error('Invalid settlement status.');
    const patch: Record<string, unknown> = { status };
    if (ref !== undefined) patch.reference_number = ref || null;
    if (status === 'settled') patch.payout_date = new Date().toISOString();
    const { data, error } = await getAdminClient().from('supplier_settlements').update(patch).eq('id', id).select('*').maybeSingle();
    ensureNoError(error, 'update settlement');
    if (!data) throw new Error('Settlement not found.');
    return settlementFromRow(data);
  }
}
