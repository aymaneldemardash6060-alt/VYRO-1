import React from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { SupplierConfig, Order, AdminTab } from '../../types/index.ts';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  DollarSign,
  Package,
  PackageCheck,
  Server,
  ShoppingBag,
  TrendingUp
} from 'lucide-react';

interface DashboardOverviewProps {
  suppliers: SupplierConfig[];
  orders: Order[];
  onSelectTab: (tab: AdminTab) => void;
}

const SUPPLIER_STATUS: Record<string, { ar: string; en: string; className: string }> = {
  active: { ar: 'نشط', en: 'Active', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  degraded: { ar: 'يحتاج متابعة', en: 'Needs attention', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  testing: { ar: 'قيد الاختبار', en: 'Testing', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
  disconnected: { ar: 'غير متصل', en: 'Disconnected', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  unconfigured: { ar: 'غير مهيأ', en: 'Not configured', className: 'bg-slate-100 text-slate-600 ring-slate-200' }
};

const ORDER_STATUS_AR: Record<string, string> = {
  pending: 'قيد الانتظار',
  processing: 'قيد التجهيز',
  routed: 'تم التوجيه',
  submitted_to_supplier: 'أُرسل للمورد',
  supplier_confirmed: 'مؤكد من المورد',
  shipped: 'تم الشحن',
  out_for_delivery: 'في الطريق',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  returned: 'مرتجع'
};

const getOrderStatusClass = (status: string) => {
  if (status === 'delivered') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'cancelled' || status === 'returned') return 'bg-rose-50 text-rose-700 ring-rose-200';
  if (status === 'shipped' || status === 'out_for_delivery' || status === 'supplier_confirmed') {
    return 'bg-sky-50 text-sky-700 ring-sky-200';
  }
  return 'bg-amber-50 text-amber-700 ring-amber-200';
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  suppliers,
  orders,
  onSelectTab
}) => {
  const { language, formatPrice, t } = useLanguage();
  const isArabic = language === 'ar';
  const ArrowIcon = isArabic ? ArrowLeft : ArrowRight;
  const UpArrowIcon = isArabic ? ArrowUpLeft : ArrowUpRight;

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const totalCost = orders.reduce((sum, order) => sum + order.financialMetrics.totalSupplierCost, 0);
  const expectedProfit = orders.reduce((sum, order) => sum + order.financialMetrics.expectedProfit, 0);
  const realizedProfit = orders.reduce((sum, order) => sum + order.financialMetrics.realizedProfit, 0);
  const overallMargin = totalRevenue > 0 ? Math.round((expectedProfit / totalRevenue) * 100) : 0;
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === 'active').length;
  const openOrders = orders.filter((order) => !['delivered', 'cancelled', 'returned'].includes(order.status)).length;

  const metrics = [
    {
      label: t('metricRevenue'),
      value: formatPrice(totalRevenue),
      note: `${orders.length} ${t('metricOrders')}`,
      icon: DollarSign,
      tone: 'bg-amber-50 text-amber-700 ring-amber-100'
    },
    {
      label: t('metricCost'),
      value: formatPrice(totalCost),
      note: isArabic ? 'إجمالي تكلفة المنتجات والموردين' : 'Total product and supplier costs',
      icon: Package,
      tone: 'bg-sky-50 text-sky-700 ring-sky-100'
    },
    {
      label: t('metricNetProfit'),
      value: formatPrice(expectedProfit),
      note: `${t('metricMargin')}: ${overallMargin}%`,
      icon: TrendingUp,
      tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100'
    },
    {
      label: t('metricRealizedProfit'),
      value: formatPrice(realizedProfit),
      note: isArabic ? 'من الطلبات التي تم تسليمها' : 'From completed deliveries',
      icon: CheckCircle2,
      tone: 'bg-violet-50 text-violet-700 ring-violet-100'
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-7">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-[#111827] px-5 py-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -end-12 -top-24 size-72 rounded-full border border-white/[0.06]" />
        <div className="pointer-events-none absolute -end-3 -top-14 size-52 rounded-full border border-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-20 start-1/3 size-56 rounded-full bg-amber-300/[0.07] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-300">
              <span className="size-1.5 rounded-full bg-amber-300" />
              <span>{isArabic ? 'نظرة تشغيلية' : 'Operations overview'}</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              {isArabic ? 'كل تفاصيل متجرك، في مكان واحد' : 'Your store, at a glance'}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">
              {isArabic
                ? 'تابع حركة الطلبات وأداء الموردين ومؤشرات المبيعات من لوحة واحدة سهلة وواضحة.'
                : 'Keep a clear view of order activity, supplier operations and store performance from one workspace.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:min-w-[330px]">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.055] p-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock3 className="size-4 text-amber-300" />
                <span className="text-[11px] font-bold">{isArabic ? 'طلبات مفتوحة' : 'Open orders'}</span>
              </div>
              <div className="mt-3 text-2xl font-black tabular-nums">{openOrders}</div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.055] p-4">
              <div className="flex items-center gap-2 text-slate-300">
                <Server className="size-4 text-emerald-300" />
                <span className="text-[11px] font-bold">{isArabic ? 'موردون نشطون' : 'Active suppliers'}</span>
              </div>
              <div className="mt-3 text-2xl font-black tabular-nums">{activeSuppliers}<span className="ms-1 text-sm font-semibold text-slate-400">/ {suppliers.length}</span></div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label={isArabic ? 'مؤشرات الأداء' : 'Performance metrics'} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)] sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-5 text-slate-500">{metric.label}</p>
                  <p className="mt-3 break-words text-[22px] font-black tracking-tight text-slate-950 sm:text-2xl">{metric.value}</p>
                </div>
                <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ${metric.tone}`}>
                  <Icon className="size-[19px]" strokeWidth={2.1} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <span className="grid size-5 place-items-center rounded-full bg-slate-50 text-slate-500">
                  <UpArrowIcon className="size-3" />
                </span>
                <span className="text-[10px] font-semibold text-slate-500">{metric.note}</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(310px,0.8fr)]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.035)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
                <ShoppingBag className="size-[18px]" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-slate-900">{t('recentOrdersTitle')}</h3>
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  {isArabic ? 'آخر الطلبات المسجلة في المتجر' : 'The latest orders placed in your store'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('orders')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-extrabold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <span>{t('viewAllOrders')}</span>
              <ArrowIcon className="size-3.5" />
            </button>
          </div>
          {orders.length === 0 ? (
            <div className="grid min-h-48 place-items-center px-6 py-8 text-center">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                  <PackageCheck className="size-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700">{isArabic ? 'لا توجد طلبات حتى الآن' : 'No orders yet'}</p>
                <p className="mt-1 text-xs text-slate-400">{isArabic ? 'ستظهر الطلبات الجديدة هنا.' : 'New orders will appear here.'}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-start text-xs">
                <thead>
                  <tr className="bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3 text-start sm:px-6">{t('orderNumberLabel')}</th>
                    <th className="px-4 py-3 text-start">{t('fullName')}</th>
                    <th className="px-4 py-3 text-start">{t('orderTotal')}</th>
                    <th className="px-5 py-3 text-start sm:px-6">{t('supplierStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.slice(0, 6).map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-5 py-4 font-mono text-[11px] font-extrabold text-slate-800 sm:px-6">{order.orderNumber}</td>
                      <td className="px-4 py-4">
                        <div className="max-w-44 truncate font-bold text-slate-800">{order.customer.fullName}</div>
                        <div className="mt-1 max-w-44 truncate text-[10px] text-slate-400">{order.shippingAddress.city}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-extrabold text-slate-800">{formatPrice(order.totalAmount)}</td>
                      <td className="px-5 py-4 sm:px-6">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${getOrderStatusClass(order.status)}`}>
                          {isArabic ? (ORDER_STATUS_AR[order.status] ?? order.status) : order.status.replaceAll('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.035)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                <Server className="size-[18px]" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-black text-slate-900">{t('supplierHealthOverview')}</h3>
                <p className="mt-1 text-[11px] font-medium text-slate-500">{activeSuppliers} {t('activeSuppliersLabel')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelectTab('suppliers')}
              title={isArabic ? 'إدارة جميع الموردين' : 'Manage all suppliers'}
              aria-label={isArabic ? 'إدارة جميع الموردين' : 'Manage all suppliers'}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
            >
              <ArrowIcon className="size-4" />
            </button>
          </div>
          {suppliers.length === 0 ? (
            <div className="grid min-h-48 place-items-center px-6 py-8 text-center">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                  <Server className="size-5" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700">{isArabic ? 'لا يوجد موردون بعد' : 'No suppliers yet'}</p>
                <button type="button" onClick={() => onSelectTab('suppliers')} className="mt-2 text-xs font-extrabold text-amber-700 hover:text-amber-800">
                  {isArabic ? 'إضافة مورد' : 'Add a supplier'}
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {suppliers.slice(0, 5).map((supplier) => {
                const status = SUPPLIER_STATUS[supplier.status] ?? {
                  ar: supplier.status,
                  en: supplier.status,
                  className: 'bg-slate-100 text-slate-600 ring-slate-200'
                };
                return (
                  <div key={supplier.id} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500">
                        <Server className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold text-slate-800">{supplier.name}</p>
                        <p className="mt-1 truncate text-[10px] font-medium text-slate-400">
                          {supplier.code} <span className="mx-1">·</span> {supplier.countryCode}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-extrabold ring-1 ring-inset ${status.className}`}>
                      {isArabic ? status.ar : status.en}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {suppliers.length > 0 && (
            <button
              type="button"
              onClick={() => onSelectTab('suppliers')}
              className="flex w-full items-center justify-center gap-2 border-t border-slate-100 px-5 py-3.5 text-[11px] font-extrabold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
            >
              <span>{isArabic ? 'عرض شبكة الموردين' : 'View supplier network'}</span>
              <ArrowIcon className="size-3.5" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
};
