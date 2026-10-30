import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { ViewMode } from '../../types/index.ts';
import { X, Trash2, ArrowRight, ArrowLeft, ShieldCheck, Tag, ShoppingBag, Minus, Plus } from 'lucide-react';

interface CartDrawerProps {
  onNavigateToCheckout: () => void;
  onExploreProducts: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  onNavigateToCheckout,
  onExploreProducts
}) => {
  const { language, formatPrice, t } = useLanguage();
  const {
    cart,
    removeFromCart,
    updateQuantity,
    subtotal,
    shipping,
    discount,
    codFee,
    total,
    itemsCount,
    couponCode,
    applyCoupon,
    removeCoupon,
    isCartOpen,
    setIsCartOpen
  } = useCart();

  const [inputCoupon, setInputCoupon] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Lock page scroll behind the drawer and close on Escape
  useEffect(() => {
    if (!isCartOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsCartOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');
    if (applyCoupon(inputCoupon)) {
      setCouponSuccess(t('couponApplied'));
      setInputCoupon('');
    } else {
      setCouponError(t('couponInvalid'));
    }
  };

  const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div
      className="vyro-backdrop fixed inset-0 z-50 flex justify-end overflow-hidden bg-stone-950/55 backdrop-blur-xs"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsCartOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('cartTitle')}
        className="animate-in slide-in-from-end flex h-dvh w-full max-w-md flex-col bg-white shadow-2xl duration-300"
      >
        {/* Drawer Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-stone-700" />
            <h3 className="text-base sm:text-lg font-extrabold text-stone-900">
              {t('cartTitle')}
            </h3>
            <span className="min-w-6 rounded-full bg-stone-950 px-2 py-0.5 text-center text-xs font-bold text-white">
              {itemsCount}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label={language === 'ar' ? 'إغلاق السلة' : 'Close cart'}
            className="-me-2 flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-stone-400">
                <ShoppingBag className="h-9 w-9" />
              </div>
              <p className="text-sm font-bold text-stone-800">{t('cartEmpty')}</p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">{t('cartEmptySub')}</p>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onExploreProducts();
                }}
                className="mt-2 h-11 rounded-xl bg-stone-950 px-6 text-sm font-bold text-white transition-colors hover:bg-stone-800 cursor-pointer"
              >
                {t('startShopping')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || 'def'}`}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-xs"
                >
                  <img
                    src={item.image}
                    alt={language === 'ar' ? item.titleAr : item.title}
                    className="h-20 w-20 shrink-0 rounded-xl border border-stone-200 bg-stone-100 object-cover"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-sm font-bold text-stone-900">
                      {language === 'ar' ? item.titleAr : item.title}
                    </h4>

                    {item.variantTitle && (
                      <p className="mt-0.5 truncate text-xs text-stone-500">{item.variantTitle}</p>
                    )}

                    <div className="mt-1 text-sm font-black text-stone-950">
                      {formatPrice(item.price)}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center overflow-hidden rounded-lg border border-stone-300 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.variantId, -1)}
                          aria-label={language === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'}
                          className="flex h-8 w-8 items-center justify-center text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm font-bold tabular-nums text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.productId, item.variantId, 1)}
                          aria-label={language === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                          className="flex h-8 w-8 items-center justify-center text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId, item.variantId)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                        title={language === 'ar' ? 'حذف من السلة' : 'Remove from cart'}
                        aria-label={language === 'ar' ? 'حذف من السلة' : 'Remove from cart'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Coupon Section */}
              <div className="pt-2">
                {couponCode ? (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{couponCode} (-10%)</span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-stone-500 hover:text-stone-800 text-xs font-semibold cursor-pointer underline"
                    >
                      {language === 'ar' ? 'إزالة' : 'Remove'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputCoupon}
                        onChange={(e) => setInputCoupon(e.target.value)}
                        placeholder={t('couponPlaceholder')}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-sm uppercase text-stone-800 placeholder:normal-case placeholder:text-stone-400 focus:border-stone-900 focus:outline-none focus:ring-4 focus:ring-stone-900/10"
                      />
                      <button
                        type="submit"
                        className="h-10 shrink-0 rounded-lg bg-stone-950 px-4 text-sm font-bold text-white transition-colors hover:bg-stone-800 cursor-pointer"
                      >
                        {t('applyCoupon')}
                      </button>
                    </div>
                    {couponError && <p role="alert" className="text-xs text-rose-600">{couponError}</p>}
                    {couponSuccess && <p role="status" className="text-xs text-emerald-600">{couponSuccess}</p>}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer / Checkout CTA */}
        {cart.length > 0 && (
          <div className="shrink-0 space-y-3 border-t border-stone-200 bg-stone-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 sm:pb-6">
            <div className="space-y-2 text-sm text-stone-600">
              <div className="flex items-center justify-between">
                <span>{t('subtotal')}</span>
                <span className="font-semibold text-stone-900">{formatPrice(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>{t('discount')}</span>
                  <span className="font-semibold">-{formatPrice(discount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>{t('shipping')}</span>
                <span className="font-semibold text-stone-900">{formatPrice(shipping)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>{t('codFee')}</span>
                <span className="font-semibold text-stone-900">{formatPrice(codFee)}</span>
              </div>

              <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-sm sm:text-base font-black text-stone-950">
                <span>{t('orderTotal')}</span>
                <span className="text-amber-600">{formatPrice(total)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsCartOpen(false);
                onNavigateToCheckout();
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-stone-950 px-4 text-sm font-extrabold text-white shadow-md transition-colors duration-200 hover:bg-stone-800 cursor-pointer"
            >
              <span>{t('proceedToCheckout')}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-stone-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {language === 'ar'
                  ? 'دفع عند الاستلام مع فحص كامل للشحنة'
                  : 'Cash on delivery with full parcel inspection'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
