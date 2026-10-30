import React, { useState } from 'react';
import { Product, ProductVariant } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { Eye, ShoppingBag, Star, Filter, Check } from 'lucide-react';
import { ProductDetailModal } from './ProductDetailModal.tsx';

interface ProductGridProps {
  products: Product[];
  title?: string;
  subtitle?: string;
  initialCategory?: string;
  onNavigateToCheckout?: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  title,
  subtitle,
  initialCategory = 'all',
  onNavigateToCheckout
}) => {
  const { language, formatPrice, t } = useLanguage();
  const { addToCart } = useCart();

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating'>('featured');
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Extract unique categories & suppliers
  const categories = [
    { key: 'all', labelAr: 'جميع الفئات', labelEn: 'All Categories' },
    { key: 'electronics', labelAr: 'إلكترونيات', labelEn: 'Electronics' },
    { key: 'fashion', labelAr: 'أزياء وحقائب', labelEn: 'Fashion & Bags' },
    { key: 'accessories', labelAr: 'إكسسوارات', labelEn: 'Accessories' },
    { key: 'home', labelAr: 'المنزل والديكور', labelEn: 'Home & Living' }
  ];

  const suppliers = Array.from(new Set(products.map((p) => p.supplierName)));

  // Filter & Sort
  const filtered = products
    .filter((product) => {
      if (!product.isActive) return false;
      if (activeCategory !== 'all') {
        const cat = product.category.toLowerCase();
        if (!cat.includes(activeCategory.toLowerCase())) return false;
      }
      if (selectedSupplier !== 'all') {
        if (product.supplierName !== selectedSupplier) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.sellingPrice - b.sellingPrice;
      if (sortBy === 'price_desc') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'rating') return b.rating - a.rating;
      return 0;
    });

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultVariant = product.variants[0];
    addToCart(
      {
        productId: product.id,
        variantId: defaultVariant?.id,
        title: product.title,
        titleAr: product.titleAr,
        variantTitle: defaultVariant
          ? language === 'ar'
            ? defaultVariant.titleAr
            : defaultVariant.title
          : undefined,
        sku: defaultVariant ? defaultVariant.sku : product.sku,
        price: product.sellingPrice + (defaultVariant?.priceDelta || 0),
        cost: 0,
        image: product.images[0] || '',
        supplierId: product.supplierId,
        supplierName: product.supplierName
      },
      1
    );

    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  return (
    <section className="py-12 bg-stone-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight text-stone-900 tracking-tight">
              {title || t('allProductsTitle')}
            </h2>
            {subtitle && <p className="text-sm text-stone-500 mt-1">{subtitle}</p>}
          </div>

          {/* Sort & Supplier Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Supplier Filter */}
            <div className="flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm shadow-xs transition-colors focus-within:border-stone-900 focus-within:ring-4 focus-within:ring-stone-900/10 hover:border-stone-300">
              <Filter className="h-4 w-4 shrink-0 text-stone-400" />
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                aria-label={language === 'ar' ? 'تصفية حسب المورد' : 'Filter by supplier'}
                className="max-w-44 cursor-pointer truncate bg-transparent font-medium text-stone-700 focus:outline-none"
              >
                <option value="all">
                  {language === 'ar' ? 'كافة المستودعات والموردين' : 'All Suppliers'}
                </option>
                {suppliers.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label={language === 'ar' ? 'ترتيب المنتجات' : 'Sort products'}
              className="h-10 cursor-pointer rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 shadow-xs transition-colors hover:border-stone-300 focus:border-stone-900 focus:outline-none focus:ring-4 focus:ring-stone-900/10"
            >
              <option value="featured">{t('sortFeatured')}</option>
              <option value="price_asc">{t('sortPriceAsc')}</option>
              <option value="price_desc">{t('sortPriceDesc')}</option>
              <option value="rating">{t('sortRating')}</option>
            </select>
          </div>
        </div>

        {/* Category Segmented Tabs (Compliant with frontend-design anti-slop) */}
        <div className="scrollbar-none -mx-4 mb-6 flex items-center gap-2 overflow-x-auto border-b border-stone-200 px-4 pb-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.key;
            const label = language === 'ar' ? cat.labelAr : cat.labelEn;
            return (
              <button
                key={cat.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveCategory(cat.key)}
                className={`h-10 shrink-0 whitespace-nowrap rounded-full px-5 text-sm font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-stone-950 text-white shadow-xs'
                    : 'border border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Product Cards Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
            <p className="text-sm font-semibold text-stone-800">
              {language === 'ar' ? 'لا توجد منتجات مطابقة لخيارات الفلترة' : 'No products found'}
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSelectedSupplier('all');
              }}
              className="mt-3 text-xs text-amber-600 font-bold hover:underline cursor-pointer"
            >
              {language === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product) => {
              const title = language === 'ar' ? product.titleAr : product.title;
              const isJustAdded = justAddedId === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => setModalProduct(product)}
                  className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-stone-400 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    {/* Image with Tag & Quick View button */}
                    <div className="relative aspect-square bg-stone-100 overflow-hidden">
                      <img
                        src={product.images[0]}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />

                      {/* Tag kicker */}
                      {product.tags && product.tags.length > 0 && (
                        <div className="absolute top-3 start-3 bg-stone-950/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          {product.tags[0]}
                        </div>
                      )}

                      {/* Quick View Floating Button */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalProduct(product);
                          }}
                          className="bg-white/95 text-stone-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 hover:bg-white transition-transform hover:scale-105 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('quickView')}</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Title */}
                    <div className="p-4">
                      {/* Quiet unboxed metadata separator */}
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mb-1.5">
                        <span>{language === 'ar' ? product.categoryAr : product.category}</span>
                        <span aria-hidden="true">·</span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="font-semibold text-stone-700">{product.rating}</span>
                        </div>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-700 font-medium">{language === 'ar' ? 'ضمان فايرو' : 'VYRO Verified'}</span>
                      </div>

                      <h3 className="text-sm font-bold text-stone-900 line-clamp-2 leading-snug group-hover:text-amber-700 transition-colors">
                        {title}
                      </h3>
                    </div>
                  </div>

                  {/* Price & Action Row */}
                  <div className="px-4 pb-4 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <div>
                      <div className="text-base font-black text-stone-950">
                        {formatPrice(product.sellingPrice)}
                      </div>
                      {product.variants.length > 1 && (
                        <div className="text-[10px] text-stone-400">
                          {product.variants.length} {language === 'ar' ? 'موديلات' : 'variants'}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleQuickAdd(product, e)}
                      type="button"
                      className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all cursor-pointer ${
                        isJustAdded
                          ? 'bg-emerald-600 text-white scale-105'
                          : 'bg-stone-100 hover:bg-stone-900 hover:text-white text-stone-800'
                      }`}
                      title={t('addToCart')}
                      aria-label={t('addToCart')}
                    >
                      {isJustAdded ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <ShoppingBag className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {modalProduct && (
        <ProductDetailModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onBuyNow={() => {
            setModalProduct(null);
            if (onNavigateToCheckout) {
              onNavigateToCheckout();
            }
          }}
        />
      )}
    </section>
  );
};
