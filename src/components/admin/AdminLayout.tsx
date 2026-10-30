import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import {
  AdminTab,
  SupplierConfig,
  Product,
  Order,
  IntegrationLog,
  SupplierSettlement,
  ViewMode
} from '../../types/index.ts';
import {
  LayoutDashboard,
  Server,
  Package,
  Layers,
  DollarSign,
  FileText,
  Database,
  Store,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { DashboardOverview } from './DashboardOverview.tsx';
import { SuppliersManager } from './SuppliersManager.tsx';
import { ProductsManager } from './ProductsManager.tsx';
import { OrdersFulfillment } from './OrdersFulfillment.tsx';
import { FinancialReports } from './FinancialReports.tsx';
import { IntegrationLogs } from './IntegrationLogs.tsx';
import { DatabaseMigrationsView } from './DatabaseMigrationsView.tsx';
import { adminFetch } from '../../lib/api.ts';

interface AdminLayoutProps {
  onNavigateToStore: () => void;
  initialTab?: AdminTab;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  onNavigateToStore,
  initialTab = 'overview'
}) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  // Loaded data states
  const [suppliers, setSuppliers] = useState<SupplierConfig[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [settlements, setSettlements] = useState<SupplierSettlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = async () => {
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
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const tabs: { key: AdminTab; label: string; icon: React.ElementType }[] = [
    { key: 'overview', label: t('tabOverview'), icon: LayoutDashboard },
    { key: 'suppliers', label: t('tabSuppliers'), icon: Server },
    { key: 'products', label: t('tabProducts'), icon: Package },
    { key: 'orders', label: t('tabOrders'), icon: Layers },
    { key: 'financials', label: t('tabFinancials'), icon: DollarSign },
    { key: 'logs', label: t('tabLogs'), icon: FileText },
    { key: 'migrations', label: t('tabMigrations'), icon: Database }
  ];

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 pb-16">
      {/* Admin Top Bar */}
      <div className="bg-stone-950 text-white border-b border-stone-800 md:sticky md:top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black tracking-widest text-amber-400 font-mono">
                VYRO / ADMIN
              </span>
              <span className="text-stone-600">|</span>
              <span className="text-xs font-semibold text-stone-300">
                {t('adminTitle')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchAllData}
                disabled={isLoading}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-stone-300 transition-colors hover:bg-stone-800 cursor-pointer disabled:opacity-60"
                title="Refresh All"
                aria-label="Refresh All"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              <button
                onClick={onNavigateToStore}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-all cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>{t('storefront')}</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-400 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:text-white hover:bg-stone-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Admin Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {isLoading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold text-stone-600">{t('loading')}</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <DashboardOverview
                suppliers={suppliers}
                orders={orders}
                onSelectTab={(tab) => setActiveTab(tab)}
                onRefreshStats={fetchAllData}
              />
            )}

            {activeTab === 'suppliers' && (
              <SuppliersManager
                suppliers={suppliers}
                onRefreshSuppliers={fetchAllData}
              />
            )}

            {activeTab === 'products' && (
              <ProductsManager
                products={products}
                suppliers={suppliers}
                onRefreshProducts={fetchAllData}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersFulfillment
                orders={orders}
                onRefreshOrders={fetchAllData}
              />
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
              <IntegrationLogs
                logs={logs}
                suppliers={suppliers}
                onRefreshLogs={fetchAllData}
              />
            )}

            {activeTab === 'migrations' && <DatabaseMigrationsView />}
          </>
        )}
      </main>
    </div>
  );
};
