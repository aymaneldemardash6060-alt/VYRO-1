import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations.ts';
import { Currency } from '../types/index.ts';

export type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  direction: 'rtl' | 'ltr';
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  t: (key: keyof typeof translations['ar']) => string;
  formatPrice: (amountInEGP: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Base rates relative to 1 EGP
const EXCHANGE_RATES: Record<Currency, number> = {
  EGP: 1,
  SAR: 1 / 13.0,
  AED: 1 / 13.2,
  USD: 1 / 48.5
};

const CURRENCY_SYMBOLS: Record<Currency, { ar: string; en: string }> = {
  EGP: { ar: 'ج.م', en: 'EGP' },
  SAR: { ar: 'ر.س', en: 'SAR' },
  AED: { ar: 'د.إ', en: 'AED' },
  USD: { ar: '$', en: '$' }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('vyro_lang');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar'; // Arabic default
  });

  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem('vyro_currency');
    return (saved as Currency) || 'EGP';
  });

  const direction = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    localStorage.setItem('vyro_lang', language);

    // Apply domain typography fonts
    if (language === 'ar') {
      document.body.style.fontFamily = "'Tajawal', system-ui, -apple-system, sans-serif";
    } else {
      document.body.style.fontFamily = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
    }
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('vyro_currency', c);
  };

  const t = (key: keyof typeof translations['ar']): string => {
    const dict = translations[language] || translations.ar;
    return dict[key] || translations.ar[key] || String(key);
  };

  const formatPrice = (amountInEGP: number): string => {
    const rate = EXCHANGE_RATES[currency] || 1;
    const converted = amountInEGP * rate;
    const symbol = CURRENCY_SYMBOLS[currency][language];

    const formattedNum = new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: 2
    }).format(converted);

    return language === 'ar' ? `${formattedNum} ${symbol}` : `${symbol} ${formattedNum}`;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        direction,
        setLanguage,
        currency,
        setCurrency,
        t,
        formatPrice
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
