import React from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { SupplierConfig, Order, AdminTab } from '../../types/index.ts';
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Server
} from 'lucide-react';

interface DashboardOverviewProps {
  suppliers: SupplierConfig[];
  orders: Order[];
  onSelectTab: (tab: AdminTab) => void;
  onRefreshStats: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  suppliers,
  orders,
  onSelectTab,
  onRefreshStats
}) => {
  const { language, formatPrice, t } = useLanguage();
  const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight;

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCost = orders.reduce((sum, o) => sum + o.financialMetrics.totalSupplierCost, 0);
  const totalExpectedProfit = orders.reduce((sum, o) => sum + o.financialMetrics.expectedProfit, 0);
  const totalRealizedProfit = orders.reduce((sum, o) => sum + o.financialMetrics.realizedProfit, 0);
  const overallMargin = totalRevenue > 0 ? Math.round((totalExpectedProfit / totalRevenue) * 100) : 0;

  const activeSuppliersCount = suppliers.filter((s) => s.status === 'active').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome & Independence Status Banner */}
      <div className="bg-stone-900 text-stone-200 p-6 rounded-2xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h2 className="text-lg font-black text-white">
              {language === 'ar'
                ? 'فايرو: شبكة العمليات المستقلة متعددة الموردين'
                : 'VYRO: Independent Multi-Supplier Core'}
            </h2>
          </div>
          <p className="text-xs text-stone-400 max-w-2xl leading-relaxed">
            {language === 'ar'
              ? 'النظام يعمل بشكل كامل بدون أي اعتماد قسري على منصة واحدة. الربط اختياري مع تاجر، المستودعات المركزية بالقاهرة، وموردي الخليج.'
              : 'Zero platform lock-in. Modular adapters allow seamless failover between automated APIs and local warehouse queues.'}
          </p>
        </div>

        <button
          onClick={onRefreshStats}
          className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 transition-colors flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span>{language === 'ar' ? 'تحديث البيانات الحية' : 'Refresh Metrics'}</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GMV */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>{t('metricRevenue')}</span>
            <DollarSign className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-black text-stone-950">{formatPrice(totalRevenue)}</div>
          <div className="text-[11px] text-stone-400 flex items-center gap-1">
            <span>{orders.length} {t('metricOrders')}</span>
          </div>
        </div>

        {/* Supplier Costs */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>{t('metricCost')}</span>
            <Package className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-black text-stone-800">{formatPrice(totalCost)}</div>
          <div className="text-[11px] text-stone-400">
            {language === 'ar' ? 'تسويات ومستحقات الموردين' : 'Supplier COGS liabilities'}
          </div>
        </div>

        {/* Expected Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>{t('metricNetProfit')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatPrice(totalExpectedProfit)}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <span>{t('metricMargin')}: {overallMargin}%</span>
          </div>
        </div>

        {/* Realized Profit (COD Collected) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>{t('metricRealizedProfit')}</span>
            <CheckCircle2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-stone-950">
            {formatPrice(totalRealizedProfit)}
          </div>
          <div className="text-[11px] text-stone-500">
            {language === 'ar' ? 'محصلة بعد التسليم الفعلي' : 'From delivered orders'}
          </div>
        </div>
      </div>

      {/* Supplier Health Status Overview */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900">{t('supplierHealthOverview')}</h3>
            <p className="text-xs text-stone-500">
              {activeSuppliersCount} {t('activeSuppliersLabel')}
            </p>
          </div>

          <button
            onClick={() => onSelectTab('suppliers')}
            className="text-xs font-bold text-stone-800 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
          >
            <span>{language === 'ar' ? 'إدارة الموردين بالكامل' : 'Manage All Suppliers'}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 truncate max-w-36">
                    {supplier.name}
                  </h4>
                  <span className="text-[10px] text-stone-400 font-mono uppercase block">
                    {supplier.code} · {supplier.countryCode}
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    supplier.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : supplier.status === 'degraded'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {supplier.status}
                </span>
              </div>

              <div className="space-y-1 text-[11px] text-stone-500">
                <div className="flex justify-between">
                  <span>{t('supplierType')}:</span>
                  <span className="font-semibold text-stone-700 uppercase">
                    {supplier.integrationType}
                  </span>
                </div>
                {supplier.lastHealthMessage && (
                  <div className="text-[10px] text-stone-400 truncate" title={supplier.lastHealthMessage}>
                    {supplier.lastHealthMessage}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Multi-Supplier Orders */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div>
            <h3 className="text-sm font-bold text-stone-900">{t('recentOrdersTitle')}</h3>
            <p className="text-xs text-stone-500">
              {language === 'ar'
                ? 'الطلبات الحالية وتوزيع الطرود على الموردين والمستودعات'
                : 'Live order routing across multiple suppliers'}
            </p>
          </div>

          <button
            onClick={() => onSelectTab('orders')}
            className="text-xs font-bold text-stone-800 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
          >
            <span>{t('viewAllOrders')}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 font-semibold">
                <th className="pb-3 text-start">{t('orderNumberLabel')}</th>
                <th className="pb-3 text-start">{t('fullName')}</th>
                <th className="pb-3 text-start">{language === 'ar' ? 'الطرود والموردين' : 'Suppliers Split'}</th>
                <th className="pb-3 text-start">{t('orderTotal')}</th>
                <th className="pb-3 text-start">{t('profitPerUnit')}</th>
                <th className="pb-3 text-start">{t('supplierStatus')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3 font-mono font-bold text-stone-900">
                    {order.orderNumber}
                  </td>
                  <td className="py-3 text-stone-700">
                    <div className="font-semibold">{order.customer.fullName}</div>
                    <div className="text-[11px] text-stone-400">{order.shippingAddress.city}</div>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {order.subOrders.map((sub, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-[10px]"
                        >
                          {sub.supplierName} ({sub.status})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 font-black text-stone-900">
                    {formatPrice(order.totalAmount)}
                  </td>
                  <td className="py-3 font-bold text-emerald-600">
                    {formatPrice(order.financialMetrics.expectedProfit)}
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        order.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : order.status === 'shipped'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-stone-100 text-stone-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
