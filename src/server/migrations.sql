-- VYRO Commerce: Supabase relational schema.
-- Safe to apply to the currently empty public schema. This file contains no user data or secrets.

CREATE TABLE IF NOT EXISTS public.suppliers (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  integration_type text NOT NULL DEFAULT 'manual' CHECK (integration_type IN ('api', 'manual', 'webhook_only')),
  base_url text,
  auth_method text NOT NULL DEFAULT 'none' CHECK (auth_method IN ('bearer', 'api_key_header', 'basic', 'none')),
  api_key_encrypted text,
  api_key_masked text,
  country_code text NOT NULL DEFAULT 'EGY',
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency IN ('EGP', 'SAR', 'AED', 'USD')),
  status text NOT NULL DEFAULT 'unconfigured' CHECK (status IN ('active', 'degraded', 'disconnected', 'testing', 'unconfigured')),
  capabilities jsonb NOT NULL DEFAULT '{"supportsProductSync":false,"supportsInventorySync":false,"supportsPricingSync":false,"supportsAutoOrderSubmission":false,"supportsTrackingSync":false,"supportsCancellation":false,"supportsWebhooks":false}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{"autoSubmitOrders":false,"autoSyncInventory":false,"autoSyncPricing":false,"syncIntervalMinutes":60,"stockThreshold":2,"markupPercentage":30,"settlementCycleDays":14,"codFeePercent":2.0}'::jsonb,
  contact_email text,
  contact_phone text,
  notes text,
  last_sync_at timestamptz,
  last_health_check_at timestamptz,
  last_health_status text CHECK (last_health_status IS NULL OR last_health_status IN ('ok', 'error')),
  last_health_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  sku text NOT NULL UNIQUE,
  title text NOT NULL,
  title_ar text NOT NULL,
  description text NOT NULL DEFAULT '',
  description_ar text NOT NULL DEFAULT '',
  category text NOT NULL,
  category_ar text NOT NULL,
  images text[] NOT NULL DEFAULT '{}',
  selling_price numeric(12,2) NOT NULL CHECK (selling_price >= 0),
  supplier_cost numeric(12,2) NOT NULL CHECK (supplier_cost >= 0),
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency IN ('EGP', 'SAR', 'AED', 'USD')),
  supplier_id text NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_name text NOT NULL,
  supplier_product_id text,
  supplier_sku text,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  sync_status text NOT NULL DEFAULT 'local_only' CHECK (sync_status IN ('synced', 'drift_detected', 'desynced', 'local_only', 'pending')),
  is_active boolean NOT NULL DEFAULT true,
  rating numeric(3,2) NOT NULL DEFAULT 5.0,
  reviews_count integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  weight_kg numeric(6,3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id text PRIMARY KEY,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text NOT NULL UNIQUE,
  supplier_sku text,
  title text NOT NULL,
  title_ar text NOT NULL,
  color text,
  size text,
  price_delta numeric(10,2) NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  tracking_code text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  shipping_country text NOT NULL DEFAULT 'Egypt',
  shipping_governorate text NOT NULL,
  shipping_city text NOT NULL,
  shipping_address_line text NOT NULL,
  shipping_secondary_phone text,
  shipping_building_number text,
  shipping_apartment text,
  shipping_postal_code text,
  shipping_notes text,
  currency text NOT NULL DEFAULT 'EGP' CHECK (currency IN ('EGP', 'SAR', 'AED', 'USD')),
  subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0),
  shipping_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
  discount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  cod_fee numeric(12,2) NOT NULL DEFAULT 0 CHECK (cod_fee >= 0),
  total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  payment_method text NOT NULL DEFAULT 'cod' CHECK (payment_method = 'cod'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'routed', 'submitted_to_supplier', 'supplier_confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned')),
  total_selling_price numeric(12,2) NOT NULL DEFAULT 0,
  total_supplier_cost numeric(12,2) NOT NULL DEFAULT 0,
  shipping_cost_to_vyro numeric(12,2) NOT NULL DEFAULT 0,
  expected_profit numeric(12,2) NOT NULL DEFAULT 0,
  realized_profit numeric(12,2) NOT NULL DEFAULT 0,
  cod_collected boolean NOT NULL DEFAULT false,
  settlement_status text NOT NULL DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'reconciled', 'settled', 'disputed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fulfillment_suborders (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  supplier_id text NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending_submission' CHECK (status IN ('pending_submission', 'submitted', 'in_manual_queue', 'acknowledged', 'processing', 'shipped', 'delivered', 'failed_submission', 'cancelled')),
  external_order_id text,
  tracking_number text,
  tracking_carrier text,
  tracking_url text,
  supplier_estimated_delivery text,
  subtotal_cost numeric(12,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  submission_attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_error text,
  idempotency_key text NOT NULL UNIQUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  fulfillment_suborder_id text REFERENCES public.fulfillment_suborders(id) ON DELETE SET NULL,
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id text,
  sku text NOT NULL,
  title text NOT NULL,
  title_ar text NOT NULL,
  variant_title text,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(12,2) NOT NULL CHECK (unit_cost >= 0),
  total_price numeric(12,2) NOT NULL CHECK (total_price >= 0),
  total_cost numeric(12,2) NOT NULL CHECK (total_cost >= 0),
  supplier_id text NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_name text NOT NULL,
  supplier_product_id text,
  image text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id text PRIMARY KEY,
  supplier_id text NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_name text NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  action text NOT NULL,
  status_code integer NOT NULL,
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  status text NOT NULL CHECK (status IN ('success', 'failure', 'degraded')),
  request_payload jsonb,
  response_payload jsonb,
  error_message text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.supplier_settlements (
  id text PRIMARY KEY,
  supplier_id text NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  supplier_name text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  orders_count integer NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
  total_product_cost numeric(12,2) NOT NULL DEFAULT 0,
  total_shipping_cost numeric(12,2) NOT NULL DEFAULT 0,
  cod_fees_deducted numeric(12,2) NOT NULL DEFAULT 0,
  net_settlement_due numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reconciled', 'settled', 'disputed')),
  payout_date timestamptz,
  reference_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_active_category_idx ON public.products (is_active, category);
CREATE INDEX IF NOT EXISTS products_supplier_idx ON public.products (supplier_id);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_suborder_idx ON public.order_items (fulfillment_suborder_id);
CREATE INDEX IF NOT EXISTS fulfillment_suborders_order_idx ON public.fulfillment_suborders (order_id);
CREATE INDEX IF NOT EXISTS fulfillment_suborders_supplier_idx ON public.fulfillment_suborders (supplier_id);
CREATE INDEX IF NOT EXISTS orders_phone_created_idx ON public.orders (customer_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS integration_logs_created_idx ON public.integration_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS supplier_settlements_supplier_idx ON public.supplier_settlements (supplier_id, created_at DESC);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_suborders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public storefront can read active products" ON public.products;
CREATE POLICY "Public storefront can read active products"
  ON public.products FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Public storefront can read active variants" ON public.product_variants;
CREATE POLICY "Public storefront can read active variants"
  ON public.product_variants FOR SELECT TO anon, authenticated
  USING (is_active = true AND EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.is_active = true
  ));

DROP POLICY IF EXISTS "Admins have full access to suppliers" ON public.suppliers;
CREATE POLICY "Admins have full access to suppliers" ON public.suppliers FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins have full access to products" ON public.products;
CREATE POLICY "Admins have full access to products" ON public.products FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins have full access to product variants" ON public.product_variants;
CREATE POLICY "Admins have full access to product variants" ON public.product_variants FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
CREATE POLICY "Admins have full access to orders" ON public.orders FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins have full access to order items" ON public.order_items;
CREATE POLICY "Admins have full access to order items" ON public.order_items FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins have full access to fulfillment suborders" ON public.fulfillment_suborders;
CREATE POLICY "Admins have full access to fulfillment suborders" ON public.fulfillment_suborders FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins have full access to integration logs" ON public.integration_logs;
CREATE POLICY "Admins have full access to integration logs" ON public.integration_logs FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
DROP POLICY IF EXISTS "Admins have full access to settlements" ON public.supplier_settlements;
CREATE POLICY "Admins have full access to settlements" ON public.supplier_settlements FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

REVOKE ALL ON TABLE public.suppliers, public.orders, public.fulfillment_suborders, public.order_items,
  public.integration_logs, public.supplier_settlements FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.suppliers, public.orders, public.fulfillment_suborders, public.order_items,
  public.integration_logs, public.supplier_settlements TO authenticated;
REVOKE ALL ON TABLE public.products, public.product_variants FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, sku, title, title_ar, description, description_ar, category, category_ar, images,
  selling_price, currency, supplier_id, supplier_name, stock_quantity, sync_status, is_active,
  rating, reviews_count, tags, weight_kg, created_at, updated_at)
  ON public.products TO anon, authenticated;
GRANT SELECT (id, product_id, sku, title, title_ar, color, size, price_delta, stock, is_active, created_at)
  ON public.product_variants TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_vyro_product(p_product jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id text;
  v_supplier_id text;
  v_supplier_name text;
  v_variant jsonb;
  v_variants jsonb;
BEGIN
  IF auth.role() <> 'service_role' AND coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'Administrator access is required.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_product) <> 'object' THEN
    RAISE EXCEPTION 'Invalid product payload.' USING ERRCODE = '22023';
  END IF;
  v_id := coalesce(nullif(p_product->>'id', ''), 'prod-' || replace(gen_random_uuid()::text, '-', ''));
  v_supplier_id := nullif(p_product->>'supplierId', '');
  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = v_supplier_id;
  IF v_supplier_name IS NULL THEN
    RAISE EXCEPTION 'A valid supplier is required.' USING ERRCODE = '23503';
  END IF;
  IF nullif(trim(p_product->>'sku'), '') IS NULL OR nullif(trim(p_product->>'title'), '') IS NULL THEN
    RAISE EXCEPTION 'Product SKU and title are required.' USING ERRCODE = '22023';
  END IF;
  IF coalesce((p_product->>'sellingPrice')::numeric, -1) < 0 OR coalesce((p_product->>'supplierCost')::numeric, -1) < 0 THEN
    RAISE EXCEPTION 'Prices must be non-negative.' USING ERRCODE = '22023';
  END IF;
  IF coalesce((p_product->>'stockQuantity')::integer, -1) < 0 THEN
    RAISE EXCEPTION 'Stock must be non-negative.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.products (
    id, sku, title, title_ar, description, description_ar, category, category_ar, images,
    selling_price, supplier_cost, currency, supplier_id, supplier_name, supplier_product_id,
    supplier_sku, stock_quantity, sync_status, is_active, rating, reviews_count, tags, weight_kg, updated_at
  ) VALUES (
    v_id,
    trim(p_product->>'sku'), trim(p_product->>'title'), coalesce(p_product->>'titleAr', ''),
    coalesce(p_product->>'description', ''), coalesce(p_product->>'descriptionAr', ''),
    coalesce(p_product->>'category', 'Other'), coalesce(p_product->>'categoryAr', 'أخرى'),
    ARRAY(SELECT jsonb_array_elements_text(coalesce(p_product->'images', '[]'::jsonb))),
    (p_product->>'sellingPrice')::numeric, (p_product->>'supplierCost')::numeric,
    coalesce(p_product->>'currency', 'EGP'), v_supplier_id, v_supplier_name,
    nullif(p_product->>'supplierProductId', ''), nullif(p_product->>'supplierSku', ''),
    (p_product->>'stockQuantity')::integer, coalesce(p_product->>'syncStatus', 'local_only'),
    coalesce((p_product->>'isActive')::boolean, true), coalesce((p_product->>'rating')::numeric, 5),
    coalesce((p_product->>'reviewsCount')::integer, 0),
    ARRAY(SELECT jsonb_array_elements_text(coalesce(p_product->'tags', '[]'::jsonb))),
    nullif(p_product->>'weightKg', '')::numeric, now()
  )
  ON CONFLICT (id) DO UPDATE SET
    sku = excluded.sku, title = excluded.title, title_ar = excluded.title_ar,
    description = excluded.description, description_ar = excluded.description_ar,
    category = excluded.category, category_ar = excluded.category_ar, images = excluded.images,
    selling_price = excluded.selling_price, supplier_cost = excluded.supplier_cost,
    currency = excluded.currency, supplier_id = excluded.supplier_id, supplier_name = excluded.supplier_name,
    supplier_product_id = excluded.supplier_product_id, supplier_sku = excluded.supplier_sku,
    stock_quantity = excluded.stock_quantity, sync_status = excluded.sync_status,
    is_active = excluded.is_active, rating = excluded.rating, reviews_count = excluded.reviews_count,
    tags = excluded.tags, weight_kg = excluded.weight_kg, updated_at = now();

  v_variants := coalesce(p_product->'variants', '[]'::jsonb);
  IF jsonb_typeof(v_variants) <> 'array' THEN
    RAISE EXCEPTION 'Product variants must be an array.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.product_variants SET is_active = false, stock = 0
  WHERE product_id = v_id;
  FOR v_variant IN SELECT value FROM jsonb_array_elements(v_variants) LOOP
    INSERT INTO public.product_variants (id, product_id, sku, supplier_sku, title, title_ar, color, size, price_delta, stock, is_active)
    VALUES (
      coalesce(nullif(v_variant->>'id', ''), 'var-' || replace(gen_random_uuid()::text, '-', '')),
      v_id, trim(v_variant->>'sku'), nullif(v_variant->>'supplierSku', ''),
      coalesce(v_variant->>'title', ''), coalesce(v_variant->>'titleAr', ''),
      nullif(v_variant->>'color', ''), nullif(v_variant->>'size', ''),
      coalesce((v_variant->>'priceDelta')::numeric, 0), coalesce((v_variant->>'stock')::integer, 0), true
    )
    ON CONFLICT (id) DO UPDATE SET
      product_id = excluded.product_id, sku = excluded.sku, supplier_sku = excluded.supplier_sku,
      title = excluded.title, title_ar = excluded.title_ar, color = excluded.color, size = excluded.size,
      price_delta = excluded.price_delta, stock = excluded.stock, is_active = true;
  END LOOP;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_vyro_product(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_vyro_product(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_vyro_order(
  p_customer jsonb,
  p_shipping jsonb,
  p_cart_items jsonb,
  p_coupon_code text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item jsonb;
  v_line jsonb;
  v_group record;
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_order_id text;
  v_order_number text;
  v_tracking_code text;
  v_idempotency_key text;
  v_variant_id text;
  v_variant_title text;
  v_sku text;
  v_quantity integer;
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
  v_line_cost numeric(12,2);
  v_subtotal numeric(12,2) := 0;
  v_total_cost numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_shipping_fee numeric(12,2) := 50;
  v_cod_fee numeric(12,2) := 15;
  v_shipping_cost numeric(12,2) := 0;
  v_total numeric(12,2);
  v_phone text;
  v_lines jsonb := '[]'::jsonb;
  v_supplier_count integer;
  v_existing public.orders%ROWTYPE;
BEGIN
  IF jsonb_typeof(p_customer) <> 'object' OR jsonb_typeof(p_shipping) <> 'object' OR
     jsonb_typeof(p_cart_items) <> 'array' OR jsonb_array_length(p_cart_items) = 0 OR
     jsonb_array_length(p_cart_items) > 100 THEN
    RAISE EXCEPTION 'Invalid order payload.' USING ERRCODE = '22023';
  END IF;
  IF coalesce(p_customer->>'fullName', '') = '' OR coalesce(p_shipping->>'city', '') = '' OR
     coalesce(p_shipping->>'streetAddress', '') = '' THEN
    RAISE EXCEPTION 'Customer and shipping details are required.' USING ERRCODE = '22023';
  END IF;
  v_phone := regexp_replace(coalesce(p_customer->>'phone', ''), '[^0-9]', '', 'g');
  IF length(v_phone) < 10 THEN
    RAISE EXCEPTION 'A valid customer phone number is required.' USING ERRCODE = '22023';
  END IF;

  v_idempotency_key := coalesce(nullif(trim(p_idempotency_key), ''), 'checkout-' || replace(gen_random_uuid()::text, '-', ''));
  SELECT * INTO v_existing FROM public.orders WHERE idempotency_key = v_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'orderNumber', v_existing.order_number, 'trackingCode', v_existing.tracking_code,
      'status', v_existing.status, 'totalAmount', v_existing.total_amount, 'createdAt', v_existing.created_at
    );
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_cart_items) LOOP
    IF coalesce(v_item->>'productId', '') = '' THEN
      RAISE EXCEPTION 'Product ID is required.' USING ERRCODE = '22023';
    END IF;
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity < 1 OR v_quantity > 20 THEN
      RAISE EXCEPTION 'Quantity must be between 1 and 20.' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_product FROM public.products WHERE id = v_item->>'productId' AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A product is unavailable.' USING ERRCODE = 'P0002';
    END IF;
    v_variant_id := nullif(v_item->>'variantId', '');
    v_variant_title := NULL;
    v_sku := v_product.sku;
    v_unit_price := v_product.selling_price;
    IF v_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant FROM public.product_variants
      WHERE id = v_variant_id AND product_id = v_product.id AND is_active = true FOR UPDATE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'A selected product variant is unavailable.' USING ERRCODE = 'P0002';
      END IF;
      IF v_variant.stock < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for a selected product variant.' USING ERRCODE = 'P0001';
      END IF;
      UPDATE public.product_variants SET stock = stock - v_quantity WHERE id = v_variant.id;
      v_variant_title := v_variant.title;
      v_sku := v_variant.sku;
      v_unit_price := v_unit_price + v_variant.price_delta;
    ELSE
      IF v_product.stock_quantity < v_quantity THEN
        RAISE EXCEPTION 'Insufficient product stock.' USING ERRCODE = 'P0001';
      END IF;
    END IF;
    UPDATE public.products SET stock_quantity = stock_quantity - v_quantity, updated_at = now() WHERE id = v_product.id;
    v_line_total := v_unit_price * v_quantity;
    v_line_cost := v_product.supplier_cost * v_quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_total_cost := v_total_cost + v_line_cost;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'id', 'item-' || replace(gen_random_uuid()::text, '-', ''),
      'productId', v_product.id, 'variantId', v_variant_id, 'title', v_product.title,
      'titleAr', v_product.title_ar, 'variantTitle', v_variant_title, 'sku', v_sku,
      'quantity', v_quantity, 'unitPrice', v_unit_price, 'unitCost', v_product.supplier_cost,
      'totalPrice', v_line_total, 'totalCost', v_line_cost, 'supplierId', v_product.supplier_id,
      'supplierName', v_product.supplier_name, 'supplierProductId', v_product.supplier_product_id,
      'image', coalesce(v_product.images[1], '')
    ));
  END LOOP;

  SELECT count(DISTINCT value->>'supplierId') INTO v_supplier_count FROM jsonb_array_elements(v_lines);
  v_shipping_cost := 35 * v_supplier_count;
  IF upper(coalesce(p_coupon_code, '')) = 'VYRO10' THEN
    v_discount := round(v_subtotal * 0.10, 2);
  END IF;
  v_total := v_subtotal + v_shipping_fee + v_cod_fee - v_discount;
  v_order_id := 'ord-vyro-' || replace(gen_random_uuid()::text, '-', '');
  v_order_number := 'VYRO-EG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  v_tracking_code := 'VYRO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

  INSERT INTO public.orders (
    id, order_number, tracking_code, idempotency_key, customer_name, customer_phone, customer_email,
    shipping_country, shipping_governorate, shipping_city, shipping_address_line,
    shipping_secondary_phone, shipping_building_number, shipping_apartment, shipping_postal_code, shipping_notes,
    currency, subtotal, shipping_fee, discount, cod_fee, total_amount, payment_method, status,
    total_selling_price, total_supplier_cost, shipping_cost_to_vyro, expected_profit, realized_profit, cod_collected, settlement_status
  ) VALUES (
    v_order_id, v_order_number, v_tracking_code, v_idempotency_key,
    trim(p_customer->>'fullName'), v_phone, nullif(trim(coalesce(p_customer->>'email', '')), ''),
    coalesce(p_shipping->>'country', 'Egypt'), coalesce(p_shipping->>'governorateOrState', ''),
    trim(p_shipping->>'city'), trim(p_shipping->>'streetAddress'),
    nullif(p_shipping->>'secondaryPhone', ''), nullif(p_shipping->>'buildingNumber', ''),
    nullif(p_shipping->>'apartment', ''), nullif(p_shipping->>'postalCode', ''), nullif(p_shipping->>'notes', ''),
    'EGP', v_subtotal, v_shipping_fee, v_discount, v_cod_fee, v_total, 'cod', 'routed',
    v_subtotal, v_total_cost, v_shipping_cost, v_total - v_total_cost - v_shipping_cost, 0, false, 'pending'
  );

  FOR v_group IN
    SELECT value->>'supplierId' AS supplier_id,
           max(value->>'supplierName') AS supplier_name,
           sum((value->>'totalCost')::numeric) AS subtotal_cost
    FROM jsonb_array_elements(v_lines)
    GROUP BY value->>'supplierId'
  LOOP
    DECLARE
      v_suborder_id text := 'sub-' || replace(gen_random_uuid()::text, '-', '');
      v_suborder_key text := 'idemp-' || replace(gen_random_uuid()::text, '-', '');
      v_suborder_items jsonb;
    BEGIN
      SELECT coalesce(jsonb_agg(value), '[]'::jsonb) INTO v_suborder_items
      FROM jsonb_array_elements(v_lines) WHERE value->>'supplierId' = v_group.supplier_id;
      INSERT INTO public.fulfillment_suborders (
        id, order_id, supplier_id, supplier_name, status, external_order_id,
        subtotal_cost, shipping_cost, submission_attempts, idempotency_key, notes
      ) VALUES (
        v_suborder_id, v_order_id, v_group.supplier_id, v_group.supplier_name, 'in_manual_queue',
        'VYRO-MF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
        v_group.subtotal_cost, 35, 0, v_suborder_key, 'Queued for manual fulfillment.'
      );
      FOR v_line IN SELECT value FROM jsonb_array_elements(v_suborder_items) LOOP
        INSERT INTO public.order_items (
          id, order_id, fulfillment_suborder_id, product_id, variant_id, sku, title, title_ar,
          variant_title, quantity, unit_price, unit_cost, total_price, total_cost,
          supplier_id, supplier_name, supplier_product_id, image
        ) VALUES (
          v_line->>'id', v_order_id, v_suborder_id, v_line->>'productId', nullif(v_line->>'variantId', ''),
          v_line->>'sku', v_line->>'title', v_line->>'titleAr', nullif(v_line->>'variantTitle', ''),
          (v_line->>'quantity')::integer, (v_line->>'unitPrice')::numeric, (v_line->>'unitCost')::numeric,
          (v_line->>'totalPrice')::numeric, (v_line->>'totalCost')::numeric,
          v_line->>'supplierId', v_line->>'supplierName', nullif(v_line->>'supplierProductId', ''),
          nullif(v_line->>'image', '')
        );
      END LOOP;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'orderNumber', v_order_number, 'trackingCode', v_tracking_code,
    'status', 'routed', 'totalAmount', v_total, 'createdAt', now()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.create_vyro_order(jsonb, jsonb, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_vyro_order(jsonb, jsonb, jsonb, text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.track_vyro_order(p_code text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_phone_digits text;
  v_order_phone_digits text;
BEGIN
  v_phone_digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF length(v_phone_digits) < 10 THEN RETURN NULL; END IF;
  SELECT * INTO v_order FROM public.orders
  WHERE upper(tracking_code) = upper(trim(p_code)) OR upper(order_number) = upper(trim(p_code))
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_order_phone_digits := regexp_replace(coalesce(v_order.customer_phone, ''), '[^0-9]', '', 'g');
  IF length(v_order_phone_digits) < 10 OR right(v_order_phone_digits, 10) <> right(v_phone_digits, 10) THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'orderNumber', v_order.order_number,
    'trackingCode', v_order.tracking_code,
    'status', v_order.status,
    'createdAt', v_order.created_at,
    'customer', jsonb_build_object('fullName', split_part(v_order.customer_name, ' ', 1)),
    'shippingAddress', jsonb_build_object(
      'fullName', split_part(v_order.customer_name, ' ', 1),
      'city', v_order.shipping_city,
      'governorateOrState', v_order.shipping_governorate,
      'country', v_order.shipping_country
    ),
    'subOrders', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'status', s.status,
        'trackingNumber', s.tracking_number,
        'trackingCarrier', s.tracking_carrier,
        'trackingUrl', s.tracking_url,
        'items', coalesce((
          SELECT jsonb_agg(jsonb_build_object(
            'id', i.id, 'title', i.title, 'titleAr', i.title_ar,
            'variantTitle', i.variant_title, 'quantity', i.quantity,
            'unitPrice', i.unit_price, 'image', i.image
          )) FROM public.order_items i WHERE i.fulfillment_suborder_id = s.id
        ), '[]'::jsonb)
      )) FROM public.fulfillment_suborders s WHERE s.order_id = v_order.id
    ), '[]'::jsonb),
    'paymentMethod', v_order.payment_method,
    'totalAmount', v_order.total_amount,
    'financialMetrics', jsonb_build_object('codCollected', v_order.cod_collected)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.track_vyro_order(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_vyro_order(text, text) TO anon, authenticated;
