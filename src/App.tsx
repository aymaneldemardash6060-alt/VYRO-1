/**
 * VYRO Commerce — Independent Multi-Supplier Platform
 * Production Application Root
 */

import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext.tsx';
import { CartProvider, useCart } from './context/CartContext.tsx';
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
          <AdminLayout
            onNavigateToStore={() => setCurrentView('storefront')}
          />
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
    <LanguageProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </LanguageProvider>
  );
}
