/**
 * VYRO Commerce — Independent Multi-Supplier Platform
 * Production Application Root
 */

import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { CartProvider, useCart } from './context/CartContext.tsx';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ViewMode, Product } from './types/index.ts';
import { Header } from './components/layout/Header.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { HomePage } from './components/storefront/HomePage.tsx';
import { ProductGrid } from './components/storefront/ProductGrid.tsx';
import { CartDrawer } from './components/storefront/CartDrawer.tsx';
import { CheckoutPage } from './components/storefront/CheckoutPage.tsx';
import { OrderTrackingPage } from './components/storefront/OrderTrackingPage.tsx';
import { AdminLayout } from './components/admin/AdminLayout.tsx';

function MainApp() {
  const { language } = useLanguage();
  const { isAdmin, loading: authLoading, isConfigured: authConfigured } = useAuth();
  const [currentView, setCurrentView] = useState<ViewMode>('storefront');
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [trackingInitialCode, setTrackingInitialCode] = useState<string>('');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // Scroll to top on view change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  const handleSearch = (query: string) => {
    setCatalogSearch(query);
    setCurrentView('catalog');
  };

  const handleOrderCompleted = (order: any) => {
    setTrackingInitialCode(order.trackingCode);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50/30 text-stone-900 selection:bg-amber-400 selection:text-stone-950 font-sans">
      {/* Global Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onSearch={handleSearch}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'storefront' && (
          <HomePage
            products={products}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}

        {currentView === 'catalog' && (
          <div className="py-6">
            <ProductGrid
              products={products}
              subtitle={
                catalogSearch
                  ? `Search results for "${catalogSearch}"`
                  : undefined
              }
              onNavigateToCheckout={() => setCurrentView('checkout')}
            />
          </div>
        )}

        {currentView === 'checkout' && (
          <CheckoutPage
            onNavigate={(view) => setCurrentView(view)}
            onOrderCompleted={handleOrderCompleted}
          />
        )}

        {currentView === 'order_tracking' && (
          <OrderTrackingPage initialCode={trackingInitialCode} />
        )}

        {currentView === 'admin' && (
          authLoading ? (
            <div className="mx-auto max-w-xl px-6 py-24 text-center text-sm font-semibold text-stone-600">
              {language === 'ar' ? 'جارٍ التحقق من صلاحيات الحساب...' : 'Checking account permissions...'}
            </div>
          ) : isAdmin ? (
            <AdminLayout onNavigateToStore={() => setCurrentView('storefront')} />
          ) : (
            <section className="mx-auto max-w-xl px-6 py-24 text-center">
              <h1 className="text-2xl font-black text-stone-950">
                {authConfigured
                  ? (language === 'ar' ? 'الدخول إلى الإدارة مقيّد' : 'Admin access is restricted')
                  : (language === 'ar' ? 'تسجيل الدخول غير مهيأ' : 'Authentication is not configured')}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-stone-600">
                {authConfigured
                  ? (language === 'ar'
                    ? 'سجّل الدخول من زر الحساب. لا يمكن فتح لوحة الإدارة إلا لحساب مُنح صلاحية admin في Supabase.'
                    : 'Sign in from the account button. Only a user assigned the admin role in Supabase can open this dashboard.')
                  : (language === 'ar'
                    ? 'يلزم تهيئة Supabase Auth قبل استخدام لوحة الإدارة.'
                    : 'Supabase Auth must be configured before the admin dashboard can be used.')}
              </p>
              <button onClick={() => setCurrentView('storefront')} className="mt-6 rounded-xl bg-stone-950 px-5 py-3 text-sm font-bold text-white hover:bg-stone-800">
                {language === 'ar' ? 'العودة للمتجر' : 'Back to storefront'}
              </button>
            </section>
          )
        )}
      </main>

      {/* Cart Drawer Slide-Over */}
      <CartDrawer
        onNavigateToCheckout={() => setCurrentView('checkout')}
        onExploreProducts={() => setCurrentView('catalog')}
      />

      {/* Global Footer (shown on storefront views) */}
      {currentView !== 'admin' && (
        <Footer onNavigate={(view) => setCurrentView(view)} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <CartProvider>
          <MainApp />
        </CartProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
