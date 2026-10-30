import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Order, SupplierSettlement, SupplierConfig } from '../../types/index.ts';
import { adminFetch } from '../../lib/api.ts';
import {
  DollarSign,
  TrendingUp,
  Banknote,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface FinancialReportsProps {
  orders: Order[];
  settlements: SupplierSettlement[];
  suppliers: SupplierConfig[];
  onRefreshFinancials: () => void;
}

export const FinancialReports: React.FC<FinancialReportsProps> = ({
  orders,
  settlements,
  suppliers,
  onRefreshFinancials
}) => {
  const { language, formatPrice, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'pnl' | 'settlements' | 'cod'>('pnl');

  // Calculations
  const grossSales = orders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalShippingCharged = orders.reduce((sum, o) => sum + o.shippingFee, 0);
  const totalCodFeesCharged = orders.reduce((sum, o) => sum + o.codFee, 0);
  const totalDiscounts = orders.reduce((sum, o) => sum + o.discount, 0);
  const netRevenueGMV = grossSales + totalShippingCharged + totalCodFeesCharged - totalDiscounts;

  const totalSupplierCosts = orders.reduce((sum, o) => sum + o.financialMetrics.totalSupplierCost, 0);
  const totalCourierCosts = orders.reduce((sum, o) => sum + o.financialMetrics.shippingCostToVyro, 0);

  const totalExpectedProfit = orders.reduce((sum, o) => sum + o.financialMetrics.expectedProfit, 0);
  const totalRealizedProfit = orders.reduce((sum, o) => sum + o.financialMetrics.realizedProfit, 0);

  // COD breakdown
  const codOrders = orders.filter((o) => o.paymentMethod === 'cod');
  const codCollectedTotal = codOrders
    .filter((o) => o.financialMetrics.codCollected)
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const codPendingTotal = codOrders
    .filter((o) => !o.financialMetrics.codCollected)
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const handleMarkSettled = async (settlementId: string) => {
    const ref = prompt(
      language === 'ar' ? 'أدخل رقم الحوالة أو الإشعار البنكي:' : 'Enter bank transfer reference number:',
      `TRF-${Date.now().toString().slice(-6)}`
    );
    if (!ref) return;

    try {
      const res = await adminFetch(`/api/settlements/${settlementId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'settled', referenceNumber: ref })
      });
      if (res.ok) {
        onRefreshFinancials();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="pb-4 border-b border-stone-200">
        <h2 className="text-xl sm:text-2xl font-black text-stone-900">
          {t('financialsHeader')}
        </h2>
        <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
          {t('financialsSub')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => setActiveTab('pnl')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'pnl'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          {language === 'ar' ? 'بيان الأرباح والخسائر (P&L)' : 'P&L Statement'}
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'settlements'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          {t('settlementsTitle')}
        </button>

        <button
          onClick={() => setActiveTab('cod')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'cod'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
          }`}
        >
          {t('codCollections')}
        </button>
      </div>

      {/* TAB 1: P&L Statement */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          {/* Top 3 High Level KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <span className="text-xs text-stone-500 font-bold block">{t('metricRevenue')}</span>
              <div className="text-2xl font-black text-stone-950">{formatPrice(netRevenueGMV)}</div>
              <span className="text-[11px] text-stone-400">
                {grossSales > 0 ? `Subtotal: ${formatPrice(grossSales)}` : ''}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <span className="text-xs text-stone-500 font-bold block">{t('metricCost')}</span>
              <div className="text-2xl font-black text-stone-800">
                {formatPrice(totalSupplierCosts + totalCourierCosts)}
              </div>
              <span className="text-[11px] text-stone-400">
                Suppliers: {formatPrice(totalSupplierCosts)} · Couriers: {formatPrice(totalCourierCosts)}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <span className="text-xs text-stone-500 font-bold block">{t('metricNetProfit')}</span>
              <div className="text-2xl font-black text-emerald-600">
                {formatPrice(totalExpectedProfit)}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">
                Realized (Delivered): {formatPrice(totalRealizedProfit)}
              </span>
            </div>
          </div>

          {/* Granular Breakdown Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-stone-900 pb-3 border-b border-stone-200">
              {language === 'ar' ? 'تفصيل الإيرادات والمصروفات اللوجستية' : 'Revenue & Expense Ledger Breakdown'}
            </h3>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span>{language === 'ar' ? 'مبيعات المنتجات (سعر بيع فايرو)' : 'Gross Merchandise Sales'}</span>
                <span className="font-bold text-stone-900 font-mono">{formatPrice(grossSales)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span>{language === 'ar' ? 'رسوم الشحن المحصلة من العملاء' : 'Customer Shipping Invoiced'}</span>
                <span className="font-bold text-stone-900 font-mono">+{formatPrice(totalShippingCharged)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-stone-100">
                <span>{language === 'ar' ? 'رسوم الدفع عند الاستلام المحصلة' : 'COD Service Surcharge Invoiced'}</span>
                <span className="font-bold text-stone-900 font-mono">+{formatPrice(totalCodFeesCharged)}</span>
              </div>

              {totalDiscounts > 0 && (
                <div className="flex items-center justify-between py-1.5 border-b border-stone-100 text-rose-600">
                  <span>{language === 'ar' ? 'أكواد الخصم الترويجية' : 'Promotional Discounts Granted'}</span>
                  <span className="font-bold font-mono">-{formatPrice(totalDiscounts)}</span>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-stone-200 font-black text-stone-900 bg-stone-50 px-2 rounded">
                <span>{language === 'ar' ? 'صافي الإيرادات العامة' : 'Net Recognized Inflow'}</span>
                <span className="font-mono">{formatPrice(netRevenueGMV)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-stone-100 text-stone-600">
                <span>{language === 'ar' ? 'تكاليف الموردين (COGS)' : 'Supplier Purchase Costs (COGS)'}</span>
                <span className="font-bold text-stone-900 font-mono">-{formatPrice(totalSupplierCosts)}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-stone-100 text-stone-600">
                <span>{language === 'ar' ? 'تكاليف شركات الشحن والأسطول' : 'Courier Dispatch & Fulfillment Fees'}</span>
                <span className="font-bold text-stone-900 font-mono">-{formatPrice(totalCourierCosts)}</span>
              </div>

              <div className="flex items-center justify-between pt-3 text-sm font-black text-emerald-700 bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                <span>{language === 'ar' ? 'صافي هامش ربح فايرو المتوقع' : 'VYRO Net Expected Profit'}</span>
                <span className="font-mono text-base">{formatPrice(totalExpectedProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Supplier Settlements */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4 text-start">{language === 'ar' ? 'المورد' : 'Supplier'}</th>
                    <th className="py-3 px-4 text-start">{language === 'ar' ? 'الفترة' : 'Period'}</th>
                    <th className="py-3 px-4 text-start">{language === 'ar' ? 'الطلبات' : 'Orders'}</th>
                    <th className="py-3 px-4 text-start">{language === 'ar' ? 'تكلفة البضائع' : 'Product Cost'}</th>
                    <th className="py-3 px-4 text-start">{language === 'ar' ? 'خصم COD' : 'COD Deductions'}</th>
                    <th className="py-3 px-4 text-start">{t('netSettlementDue')}</th>
                    <th className="py-3 px-4 text-start">{t('supplierStatus')}</th>
                    <th className="py-3 px-4 text-end">{language === 'ar' ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-stone-900">{s.supplierName}</div>
                        <div className="font-mono text-[10px] text-stone-400">Ref: {s.referenceNumber || 'Pending'}</div>
                      </td>
                      <td className="py-3 px-4 text-stone-600">
                        {new Date(s.periodStart).toLocaleDateString()} - {new Date(s.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-800">{s.ordersCount}</td>
                      <td className="py-3 px-4 font-mono">{formatPrice(s.totalProductCost)}</td>
                      <td className="py-3 px-4 font-mono text-stone-500">-{formatPrice(s.codFeesDeducted)}</td>
                      <td className="py-3 px-4 font-black font-mono text-stone-900">
                        {formatPrice(s.netSettlementDue)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.status === 'settled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {s.status === 'settled' ? t('settledBadge') : t('pendingSettlementBadge')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-end">
                        {s.status !== 'settled' && (
                          <button
                            onClick={() => handleMarkSettled(s.id)}
                            className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-bold cursor-pointer"
                          >
                            {t('markSettledBtn')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COD Collections */}
      {activeTab === 'cod' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <span className="text-xs text-stone-500 font-bold block">{t('codCollectedAmount')}</span>
              <div className="text-2xl font-black text-emerald-600">{formatPrice(codCollectedTotal)}</div>
              <span className="text-[11px] text-stone-400">
                {language === 'ar' ? 'تم تحصيلها وإيداعها في حساب فايرو' : 'Remitted and verified by carriers'}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
              <span className="text-xs text-stone-500 font-bold block">{t('codPendingAmount')}</span>
              <div className="text-2xl font-black text-amber-600">{formatPrice(codPendingTotal)}</div>
              <span className="text-[11px] text-stone-400">
                {language === 'ar' ? 'قيد التحصيل مع مناديب الشحن' : 'In transit with delivery fleet'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-6 space-y-3 text-xs">
            <h4 className="font-bold text-stone-900">{language === 'ar' ? 'إجراءات التحصيل والتسوية لكل مورد' : 'Per-Supplier COD Policy'}</h4>
            <p className="text-stone-500 leading-relaxed">
              {language === 'ar'
                ? 'تختلف سياسات الدفع عند الاستلام بين الموردين: يقوم تاجر بالتحصيل المباشر واقتطاع عمولة الخدمة، بينما تقوم المستودعات المركزية الخاصة بـ فايرو بتحصيل المبالغ مباشرة عبر أسطول النقل الخاص وتوريدها يومياً.'
                : 'Taager handles COD via its integrated courier partners and deducts fees, whereas VYRO Central Hub collections are reconciled daily via direct courier remit.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
