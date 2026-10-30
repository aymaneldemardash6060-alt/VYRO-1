import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Copy, Check, Database, ShieldCheck, Terminal, Layers } from 'lucide-react';

export const DatabaseMigrationsView: React.FC = () => {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const sqlSchema = `-- ====================================================================
-- VYRO COMMERCE — PRODUCTION DATABASE SCHEMA & SUPABASE MIGRATIONS
-- Multi-Supplier Independent Architecture with Row Level Security (RLS)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE supplier_integration_type AS ENUM ('api', 'manual', 'webhook_only');
CREATE TYPE supplier_connection_status AS ENUM ('active', 'degraded', 'disconnected', 'testing', 'unconfigured');
CREATE TYPE product_sync_status AS ENUM ('synced', 'drift_detected', 'desynced', 'local_only', 'pending');
CREATE TYPE vyro_order_status AS ENUM ('pending', 'processing', 'routed', 'submitted_to_supplier', 'supplier_confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned');
CREATE TYPE fulfillment_suborder_status AS ENUM ('pending_submission', 'submitted', 'in_manual_queue', 'acknowledged', 'processing', 'shipped', 'delivered', 'failed_submission', 'cancelled');
CREATE TYPE settlement_status AS ENUM ('pending', 'reconciled', 'settled', 'disputed');

-- Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    integration_type supplier_integration_type NOT NULL DEFAULT 'manual',
    base_url TEXT,
    auth_method VARCHAR(32) NOT NULL DEFAULT 'none',
    api_key_encrypted TEXT,
    country_code VARCHAR(3) NOT NULL DEFAULT 'EGY',
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    status supplier_connection_status NOT NULL DEFAULT 'unconfigured',
    capabilities JSONB NOT NULL DEFAULT '{"supportsProductSync": false, "supportsInventorySync": false, "supportsPricingSync": false, "supportsAutoOrderSubmission": false, "supportsTrackingSync": false, "supportsCancellation": false, "supportsWebhooks": false}',
    settings JSONB NOT NULL DEFAULT '{"autoSubmitOrders": false, "autoSyncInventory": false, "autoSyncPricing": false, "syncIntervalMinutes": 60, "stockThreshold": 2, "markupPercentage": 30, "settlementCycleDays": 14, "codFeePercent": 2.0}',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(64) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    description TEXT,
    description_ar TEXT,
    category VARCHAR(64) NOT NULL,
    category_ar VARCHAR(64) NOT NULL,
    images TEXT[] NOT NULL DEFAULT '{}',
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    supplier_cost NUMERIC(12, 2) NOT NULL CHECK (supplier_cost >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    supplier_product_id VARCHAR(128),
    supplier_sku VARCHAR(128),
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    sync_status product_sync_status NOT NULL DEFAULT 'local_only',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(64) UNIQUE NOT NULL,
    tracking_code VARCHAR(64) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255),
    shipping_country VARCHAR(64) NOT NULL,
    shipping_governorate VARCHAR(64) NOT NULL,
    shipping_city VARCHAR(64) NOT NULL,
    shipping_address_line TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    subtotal NUMERIC(12, 2) NOT NULL,
    shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cod_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(16) NOT NULL DEFAULT 'cod',
    status vyro_order_status NOT NULL DEFAULT 'pending',
    total_selling_price NUMERIC(12, 2) NOT NULL,
    total_supplier_cost NUMERIC(12, 2) NOT NULL,
    expected_profit NUMERIC(12, 2) NOT NULL,
    realized_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cod_collected BOOLEAN NOT NULL DEFAULT false,
    settlement_status settlement_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fulfillment Sub-Orders (Multi-Supplier Split Routing)
CREATE TABLE fulfillment_suborders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    status fulfillment_suborder_status NOT NULL DEFAULT 'pending_submission',
    external_order_id VARCHAR(128),
    tracking_number VARCHAR(128),
    tracking_carrier VARCHAR(128),
    subtotal_cost NUMERIC(12, 2) NOT NULL,
    shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_suborders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public storefront can read active products"
    ON products FOR SELECT USING (is_active = true);

CREATE POLICY "Admins have full access to all resources"
    ON orders FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">
            {language === 'ar' ? 'مخطط قواعد البيانات و Supabase' : 'Database Schema & Supabase Migrations'}
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            {language === 'ar'
              ? 'مخطط قاعدة بيانات PostgreSQL المتوافق مع Supabase، متضمناً سياسات أمان مستوى الصف (RLS) ومفاتيح الربط التلقائي للموردين.'
              : 'PostgreSQL schema with Supabase Row Level Security (RLS) and multi-supplier relational integrity.'}
          </p>
        </div>

        <button
          onClick={copySql}
          className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? (language === 'ar' ? 'تم نسخ الـ SQL!' : 'Copied!') : (language === 'ar' ? 'نسخ كود الميجريشن' : 'Copy SQL Schema')}</span>
        </button>
      </div>

      {/* Env Vars Checklist Card */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-600" />
          <span>{language === 'ar' ? 'المتغيرات البيئية الموصى بها (Environment Variables)' : 'Recommended Environment Setup'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="font-bold text-stone-800">PORT=3000</span>
            <p className="font-sans text-[11px] text-stone-500">
              {language === 'ar' ? 'المنفذ الافتراضي لخادم Express & Vite' : 'Port for Express & Vite full-stack server'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="font-bold text-stone-800">TAAGER_API_TOKEN</span>
            <p className="font-sans text-[11px] text-stone-500">
              {language === 'ar' ? 'مفتاح الـ Bearer للربط مع دروب شيبنج تاجر' : 'Bearer token for live Taager B2B sync'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="font-bold text-stone-800">SUPABASE_URL</span>
            <p className="font-sans text-[11px] text-stone-500">
              {language === 'ar' ? 'رابط مشروع Supabase في بيئة الإنتاج' : 'Target Supabase project URL'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
            <span className="font-bold text-stone-800">SUPABASE_SERVICE_ROLE_KEY</span>
            <p className="font-sans text-[11px] text-stone-500">
              {language === 'ar' ? 'مفتاح الصلاحيات الكاملة على مستوى الخادم فقط' : 'Server-side key with bypass RLS capability'}
            </p>
          </div>
        </div>
      </div>

      {/* SQL Migration Code Block */}
      <div className="bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-stone-800 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2 font-mono">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>src/server/migrations.sql</span>
          </div>
          <span className="font-mono text-emerald-400">PostgreSQL 15+ / Supabase</span>
        </div>

        <div className="p-6 overflow-x-auto max-h-[600px] overflow-y-auto">
          <pre className="text-xs font-mono text-stone-300 leading-relaxed">
            {sqlSchema}
          </pre>
        </div>
      </div>
    </div>
  );
};
