import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../database.ts';
import { AdapterRegistry } from '../adapters/AdapterRegistry.ts';
import { requireAdmin } from '../auth.ts';

export const apiRouter = Router();

apiRouter.use('/suppliers', requireAdmin);
apiRouter.use('/fulfillment', requireAdmin);
apiRouter.use('/settlements', requireAdmin);
apiRouter.use('/logs', requireAdmin);
apiRouter.use('/stats', requireAdmin);

const toPublicProduct = (product: any) => {
  const {
    supplierCost: _supplierCost,
    supplierProductId: _supplierProductId,
    supplierSku: _supplierSku,
    ...safeProduct
  } = product;
  return {
    ...safeProduct,
    variants: (product.variants || []).map((variant: any) => {
      const { supplierSku: _variantSupplierSku, ...safeVariant } = variant;
      return safeVariant;
    })
  };
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

// Suppliers management
apiRouter.get('/suppliers', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await db.getSuppliers() });
  } catch (error) {
    res.status(503).json({ success: false, error: errorMessage(error, 'Could not load suppliers.') });
  }
});

apiRouter.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const created = await db.createSupplier(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, error: errorMessage(error, 'Could not create supplier.') });
  }
});

apiRouter.patch('/suppliers/:id', async (req: Request, res: Response) => {
  try {
    const updated = await db.updateSupplier(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: errorMessage(error, 'Could not update supplier.') });
  }
});

apiRouter.post('/suppliers/:id/test', async (req: Request, res: Response) => {
  let supplier;
  try {
    supplier = await db.getSupplierById(req.params.id);
  } catch (error) {
    return res.status(503).json({ success: false, error: errorMessage(error, 'Could not load supplier.') });
  }
  if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found.' });
  const registry = AdapterRegistry.getInstance();
  const adapter = registry.getAdapter(supplier);
  const startTime = Date.now();
  try {
    const result = await adapter.testConnection();
    const durationMs = Date.now() - startTime;
    await registry.recordLog({
      supplierId: supplier.id,
      supplierName: supplier.name,
      endpoint: supplier.baseUrl ? `${supplier.baseUrl}/auth/verify` : 'internal://queue',
      method: 'GET',
      action: 'test_connection',
      statusCode: result.statusCode,
      durationMs,
      status: result.success ? 'success' : 'failure',
      responsePayload: undefined,
      errorMessage: result.success ? undefined : result.message
    });
    await db.updateSupplier(supplier.id, {
      lastHealthCheckAt: new Date().toISOString(),
      lastHealthStatus: result.success ? 'ok' : 'error',
      lastHealthMessage: `${result.statusCode}: ${result.message}`,
      status: result.success ? 'active' : (supplier.integrationType === 'manual' ? 'active' : 'degraded')
    });
    return res.json({ success: true, result });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await registry.recordLog({
      supplierId: supplier.id,
      supplierName: supplier.name,
      endpoint: supplier.baseUrl || 'internal://supplier',
      method: 'GET',
      action: 'test_connection',
      statusCode: 500,
      durationMs,
      status: 'failure',
      errorMessage: errorMessage(error, 'Connection test failed.')
    }).catch(() => undefined);
    await db.updateSupplier(supplier.id, {
      lastHealthCheckAt: new Date().toISOString(),
      lastHealthStatus: 'error',
      lastHealthMessage: errorMessage(error, 'Connection test failed.'),
      status: 'disconnected'
    }).catch(() => undefined);
    return res.status(500).json({ success: false, error: errorMessage(error, 'Connection test failed.') });
  }
});

apiRouter.post('/suppliers/:id/sync', async (req: Request, res: Response) => {
  try {
    const supplier = await db.getSupplierById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found.' });
    if (!supplier.capabilities.supportsProductSync && !supplier.capabilities.supportsInventorySync) {
      return res.json({ success: true, message: 'Manual supplier inventory is managed locally in VYRO.', syncedItemsCount: 0 });
    }
    const adapter = AdapterRegistry.getInstance().getAdapter(supplier);
    const products = await adapter.fetchProducts({ page: 1, limit: 10 });
    await db.updateSupplier(supplier.id, { lastSyncAt: new Date().toISOString() });
    return res.json({ success: true, message: `Fetched ${products.length} products from ${supplier.name}.`, products });
  } catch (error) {
    return res.status(400).json({ success: false, error: errorMessage(error, 'Supplier sync failed.') });
  }
});

// Product catalog: active products are public; inactive products require admin auth.
apiRouter.get('/products', (req: Request, res: Response, next) => {
  if (req.query.activeOnly === 'false') return requireAdmin(req, res, next);
  next();
}, async (req: Request, res: Response) => {
  try {
    const { category, supplierId, search, activeOnly } = req.query;
    const products = await db.getProducts({
      category: category as string,
      supplierId: supplierId as string,
      search: search as string,
      activeOnly: activeOnly !== 'false'
    });
    const data = activeOnly === 'false' ? products : products.map(toPublicProduct);
    res.json({ success: true, count: products.length, data });
  } catch (error) {
    res.status(503).json({ success: false, error: errorMessage(error, 'Could not load products.') });
  }
});

apiRouter.get('/products/:id', async (req: Request, res: Response) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found.' });
    return res.json({ success: true, data: toPublicProduct(product) });
  } catch (error) {
    return res.status(503).json({ success: false, error: errorMessage(error, 'Could not load product.') });
  }
});

apiRouter.post('/products', requireAdmin, async (req: Request, res: Response) => {
  try {
    const created = await db.createProduct(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, error: errorMessage(error, 'Could not create product.') });
  }
});

apiRouter.patch('/products/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const updated = await db.updateProduct(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: errorMessage(error, 'Could not update product.') });
  }
});

apiRouter.delete('/products/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const deleted = await db.deleteProduct(req.params.id);
    res.json({ success: deleted });
  } catch (error) {
    res.status(400).json({ success: false, error: errorMessage(error, 'Could not deactivate product.') });
  }
});

// Public checkout uses a transaction-safe Supabase RPC; prices and stock are revalidated in Postgres.
apiRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const { customer, shippingAddress, cartItems, paymentMethod, couponCode } = req.body || {};
    if (paymentMethod !== undefined && paymentMethod !== 'cod') {
      return res.status(400).json({ success: false, error: 'Card payments are not available yet.' });
    }
    if (!customer || !String(customer.fullName || '').trim() || String(customer.phone || '').replace(/\D/g, '').length < 10) {
      return res.status(400).json({ success: false, error: 'Customer name and a valid phone number are required.' });
    }
    if (!shippingAddress || !String(shippingAddress.city || '').trim() || !String(shippingAddress.streetAddress || '').trim()) {
      return res.status(400).json({ success: false, error: 'Complete shipping address is required.' });
    }
    if (!Array.isArray(cartItems) || cartItems.length === 0 || cartItems.length > 100) {
      return res.status(400).json({ success: false, error: 'Cart must contain between 1 and 100 items.' });
    }
    const idempotencyKey = (req.header('Idempotency-Key') || randomUUID()).slice(0, 128);
    const order = await db.createOrder({
      customer: {
        fullName: String(customer.fullName).trim(),
        phone: String(customer.phone).trim(),
        email: String(customer.email || '').trim()
      },
      shippingAddress,
      cartItems,
      paymentMethod: 'cod',
      couponCode: typeof couponCode === 'string' ? couponCode : undefined
    }, idempotencyKey);
    return res.status(201).json({ success: true, message: 'Order placed successfully.', data: order });
  } catch (error) {
    const message = errorMessage(error, 'Could not place order.');
    const clientError = /required|unavailable|stock|quantity|invalid|coupon|product/i.test(message);
    return res.status(clientError ? 400 : 503).json({ success: false, error: message });
  }
});

apiRouter.get('/orders', requireAdmin, async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await db.getOrders() });
  } catch (error) {
    res.status(503).json({ success: false, error: errorMessage(error, 'Could not load orders.') });
  }
});

apiRouter.get('/orders/track/:code', async (req: Request, res: Response) => {
  const phone = (req.query.phone as string | undefined)?.trim();
  if (!phone) return res.status(400).json({ success: false, error: 'The phone number used for the order is required.' });
  try {
    const order = await db.getOrderByTracking(req.params.code, phone);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found. Please check your tracking code or phone number.' });
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(503).json({ success: false, error: errorMessage(error, 'Could not track this order.') });
  }
});

apiRouter.get('/orders/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const order = await db.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(503).json({ success: false, error: errorMessage(error, 'Could not load order.') });
  }
});

// Fulfillment status updates and supplier retry actions
apiRouter.post('/fulfillment/sub-orders/:orderId/:subOrderId/status', async (req: Request, res: Response) => {
  try {
    const { orderId, subOrderId } = req.params;
    const { status, trackingNumber, carrier, trackingUrl, notes } = req.body;
    const updated = await db.updateSubOrderStatus(orderId, subOrderId, status, { trackingNumber, carrier, trackingUrl, notes });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: errorMessage(error, 'Could not update fulfillment status.') });
  }
});

apiRouter.post('/fulfillment/sub-orders/:orderId/:subOrderId/retry', async (req: Request, res: Response) => {
  try {
    const { orderId, subOrderId } = req.params;
    const order = await db.getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });
    const subOrder = order.subOrders.find((s) => s.id === subOrderId);
    if (!subOrder) return res.status(404).json({ success: false, error: 'Sub-order not found.' });
    const supplier = await db.getSupplierById(subOrder.supplierId);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found.' });
    const attempt = subOrder.submissionAttempts + 1;
    const now = new Date().toISOString();
    const adapter = AdapterRegistry.getInstance().getAdapter(supplier);
    const result = await adapter.submitOrder({
      vyroOrderId: order.orderNumber,
      subOrderId,
      idempotencyKey: `${subOrder.idempotencyKey}-retry-${attempt}`,
      shippingAddress: order.shippingAddress,
      customer: order.customer,
      items: subOrder.items,
      codAmountToCollect: order.paymentMethod === 'cod' ? subOrder.items.reduce((sum, item) => sum + item.totalPrice, 0) : 0,
      currency: supplier.currency,
      notes: 'Retry submission from VYRO Admin'
    });
    const updatedOrder = await db.updateSubOrderStatus(orderId, subOrderId, result.success ? 'submitted' : 'in_manual_queue', {
      submissionAttempts: attempt,
      lastAttemptAt: now,
      externalOrderId: result.externalOrderId,
      trackingNumber: result.trackingNumber,
      carrier: result.trackingCarrier,
      trackingUrl: result.trackingUrl,
      supplierEstimatedDelivery: result.estimatedDelivery,
      lastError: result.success ? '' : result.message
    });
    const updatedSubOrder = updatedOrder.subOrders.find((s) => s.id === subOrderId);
    return res.json({ success: result.success, result, subOrder: updatedSubOrder });
  } catch (error) {
    return res.status(500).json({ success: false, error: errorMessage(error, 'Could not retry supplier submission.') });
  }
});

// Supplier settlements
apiRouter.get('/settlements', async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: await db.getSettlements() });
  } catch (error) {
    res.status(503).json({ success: false, error: errorMessage(error, 'Could not load settlements.') });
  }
});

apiRouter.post('/settlements', async (req: Request, res: Response) => {
  try {
    const created = await db.createSettlement(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    res.status(400).json({ success: false, error: errorMessage(error, 'Could not create settlement.') });
  }
});

apiRouter.patch('/settlements/:id/status', async (req: Request, res: Response) => {
  try {
    const updated = await db.updateSettlementStatus(req.params.id, req.body?.status, req.body?.referenceNumber);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: errorMessage(error, 'Could not update settlement.') });
  }
});

// Redacted integration audit log
apiRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const supplierId = req.query.supplierId as string | undefined;
    const logs = await db.getLogs(limit, supplierId);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    res.status(503).json({ success: false, error: errorMessage(error, 'Could not load integration logs.') });
  }
});

// Analytics
apiRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [orders, suppliers, products] = await Promise.all([
      db.getOrders(),
      db.getSuppliers(),
      db.getProducts({ activeOnly: false })
    ]);
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalSupplierCost = orders.reduce((sum, order) => sum + order.financialMetrics.totalSupplierCost, 0);
    const expectedProfit = orders.reduce((sum, order) => sum + order.financialMetrics.expectedProfit, 0);
    const realizedProfit = orders.reduce((sum, order) => sum + order.financialMetrics.realizedProfit, 0);
    let queuedSubOrders = 0;
    let submittedSubOrders = 0;
    let deliveredSubOrders = 0;
    for (const order of orders) {
      for (const subOrder of order.subOrders) {
        if (subOrder.status === 'in_manual_queue' || subOrder.status === 'pending_submission') queuedSubOrders++;
        else if (subOrder.status === 'submitted' || subOrder.status === 'shipped') submittedSubOrders++;
        else if (subOrder.status === 'delivered') deliveredSubOrders++;
      }
    }
    res.json({
      success: true,
      data: {
        totalRevenue,
        totalSupplierCost,
        expectedProfit,
        realizedProfit,
        profitMarginPct: totalRevenue > 0 ? Math.round((expectedProfit / totalRevenue) * 100) : 0,
        ordersCount: orders.length,
        productsCount: products.length,
        suppliersCount: suppliers.length,
        activeSuppliers: suppliers.filter((supplier) => supplier.status === 'active').length,
        degradedSuppliers: suppliers.filter((supplier) => supplier.status === 'degraded' || supplier.status === 'disconnected').length,
        fulfillmentQueue: { queued: queuedSubOrders, submitted: submittedSubOrders, delivered: deliveredSubOrders }
      }
    });
  } catch (error) {
    res.status(503).json({ success: false, error: errorMessage(error, 'Could not load analytics.') });
  }
});
