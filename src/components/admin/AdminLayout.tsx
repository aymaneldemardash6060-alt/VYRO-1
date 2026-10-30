import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  AdminTab,
  SupplierConfig,
  Product,
  Order,
  IntegrationLog,
  SupplierSettlement
} from '../../types/index.ts';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ExternalLink,
  FileText,
  Layers,
  LayoutDashboard,
  Package,
  RefreshCw,
  Server,
  ShieldCheck,
  Store
} from 'lucide-react';
import { DashboardOverview } from './DashboardOverview.tsx';
import { SuppliersManager } from './SuppliersManager.tsx';
import { ProductsManager } from './ProductsManager.tsx';
import { OrdersFulfillment } from './OrdersFulfillment.tsx';
import { FinancialReports } from './FinancialReports.tsx';
import { IntegrationLogs } from './IntegrationLogs.tsx';
import { adminFetch } from '../../lib/api.ts';

interface AdminLayoutProps {
  onNavigateToStore: () => void;
  initialTab?: AdminTab;
}

const PAGE_DESCRIPTIONS: Record<AdminTab, { ar: string; en: string }> = {
  overview: {
    ar: 'ملخص واضح لأداء المتجر والطلبات والموردين.',
    en: 'A clear snapshot of store performance, orders and suppliers.'
  },
  suppliers: {
    ar: 'تابع شبكة الموردين وإعدادات الربط وحالة كل مورد.',
    en: 'Monitor supplier connections, settings and operational status.'
  },
  products: {
    ar: 'أدر كتالوج المنتجات والأسعار والمخزون من مكان واحد.',
    en: 'Manage your catalog, pricing and inventory in one place.'
  },
  orders: {
    ar: 'تابع تجهيز الطلبات وتوزيع الشحنات حتى التسليم.',
    en: 'Track order processing and fulfillment through delivery.'
  },
  financials: {
    ar: 'راجع الإيرادات والتكاليف والأرباح وتسويات الموردين.',
    en: 'Review revenue, costs, profit and supplier settlements.'
  },
  logs: {
    ar: 'راجع سجل عمليات الربط ونتائج المزامنة.',
    en: 'Review integration activity and synchronization results.'
  }
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  onNavigateToStore,
  initialTab = 'overview'
}) => {
  const { language, t } = useLanguage();
  const isArabic = language === 'ar';
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  const [suppliers, setSuppliers] = useState<SupplierConfig[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [settlements, setSettlements] = useState<SupplierSettlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      const [supRes, prodRes, ordRes, logRes, setRes] = await Promise.all([
        adminFetch('/api/suppliers').then((r) => r.json()),
        adminFetch('/api/products?activeOnly=false').then((r) => r.json()),
        adminFetch('/api/orders').then((r) => r.json()),
        adminFetch('/api/logs?limit=50').then((r) => r.json()),
        adminFetch('/api/settlements').then((r) => r.json())
      ]);

      if (supRes.success) setSuppliers(supRes.data);
      if (prodRes.success) setProducts(prodRes.data);
      if (ordRes.success) setOrders(ordRes.data);
      if (logRes.success) setLogs(logRes.data);
      if (setRes.success) setSettlements(setRes.data);
    } catch (err) {
      console.error('Failed fetching admin data', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchAllData();
  }, []);

  const tabs: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: t('tabOverview'), icon: LayoutDashboard },
    { key: 'suppliers', label: t('tabSuppliers'), icon: Server },
    { key: 'products', label: t('tabProducts'), icon: Package },
    { key: 'orders', label: t('tabOrders'), icon: Layers },
    { key: 'financials', label: t('tabFinancials'), icon: DollarSign },
    { key: 'logs', label: t('tabLogs'), icon: FileText }
  ];
  const activePage = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const pageDescription = PAGE_DESCRIPTIONS[activeTab][isArabic ? 'ar' : 'en'];
  const BackIcon = isArabic ? ChevronLeft : ChevronRight;

  const renderNavigation = (compact = false) => (
    <nav aria-label={isArabic ? 'التنقل الإداري' : 'Admin navigation'}>
      {!compact && (
        <p className="mb-3 px-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
          {isArabic ? 'مساحة العمل' : 'Workspace'}
        </p>
      )}
      <div className={compact ? 'flex min-w-max items-center gap-2' : 'space-y-1.5'}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-center gap-3 rounded-xl text-start text-[13px] font-bold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                compact ? 'px-3 py-2.5' : 'w-full px-3 py-3'
              } ${
                isActive
                  ? 'bg-amber-300 text-slate-950 shadow-[0_8px_20px_rgba(251,191,36,0.12)]'
                  : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${isActive ? 'bg-slate-950/10' : 'bg-white/[0.045] group-hover:bg-white/[0.08]'}`}>
                <Icon className="size-4" strokeWidth={2.1} />
              </span>
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#f4f6f9] text-slate-900">
      <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col border-e border-white/[0.06] bg-[#111827] px-5 py-6 text-white lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-11 place-items-center rounded-2xl bg-amber-300 text-slate-950 shadow-lg shadow-amber-950/20">
            <Layers className="size-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[17px] font-black tracking-[0.13em]">VYRO</div>
            <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {isArabic ? 'إدارة التجارة' : 'Commerce management'}
            </div>
          </div>
        </div>

        <div className="mt-9 rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3.5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300">
              <ShieldCheck className="size-[18px]" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">{isArabic ? 'مساحة المدير' : 'Admin workspace'}</p>
              <p className="mt-1 text-[10px] text-slate-500">{isArabic ? 'إدارة عمليات المتجر' : 'Store operations'}</p>
            </div>
          </div>
        </div>

        <div className="mt-8">{renderNavigation()}</div>

        <div className="mt-auto pt-6">
          <div className="mb-4 h-px bg-white/[0.08]" />
          <button
            type="button"
            onClick={onNavigateToStore}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start text-[13px] font-bold text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-white/[0.045]">
              <Store className="size-4" />
            </span>
            <span className="flex-1">{t('storefront')}</span>
            <ExternalLink className="size-3.5 text-slate-500" />
          </button>
          <div className="mt-5 flex items-center justify-between px-2 text-[10px] font-semibold text-slate-500">
            <span>VYRO</span>
            <span>{isArabic ? 'لوحة التحكم' : 'Control panel'}</span>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex min-h-[88px] max-w-[1680px] items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-9">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
                <span>VYRO</span>
                <span className="size-1 rounded-full bg-amber-400" />
                <span>{isArabic ? 'إدارة المتجر' : 'Store management'}</span>
              </div>
              <h1 className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                {activePage.label}
              </h1>
              <p className="mt-0.5 hidden text-xs font-medium text-slate-500 sm:block">
                {pageDescription}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => void fetchAllData()}
                disabled={isRefreshing}
                title={isArabic ? 'تحديث بيانات لوحة التحكم' : 'Refresh dashboard data'}
                aria-label={isArabic ? 'تحديث بيانات لوحة التحكم' : 'Refresh dashboard data'}
                className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={onNavigateToStore}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-xs font-extrabold text-white shadow-sm transition hover:bg-slate-800 sm:px-4"
              >
                <Store className="size-4" />
                <span className="hidden sm:inline">{t('storefront')}</span>
                <BackIcon className="hidden size-3.5 sm:block" />
              </button>
            </div>
          </div>
        </header>

        <div className="border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <div className="mx-auto max-w-[1680px] overflow-x-auto scrollbar-none">
            {renderNavigation(true)}
          </div>
        </div>

        <main className="mx-auto w-full max-w-[1680px] px-4 py-6 sm:px-6 sm:py-8 xl:px-9">
          {isLoading ? (
            <div className="grid min-h-[55vh] place-items-center">
              <div className="text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-amber-600 shadow-sm ring-1 ring-slate-200">
                  <Activity className="size-6 animate-pulse" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-700">{t('loading')}</p>
                <p className="mt-1 text-xs text-slate-400">{isArabic ? 'جارٍ تجهيز ملخص المتجر' : 'Preparing your store overview'}</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <DashboardOverview
                  suppliers={suppliers}
                  orders={orders}
                  onSelectTab={setActiveTab}
                />
              )}
              {activeTab === 'suppliers' && (
                <SuppliersManager suppliers={suppliers} onRefreshSuppliers={fetchAllData} />
              )}
              {activeTab === 'products' && (
                <ProductsManager products={products} suppliers={suppliers} onRefreshProducts={fetchAllData} />
              )}
              {activeTab === 'orders' && (
                <OrdersFulfillment orders={orders} onRefreshOrders={fetchAllData} />
              )}
              {activeTab === 'financials' && (
                <FinancialReports
                  orders={orders}
                  settlements={settlements}
                  suppliers={suppliers}
                  onRefreshFinancials={fetchAllData}
                />
              )}
              {activeTab === 'logs' && (
                <IntegrationLogs logs={logs} suppliers={suppliers} onRefreshLogs={fetchAllData} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
