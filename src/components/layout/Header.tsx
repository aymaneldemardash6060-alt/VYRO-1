import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { ViewMode } from '../../types/index.ts';
import {
  ShoppingBag,
  Search,
  Truck,
  ShieldCheck,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  LayoutDashboard,
  Store
} from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onSearch }) => {
  const { language, setLanguage, currency, setCurrency, t } = useLanguage();
  const { itemsCount, setIsCartOpen } = useCart();
  const [searchInput, setSearchInput] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchInput);
      onNavigate('catalog');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Banner: Independence & Delivery Assurance */}
      <div className="bg-stone-900 text-stone-200 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {language === 'ar'
                ? 'منصة تسوق مستقلة 100% · فحص شامل لكل طلب · دفع عند الاستلام متاح'
                : '100% Independent Commerce · Verified Fulfillment · Cash on Delivery Available'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Currency Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="flex items-center gap-1 text-stone-300 hover:text-white transition-colors cursor-pointer text-xs"
              >
                <span>{currency}</span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {showCurrencyDropdown && (
                <div className="absolute top-full mt-1 end-0 bg-stone-900 border border-stone-800 rounded shadow-xl py-1 z-50 min-w-24">
                  {(['EGP', 'SAR', 'AED', 'USD'] as const).map((curr) => (
                    <button
                      key={curr}
                      onClick={() => {
                        setCurrency(curr);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`w-full text-start px-3 py-1 text-xs transition-colors hover:bg-stone-800 cursor-pointer ${
                        currency === curr ? 'text-amber-400 font-semibold' : 'text-stone-300'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="text-stone-600">|</span>

            {/* Language Switcher */}
            <div className="flex items-center gap-1.5">
              <Globe className="w-3 h-3 text-stone-400" />
              <button
                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                className="hover:text-amber-400 transition-colors font-medium cursor-pointer"
              >
                {language === 'ar' ? 'English (EN)' : 'العربية (AR)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('storefront')}
              className="text-2xl font-extrabold tracking-tight text-stone-900 flex items-center gap-2 cursor-pointer group"
            >
              <span className="w-8 h-8 rounded-lg bg-stone-950 text-white flex items-center justify-center font-black text-lg group-hover:bg-amber-600 transition-colors">
                V
              </span>
              <div className="flex flex-col text-start leading-none">
                <span className="font-black tracking-wider text-xl">VYRO</span>
                <span className="text-[10px] text-stone-500 font-normal">
                  {language === 'ar' ? 'فايرو كومرس' : 'COMMERCE'}
                </span>
              </div>
            </button>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
              <button
                onClick={() => onNavigate('storefront')}
                className={`transition-colors cursor-pointer hover:text-stone-900 ${
                  currentView === 'storefront' ? 'text-stone-900 font-bold border-b-2 border-stone-950 pb-0.5' : ''
                }`}
              >
                {t('navHome')}
              </button>
              <button
                onClick={() => onNavigate('catalog')}
                className={`transition-colors cursor-pointer hover:text-stone-900 ${
                  currentView === 'catalog' ? 'text-stone-900 font-bold border-b-2 border-stone-950 pb-0.5' : ''
                }`}
              >
                {t('navCatalog')}
              </button>
              <button
                onClick={() => onNavigate('order_tracking')}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer hover:text-stone-900 ${
                  currentView === 'order_tracking' ? 'text-stone-900 font-bold border-b-2 border-stone-950 pb-0.5' : ''
                }`}
              >
                <Truck className="w-4 h-4 text-stone-500" />
                <span>{t('navTrackOrder')}</span>
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-md hidden sm:block relative"
          >
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-stone-100 border border-stone-200 rounded-full py-2 ps-10 pe-4 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-stone-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            </div>
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            {/* View Switcher: Storefront <-> Admin Portal */}
            <button
              onClick={() => onNavigate(currentView === 'admin' ? 'storefront' : 'admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
              title={t('adminPortal')}
            >
              {currentView === 'admin' ? (
                <>
                  <Store className="w-3.5 h-3.5" />
                  <span>{t('storefront')}</span>
                </>
              ) : (
                <>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>{t('adminPortal')}</span>
                </>
              )}
            </button>

            {/* Cart Trigger */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-full text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label={t('navCart')}
            >
              <ShoppingBag className="w-5 h-5" />
              {itemsCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 bg-stone-900 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Input */}
        <div className="pb-3 sm:hidden">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full bg-stone-100 border border-stone-200 rounded-full py-2 ps-10 pe-4 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            </div>
          </form>
        </div>
      </div>
    </header>
  );
};
