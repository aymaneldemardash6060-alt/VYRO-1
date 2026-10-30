/**
 * VYRO Commerce — Unified Express API Router
 * 
 * Provides all server-side endpoints for:
 * - Suppliers Management & Adapter Health Checks
 * - Tamper-Proof Order Placement & Tracking
 * - Multi-Supplier Fulfillment Routing
 * - Inventory & Price Synchronization
 * - Financial Settlements & Audit Logs
 */

import { Router, Request, Response } from 'express';
import { db } from '../database.ts';
import { AdapterRegistry } from '../adapters/AdapterRegistry.ts';

export const apiRouter = Router();

// ==========================================
// 1. SUPPLIERS MANAGEMENT & TEST CONNECTION
// ==========================================

apiRouter.get('/suppliers', (req: Request, res: Response) => {
  try {
    const suppliers = db.getSuppliers();
    res.json({ success: true, data: suppliers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/suppliers', (req: Request, res: Response) => {
  try {
    const newSupplier = db.createSupplier(req.body);
    res.status(201).json({ success: true, data: newSupplier });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.patch('/suppliers/:id', (req: Request, res: Response) => {
  try {
    const updated = db.updateSupplier(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.post('/suppliers/:id/test', async (req: Request, res: Response) => {
  const supplierId = req.params.id;
  const supplier = db.getSupplierById(supplierId);

  if (!supplier) {
    return res.status(404).json({ success: false, error: `Supplier ${supplierId} not found` });
  }

  const registry = AdapterRegistry.getInstance();
  const adapter = registry.getAdapter(supplier);
  const startTime = Date.now();

  try {
    const result = await adapter.testConnection();
    const durationMs = Date.now() - startTime;

    // Record in database audit logs
    registry.recordLog({
      supplierId: supplier.id,
      supplierName: supplier.name,
      endpoint: supplier.baseUrl ? `${supplier.baseUrl}/auth/verify` : 'internal://queue',
      method: 'GET',
      action: 'test_connection',
      statusCode: result.statusCode,
      durationMs,
      status: result.success ? 'success' : 'failure',
      responsePayload: result,
      errorMessage: result.success ? undefined : result.message
    });

    // Update supplier health in DB
    db.updateSupplier(supplier.id, {
      lastHealthCheckAt: new Date().toISOString(),
      lastHealthStatus: result.success ? 'ok' : 'error',
      lastHealthMessage: `${result.statusCode}: ${result.message}`,
      status: result.success ? 'active' : (supplier.integrationType === 'manual' ? 'active' : 'degraded')
    });

    res.json({ success: true, result });
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    registry.recordLog({
      supplierId: supplier.id,
      supplierName: supplier.name,
      endpoint: supplier.baseUrl || 'internal',
      method: 'GET',
      action: 'test_connection',
      statusCode: 500,
      durationMs,
      status: 'failure',
      errorMessage: err.message
    });

    db.updateSupplier(supplier.id, {
      lastHealthCheckAt: new Date().toISOString(),
      lastHealthStatus: 'error',
      lastHealthMessage: err.message,
      status: 'disconnected'
    });

    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/suppliers/:id/sync', async (req: Request, res: Response) => {
  const supplier = db.getSupplierById(req.params.id);
  if (!supplier) {
    return res.status(404).json({ success: false, error: 'Supplier not found' });
  }

  const adapter = AdapterRegistry.getInstance().getAdapter(supplier);
  try {
    if (!supplier.capabilities.supportsProductSync && !supplier.capabilities.supportsInventorySync) {
      return res.json({ 
        success: true, 
        message: 'Manual supplier inventory managed locally in VYRO.',
        syncedItemsCount: 0
      });
    }

    // Attempt product fetch
    const products = await adapter.fetchProducts({ page: 1, limit: 10 });
    db.updateSupplier(supplier.id, { lastSyncAt: new Date().toISOString() });

    res.json({
      success: true,
      message: `Successfully synchronized ${products.length} products from ${supplier.name}.`,
      products
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. PRODUCT CATALOG (INDEPENDENT)
// ==========================================

apiRouter.get('/products', (req: Request, res: Response) => {
  try {
    const { category, supplierId, search, activeOnly } = req.query;
    const products = db.getProducts({
      category: category as string,
      supplierId: supplierId as string,
      search: search as string,
      activeOnly: activeOnly === 'true'
    });
    res.json({ success: true, count: products.length, data: products });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/products/:id', (req: Request, res: Response) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  res.json({ success: true, data: product });
});

apiRouter.post('/products', (req: Request, res: Response) => {
  try {
    const created = db.createProduct(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.patch('/products/:id', (req: Request, res: Response) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.delete('/products/:id', (req: Request, res: Response) => {
  const deleted = db.deleteProduct(req.params.id);
  res.json({ success: deleted });
});

// ==========================================
// 3. TAMPER-PROOF ORDERS & ROUTING
// ==========================================

apiRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const { customer, shippingAddress, cartItems, paymentMethod, couponCode } = req.body;

    if (!customer || !customer.fullName || !customer.phone) {
      return res.status(400).json({ success: false, error: 'Customer full name and phone are required.' });
    }

    if (!shippingAddress || !shippingAddress.city || !shippingAddress.streetAddress) {
      return res.status(400).json({ success: false, error: 'Complete shipping address is required.' });
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Cart must contain at least one item.' });
    }

    // Server-side order creation & price recalculation
    const order = await db.createOrder({
      customer,
      shippingAddress,
      cartItems,
      paymentMethod: paymentMethod || 'cod',
      couponCode
    });

    res.status(201).json({
      success: true,
      message: 'Order placed and routed successfully.',
      data: order
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.get('/orders', (req: Request, res: Response) => {
  try {
    const orders = db.getOrders();
    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/orders/track/:code', (req: Request, res: Response) => {
  const code = req.params.code;
  const phone = req.query.phone as string | undefined;

  const order = db.getOrderByTracking(code, phone);
  if (!order) {
    return res.status(404).json({
      success: false,
      error: 'Order not found. Please check your tracking code or phone number.'
    });
  }

  // Mask sensitive customer details for public tracking
  const sanitized = {
    ...order,
    customer: {
      fullName: order.customer.fullName,
      phone: `${order.customer.phone.slice(0, 4)}••••${order.customer.phone.slice(-3)}`
    },
    financialMetrics: {
      codCollected: order.financialMetrics.codCollected
    }
  };

  res.json({ success: true, data: sanitized });
});

apiRouter.get('/orders/:id', (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

// ==========================================
// 4. FULFILLMENT ACTIONS & SUB-ORDER QUEUE
// ==========================================

apiRouter.post('/fulfillment/sub-orders/:orderId/:subOrderId/status', (req: Request, res: Response) => {
  try {
    const { orderId, subOrderId } = req.params;
    const { status, trackingNumber, carrier } = req.body;

    const updated = db.updateSubOrderStatus(orderId, subOrderId, status, { trackingNumber, carrier });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.post('/fulfillment/sub-orders/:orderId/:subOrderId/retry', async (req: Request, res: Response) => {
  try {
    const { orderId, subOrderId } = req.params;
    const order = db.getOrderById(orderId);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const subOrder = order.subOrders.find(s => s.id === subOrderId);
    if (!subOrder) return res.status(404).json({ success: false, error: 'Sub-order not found' });

    const supplier = db.getSupplierById(subOrder.supplierId);
    if (!supplier) return res.status(404).json({ success: false, error: 'Supplier not found' });

    const adapter = AdapterRegistry.getInstance().getAdapter(supplier);
    subOrder.submissionAttempts += 1;
    subOrder.lastAttemptAt = new Date().toISOString();

    const submissionResult = await adapter.submitOrder({
      vyroOrderId: order.orderNumber,
      subOrderId,
      idempotencyKey: `${subOrder.idempotencyKey}-retry-${subOrder.submissionAttempts}`,
      shippingAddress: order.shippingAddress,
      customer: order.customer,
      items: subOrder.items,
      codAmountToCollect: order.paymentMethod === 'cod' ? subOrder.items.reduce((s, i) => s + i.totalPrice, 0) : 0,
      currency: supplier.currency,
      notes: 'Retry submission from VYRO Admin'
    });

    if (submissionResult.success) {
      subOrder.status = 'submitted';
      subOrder.externalOrderId = submissionResult.externalOrderId;
      subOrder.trackingNumber = submissionResult.trackingNumber;
      subOrder.trackingCarrier = submissionResult.trackingCarrier;
      subOrder.lastError = undefined;
    } else {
      subOrder.lastError = submissionResult.message;
    }

    res.json({ success: submissionResult.success, result: submissionResult, subOrder });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. FINANCIAL SETTLEMENTS & REPORTS
// ==========================================

apiRouter.get('/settlements', (req: Request, res: Response) => {
  try {
    const settlements = db.getSettlements();
    res.json({ success: true, data: settlements });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/settlements', (req: Request, res: Response) => {
  try {
    const newSettlement = db.createSettlement(req.body);
    res.status(201).json({ success: true, data: newSettlement });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.patch('/settlements/:id/status', (req: Request, res: Response) => {
  try {
    const { status, referenceNumber } = req.body;
    const updated = db.updateSettlementStatus(req.params.id, status, referenceNumber);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ==========================================
// 6. INTEGRATION LOGS & AUDIT TRAIL
// ==========================================

apiRouter.get('/logs', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const supplierId = req.query.supplierId as string;
    const logs = db.getLogs(limit, supplierId);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 7. ANALYTICS & SYSTEM STATS
// ==========================================

apiRouter.get('/stats', (req: Request, res: Response) => {
  try {
    const orders = db.getOrders();
    const suppliers = db.getSuppliers();
    const products = db.getProducts();

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalSupplierCost = orders.reduce((sum, o) => sum + o.financialMetrics.totalSupplierCost, 0);
    const expectedProfit = orders.reduce((sum, o) => sum + o.financialMetrics.expectedProfit, 0);
    const realizedProfit = orders.reduce((sum, o) => sum + o.financialMetrics.realizedProfit, 0);

    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    const degradedSuppliers = suppliers.filter(s => s.status === 'degraded' || s.status === 'disconnected').length;

    // Sub-order distribution
    let queuedSubOrders = 0;
    let submittedSubOrders = 0;
    let deliveredSubOrders = 0;

    orders.forEach(o => {
      o.subOrders.forEach(s => {
        if (s.status === 'in_manual_queue' || s.status === 'pending_submission') queuedSubOrders++;
        else if (s.status === 'submitted' || s.status === 'shipped') submittedSubOrders++;
        else if (s.status === 'delivered') deliveredSubOrders++;
      });
    });

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
        activeSuppliers,
        degradedSuppliers,
        fulfillmentQueue: {
          queued: queuedSubOrders,
          submitted: submittedSubOrders,
          delivered: deliveredSubOrders
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
