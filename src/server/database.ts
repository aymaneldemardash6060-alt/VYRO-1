/**
 * VYRO Commerce — Resilient Database Layer & Seed Store
 * 
 * Provides thread-safe, transactional operations for:
 * - Suppliers & Credentials (with server-side encryption/masking)
 * - Products & Variants (with dual AR/EN titles and supplier association)
 * - Orders & Multi-Supplier Sub-Order Routing
 * - Financial Calculations & Settlements
 * - Integration Audit Trail
 */

import {
  SupplierConfig,
  Product,
  Order,
  FulfillmentSubOrder,
  IntegrationLog,
  SupplierSettlement,
  OrderItem,
  ShippingAddress,
  Currency
} from './types.ts';
import { AdapterRegistry } from './adapters/AdapterRegistry.ts';

// Initial Mock Suppliers
const INITIAL_SUPPLIERS: SupplierConfig[] = [
  {
    id: 'sup-taager-egypt',
    name: 'Taager B2B Dropshipping',
    code: 'taager',
    integrationType: 'api',
    baseUrl: 'https://api.taager.com',
    authMethod: 'bearer',
    apiKeyMasked: 'tg_live_98ab••••••••••••••4c21',
    apiKeySecret: 'tg_live_sample_secret_key_taager_egypt_98412',
    countryCode: 'EGY',
    currency: 'EGP',
    status: 'active',
    capabilities: {
      supportsProductSync: true,
      supportsInventorySync: true,
      supportsPricingSync: true,
      supportsAutoOrderSubmission: true,
      supportsTrackingSync: true,
      supportsCancellation: true,
      supportsWebhooks: true
    },
    settings: {
      autoSubmitOrders: true,
      autoSyncInventory: true,
      autoSyncPricing: false,
      syncIntervalMinutes: 60,
      stockThreshold: 5,
      markupPercentage: 35,
      settlementCycleDays: 7,
      codFeePercent: 2.5
    },
    contactEmail: 'api-support@taager.com',
    contactPhone: '+20 2 2456 7890',
    notes: 'Primary dropshipping provider for electronics and trending consumer goods in Egypt and KSA.',
    lastSyncAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    lastHealthCheckAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    lastHealthStatus: 'ok',
    lastHealthMessage: 'HTTP 200: API authentication verified'
  },
  {
    id: 'sup-cairo-central-hub',
    name: 'Cairo Central Fulfillment Hub',
    code: 'cairo_hub',
    integrationType: 'manual',
    authMethod: 'none',
    countryCode: 'EGY',
    currency: 'EGP',
    status: 'active',
    capabilities: {
      supportsProductSync: false,
      supportsInventorySync: false,
      supportsPricingSync: false,
      supportsAutoOrderSubmission: false,
      supportsTrackingSync: false,
      supportsCancellation: true,
      supportsWebhooks: false
    },
    settings: {
      autoSubmitOrders: false,
      autoSyncInventory: false,
      autoSyncPricing: false,
      syncIntervalMinutes: 0,
      stockThreshold: 2,
      markupPercentage: 45,
      settlementCycleDays: 14,
      codFeePercent: 1.0
    },
    contactEmail: 'warehouse.cairo@vyro.shop',
    contactPhone: '+20 100 889 4432',
    notes: 'Internal primary warehouse for verified local stock, premium apparel, and high-margin goods.',
    lastHealthCheckAt: new Date().toISOString(),
    lastHealthStatus: 'ok',
    lastHealthMessage: 'Internal queue operational'
  },
  {
    id: 'sup-gulf-express-fz',
    name: 'Gulf Direct Logistics FZ',
    code: 'gulf_logistics',
    integrationType: 'api',
    baseUrl: 'https://api.gulfdirectlogistics.ae',
    authMethod: 'api_key_header',
    apiKeyMasked: 'gulf_fz_sec_••••••••••••e09',
    apiKeySecret: 'gulf_fz_sec_sample_token_dubai_hub_55',
    countryCode: 'ARE',
    currency: 'AED',
    status: 'active',
    capabilities: {
      supportsProductSync: true,
      supportsInventorySync: true,
      supportsPricingSync: true,
      supportsAutoOrderSubmission: true,
      supportsTrackingSync: true,
      supportsCancellation: false,
      supportsWebhooks: true
    },
    settings: {
      autoSubmitOrders: true,
      autoSyncInventory: true,
      autoSyncPricing: true,
      syncIntervalMinutes: 120,
      stockThreshold: 3,
      markupPercentage: 30,
      settlementCycleDays: 10,
      codFeePercent: 3.0
    },
    contactEmail: 'partnerships@gulfdirectlogistics.ae',
    contactPhone: '+971 4 888 1234',
    notes: 'Cross-border express supplier covering UAE and Saudi Arabia regional distribution.',
    lastSyncAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    lastHealthCheckAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    lastHealthStatus: 'ok',
    lastHealthMessage: 'HTTP 200: Connected'
  },
  {
    id: 'sup-alex-leather-craft',
    name: 'Alexandria Artisan Leather',
    code: 'alex_artisan',
    integrationType: 'manual',
    authMethod: 'none',
    countryCode: 'EGY',
    currency: 'EGP',
    status: 'active',
    capabilities: {
      supportsProductSync: false,
      supportsInventorySync: false,
      supportsPricingSync: false,
      supportsAutoOrderSubmission: false,
      supportsTrackingSync: false,
      supportsCancellation: true,
      supportsWebhooks: false
    },
    settings: {
      autoSubmitOrders: false,
      autoSyncInventory: false,
      autoSyncPricing: false,
      syncIntervalMinutes: 0,
      stockThreshold: 1,
      markupPercentage: 50,
      settlementCycleDays: 30,
      codFeePercent: 0
    },
    contactEmail: 'workshop@alex-leathercraft.eg',
    contactPhone: '+20 3 552 1109',
    notes: 'Direct handmade manufacturer. Orders printed as packing slips for daily workshop dispatch.',
    lastHealthCheckAt: new Date().toISOString(),
    lastHealthStatus: 'ok',
    lastHealthMessage: 'Ready for batch order dispatch'
  }
];

// Initial Seed Products
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-vyro-01',
    title: 'AeroPulse Wireless ANC Headphones',
    titleAr: 'سماعات رأس لاسلكية بخاصية عزل الضوضاء النشط',
    description: 'High-fidelity audio with 40-hour battery life, hybrid active noise cancellation, and ultra-soft memory foam earcups.',
    descriptionAr: 'صوت عالي الدقة مع بطارية تدوم 40 ساعة، تقنية عزل الضوضاء الهجينة، ووسائد أذن من الميموري فوم المريحة للغاية.',
    category: 'Electronics',
    categoryAr: 'إلكترونيات',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&q=80'
    ],
    sellingPrice: 1250,
    supplierCost: 780,
    currency: 'EGP',
    supplierId: 'sup-taager-egypt',
    supplierName: 'Taager B2B Dropshipping',
    supplierProductId: 'tg_p_88419',
    supplierSku: 'TG-HP-BLK-01',
    sku: 'VYRO-TECH-001',
    variants: [
      { id: 'v1', title: 'Matte Black', titleAr: 'أسود مطفي', sku: 'VYRO-TECH-001-BLK', color: '#111827', priceDelta: 0, stock: 45 },
      { id: 'v2', title: 'Silver Grey', titleAr: 'رمادي فضي', sku: 'VYRO-TECH-001-SLV', color: '#9CA3AF', priceDelta: 0, stock: 28 },
      { id: 'v3', title: 'Midnight Blue', titleAr: 'أزرق داكن', sku: 'VYRO-TECH-001-BLU', color: '#1E3A8A', priceDelta: 50, stock: 14 }
    ],
    stockQuantity: 87,
    syncStatus: 'synced',
    isActive: true,
    rating: 4.8,
    reviewsCount: 142,
    tags: ['Best Seller', 'Trending', 'Free Delivery'],
    weightKg: 0.35,
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-03-28T14:30:00Z'
  },
  {
    id: 'prod-vyro-02',
    title: 'Heritage Genuine Leather Weekender Bag',
    titleAr: 'حقيبة سفر كلاسيكية من الجلد الطبيعي الفاخر',
    description: 'Handcrafted full-grain Egyptian cowhide leather with reinforced brass hardware, waterproof nylon lining, and detachable shoulder strap.',
    descriptionAr: 'مصنوعة يدوياً من الجلد البقري الطبيعي المصري الأصيل مع إكسسوارات نحاسية متينة وبطانة نايلون مقاومة للماء وحزام كتف قابل للفصل.',
    category: 'Fashion & Bags',
    categoryAr: 'أزياء وحقائب',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80'
    ],
    sellingPrice: 1890,
    supplierCost: 1100,
    currency: 'EGP',
    supplierId: 'sup-alex-leather-craft',
    supplierName: 'Alexandria Artisan Leather',
    supplierProductId: 'alc_wkd_01',
    supplierSku: 'ALC-BAG-VINTAGE',
    sku: 'VYRO-LTH-002',
    variants: [
      { id: 'v4', title: 'Cognac Brown', titleAr: 'بني عسلي', sku: 'VYRO-LTH-002-CGN', color: '#78350F', priceDelta: 0, stock: 18 },
      { id: 'v5', title: 'Espresso Dark', titleAr: 'بني داكن إسبريسو', sku: 'VYRO-LTH-002-DKB', color: '#451A03', priceDelta: 0, stock: 12 }
    ],
    stockQuantity: 30,
    syncStatus: 'local_only',
    isActive: true,
    rating: 4.9,
    reviewsCount: 89,
    tags: ['Handmade', 'Genuine Leather', 'Premium'],
    weightKg: 1.4,
    createdAt: '2026-02-01T12:00:00Z',
    updatedAt: '2026-03-25T09:15:00Z'
  },
  {
    id: 'prod-vyro-03',
    title: 'Precision Ergonomic Mechanical Keyboard',
    titleAr: 'لوحة مفاتيح ميكانيكية مريحة مع إضاءة RGB',
    description: 'Custom hot-swappable switches with gasket mount structure, sound dampening foam, multi-device Bluetooth 5.2, and 2.4GHz wireless.',
    descriptionAr: 'مفاتيح قابلة للتبديل السريع مع هيكل جاكيت عازل للصوت، وتقنية بلوتوث 5.2 متعددة الأجهزة ولاسلكي 2.4 جيجاهرتز سريع الاستجابة.',
    category: 'Electronics',
    categoryAr: 'إلكترونيات',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80'
    ],
    sellingPrice: 1490,
    supplierCost: 950,
    currency: 'EGP',
    supplierId: 'sup-cairo-central-hub',
    supplierName: 'Cairo Central Fulfillment Hub',
    supplierProductId: 'hub_kb_mech75',
    supplierSku: 'HUB-MKB-75P',
    sku: 'VYRO-TECH-003',
    variants: [
      { id: 'v6', title: 'Red Switch (Silent)', titleAr: 'سويتش أحمر (هادئ)', sku: 'VYRO-TECH-003-RED', priceDelta: 0, stock: 24 },
      { id: 'v7', title: 'Brown Switch (Tactile)', titleAr: 'سويتش بني (لمسي)', sku: 'VYRO-TECH-003-BRN', priceDelta: 0, stock: 31 }
    ],
    stockQuantity: 55,
    syncStatus: 'local_only',
    isActive: true,
    rating: 4.7,
    reviewsCount: 64,
    tags: ['Fast Dispatch', 'Gamer & Office'],
    weightKg: 0.9,
    createdAt: '2026-02-10T11:00:00Z',
    updatedAt: '2026-03-27T16:00:00Z'
  },
  {
    id: 'prod-vyro-04',
    title: 'Ultra-Slim Minimalist Bifold Wallet with RFID',
    titleAr: 'محفظة جلدية رفيعة مضادة لسرقة البطاقات RFID',
    description: 'Holds up to 10 cards and cash, aluminum card ejector slider mechanism with anti-theft RFID radio shielding.',
    descriptionAr: 'تتسع لما يصل إلى 10 بطاقات ونقود ورقية مع آلية منزلق الألمنيوم لإخراج البطاقات وحماية بتقنية RFID.',
    category: 'Accessories',
    categoryAr: 'إكسسوارات',
    images: [
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&q=80'
    ],
    sellingPrice: 420,
    supplierCost: 220,
    currency: 'EGP',
    supplierId: 'sup-alex-leather-craft',
    supplierName: 'Alexandria Artisan Leather',
    supplierProductId: 'alc_wlt_rfid',
    supplierSku: 'ALC-WLT-MINI',
    sku: 'VYRO-ACC-004',
    variants: [
      { id: 'v8', title: 'Carbon Black', titleAr: 'أسود كربون', sku: 'VYRO-ACC-004-BLK', color: '#18181B', priceDelta: 0, stock: 50 },
      { id: 'v9', title: 'Classic Tan', titleAr: 'تان كلاسيكي', sku: 'VYRO-ACC-004-TAN', color: '#B45309', priceDelta: 0, stock: 40 }
    ],
    stockQuantity: 90,
    syncStatus: 'local_only',
    isActive: true,
    rating: 4.6,
    reviewsCount: 118,
    tags: ['Everyday Carry', 'RFID Protected'],
    weightKg: 0.1,
    createdAt: '2026-02-15T09:00:00Z',
    updatedAt: '2026-03-29T10:00:00Z'
  },
  {
    id: 'prod-vyro-05',
    title: 'Smart Ambient Hydroponics Desktop Garden',
    titleAr: 'مزرعة مكتبية مائية ذكية مع إضاءة نمو LED',
    description: 'Grow fresh basil, mint, and herbs indoor with automated LED daylight cycling and silent water circulation pump.',
    descriptionAr: 'ازرع الريحان والنعناع والأعشاب الطازجة داخل منزلك مع دورة إضاءة LED نهارية ومضخة تدوير مياه صامتة وتنبيه ذكي لمستوى الماء.',
    category: 'Home & Living',
    categoryAr: 'المنزل والديكور',
    images: [
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80',
      'https://images.unsplash.com/photo-1545241047-6083a3684587?w=800&q=80'
    ],
    sellingPrice: 990,
    supplierCost: 610,
    currency: 'EGP',
    supplierId: 'sup-taager-egypt',
    supplierName: 'Taager B2B Dropshipping',
    supplierProductId: 'tg_p_55102',
    supplierSku: 'TG-HOME-GARDEN-01',
    sku: 'VYRO-HOME-005',
    variants: [
      { id: 'v10', title: 'Pure White (6 Pods)', titleAr: 'أبيض ناصع (6 شتلات)', sku: 'VYRO-HOME-005-WHT', color: '#FFFFFF', priceDelta: 0, stock: 22 },
      { id: 'v11', title: 'Sage Green (6 Pods)', titleAr: 'أخضر عشبي (6 شتلات)', sku: 'VYRO-HOME-005-SGE', color: '#84CC16', priceDelta: 30, stock: 15 }
    ],
    stockQuantity: 37,
    syncStatus: 'synced',
    isActive: true,
    rating: 4.9,
    reviewsCount: 72,
    tags: ['Eco Friendly', 'Indoor Smart'],
    weightKg: 1.1,
    createdAt: '2026-02-20T14:00:00Z',
    updatedAt: '2026-03-29T11:00:00Z'
  },
  {
    id: 'prod-vyro-06',
    title: 'Titanium Edge Smart Health Watch Pro',
    titleAr: 'ساعة ذكية تيتانيوم لتتبع الصحة واللياقة البدنية',
    description: 'AMOLED 1.43" display, ECG monitoring, SpO2 sensor, 100+ sport modes, and 12-day battery life with waterproof 5ATM rating.',
    descriptionAr: 'شاشة AMOLED مقاس 1.43 بوصة، مراقبة نبضات القلب وتخطيط ECG، قياس نسبة الأكسجين، وأكثر من 100 وضع رياضي مع بطارية تدوم 12 يوماً.',
    category: 'Electronics',
    categoryAr: 'إلكترونيات',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
      'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80'
    ],
    sellingPrice: 1680,
    supplierCost: 1050,
    currency: 'EGP',
    supplierId: 'sup-gulf-express-fz',
    supplierName: 'Gulf Direct Logistics FZ',
    supplierProductId: 'gulf_w_titanium',
    supplierSku: 'GLF-WAT-TITAN-PRO',
    sku: 'VYRO-TECH-006',
    variants: [
      { id: 'v12', title: 'Space Titanium & Silicon Strap', titleAr: 'تيتانيوم رمادي وسوار سيليكون', sku: 'VYRO-TECH-006-GRY', priceDelta: 0, stock: 30 },
      { id: 'v13', title: 'Ceramic Black & Leather Strap', titleAr: 'سيراميك أسود وسوار جلد فاخر', sku: 'VYRO-TECH-006-LBR', priceDelta: 100, stock: 19 }
    ],
    stockQuantity: 49,
    syncStatus: 'synced',
    isActive: true,
    rating: 4.8,
    reviewsCount: 95,
    tags: ['Waterproof', 'AMOLED', 'Long Battery'],
    weightKg: 0.2,
    createdAt: '2026-02-25T13:00:00Z',
    updatedAt: '2026-03-29T12:00:00Z'
  }
];

// Initial Multi-Supplier Routed Orders
const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-vyro-1001',
    orderNumber: 'VYRO-EG-98412',
    trackingCode: 'VYRO-EG-98412',
    customer: {
      fullName: 'Omar Tarek El-Sayed',
      phone: '+20 102 334 5567',
      email: 'omar.tarek@example.com'
    },
    shippingAddress: {
      fullName: 'Omar Tarek El-Sayed',
      phone: '+20 102 334 5567',
      secondaryPhone: '+20 111 889 0012',
      country: 'Egypt',
      governorateOrState: 'Cairo (القاهرة)',
      city: 'New Cairo (التجمع الخامس)',
      streetAddress: 'Street 90 North, Sector 2',
      buildingNumber: 'Villa 44B',
      notes: 'Please call before delivery'
    },
    items: [
      {
        id: 'item-101',
        productId: 'prod-vyro-01',
        variantId: 'v1',
        title: 'AeroPulse Wireless ANC Headphones',
        titleAr: 'سماعات رأس لاسلكية بخاصية عزل الضوضاء النشط',
        variantTitle: 'Matte Black',
        sku: 'VYRO-TECH-001-BLK',
        quantity: 1,
        unitPrice: 1250,
        unitCost: 780,
        totalPrice: 1250,
        totalCost: 780,
        supplierId: 'sup-taager-egypt',
        supplierName: 'Taager B2B Dropshipping',
        supplierProductId: 'tg_p_88419',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
      },
      {
        id: 'item-102',
        productId: 'prod-vyro-04',
        variantId: 'v8',
        title: 'Ultra-Slim Minimalist Bifold Wallet with RFID',
        titleAr: 'محفظة جلدية رفيعة مضادة لسرقة البطاقات RFID',
        variantTitle: 'Carbon Black',
        sku: 'VYRO-ACC-004-BLK',
        quantity: 1,
        unitPrice: 420,
        unitCost: 220,
        totalPrice: 420,
        totalCost: 220,
        supplierId: 'sup-alex-leather-craft',
        supplierName: 'Alexandria Artisan Leather',
        supplierProductId: 'alc_wlt_rfid',
        image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80'
      }
    ],
    subOrders: [
      {
        id: 'sub-ord-1001-1',
        orderId: 'ord-vyro-1001',
        supplierId: 'sup-taager-egypt',
        supplierName: 'Taager B2B Dropshipping',
        status: 'shipped',
        externalOrderId: 'TG-ORD-882194',
        trackingNumber: 'TG-EXP-9921448',
        trackingCarrier: 'Taager Express Fleet',
        trackingUrl: 'https://taager.com/track/TG-EXP-9921448',
        items: [],
        subtotalCost: 780,
        shippingCost: 45,
        supplierEstimatedDelivery: '2026-10-31',
        submissionAttempts: 1,
        lastAttemptAt: new Date(Date.now() - 3600000 * 8).toISOString(),
        idempotencyKey: 'idemp-1001-taager-8812',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
      },
      {
        id: 'sub-ord-1001-2',
        orderId: 'ord-vyro-1001',
        supplierId: 'sup-alex-leather-craft',
        supplierName: 'Alexandria Artisan Leather',
        status: 'in_manual_queue',
        externalOrderId: 'VYRO-MF-448102',
        trackingCarrier: 'Local Courier Service',
        items: [],
        subtotalCost: 220,
        shippingCost: 30,
        submissionAttempts: 1,
        lastAttemptAt: new Date(Date.now() - 3600000 * 10).toISOString(),
        idempotencyKey: 'idemp-1001-alex-8813',
        notes: 'Handmade item packaged at Alexandria studio. Awaiting pickup.',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 10).toISOString()
      }
    ],
    currency: 'EGP',
    subtotal: 1670,
    shippingFee: 50,
    discount: 0,
    codFee: 15,
    totalAmount: 1735,
    paymentMethod: 'cod',
    status: 'shipped',
    financialMetrics: {
      totalSellingPrice: 1670,
      totalSupplierCost: 1000,
      shippingCostToVyro: 75,
      expectedProfit: 595, // (1670 + 50 + 15) - (1000 + 75 + COD cost)
      realizedProfit: 0,
      codCollected: false,
      settlementStatus: 'pending'
    },
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'ord-vyro-1002',
    orderNumber: 'VYRO-EG-55201',
    trackingCode: 'VYRO-EG-55201',
    customer: {
      fullName: 'Nouran Ahmed Mansour',
      phone: '+20 115 678 9901',
      email: 'nouran.mansour@example.com'
    },
    shippingAddress: {
      fullName: 'Nouran Ahmed Mansour',
      phone: '+20 115 678 9901',
      country: 'Egypt',
      governorateOrState: 'Giza (الجيزة)',
      city: 'Sheikh Zayed (الشيخ زايد)',
      streetAddress: 'Beverly Hills Compound, Gate 3',
      buildingNumber: 'Building 12, Apt 4'
    },
    items: [
      {
        id: 'item-201',
        productId: 'prod-vyro-03',
        variantId: 'v6',
        title: 'Precision Ergonomic Mechanical Keyboard',
        titleAr: 'لوحة مفاتيح ميكانيكية مريحة مع إضاءة RGB',
        variantTitle: 'Red Switch (Silent)',
        sku: 'VYRO-TECH-003-RED',
        quantity: 1,
        unitPrice: 1490,
        unitCost: 950,
        totalPrice: 1490,
        totalCost: 950,
        supplierId: 'sup-cairo-central-hub',
        supplierName: 'Cairo Central Fulfillment Hub',
        supplierProductId: 'hub_kb_mech75',
        image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80'
      }
    ],
    subOrders: [
      {
        id: 'sub-ord-1002-1',
        orderId: 'ord-vyro-1002',
        supplierId: 'sup-cairo-central-hub',
        supplierName: 'Cairo Central Fulfillment Hub',
        status: 'delivered',
        externalOrderId: 'VYRO-MF-220199',
        trackingNumber: 'VY-ZAYED-9902',
        trackingCarrier: 'VYRO Local Fleet',
        items: [],
        subtotalCost: 950,
        shippingCost: 35,
        submissionAttempts: 1,
        idempotencyKey: 'idemp-1002-cairo-9921',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 6).toISOString()
      }
    ],
    currency: 'EGP',
    subtotal: 1490,
    shippingFee: 50,
    discount: 50,
    codFee: 15,
    totalAmount: 1505,
    paymentMethod: 'cod',
    status: 'delivered',
    financialMetrics: {
      totalSellingPrice: 1490,
      totalSupplierCost: 950,
      shippingCostToVyro: 35,
      expectedProfit: 505,
      realizedProfit: 505,
      codCollected: true,
      settlementStatus: 'reconciled'
    },
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString()
  }
];

// Link subOrder items properly
INITIAL_ORDERS[0].subOrders[0].items = [INITIAL_ORDERS[0].items[0]];
INITIAL_ORDERS[0].subOrders[1].items = [INITIAL_ORDERS[0].items[1]];
INITIAL_ORDERS[1].subOrders[0].items = [INITIAL_ORDERS[1].items[0]];

// Initial Integration Logs
const INITIAL_LOGS: IntegrationLog[] = [
  {
    id: 'log-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    supplierId: 'sup-taager-egypt',
    supplierName: 'Taager B2B Dropshipping',
    endpoint: '/api/v1/auth/verify',
    method: 'GET',
    action: 'test_connection',
    statusCode: 200,
    durationMs: 312,
    status: 'success',
    responsePayload: { status: 'authenticated', seller_id: 'vyro_eg_production' }
  },
  {
    id: 'log-002',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    supplierId: 'sup-gulf-express-fz',
    supplierName: 'Gulf Direct Logistics FZ',
    endpoint: '/health',
    method: 'GET',
    action: 'test_connection',
    statusCode: 200,
    durationMs: 185,
    status: 'success',
    responsePayload: { healthy: true, uptime: 99.98 }
  },
  {
    id: 'log-003',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    supplierId: 'sup-taager-egypt',
    supplierName: 'Taager B2B Dropshipping',
    endpoint: '/api/v1/orders',
    method: 'POST',
    action: 'submit_order',
    statusCode: 201,
    durationMs: 440,
    status: 'success',
    requestPayload: { order_number: 'VYRO-EG-98412', cash_on_delivery: 1250 },
    responsePayload: { order_id: 'TG-ORD-882194', tracking_number: 'TG-EXP-9921448', status: 'shipped' },
    idempotencyKey: 'idemp-1001-taager-8812'
  }
];

// Initial Settlements
const INITIAL_SETTLEMENTS: SupplierSettlement[] = [
  {
    id: 'set-taager-2026-w12',
    supplierId: 'sup-taager-egypt',
    supplierName: 'Taager B2B Dropshipping',
    periodStart: '2026-03-15T00:00:00Z',
    periodEnd: '2026-03-22T23:59:59Z',
    ordersCount: 42,
    totalProductCost: 32760,
    totalShippingCost: 1890,
    codFeesDeducted: 819,
    netSettlementDue: 33831,
    status: 'settled',
    payoutDate: '2026-03-25T14:00:00Z',
    referenceNumber: 'TRF-TG-881920',
    notes: 'Reconciled and transferred via bank wire.'
  },
  {
    id: 'set-cairo-hub-2026-w12',
    supplierId: 'sup-cairo-central-hub',
    supplierName: 'Cairo Central Fulfillment Hub',
    periodStart: '2026-03-15T00:00:00Z',
    periodEnd: '2026-03-28T23:59:59Z',
    ordersCount: 68,
    totalProductCost: 54400,
    totalShippingCost: 2380,
    codFeesDeducted: 544,
    netSettlementDue: 56236,
    status: 'reconciled',
    notes: 'Approved by finance. Scheduled for payout on April 2.'
  }
];

export class Database {
  private suppliers: SupplierConfig[] = [...INITIAL_SUPPLIERS];
  private products: Product[] = [...INITIAL_PRODUCTS];
  private orders: Order[] = [...INITIAL_ORDERS];
  private logs: IntegrationLog[] = [...INITIAL_LOGS];
  private settlements: SupplierSettlement[] = [...INITIAL_SETTLEMENTS];

  constructor() {
    // Hook up registry logging subscriber
    const registry = AdapterRegistry.getInstance();
    registry.setLogSubscriber((log) => {
      this.addLog(log);
    });

    // Register all initial suppliers
    this.suppliers.forEach(s => registry.register(s));
  }

  // SUPPLIERS
  public getSuppliers(): SupplierConfig[] {
    return this.suppliers.map(s => ({
      ...s,
      // Never expose real secret to browser
      apiKeySecret: undefined
    }));
  }

  public getSupplierById(id: string): SupplierConfig | undefined {
    return this.suppliers.find(s => s.id === id);
  }

  public updateSupplier(id: string, updates: Partial<SupplierConfig>): SupplierConfig {
    const index = this.suppliers.findIndex(s => s.id === id);
    if (index === -1) {
      throw new Error(`Supplier ${id} not found.`);
    }

    const current = this.suppliers[index];
    const newSecret = updates.apiKeySecret || current.apiKeySecret;
    const newMasked = updates.apiKeySecret 
      ? `${updates.apiKeySecret.slice(0, 7)}••••••••${updates.apiKeySecret.slice(-4)}`
      : current.apiKeyMasked;

    const updated: SupplierConfig = {
      ...current,
      ...updates,
      apiKeySecret: newSecret,
      apiKeyMasked: newMasked
    };

    this.suppliers[index] = updated;
    AdapterRegistry.getInstance().register(updated);

    return {
      ...updated,
      apiKeySecret: undefined
    };
  }

  public createSupplier(supplierData: Omit<SupplierConfig, 'id'>): SupplierConfig {
    const id = `sup-${supplierData.code}-${Date.now().toString().slice(-4)}`;
    const secret = supplierData.apiKeySecret || '';
    const masked = secret ? `${secret.slice(0, 6)}••••••••${secret.slice(-4)}` : undefined;

    const newSupplier: SupplierConfig = {
      ...supplierData,
      id,
      apiKeySecret: secret,
      apiKeyMasked: masked,
      status: supplierData.status || 'unconfigured'
    };

    this.suppliers.push(newSupplier);
    AdapterRegistry.getInstance().register(newSupplier);

    return {
      ...newSupplier,
      apiKeySecret: undefined
    };
  }

  // PRODUCTS
  public getProducts(filter?: { category?: string; supplierId?: string; search?: string; activeOnly?: boolean }): Product[] {
    let result = [...this.products];

    if (filter?.activeOnly) {
      result = result.filter(p => p.isActive);
    }
    if (filter?.category && filter.category !== 'all') {
      result = result.filter(p => p.category.toLowerCase() === filter.category!.toLowerCase() || p.categoryAr === filter.category);
    }
    if (filter?.supplierId && filter.supplierId !== 'all') {
      result = result.filter(p => p.supplierId === filter.supplierId);
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.titleAr.includes(q) || 
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find(p => p.id === id);
  }

  public createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const newProduct: Product = {
      ...data,
      id: `prod-vyro-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.products.unshift(newProduct);
    return newProduct;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error(`Product ${id} not found.`);
    }
    const updated = {
      ...this.products[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.products[index] = updated;
    return updated;
  }

  public deleteProduct(id: string): boolean {
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.products.splice(index, 1);
    return true;
  }

  // ORDERS & MULTI-SUPPLIER ROUTING
  public getOrders(): Order[] {
    return this.orders;
  }

  public getOrderById(id: string): Order | undefined {
    return this.orders.find(o => o.id === id || o.orderNumber === id || o.trackingCode === id);
  }

  public getOrderByTracking(code: string, phone?: string): Order | undefined {
    const cleanCode = code.trim().toUpperCase();
    const order = this.orders.find(o => 
      o.trackingCode.toUpperCase() === cleanCode || 
      o.orderNumber.toUpperCase() === cleanCode
    );

    if (order && phone) {
      const cleanPhone = phone.replace(/\D/g, '');
      const orderPhone = order.customer.phone.replace(/\D/g, '');
      if (!orderPhone.endsWith(cleanPhone.slice(-7))) {
        return undefined; // Security match validation
      }
    }
    return order;
  }

  /**
   * Server-Side Order Creation & Multi-Supplier Routing
   * 
   * CRITICAL SECURITY:
   * Re-evaluates all items against true database prices.
   * Never trusts client-submitted prices or supplier costs!
   */
  public async createOrder(payload: {
    customer: { fullName: string; phone: string; email: string };
    shippingAddress: ShippingAddress;
    cartItems: { productId: string; variantId?: string; quantity: number }[];
    paymentMethod: 'cod' | 'card';
    couponCode?: string;
  }): Promise<Order> {
    const orderId = `ord-vyro-${Date.now()}`;
    const randSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderNumber = `VYRO-EG-${randSuffix}`;
    const trackingCode = orderNumber;

    // 1. Validate & Hydrate items from genuine database products
    const validatedItems: OrderItem[] = [];
    let calculatedSubtotal = 0;
    let calculatedTotalCost = 0;

    for (const cartItem of payload.cartItems) {
      const dbProduct = this.products.find(p => p.id === cartItem.productId);
      if (!dbProduct) {
        throw new Error(`Product ID ${cartItem.productId} does not exist in catalog.`);
      }
      if (!dbProduct.isActive) {
        throw new Error(`Product "${dbProduct.title}" is currently unavailable.`);
      }

      let unitPrice = dbProduct.sellingPrice;
      let variantTitle: string | undefined;
      let sku = dbProduct.sku;

      if (cartItem.variantId) {
        const variant = dbProduct.variants.find(v => v.id === cartItem.variantId);
        if (variant) {
          unitPrice += variant.priceDelta;
          variantTitle = variant.title;
          sku = variant.sku;
        }
      }

      const quantity = Math.max(1, Math.min(20, cartItem.quantity));
      const lineTotalPrice = unitPrice * quantity;
      const lineTotalCost = dbProduct.supplierCost * quantity;

      calculatedSubtotal += lineTotalPrice;
      calculatedTotalCost += lineTotalCost;

      validatedItems.push({
        id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId: dbProduct.id,
        variantId: cartItem.variantId,
        title: dbProduct.title,
        titleAr: dbProduct.titleAr,
        variantTitle,
        sku,
        quantity,
        unitPrice,
        unitCost: dbProduct.supplierCost,
        totalPrice: lineTotalPrice,
        totalCost: lineTotalCost,
        supplierId: dbProduct.supplierId,
        supplierName: dbProduct.supplierName,
        supplierProductId: dbProduct.supplierProductId,
        image: dbProduct.images[0] || ''
      });
    }

    if (validatedItems.length === 0) {
      throw new Error('Order must contain at least one valid product.');
    }

    // 2. Shipping & Fees Calculation
    const shippingFee = 50; // Flat standard shipping in EGP
    const discount = payload.couponCode?.toUpperCase() === 'VYRO10' ? Math.round(calculatedSubtotal * 0.10) : 0;
    const codFee = payload.paymentMethod === 'cod' ? 15 : 0;
    const totalAmount = calculatedSubtotal + shippingFee + codFee - discount;

    // 3. Multi-Supplier Decomposition & Routing
    // Group line items by supplierId
    const itemsBySupplier: Record<string, OrderItem[]> = {};
    for (const item of validatedItems) {
      if (!itemsBySupplier[item.supplierId]) {
        itemsBySupplier[item.supplierId] = [];
      }
      itemsBySupplier[item.supplierId].push(item);
    }

    const subOrders: FulfillmentSubOrder[] = [];
    const registry = AdapterRegistry.getInstance();

    for (const [supplierId, supplierItems] of Object.entries(itemsBySupplier)) {
      const supplier = this.suppliers.find(s => s.id === supplierId);
      const supplierName = supplier?.name || 'Local Warehouse';
      const subOrderId = `sub-${orderId}-${supplier?.code || 'local'}-${Math.random().toString(36).substring(2, 5)}`;
      const idempotencyKey = `idemp-${orderId}-${supplierId}`;
      const subtotalCost = supplierItems.reduce((sum, item) => sum + item.totalCost, 0);

      // Create initial sub-order
      const subOrder: FulfillmentSubOrder = {
        id: subOrderId,
        orderId,
        supplierId,
        supplierName,
        status: 'pending_submission',
        items: supplierItems,
        subtotalCost,
        shippingCost: 35,
        submissionAttempts: 0,
        idempotencyKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 4. Automated Submission if Supplier API is configured & enabled
      if (supplier && supplier.integrationType === 'api' && supplier.settings.autoSubmitOrders && supplier.status === 'active') {
        try {
          const adapter = registry.getAdapter(supplier);
          subOrder.submissionAttempts += 1;
          subOrder.lastAttemptAt = new Date().toISOString();

          // Calculate COD collection assigned to this supplier proportion
          const supplierProportion = subtotalCost / (calculatedTotalCost || 1);
          const supplierCodShare = payload.paymentMethod === 'cod' ? Math.round(totalAmount * supplierProportion) : 0;

          const submissionResult = await adapter.submitOrder({
            vyroOrderId: orderNumber,
            subOrderId,
            idempotencyKey,
            shippingAddress: payload.shippingAddress,
            customer: payload.customer,
            items: supplierItems,
            codAmountToCollect: supplierCodShare,
            currency: supplier.currency,
            notes: `Sub-order for ${supplierName} via VYRO`
          });

          if (submissionResult.success) {
            subOrder.status = 'submitted';
            subOrder.externalOrderId = submissionResult.externalOrderId;
            subOrder.trackingNumber = submissionResult.trackingNumber;
            subOrder.trackingCarrier = submissionResult.trackingCarrier;
            subOrder.trackingUrl = submissionResult.trackingUrl;
            subOrder.supplierEstimatedDelivery = submissionResult.estimatedDelivery;
          } else {
            // Failed to submit to supplier API -> Graceful fallback to Manual Queue!
            subOrder.status = 'in_manual_queue';
            subOrder.lastError = submissionResult.message;
            subOrder.notes = 'API Submission rejected or unconfigured. Re-routed to VYRO Manual Dispatch Queue.';
          }
        } catch (err: any) {
          subOrder.status = 'in_manual_queue';
          subOrder.lastError = err.message;
          subOrder.notes = 'Supplier API call threw an exception. Re-routed to VYRO Manual Dispatch Queue.';
        }
      } else {
        // Supplier is manual or auto-submission disabled -> directly to manual fulfillment queue
        subOrder.status = 'in_manual_queue';
        subOrder.externalOrderId = `VYRO-MF-${Math.floor(100000 + Math.random() * 900000)}`;
        subOrder.trackingCarrier = 'Local Dispatch / Warehouse Team';
        subOrder.notes = 'Direct manual fulfillment queue. Packing slip generated.';
      }

      subOrders.push(subOrder);
    }

    // 5. Overall Order Status Determination
    let overallStatus: Order['status'] = 'processing';
    const allSubmittedOrQueued = subOrders.every(s => ['submitted', 'in_manual_queue'].includes(s.status));
    if (allSubmittedOrQueued) {
      overallStatus = 'routed';
    }

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      trackingCode,
      customer: payload.customer,
      shippingAddress: payload.shippingAddress,
      items: validatedItems,
      subOrders,
      currency: 'EGP',
      subtotal: calculatedSubtotal,
      shippingFee,
      discount,
      codFee,
      totalAmount,
      paymentMethod: payload.paymentMethod,
      status: overallStatus,
      financialMetrics: {
        totalSellingPrice: calculatedSubtotal,
        totalSupplierCost: calculatedTotalCost,
        shippingCostToVyro: subOrders.reduce((sum, s) => sum + s.shippingCost, 0),
        expectedProfit: totalAmount - calculatedTotalCost - subOrders.reduce((sum, s) => sum + s.shippingCost, 0),
        realizedProfit: 0,
        codCollected: false,
        settlementStatus: 'pending'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.orders.unshift(newOrder);

    // Decrement stock in catalog
    for (const item of validatedItems) {
      const prod = this.products.find(p => p.id === item.productId);
      if (prod) {
        prod.stockQuantity = Math.max(0, prod.stockQuantity - item.quantity);
        if (item.variantId) {
          const v = prod.variants.find(vr => vr.id === item.variantId);
          if (v) v.stock = Math.max(0, v.stock - item.quantity);
        }
      }
    }

    return newOrder;
  }

  public updateSubOrderStatus(
    orderId: string, 
    subOrderId: string, 
    status: FulfillmentSubOrder['status'], 
    tracking?: { trackingNumber?: string; carrier?: string }
  ): Order {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) throw new Error(`Order ${orderId} not found.`);

    const subOrder = order.subOrders.find(s => s.id === subOrderId);
    if (!subOrder) throw new Error(`Sub-order ${subOrderId} not found.`);

    subOrder.status = status;
    subOrder.updatedAt = new Date().toISOString();
    if (tracking?.trackingNumber) subOrder.trackingNumber = tracking.trackingNumber;
    if (tracking?.carrier) subOrder.trackingCarrier = tracking.carrier;

    // Check if entire order can be transitioned
    if (order.subOrders.every(s => s.status === 'delivered')) {
      order.status = 'delivered';
      order.financialMetrics.realizedProfit = order.financialMetrics.expectedProfit;
      order.financialMetrics.codCollected = true;
    } else if (order.subOrders.some(s => s.status === 'shipped')) {
      order.status = 'shipped';
    }

    order.updatedAt = new Date().toISOString();
    return order;
  }

  // AUDIT LOGS
  public getLogs(limit: number = 50, supplierId?: string): IntegrationLog[] {
    let result = [...this.logs];
    if (supplierId && supplierId !== 'all') {
      result = result.filter(l => l.supplierId === supplierId);
    }
    return result.slice(0, limit);
  }

  public addLog(log: IntegrationLog): void {
    this.logs.unshift(log);
    if (this.logs.length > 500) {
      this.logs.pop();
    }
  }

  // SETTLEMENTS
  public getSettlements(): SupplierSettlement[] {
    return this.settlements;
  }

  public createSettlement(data: Omit<SupplierSettlement, 'id'>): SupplierSettlement {
    const newSettlement: SupplierSettlement = {
      ...data,
      id: `set-${data.supplierId}-${Date.now().toString().slice(-4)}`
    };
    this.settlements.unshift(newSettlement);
    return newSettlement;
  }

  public updateSettlementStatus(id: string, status: SupplierSettlement['status'], ref?: string): SupplierSettlement {
    const s = this.settlements.find(item => item.id === id);
    if (!s) throw new Error('Settlement not found');
    s.status = status;
    if (ref) s.referenceNumber = ref;
    if (status === 'settled') s.payoutDate = new Date().toISOString();
    return s;
  }
}

// Global Singleton Database Instance
export const db = new Database();
