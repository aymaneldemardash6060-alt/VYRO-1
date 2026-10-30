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
    <div className="space-y-12 pb-16">
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
                    ? 'بنية تجارة إلكترونية مستقلة ومتعددة الموردين'
                    : 'Independent Multi-Supplier Architecture'}
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
                  className="px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-sm transition-all duration-200 shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
                >
                  <span>{t('heroCta')}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('order_tracking')}
                  className="px-6 py-3.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-200 border border-stone-700 font-bold text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer"
                >
                  <Truck className="w-4 h-4 text-stone-400" />
                  <span>{t('heroTrackCta')}</span>
                </button>
              </div>

              {/* Quick Trust Badges */}
              <div className="pt-6 border-t border-stone-800 grid grid-cols-3 gap-4 text-xs text-stone-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{language === 'ar' ? 'دفع عند الباب' : 'COD Available'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{language === 'ar' ? 'فحص جودة صارم' : 'Verified Goods'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{language === 'ar' ? 'توصيل مباشر' : 'Direct Dispatch'}</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Feature */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md bg-stone-800/60 backdrop-blur-md rounded-2xl p-6 border border-stone-700/80 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-stone-200">
                      {language === 'ar' ? 'نظام التوجيه الذكي للموردين' : 'Smart Routing Engine'}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">LIVE / AGNOSTIC</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-700/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Taager B2B Network</div>
                      <div className="text-stone-400 text-[11px]">
                        {language === 'ar' ? 'إلكترونيات واستهلاكيات' : 'Electronics & Tech'}
                      </div>
                    </div>
                    <span className="text-emerald-400 font-mono text-[11px]">
                      {language === 'ar' ? 'متصل' : 'Active'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-700/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Cairo Central Hub</div>
                      <div className="text-stone-400 text-[11px]">
                        {language === 'ar' ? 'مستودع فايرو المحلي' : 'Internal Warehouse'}
                      </div>
                    </div>
                    <span className="text-emerald-400 font-mono text-[11px]">
                      {language === 'ar' ? 'طابور فوري' : 'Manual Queue'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-stone-900/80 border border-stone-700/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Alexandria Artisan Leather</div>
                      <div className="text-stone-400 text-[11px]">
                        {language === 'ar' ? 'تصنيع يدوي محلي' : 'Artisan Workshop'}
                      </div>
                    </div>
                    <span className="text-emerald-400 font-mono text-[11px]">
                      {language === 'ar' ? 'شحن مباشر' : 'Direct Dispatch'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-400 italic pt-1 text-center">
                  {language === 'ar'
                    ? 'تسوق كعميل واحد وسلة واحدة؛ و فايرو يتولى التنسيق وتوزيع الطرود بسلاسة تامة.'
                    : 'One unified cart & checkout. VYRO routes line-items to verified suppliers behind the scenes.'}
                </p>
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

      {/* Mid-Page Value Statement Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-amber-500 text-stone-950 p-8 sm:p-12 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl text-start">
            <div className="inline-block px-3 py-1 bg-stone-950 text-white rounded text-xs font-black tracking-wider uppercase">
              {language === 'ar' ? 'التجارة المستقلة' : 'Zero Lock-In'}
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              {language === 'ar'
                ? 'استقلال كامل لـ فايرو: لا تحويل خارجي، لا اعتماد حصري، وسداد آمن عند الاستلام'
                : 'Built Independent: No external redirects, zero supplier lock-in, and reliable COD.'}
            </h3>
            <p className="text-sm font-medium text-stone-900 leading-relaxed">
              {language === 'ar'
                ? 'حتى في حال تعطل أي مورد خارجي أو انقطاع الـ API، تستمر عمليات فايرو بكفاءة تامة من خلال مستودعاتنا المركزية وطوابير الشحن اليدوية الموازية.'
                : 'If any external supplier API experiences downtime, VYRO automatically fails over to internal fulfillment queues without disrupting the customer.'}
            </p>
          </div>

          <button
            onClick={() => onNavigate('catalog')}
            className="px-6 py-3.5 bg-stone-950 hover:bg-stone-800 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-md shrink-0"
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
