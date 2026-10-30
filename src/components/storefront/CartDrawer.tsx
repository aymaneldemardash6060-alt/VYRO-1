import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { ViewMode } from '../../types/index.ts';
import { X, Trash2, ArrowRight, ArrowLeft, ShieldCheck, Tag } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-end duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-6 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-extrabold text-stone-900">
              {t('cartTitle')}
            </h3>
            <span className="text-xs bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded-full">
              {itemsCount}
            </span>
          </div>

          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center">
                <Tag className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-stone-800">{t('cartEmpty')}</p>
              <p className="text-xs text-stone-500 max-w-xs mx-auto">{t('cartEmptySub')}</p>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  onExploreProducts();
                }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {t('startShopping')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || 'def'}`}
                  className="flex items-center gap-3 p-3 rounded-xl border border-stone-200 bg-stone-50/50"
                >
                  <img
                    src={item.image}
                    alt={language === 'ar' ? item.titleAr : item.title}
                    className="w-16 h-16 rounded-lg object-cover bg-white border border-stone-200 shrink-0"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate">
                      {language === 'ar' ? item.titleAr : item.title}
                    </h4>

                    {item.variantTitle && (
                      <p className="text-[11px] text-stone-500 mt-0.5">{item.variantTitle}</p>
                    )}

                    <div className="text-xs font-black text-stone-950 mt-1">
                      {formatPrice(item.price)}
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-stone-300 rounded bg-white">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, -1)}
                          className="px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-100 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2.5 py-0.5 text-xs font-bold text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, 1)}
                          className="px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-100 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.productId, item.variantId)}
                        className="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer p-1"
                        title="Remove"
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
                        className="flex-1 px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-800 uppercase focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        {t('applyCoupon')}
                      </button>
                    </div>
                    {couponError && <p className="text-[11px] text-rose-600">{couponError}</p>}
                    {couponSuccess && <p className="text-[11px] text-emerald-600">{couponSuccess}</p>}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer / Checkout CTA */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-stone-200 bg-stone-50 space-y-3">
            <div className="space-y-1.5 text-xs text-stone-600">
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
              className="w-full py-3.5 px-4 rounded-xl bg-stone-950 hover:bg-stone-800 text-white text-xs sm:text-sm font-extrabold transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t('proceedToCheckout')}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 pt-1">
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
