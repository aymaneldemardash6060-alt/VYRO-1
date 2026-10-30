import React from 'react';
import { Product, ViewMode } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { ProductGrid } from './ProductGrid.tsx';
import {
  ArrowRight,
  ArrowLeft,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';

interface HomePageProps {
  products: Product[];
  onNavigate: (view: ViewMode) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ products, onNavigate }) => {
  const { language, t } = useLanguage();
  const ArrowIcon = language === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-stone-900 text-white py-16 lg:py-24 border-b border-stone-800">
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-start">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar'
                    ? 'تشكيلة مختارة 2026 · جودة استثنائية معتمدة'
                    : 'Curated 2026 Collection · Certified Quality'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
                {t('heroTitle')}
              </h1>

              <p className="text-base sm:text-lg text-stone-300 max-w-xl leading-relaxed">
                {t('heroSubtitle')}
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate('catalog')}
                  className="flex h-12 items-center gap-2 rounded-xl bg-amber-500 px-6 text-sm font-extrabold text-stone-950 shadow-lg shadow-amber-500/20 transition-all duration-200 hover:bg-amber-400 cursor-pointer"
                >
                  <span>{t('heroCta')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('order_tracking')}
                  className="flex h-12 items-center gap-2 rounded-xl border border-stone-700 bg-stone-800/80 px-6 text-sm font-bold text-stone-200 transition-all duration-200 hover:bg-stone-800 cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-stone-400" />
                  <span>{t('heroTrackCta')}</span>
                </button>
              </div>

              {/* Quick Trust Badges */}
              <div className="grid grid-cols-1 gap-3 border-t border-stone-800 pt-6 text-xs text-stone-300 min-[480px]:grid-cols-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{language === 'ar' ? 'معاينة ودفع عند الباب' : 'Doorstep COD'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{language === 'ar' ? 'فحص شامل قبل الشحن' : '100% Inspected'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{language === 'ar' ? 'استرجاع مجاني 14 يوم' : '14-Day Returns'}</span>
                </div>
              </div>
            </div>

            {/* Right Hero: Featured Product Showcase Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-stone-800/80 backdrop-blur-md rounded-2xl p-5 border border-stone-700 shadow-2xl space-y-4">
                <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-stone-900 border border-stone-700/50">
                  <img
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"
                    alt="AeroPulse Wireless ANC Headphones"
                    className="h-full w-full object-cover"
                    loading="eager"
                    onError={(event) => {
                      event.currentTarget.style.visibility = 'hidden';
                    }}
                  />
                  <div className="absolute top-3 start-3 bg-amber-500 text-stone-950 text-[10px] font-black px-2.5 py-1 rounded shadow-md">
                    {language === 'ar' ? 'الأكثر طلباً' : 'Best Seller'}
                  </div>
                  <div className="absolute bottom-3 end-3 bg-stone-950/80 backdrop-blur-xs text-white text-xs font-black px-3 py-1 rounded-lg">
                    {language === 'ar' ? '1,250 ج.م' : '1,250 EGP'}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    {language === 'ar'
                      ? 'سماعات AeroPulse اللاسلكية بعزل الضوضاء'
                      : 'AeroPulse Wireless ANC Headphones'}
                  </h3>
                  <p className="text-xs text-stone-400 line-clamp-2">
                    {language === 'ar'
                      ? 'صوت استثنائي عالي الدقة، بطارية تدوم 40 ساعة، ومقاومة للماء وضمان شامل.'
                      : 'High-fidelity audio, 40-hour battery, active noise cancellation, and full warranty.'}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-700/60 flex items-center justify-between">
                  <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'متوفر وجاهز للشحن الفوري' : 'Ready for Instant Dispatch'}</span>
                  </div>

                  <button
                    onClick={() => onNavigate('catalog')}
                    className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-900 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    {language === 'ar' ? 'اطلب الآن' : 'Shop Now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Best Sellers Section */}
      <ProductGrid
        products={products.slice(0, 4)}
        title={t('bestSellers')}
        subtitle={
          language === 'ar'
            ? 'المنتجات الأكثر مبيعاً وتقييماً من عملائنا مع ضمان التوصيل السريع'
            : 'Highest rated and most demanded products with express dispatch'
        }
        onNavigateToCheckout={() => onNavigate('checkout')}
      />

      {/* Mid-Page Promo Banner (Clean Customer-Facing Offer) */}
      <section className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-amber-500 text-stone-950 p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="inline-block px-3 py-1 bg-stone-950 text-white rounded text-xs font-black tracking-wider uppercase">
              {language === 'ar' ? 'عرض ترويجي خاص' : 'Special Offer'}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              {language === 'ar'
                ? 'خصم 10% على كامل مشترياتك باستخدام كود VYRO10'
                : 'Get 10% Off Your Entire Order with Code VYRO10'}
            </h3>
            <p className="text-sm font-medium text-stone-900 leading-relaxed">
              {language === 'ar'
                ? 'تسوق براحة وأمان مع خدمة الدفع عند الاستلام، فحص المنتجات عند باب منزلك، واسترجاع مجاني خلال 14 يوماً.'
                : 'Shop with full confidence: doorstep inspection before payment, Cash on Delivery, and hassle-free returns.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('catalog')}
            className="h-12 w-full shrink-0 rounded-xl bg-stone-950 px-6 text-sm font-extrabold text-white shadow-md transition-all hover:bg-stone-800 cursor-pointer md:w-auto"
          >
            {t('navCatalog')}
          </button>
        </div>
      </section>

      {/* Complete Product Catalog */}
      <ProductGrid
        products={products}
        title={t('allProductsTitle')}
        subtitle={
          language === 'ar'
            ? 'تصفح كل التشكيلات المتاحة مع إمكانية التصفية حسب الفئة والمورد والسعر'
            : 'Browse all products with comprehensive category and supplier filtering'
        }
        onNavigateToCheckout={() => onNavigate('checkout')}
      />
    </div>
  );
};
