import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Check, Copy, Database, ShieldCheck, Terminal, TriangleAlert } from 'lucide-react';
import sqlSchema from '../../server/migrations.sql?raw';

export const DatabaseMigrationsView: React.FC = () => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const isArabic = language === 'ar';

  const copySql = async () => {
    try {
      await navigator.clipboard.writeText(sqlSchema);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900 sm:text-2xl">
            {isArabic ? 'مخطط قاعدة البيانات وSupabase' : 'Database Schema & Supabase Migrations'}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-stone-500">
            {isArabic
              ? 'معاينة ملف SQL المصدري لقاعدة PostgreSQL وسياسات RLS.'
              : 'Preview the source SQL schema and its PostgreSQL Row Level Security policies.'}
          </p>
        </div>
        <button
          onClick={() => void copySql()}
          className="flex cursor-pointer items-center gap-2 self-start rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-stone-800 sm:self-auto"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          <span>{copied ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ ملف SQL' : 'Copy SQL')}</span>
        </button>
      </div>

      <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="space-y-1">
          <h3 className="text-sm font-black">
            {isArabic ? 'مهم: طبقة البيانات متصلة عبر Supabase' : 'Supabase persistence is implemented'}
          </h3>
          <p className="text-xs leading-relaxed">
            {isArabic
              ? 'المنتجات والطلبات والموردون والسجلات والتسويات تُقرأ وتُكتب عبر Supabase. يجب تطبيق ملف SQL مرة واحدة على مشروع vyro، ثم ضبط متغيرات البيئة في Vercel قبل النشر.'
              : 'Products, orders, suppliers, logs, and settlements now use Supabase persistence. Apply this SQL once to the vyro project, then configure the Vercel environment variables before deployment.'}
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <Terminal className="h-4 w-4 text-amber-600" />
          <span>{isArabic ? 'متغيرات البيئة المطلوبة للمصادقة والبيانات' : 'Environment variables for auth and persistence'}</span>
        </h3>
        <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
          {[
            ['VITE_SUPABASE_URL', isArabic ? 'رابط المشروع المستخدم في الواجهة.' : 'Project URL used by the browser client.'],
            ['VITE_SUPABASE_PUBLISHABLE_KEY', isArabic ? 'المفتاح العام للنشر والمصادقة في الواجهة.' : 'Publishable key used by the browser client.'],
            ['SUPABASE_URL', isArabic ? 'رابط المشروع الذي يتحقق منه الخادم.' : 'Project URL used by server-side token verification.'],
            ['SUPABASE_PUBLISHABLE_KEY', isArabic ? 'المفتاح العام الذي يستخدمه الخادم للتحقق من الجلسة.' : 'Publishable key used by the server to verify sessions.'],
            ['SUPABASE_SERVICE_ROLE_KEY', isArabic ? 'مفتاح سري للخادم فقط لعمليات لوحة الإدارة وقاعدة البيانات.' : 'Server-only secret for admin data access; never expose to the browser.'],
            ['SUPPLIER_CREDENTIALS_ENCRYPTION_KEY', isArabic ? 'مفتاح خادمي اختياري عند حفظ أسرار الموردين.' : 'Optional server-only encryption key for supplier credentials.']
          ].map(([name, description]) => (
            <div key={name} className="space-y-1 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <span className="font-mono font-bold text-stone-800">{name}</span>
              <p className="text-[11px] leading-relaxed text-stone-500">{description}</p>
            </div>
          ))}
        </div>
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-stone-600">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
          <span>
            {isArabic
              ? 'لا تضع SUPABASE_SERVICE_ROLE_KEY أو مفتاح تشفير الموردين في VITE_* أو ملفات المصدر أو GitHub. أضفهما في متغيرات البيئة الخادمية في Vercel فقط.'
              : 'Never put SUPABASE_SERVICE_ROLE_KEY or the supplier encryption key in VITE_* variables, source files, or GitHub. Add them only as server environment variables in Vercel.'}
          </span>
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-800 p-4 text-xs text-stone-400">
          <div className="flex items-center gap-2 font-mono">
            <Database className="h-4 w-4 text-emerald-400" />
            <span>src/server/migrations.sql</span>
          </div>
          <span className="font-mono text-emerald-400">PostgreSQL / Supabase</span>
        </div>
        <div className="max-h-[600px] overflow-auto p-6">
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-stone-300">{sqlSchema}</pre>
        </div>
      </div>
    </div>
  );
};
