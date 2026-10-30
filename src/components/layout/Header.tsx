import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { AuthDialog } from '../auth/AuthDialog.tsx';
import { ViewMode } from '../../types/index.ts';
import {
  ShoppingBag,
  Search,
  Truck,
  ShieldCheck,
  Globe,
  ChevronDown,
  LayoutDashboard,
  Store,
  UserRound,
  LogOut,
  Check
} from 'lucide-react';

interface HeaderProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate, onSearch }) => {
  const { language, setLanguage, currency, setCurrency, t } = useLanguage();
  const { itemsCount, setIsCartOpen } = useCart();
  const { user, isAdmin, signOut, passwordRecoveryPending } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const closeAuthDialog = useCallback(() => setShowAuthDialog(false), []);

  // Close the small dropdowns when clicking elsewhere or pressing Escape
  useEffect(() => {
    if (!showCurrencyDropdown && !showAccountMenu) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (showCurrencyDropdown && !currencyRef.current?.contains(target)) setShowCurrencyDropdown(false);
      if (showAccountMenu && !accountRef.current?.contains(target)) setShowAccountMenu(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCurrencyDropdown(false);
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showCurrencyDropdown, showAccountMenu]);

  useEffect(() => {
    if (passwordRecoveryPending) {
      setShowAccountMenu(false);
      setShowAuthDialog(true);
    }
  }, [passwordRecoveryPending]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchInput);
      onNavigate('catalog');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign-out failed', error);
    } finally {
      setShowAccountMenu(false);
      onNavigate('storefront');
    }
  };

  // -top-9 lets the 36px promo strip scroll away while the navbar stays pinned
  return (
    <header className="sticky -top-9 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Banner: Independence & Delivery Assurance */}
      <div className="bg-stone-950 text-stone-300 text-xs">
        <div className="max-w-7xl mx-auto flex h-9 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
            <span className="truncate sm:hidden">
              {language === 'ar' ? 'الدفع عند الاستلام · معاينة عند الباب' : 'Cash on Delivery · Doorstep Inspection'}
            </span>
            <span className="hidden truncate sm:inline">
              {language === 'ar'
                ? 'شحن سريع لكافة المحافظات · معاينة وفحص عند الباب · الدفع عند الاستلام متاح'
                : 'Fast Regional Delivery · Doorstep Inspection · Cash on Delivery Available'}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <div className="relative" ref={currencyRef}>
              <button
                type="button"
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                aria-haspopup="listbox"
                aria-expanded={showCurrencyDropdown}
                aria-label={language === 'ar' ? 'العملة' : 'Currency'}
                className="flex h-7 items-center gap-1 rounded-md px-2 text-xs font-semibold text-stone-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <span>{currency}</span>
                <ChevronDown className={`w-3 h-3 opacity-70 transition-transform ${showCurrencyDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showCurrencyDropdown && (
                <div
                  role="listbox"
                  className="animate-in zoom-in-95 absolute end-0 top-full z-50 mt-1.5 min-w-28 overflow-hidden rounded-xl border border-stone-200 bg-white p-1 shadow-xl ring-1 ring-stone-900/5"
                >
                  {(['EGP', 'SAR', 'AED', 'USD'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      role="option"
                      aria-selected={currency === curr}
                      onClick={() => {
                        setCurrency(curr);
                        setShowCurrencyDropdown(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start text-xs transition-colors cursor-pointer ${
                        currency === curr
                          ? 'bg-stone-100 font-bold text-stone-950'
                          : 'font-medium text-stone-600 hover:bg-stone-50 hover:text-stone-950'
                      }`}
                    >
                      <span>{curr}</span>
                      {currency === curr && <Check className="h-3.5 w-3.5 text-amber-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span aria-hidden="true" className="h-3.5 w-px bg-stone-700" />

            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-stone-300 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-stone-400" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
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

          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:block relative">
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

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => user ? setShowAccountMenu(!showAccountMenu) : setShowAuthDialog(true)}
                className={`flex h-10 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors cursor-pointer ${
                  user
                    ? 'border-stone-200 bg-stone-50 text-stone-800 hover:bg-stone-100'
                    : 'border-stone-950 bg-stone-950 text-white hover:bg-stone-800'
                }`}
                aria-label={language === 'ar' ? 'الحساب' : 'Account'}
                aria-haspopup={user ? 'menu' : 'dialog'}
                aria-expanded={user ? showAccountMenu : showAuthDialog}
              >
                {user ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-stone-950">
                    {(user.email?.[0] ?? 'V').toUpperCase()}
                  </span>
                ) : (
                  <UserRound className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {user ? (language === 'ar' ? 'حسابي' : 'Account') : (language === 'ar' ? 'دخول' : 'Sign in')}
                </span>
              </button>

              {user && showAccountMenu && (
                <div
                  role="menu"
                  className="animate-in zoom-in-95 absolute end-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl ring-1 ring-stone-900/5"
                >
                  <div className="flex items-center gap-3 border-b border-stone-100 bg-stone-50 px-4 py-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-950 text-sm font-black text-white">
                      {(user.email?.[0] ?? 'V').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs text-stone-500">
                        {isAdmin ? (language === 'ar' ? 'مدير المتجر' : 'Store admin') : (language === 'ar' ? 'مسجّل الدخول' : 'Signed in')}
                      </p>
                      <p className="truncate text-sm font-bold text-stone-900" dir="ltr" style={{ textAlign: 'start' }}>
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleSignOut()}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm font-semibold text-stone-700 transition-colors hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      {language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {isAdmin && (
              <button
                onClick={() => onNavigate(currentView === 'admin' ? 'storefront' : 'admin')}
                className={`flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold transition-all cursor-pointer ${
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
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label={t('navCart')}
            >
              <ShoppingBag className="w-5 h-5" />
              {itemsCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-black leading-none text-stone-950 ring-2 ring-white">
                  {itemsCount}
                </span>
              )}
            </button>
          </div>
        </div>

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

      {/* Mobile navigation (the desktop nav is hidden below md) */}
      <nav
        aria-label={language === 'ar' ? 'التنقل' : 'Primary'}
        className="scrollbar-none flex gap-1 overflow-x-auto border-t border-stone-100 px-4 py-2 md:hidden"
      >
        {([
          { view: 'storefront', label: t('navHome') },
          { view: 'catalog', label: t('navCatalog') },
          { view: 'order_tracking', label: t('navTrackOrder') }
        ] as const).map((item) => (
          <button
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
            aria-current={currentView === item.view ? 'page' : undefined}
            className={`h-9 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors cursor-pointer ${
              currentView === item.view
                ? 'bg-stone-950 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {showAuthDialog && (
        <AuthDialog
          onClose={closeAuthDialog}
          initialMode={passwordRecoveryPending ? 'update-password' : 'signin'}
        />
      )}
    </header>
  );
};
