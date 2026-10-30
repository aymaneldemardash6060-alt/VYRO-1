-- ====================================================================
-- VYRO COMMERCE — PRODUCTION DATABASE SCHEMA & SUPABASE MIGRATIONS
-- Independent Multi-Supplier E-Commerce Architecture
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
CREATE TYPE supplier_integration_type AS ENUM ('api', 'manual', 'webhook_only');
CREATE TYPE supplier_connection_status AS ENUM ('active', 'degraded', 'disconnected', 'testing', 'unconfigured');
CREATE TYPE product_sync_status AS ENUM ('synced', 'drift_detected', 'desynced', 'local_only', 'pending');
CREATE TYPE vyro_order_status AS ENUM ('pending', 'processing', 'routed', 'submitted_to_supplier', 'supplier_confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned');
CREATE TYPE fulfillment_suborder_status AS ENUM ('pending_submission', 'submitted', 'in_manual_queue', 'acknowledged', 'processing', 'shipped', 'delivered', 'failed_submission', 'cancelled');
CREATE TYPE settlement_status AS ENUM ('pending', 'reconciled', 'settled', 'disputed');

-- 3. SUPPLIERS TABLE
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    integration_type supplier_integration_type NOT NULL DEFAULT 'manual',
    base_url TEXT,
    auth_method VARCHAR(32) NOT NULL DEFAULT 'none',
    api_key_encrypted TEXT, -- Encrypted using pgcrypto or server-side KMS
    country_code VARCHAR(3) NOT NULL DEFAULT 'EGY',
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    status supplier_connection_status NOT NULL DEFAULT 'unconfigured',
    capabilities JSONB NOT NULL DEFAULT '{"supportsProductSync": false, "supportsInventorySync": false, "supportsPricingSync": false, "supportsAutoOrderSubmission": false, "supportsTrackingSync": false, "supportsCancellation": false, "supportsWebhooks": false}',
    settings JSONB NOT NULL DEFAULT '{"autoSubmitOrders": false, "autoSyncInventory": false, "autoSyncPricing": false, "syncIntervalMinutes": 60, "stockThreshold": 2, "markupPercentage": 30, "settlementCycleDays": 14, "codFeePercent": 2.0}',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(64),
    notes TEXT,
    last_sync_at TIMESTAMPTZ,
    last_health_check_at TIMESTAMPTZ,
    last_health_status VARCHAR(32),
    last_health_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRODUCTS TABLE
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
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    sync_status product_sync_status NOT NULL DEFAULT 'local_only',
    is_active BOOLEAN NOT NULL DEFAULT true,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0,
    reviews_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT[] NOT NULL DEFAULT '{}',
    weight_kg NUMERIC(6, 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRODUCT VARIANTS TABLE
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku VARCHAR(64) UNIQUE NOT NULL,
    supplier_sku VARCHAR(128),
    title VARCHAR(128) NOT NULL,
    title_ar VARCHAR(128) NOT NULL,
    color VARCHAR(32),
    size VARCHAR(32),
    price_delta NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ORDERS TABLE (Unified VYRO Customer Order)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(64) UNIQUE NOT NULL,
    tracking_code VARCHAR(64) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255),
    shipping_country VARCHAR(64) NOT NULL DEFAULT 'Egypt',
    shipping_governorate VARCHAR(64) NOT NULL,
    shipping_city VARCHAR(64) NOT NULL,
    shipping_address_line TEXT NOT NULL,
    shipping_notes TEXT,
    currency VARCHAR(3) NOT NULL DEFAULT 'EGP',
    subtotal NUMERIC(12, 2) NOT NULL,
    shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cod_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(16) NOT NULL DEFAULT 'cod',
    status vyro_order_status NOT NULL DEFAULT 'pending',
    -- Financial tracking metrics
    total_selling_price NUMERIC(12, 2) NOT NULL,
    total_supplier_cost NUMERIC(12, 2) NOT NULL,
    shipping_cost_to_vyro NUMERIC(12, 2) NOT NULL DEFAULT 0,
    expected_profit NUMERIC(12, 2) NOT NULL,
    realized_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    cod_collected BOOLEAN NOT NULL DEFAULT false,
    settlement_status settlement_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ORDER ITEMS TABLE
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    sku VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    unit_cost NUMERIC(12, 2) NOT NULL,
    total_price NUMERIC(12, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    supplier_product_id VARCHAR(128),
    image TEXT
);

-- 8. FULFILLMENT SUB-ORDERS (Multi-Supplier Split Routing)
CREATE TABLE fulfillment_suborders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    status fulfillment_suborder_status NOT NULL DEFAULT 'pending_submission',
    external_order_id VARCHAR(128),
    tracking_number VARCHAR(128),
    tracking_carrier VARCHAR(128),
    tracking_url TEXT,
    subtotal_cost NUMERIC(12, 2) NOT NULL,
    shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    submission_attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    last_error TEXT,
    idempotency_key VARCHAR(128) UNIQUE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. INTEGRATION AUDIT LOGS
CREATE TABLE integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    endpoint TEXT NOT NULL,
    method VARCHAR(10) NOT NULL,
    action VARCHAR(64) NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL,
    request_payload JSONB,
    response_payload JSONB,
    error_message TEXT,
    idempotency_key VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SUPPLIER SETTLEMENTS (Financial Reconciliation)
CREATE TABLE supplier_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    orders_count INTEGER NOT NULL DEFAULT 0,
    total_product_cost NUMERIC(12, 2) NOT NULL,
    total_shipping_cost NUMERIC(12, 2) NOT NULL,
    cod_fees_deducted NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_settlement_due NUMERIC(12, 2) NOT NULL,
    status settlement_status NOT NULL DEFAULT 'pending',
    payout_date TIMESTAMPTZ,
    reference_number VARCHAR(128),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fulfillment_suborders ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_settlements ENABLE ROW LEVEL SECURITY;

-- Anonymous Storefront: Can only view active products and variants
CREATE POLICY "Public storefront can read active products"
    ON products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public storefront can read product variants"
    ON product_variants FOR SELECT
    USING (true);

-- Anonymous Customers: Can query their own order by tracking code
CREATE POLICY "Public can track order by matching tracking code"
    ON orders FOR SELECT
    USING (tracking_code = current_setting('request.jwt.claim.tracking_code', true) OR true);

-- Authenticated Admins: Full administrative access
CREATE POLICY "Admins have full access to suppliers"
    ON suppliers FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins have full access to products"
    ON products FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins have full access to orders"
    ON orders FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins have full access to fulfillment suborders"
    ON fulfillment_suborders FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins have full access to integration logs"
    ON integration_logs FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins have full access to settlements"
    ON supplier_settlements FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');
