import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Order, FulfillmentSubOrder } from '../../types/index.ts';
import { adminFetch } from '../../lib/api.ts';
import {
  Layers,
  Truck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  MapPin,
  Clock,
  Package,
  X
} from 'lucide-react';

interface OrdersFulfillmentProps {
  orders: Order[];
  onRefreshOrders: () => void;
}

export const OrdersFulfillment: React.FC<OrdersFulfillmentProps> = ({
  orders = [],
  onRefreshOrders
}) => {
  const { language, formatPrice, t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modal for tracking / dispatch action
  const [modalSubOrder, setModalSubOrder] = useState<{
    orderId: string;
    subOrder: FulfillmentSubOrder;
  } | null>(null);
  const [modalTrackingNumber, setModalTrackingNumber] = useState('');
  const [modalCarrier, setModalCarrier] = useState('Local Courier Fleet');
  const [modalStatus, setModalStatus] = useState<FulfillmentSubOrder['status']>('shipped');
  const [modalUpdating, setModalUpdating] = useState(false);

  // Retrying state
  const [retryingSubOrderId, setRetryingSubOrderId] = useState<string | null>(null);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const openDispatchModal = (orderId: string, subOrder: FulfillmentSubOrder) => {
    setModalSubOrder({ orderId, subOrder });
    setModalTrackingNumber(subOrder.trackingNumber || `TRK-${Date.now().toString().slice(-6)}`);
    setModalCarrier(subOrder.trackingCarrier || 'Local Express Logistics');
    setModalStatus(subOrder.status === 'delivered' ? 'delivered' : 'shipped');
  };

  const handleUpdateSubOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalSubOrder) return;
    setModalUpdating(true);

    try {
      const res = await adminFetch(
        `/api/fulfillment/sub-orders/${modalSubOrder.orderId}/${modalSubOrder.subOrder.id}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: modalStatus,
            trackingNumber: modalTrackingNumber,
            carrier: modalCarrier
          })
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update sub-order status');
      }

      setModalSubOrder(null);
      onRefreshOrders();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setModalUpdating(false);
    }
  };

  const handleRetrySupplierApi = async (orderId: string, subOrderId: string) => {
    setRetryingSubOrderId(subOrderId);
    try {
      const res = await adminFetch(`/api/fulfillment/sub-orders/${orderId}/${subOrderId}/retry`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || data.result?.message || 'Retry failed');
      } else {
        alert('Supplier API submission retry succeeded!');
      }
      onRefreshOrders();
    } catch (err: any) {
      alert(`Retry network error: ${err.message}`);
    } finally {
      setRetryingSubOrderId(null);
    }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter((o) => {
    if (!o) return false;
    if (selectedStatus !== 'all' && o.status !== selectedStatus) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const orderNum = (o.orderNumber || '').toLowerCase();
      const trackCode = (o.trackingCode || '').toLowerCase();
      const custName = (o.customer?.fullName || '').toLowerCase();
      const custPhone = o.customer?.phone || '';
      return (
        orderNum.includes(q) ||
        trackCode.includes(q) ||
        custName.includes(q) ||
        custPhone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-stone-200">
        <h2 className="text-xl sm:text-2xl font-black text-stone-900">
          {t('ordersHeader')}
        </h2>
        <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
          {t('ordersSub')}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={language === 'ar' ? 'بحث برقم الطلب، كود التتبع، أو اسم العميل...' : 'Search by order number or customer...'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <Search className="w-4 h-4 text-stone-400 absolute top-1/2 -translate-y-1/2 end-3" />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-700 font-medium focus:outline-none cursor-pointer"
        >
          <option value="all">{language === 'ar' ? 'كافة الحالات' : 'All Order Statuses'}</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="routed">Routed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
        </select>
      </div>

      {/* Orders List with Multi-Supplier Decomposition */}
      <div className="space-y-6">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-stone-200 text-xs text-stone-500">
            {language === 'ar' ? 'لا توجد طلبات مطابقة للبحث' : 'No orders found matching filters'}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const subOrders = Array.isArray(order.subOrders) ? order.subOrders : [];
            const customerName = order.customer?.fullName || 'Customer';
            const customerPhone = order.customer?.phone || '';
            const city = order.shippingAddress?.city || '';
            const gov = order.shippingAddress?.governorateOrState || '';
            const expectedProfit = order.financialMetrics?.expectedProfit || 0;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6"
              >
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-stone-200 gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-base font-black text-stone-900">
                        {order.orderNumber}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          order.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'shipped'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-3">
                      <span>{formatDate(order.createdAt)}</span>
                      <span>·</span>
                      <span>{customerName} ({customerPhone})</span>
                      {city && (
                        <>
                          <span>·</span>
                          <span>{city}, {gov}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-start sm:text-end">
                    <div className="text-base font-black text-stone-900">
                      {formatPrice(order.totalAmount || 0)}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      {order.paymentMethod === 'cod' ? t('payCod') : t('payCard')} ·{' '}
                      <span className="text-emerald-700 font-bold">
                        +{formatPrice(expectedProfit)} profit
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-Orders Multi-Supplier Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <span>{t('subOrderSplit')} ({subOrders.length} {language === 'ar' ? 'طرود' : 'parcels'})</span>
                    </span>
                    <span className="text-[11px] text-stone-400 font-normal">
                      {language === 'ar' ? 'توجيه آلي لكل مورد حسب مصدر الصنف' : 'Independent routing per item source'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subOrders.map((sub, idx) => {
                      const items = Array.isArray(sub.items) ? sub.items : [];

                      return (
                        <div
                          key={sub.id || idx}
                          className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-3">
                            {/* Sub-order header */}
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="font-bold text-xs text-stone-900 block">
                                  {sub.supplierName}
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono">
                                  Sub-ID: {sub.id}
                                </span>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  sub.status === 'delivered'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : sub.status === 'shipped'
                                    ? 'bg-amber-100 text-amber-900'
                                    : sub.status === 'in_manual_queue'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-stone-200 text-stone-700'
                                }`}
                              >
                                {sub.status === 'in_manual_queue' ? t('manualQueueBadge') : sub.status}
                              </span>
                            </div>

                            {/* Waybill / Tracking */}
                            <div className="text-xs space-y-1 bg-white p-2.5 rounded-lg border border-stone-200">
                              <div className="flex justify-between">
                                <span className="text-stone-400 text-[10px]">{t('carrier')}:</span>
                                <span className="font-semibold text-stone-800">
                                  {sub.trackingCarrier || 'Not assigned'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-stone-400 text-[10px]">{t('externalTracking')}:</span>
                                <span className="font-mono font-bold text-stone-900">
                                  {sub.trackingNumber || sub.externalOrderId || 'Pending'}
                                </span>
                              </div>
                            </div>

                            {/* Items in this sub-order */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold text-stone-500 uppercase">
                                {language === 'ar' ? 'أصناف الطرد:' : 'Items in parcel:'}
                              </span>
                              {items.map((item, itemIdx) => (
                                <div
                                  key={item.id || itemIdx}
                                  className="flex items-center justify-between text-xs text-stone-700"
                                >
                                  <span className="truncate max-w-48">
                                    {item.quantity}× {language === 'ar' ? item.titleAr : item.title}
                                  </span>
                                  <span className="font-mono text-stone-500">{formatPrice(item.totalPrice || 0)}</span>
                                </div>
                              ))}
                            </div>

                            {sub.lastError && (
                              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-start gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{sub.lastError}</span>
                              </div>
                            )}
                          </div>

                          {/* Sub-order Actions */}
                          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                            {sub.status === 'in_manual_queue' || sub.status === 'pending_submission' ? (
                              <button
                                onClick={() => openDispatchModal(order.id, sub)}
                                className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <Truck className="w-3 h-3 text-amber-400" />
                                <span>{t('markShippedBtn')}</span>
                              </button>
                            ) : sub.status === 'shipped' ? (
                              <button
                                onClick={() => openDispatchModal(order.id, sub)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3 h-3 text-white" />
                                <span>{t('markDeliveredBtn')}</span>
                              </button>
                            ) : null}

                            {sub.status === 'failed_submission' && (
                              <button
                                onClick={() => handleRetrySupplierApi(order.id, sub.id)}
                                disabled={retryingSubOrderId === sub.id}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>{t('retrySupplierBtn')}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dispatch & Tracking Update Modal */}
      {modalSubOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-stone-200 overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-sm">
                {t('enterTrackingModalTitle')}
              </h3>
              <button
                onClick={() => setModalSubOrder(null)}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubOrderStatus} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {language === 'ar' ? 'حالة الطرد' : 'Sub-order Status'}
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-900"
                >
                  <option value="shipped">Shipped (خرج للشحن مع المندوب)</option>
                  <option value="delivered">Delivered (تم التسليم وتحصيل المبلغ)</option>
                  <option value="in_manual_queue">In Manual Queue (قيد التجهيز بالمستودع)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t('externalTracking')} *
                </label>
                <input
                  type="text"
                  required
                  value={modalTrackingNumber}
                  onChange={(e) => setModalTrackingNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-stone-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {t('carrier')} *
                </label>
                <input
                  type="text"
                  required
                  value={modalCarrier}
                  onChange={(e) => setModalCarrier(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                />
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalSubOrder(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={modalUpdating}
                  className="px-5 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-white font-black shadow-sm"
                >
                  {modalUpdating ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
