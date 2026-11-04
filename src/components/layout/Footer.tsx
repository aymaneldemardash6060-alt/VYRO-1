import React from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { ShieldCheck, Truck, RotateCcw, CreditCard, Layers, MessageCircle } from 'lucide-react';
import { ViewMode } from '../../types/index.ts';

interface FooterProps {
  onNavigate: (view: ViewMode) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { language, t } = useLanguage();

  return (
    <footer className="bg-stone-950 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Trust Badges Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-stone-800 text-stone-200">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-amber-400 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{t('trustTitle1')}</h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{t('trustDesc1')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-amber-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{t('trustTitle2')}</h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{t('trustDesc2')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{t('trustTitle3')}</h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{t('trustDesc3')}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-stone-900 border border-stone-800 text-amber-400 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">{t('trustTitle4')}</h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{t('trustDesc4')}</p>
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-12 border-b border-stone-800">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded bg-amber-500 text-stone-950 font-black flex items-center justify-center text-sm">
                V
              </span>
              <span className="text-xl font-black text-white tracking-wider">VYRO COMMERCE</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              {language === 'ar'
                ? 'وجهتك الأولى لتسوق أفضل المنتجات العصرية بأعلى معايير الجودة، مع فحص دقيق قبل الشحن، وتوصيل سريع لباب منزلك، والدفع عند الاستلام.'
                : 'Your premier destination for verified lifestyle, fashion, and tech products with doorstep Cash on Delivery and hassle-free returns.'}
            </p>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              {language === 'ar' ? 'التسوق' : 'Shop'}
            </h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => onNavigate('catalog')} className="hover:text-white transition-colors cursor-pointer">
                  {t('allProductsTitle')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog')} className="hover:text-white transition-colors cursor-pointer">
                  {t('bestSellers')}
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('catalog')} className="hover:text-white transition-colors cursor-pointer">
                  {t('featuredProducts')}
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              {language === 'ar' ? 'خدمة العملاء' : 'Customer Care'}
            </h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => onNavigate('order_tracking')} className="hover:text-white transition-colors cursor-pointer">
                  {t('navTrackOrder')}
                </button>
              </li>
              <li>
                <span className="text-stone-500">{language === 'ar' ? 'سياسة الإرجاع 14 يوم' : '14-Day Return Policy'}</span>
              </li>
              <li>
                <span className="text-stone-500">{language === 'ar' ? 'الشحن والدفع عند الاستلام' : 'COD & Shipping Rates'}</span>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              {language === 'ar' ? 'الأمان والضمان' : 'Trust & Safety'}
            </h5>
            <p className="text-xs text-stone-400 leading-relaxed">
              {language === 'ar'
                ? 'جميع المنتجات تخضع للفحص المباشر قبل التغليف. يحق لك معاينة طلبك بالكامل والدفع نقداً عند الاستلام دون أي مخاطرة.'
                : 'Every order is strictly inspected prior to packaging. Inspect your items upon arrival and pay cash at your doorstep.'}
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'ar' ? 'ضمان استرداد أموالك 100%' : '100% Buyer Protection'}</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Contact */}
        <div className="border-b border-stone-800 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h5 className="text-sm font-bold text-white">{language === 'ar' ? 'تواصل مع VYRO' : 'Contact VYRO'}</h5>
            <p className="mt-1 text-xs text-stone-400">{language === 'ar' ? 'راسلنا مباشرة عبر واتساب' : 'Message us directly on WhatsApp'}</p>
          </div>
          <a
            href="https://wa.me/201271061162"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={language === 'ar' ? 'التواصل مع VYRO عبر واتساب' : 'Contact VYRO on WhatsApp'}
            className="inline-flex items-center gap-2 rounded-full border border-stone-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-emerald-500 hover:bg-stone-900"
          >
            <MessageCircle className="h-4 w-4 text-emerald-400" />
            <span dir="ltr">01271061162</span>
          </a>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© 2026 VYRO Commerce Platform. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>{language === 'ar' ? 'القاهرة · الرياض · دبي' : 'Cairo · Riyadh · Dubai'}</span>
            <span>{t('currencyNote')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
