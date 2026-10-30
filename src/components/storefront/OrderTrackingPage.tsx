import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Order, FulfillmentSubOrder } from '../../types/index.ts';
import {
  Search,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  MapPin,
  AlertCircle,
  ExternalLink,
  Layers,
  Banknote
} from 'lucide-react';

interface OrderTrackingPageProps {
  initialCode?: string;
}

export const OrderTrackingPage: React.FC<OrderTrackingPageProps> = ({ initialCode = '' }) => {
  const { language, formatPrice, t } = useLanguage();
  const [trackingCode, setTrackingCode] = useState(initialCode);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchOrder = async (codeToSearch: string) => {
    if (!codeToSearch.trim() || !phoneNumber.trim()) {
      setSearchError(language === 'ar' ? 'أدخل رقم الهاتف المستخدم عند إنشاء الطلب.' : 'Enter the phone number used when placing the order.');
      return;
    }
    setIsLoading(true);
    setSearchError(null);

    try {
      const url = `/api/orders/track/${encodeURIComponent(codeToSearch.trim())}?phone=${encodeURIComponent(phoneNumber.trim())}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No shipment found with this tracking code.');
      }

      setOrder(data.data);
    } catch (err: any) {
      setSearchError(err.message);
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTrackingCode(initialCode);
  }, [initialCode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(trackingCode);
  };

  // Helper to determine status progress step (0 to 3)
  const getProgressStep = (status: Order['status']): number => {
    switch (status) {
      case 'pending':
        return 0;
      case 'processing':
      case 'routed':
        return 1;
      case 'submitted_to_supplier':
      case 'supplier_confirmed':
      case 'shipped':
      case 'out_for_delivery':
        return 2;
      case 'delivered':
        return 3;
      default:
        return 1;
    }
  };

  const steps = [
    { title: t('statusStepPlaced'), desc: language === 'ar' ? 'تم تسجيل وتأكيد الطلب' : 'Order verified & registered' },
    { title: t('statusStepRouted'), desc: language === 'ar' ? 'توجيه المستودعات وتجهيز الطرود' : 'Hub dispatch & packing' },
    { title: t('statusStepShipped'), desc: language === 'ar' ? 'في طريق التوصيل مع المندوب' : 'Courier out for delivery' },
    { title: t('statusStepDelivered'), desc: language === 'ar' ? 'تم الاستلام والتحصيل' : 'Delivered & COD settled' }
  ];

  const currentStep = order ? getProgressStep(order.status) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-stone-900 tracking-tight">
          {t('trackingPageTitle')}
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 max-w-lg mx-auto">
          {t('trackingPageSubtitle')}
        </p>
      </div>

      {/* Search Bar Card */}
      <div className="mx-auto max-w-2xl rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                required
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder={t('trackCodeInputPlaceholder')}
                className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 placeholder:text-stone-400 transition-[border-color,box-shadow] hover:border-stone-400 focus:border-stone-900 focus:outline-none focus:ring-4 focus:ring-stone-900/10 sm:text-sm pe-11 font-mono uppercase placeholder:font-sans placeholder:normal-case"
              />
              <Search className="w-4 h-4 text-stone-400 absolute top-1/2 -translate-y-1/2 end-3.5" />
            </div>

            <div className="relative flex-1">
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder={language === 'ar' ? 'رقم الهاتف المستخدم في الطلب' : 'Phone number used for the order'}
                className="h-12 w-full rounded-xl border border-stone-300 bg-white px-4 text-base text-stone-900 placeholder:text-stone-400 transition-[border-color,box-shadow] hover:border-stone-400 focus:border-stone-900 focus:outline-none focus:ring-4 focus:ring-stone-900/10 sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-12 shrink-0 rounded-xl bg-stone-950 px-6 text-sm font-bold text-white transition-colors hover:bg-stone-800 disabled:cursor-wait disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? t('loading') : t('searchOrderBtn')}
            </button>
          </div>

        </form>
      </div>

      {searchError && (
        <div role="alert" className="mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Order Details Result */}
      {order && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Tracking Stepper Card */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
              <div>
                <span className="text-xs text-stone-400 block">{t('trackingCodeLabel')}</span>
                <span className="font-mono text-xl sm:text-2xl font-black text-stone-900">
                  {order.trackingCode}
                </span>
                <span className="text-xs text-stone-500 block mt-0.5">
                  {language === 'ar' ? 'تاريخ الإنشاء:' : 'Created:'}{' '}
                  {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                    dateStyle: 'medium'
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                    order.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : order.status === 'shipped'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-stone-100 text-stone-800'
                  }`}
                >
                  {order.status === 'delivered'
                    ? language === 'ar'
                      ? 'تم التوصيل بنجاح'
                      : 'Delivered'
                    : order.status === 'shipped'
                    ? language === 'ar'
                      ? 'خرج مع المندوب'
                      : 'In Transit'
                    : language === 'ar'
                    ? 'قيد التجهيز والتوجيه'
                    : 'Processing'}
                </span>
              </div>
            </div>

            {/* Stepper Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
              {steps.map((step, idx) => {
                const isPassed = idx <= currentStep;
                const isCurrent = idx === currentStep;

                return (
                  <div key={idx} className="flex flex-col items-start space-y-2">
                    <div className="flex items-center gap-2 w-full">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isPassed
                            ? 'bg-stone-950 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-400 border border-stone-200'
                        } ${isCurrent ? 'ring-4 ring-amber-400/40' : ''}`}
                      >
                        {isPassed ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : idx + 1}
                      </div>

                      {idx < steps.length - 1 && (
                        <div
                          className={`flex-1 h-1 rounded ${
                            idx < currentStep ? 'bg-stone-950' : 'bg-stone-200'
                          }`}
                        />
                      )}
                    </div>

                    <div>
                      <h4
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-stone-950 font-black' : isPassed ? 'text-stone-800' : 'text-stone-400'
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-stone-500 leading-tight mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-Supplier Sub-Orders Parcel Breakdown */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-xs space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-stone-900">{t('subOrdersTitle')}</h3>
              </div>
              <p className="text-xs text-stone-500">{t('multiSupplierNotice')}</p>
            </div>

            <div className="space-y-4">
              {order.subOrders.map((subOrder, index) => (
                <div
                  key={subOrder.id}
                  className="p-5 rounded-xl border border-stone-200 bg-stone-50/60 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-200 gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">
                          {language === 'ar' ? `طرد رقم #${index + 1} · شحنة فايرو السريعة` : `Parcel #${index + 1} · Express Courier`}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            subOrder.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : subOrder.status === 'shipped'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-stone-200 text-stone-800'
                          }`}
                        >
                          {subOrder.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {subOrder.trackingCarrier && (
                        <div className="text-[11px] text-stone-500 mt-1">
                          {t('carrier')}: <span className="font-semibold">{subOrder.trackingCarrier}</span>
                        </div>
                      )}
                    </div>

                    {subOrder.trackingNumber && (
                      <div className="text-end">
                        <span className="text-[10px] text-stone-400 block">{t('externalTracking')}</span>
                        <span className="font-mono text-xs font-bold text-stone-800">
                          {subOrder.trackingNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Parcel Items */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-stone-700 block">
                      {language === 'ar' ? 'محتويات هذا الطرد:' : 'Items in this parcel:'}
                    </span>
                    {subOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 bg-white p-2.5 rounded-lg border border-stone-200 text-xs"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-10 h-10 rounded object-cover border border-stone-100 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-stone-900 truncate block">
                            {language === 'ar' ? item.titleAr : item.title}
                          </span>
                          {item.variantTitle && (
                            <span className="text-[10px] text-stone-400">{item.variantTitle}</span>
                          )}
                        </div>
                        <span className="text-stone-600 font-semibold">
                          {item.quantity} × {formatPrice(item.unitPrice)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {subOrder.notes && (
                    <div className="text-[11px] text-stone-500 bg-white p-2 rounded border border-stone-200">
                      ℹ️ {subOrder.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address & Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Address */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 text-xs space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-stone-900 text-sm">
                <MapPin className="w-4 h-4 text-stone-600" />
                <span>{language === 'ar' ? 'عنوان وجهة التوصيل' : 'Delivery Address'}</span>
              </div>
              <div className="space-y-1 text-stone-600">
                <p className="font-semibold text-stone-900">{order.shippingAddress.fullName}</p>
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.governorateOrState},{' '}
                  {order.shippingAddress.country}
                </p>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200 text-xs space-y-3">
              <div className="flex items-center gap-1.5 font-bold text-stone-900 text-sm">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>{language === 'ar' ? 'بيانات التحصيل والمبلغ' : 'Payment & COD'}</span>
              </div>

              <div className="space-y-1.5 text-stone-600">
                <div className="flex items-center justify-between">
                  <span>{language === 'ar' ? 'طريقة الدفع:' : 'Payment Mode:'}</span>
                  <span className="font-bold text-stone-900">
                    {order.paymentMethod === 'cod' ? t('payCod') : t('payCard')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{language === 'ar' ? 'حالة التحصيل:' : 'Collection Status:'}</span>
                  <span
                    className={`font-bold ${
                      order.financialMetrics.codCollected ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {order.financialMetrics.codCollected
                      ? language === 'ar'
                        ? 'تم التحصيل نقداً'
                        : 'Collected in Cash'
                      : language === 'ar'
                      ? 'مطلوب التحصيل عند الاستلام'
                      : 'To Collect on Delivery'}
                  </span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex items-center justify-between font-black text-sm text-stone-950">
                  <span>{t('orderTotal')}</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
