import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { ViewMode, Order } from '../../types/index.ts';
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  AlertCircle,
  Copy,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Banknote,
  Layers,
  Lock
} from 'lucide-react';

interface CheckoutPageProps {
  onNavigate: (view: ViewMode) => void;
  onOrderCompleted?: (order: Order) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onNavigate, onOrderCompleted }) => {
  const { language, formatPrice, t } = useLanguage();
  const {
    cart,
    subtotal,
    shipping,
    discount,
    codFee,
    total,
    couponCode,
    clearCart
  } = useCart();

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('Egypt');
  const [governorate, setGovernorate] = useState('Cairo (القاهرة)');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const paymentMethod = 'cod' as const;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [checkoutRequestId] = useState(() => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);

  const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight;

  // Group cart items by supplier to show customer transparent fulfillment breakdown
  const suppliersInCart = Array.from(new Set(cart.map((item) => item.supplierName)));

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!fullName.trim() || !phone.trim() || !city.trim() || !streetAddress.trim()) {
      setSubmitError(
        language === 'ar'
          ? 'يرجى إكمال جميع الحقول المطلوبة (الاسم، الهاتف، المدينة، العنوان).'
          : 'Please complete all required fields (Name, Phone, City, Address).'
      );
      return;
    }

    if (cart.length === 0) {
      setSubmitError(
        language === 'ar' ? 'سلة المشتريات فارغة.' : 'Your cart is currently empty.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // POST to server-side API (which verifies prices against DB)
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': checkoutRequestId },
        body: JSON.stringify({
          customer: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email.trim()
          },
          shippingAddress: {
            fullName: fullName.trim(),
            phone: phone.trim(),
            secondaryPhone: secondaryPhone.trim() || undefined,
            country,
            governorateOrState: governorate,
            city: city.trim(),
            streetAddress: streetAddress.trim(),
            notes: deliveryNotes.trim() || undefined
          },
          cartItems: cart.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity
          })),
          paymentMethod,
          couponCode: couponCode || undefined
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order.');
      }

      const createdOrder: Order = data.data;
      setCompletedOrder(createdOrder);
      clearCart();

      if (onOrderCompleted) {
        onOrderCompleted(createdOrder);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Error communicating with checkout server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTrackingCode = () => {
    if (completedOrder) {
      navigator.clipboard.writeText(completedOrder.trackingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // SUCCESS SCREEN
  if (completedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-8 animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900">
            {t('orderSuccessTitle')}
          </h2>
          <p className="text-sm text-stone-600 max-w-lg mx-auto">
            {t('orderSuccessDesc')}
          </p>
        </div>

        {/* Order Identifier & Tracking Code Box */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 max-w-md mx-auto text-start space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 text-xs">
            <span className="text-stone-500">{t('orderNumberLabel')}</span>
            <span className="font-mono font-bold text-stone-900">{completedOrder.orderNumber}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-stone-500 block">{t('trackingCodeLabel')}</span>
              <span className="font-mono text-lg font-black text-stone-950">
                {completedOrder.trackingCode}
              </span>
            </div>

            <button
              onClick={copyTrackingCode}
              className="p-2 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCode ? (language === 'ar' ? 'تم النسخ!' : 'Copied!') : (language === 'ar' ? 'نسخ' : 'Copy')}</span>
            </button>
          </div>

          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs">
            <span className="text-stone-500">{t('orderTotal')}</span>
            <span className="font-black text-stone-900">
              {formatPrice(completedOrder.totalAmount)}
            </span>
          </div>
        </div>

        {/* Shipping confirmation notice */}
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 max-w-md mx-auto text-xs text-amber-900 flex items-start gap-2.5 text-start">
          <Truck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5">
              {language === 'ar' ? 'تجهيز الشحن السريع' : 'Fast Courier Dispatch'}
            </span>
            <span>
              {language === 'ar'
                ? 'تم تسجيل طلبك بنجاح وجاري فحص وتغليف المنتجات للشحن المباشر لباب منزلك مع إمكانية المعاينة.'
                : 'Your order is verified and being prepared for direct doorstep dispatch with free inspection.'}
            </span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={() => onNavigate('order_tracking')}
            className="px-6 py-3 rounded-xl bg-stone-950 hover:bg-stone-800 text-white font-extrabold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            <span>{t('trackOrderNow')}</span>
          </button>

          <button
            onClick={() => onNavigate('storefront')}
            className="px-6 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            {t('backToHome')}
          </button>
        </div>
      </div>
    );
  }

  // CHECKOUT FORM
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          {t('checkoutTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">{t('checkoutSubtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Column */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmitOrder} className="space-y-8 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs">
            {submitError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Step 1: Customer Contact */}
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-stone-200 mb-4">
                <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-bold text-stone-900">{t('customerInfo')}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('fullName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('fullNamePlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('phone')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t('phonePlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('secondaryPhone')}
                  </label>
                  <input
                    type="tel"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="011XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('email')}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Address */}
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-stone-200 mb-4">
                <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <h3 className="text-sm font-bold text-stone-900">{t('shippingInfo')}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('country')} *
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900 bg-white cursor-pointer"
                  >
                    <option value="Egypt">مصر (Egypt)</option>
                    <option value="Saudi Arabia">المملكة العربية السعودية (KSA)</option>
                    <option value="UAE">الإمارات العربية المتحدة (UAE)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('governorate')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={governorate}
                    onChange={(e) => setGovernorate(e.target.value)}
                    placeholder="Cairo / Giza / Alexandria"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('city')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="New Cairo, Nasr City, Mohandessin..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('streetAddress')} *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="Building name/number, street name, apartment or villa..."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {t('deliveryNotes')}
                  </label>
                  <input
                    type="text"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    placeholder={t('deliveryNotesPlaceholder')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payment Method */}
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-stone-200 mb-4">
                <span className="w-6 h-6 rounded-full bg-stone-900 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h3 className="text-sm font-bold text-stone-900">{t('paymentInfo')}</h3>
              </div>

              <div className="space-y-3">
                {/* Cash on Delivery (Recommended & Active) */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    paymentMethod === 'cod'
                      ? 'border-stone-900 bg-stone-50/80 shadow-xs'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'cod'}
                    disabled
                    className="mt-1 cursor-not-allowed text-stone-900 focus:ring-stone-900"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-stone-900">{t('payCod')}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                        {language === 'ar' ? 'الأكثر أماناً وشيوعاً' : 'Recommended'}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                      {t('payCodDesc')}
                    </p>
                  </div>
                </label>

                <div aria-disabled="true" className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 opacity-60">
                  <CreditCard className="mt-0.5 h-4 w-4 text-stone-500" />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-stone-700">{t('payCard')}</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                      {language === 'ar' ? 'غير متاح حاليًا — لم يتم ربط بوابة دفع إلكتروني.' : 'Unavailable — no online payment provider is connected yet.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-stone-200">
              <button
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                className={`w-full py-4 px-6 rounded-xl text-sm sm:text-base font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  isSubmitting || cart.length === 0
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                    : 'bg-stone-950 hover:bg-stone-800 text-white shadow-stone-950/20'
                }`}
              >
                {isSubmitting ? (
                  <span>{t('processingOrder')}</span>
                ) : (
                  <>
                    <span>{t('placeOrderBtn')} ({formatPrice(total)})</span>
                    <ArrowIcon className="w-5 h-5 text-amber-400" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-stone-400 text-xs mt-3">
                <Lock className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar'
                    ? 'الدفع عند الاستلام فقط في الوقت الحالي'
                    : 'Cash on delivery is the only available payment method'}
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Right Order Summary Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-stone-900 pb-3 border-b border-stone-200">
              {t('orderSummary')} ({cart.reduce((s, i) => s + i.quantity, 0)})
            </h3>

            {/* Items list */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={`${item.productId}-${item.variantId || 'def'}`}
                  className="flex items-center gap-3 text-xs"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-900 truncate">
                      {language === 'ar' ? item.titleAr : item.title}
                    </div>
                    {item.variantTitle && (
                      <div className="text-[11px] text-stone-500">{item.variantTitle}</div>
                    )}
                    <div className="text-stone-400 text-[11px]">
                      {item.quantity} × {formatPrice(item.price)}
                    </div>
                  </div>
                  <div className="font-black text-stone-900">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Doorstep Inspection & COD Assurance */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{language === 'ar' ? 'معاينة مجانية عند الاستلام' : 'Free Doorstep Inspection'}</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {language === 'ar'
                  ? 'يحق لك معاينة طلبك وفحص كافة القطع مع المندوب قبل دفع أي مبالغ نقدية.'
                  : 'You have full rights to inspect all items with the courier before paying in cash.'}
              </p>
            </div>

            {/* Cost Breakdown */}
            <div className="pt-3 border-t border-stone-200 space-y-2 text-xs text-stone-600">
              <div className="flex items-center justify-between">
                <span>{t('subtotal')}</span>
                <span className="font-bold text-stone-900">{formatPrice(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>{t('discount')} ({couponCode})</span>
                  <span className="font-bold">-{formatPrice(discount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span>{t('shipping')}</span>
                <span className="font-bold text-stone-900">{formatPrice(shipping)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>{t('codFee')}</span>
                <span className="font-bold text-stone-900">{formatPrice(codFee)}</span>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-base font-black text-stone-950">
                <span>{t('orderTotal')}</span>
                <span className="text-amber-600">{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* Independence Guarantee Card */}
          <div className="p-5 rounded-2xl bg-stone-900 text-stone-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'ar' ? 'ضمان فايرو المالي واللوجستي' : 'VYRO Fulfillment Guarantee'}</span>
            </div>
            <p className="text-stone-400 leading-relaxed text-[11px]">
              {language === 'ar'
                ? 'لا يتم إرسال بياناتك المالية لأي مورد خارجي. فايرو مسؤول مسؤولية مباشرة عن جودة المنتج، دقة الشحن، وإمكانية الاسترجاع.'
                : 'VYRO handles customer service, returns, and delivery guarantees directly. No external supplier contact is ever needed.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
