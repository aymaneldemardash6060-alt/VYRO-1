import React, { useEffect, useState } from 'react';
import { Product, ProductVariant } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { X, Check, ShieldCheck, Truck, Star, Sparkles, Minus, Plus } from 'lucide-react';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onBuyNow?: (product: Product, variant?: ProductVariant, quantity?: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onBuyNow
}) => {
  const { language, formatPrice, t } = useLanguage();
  const { addToCart } = useCart();

  if (!product) return null;

  const [selectedImage, setSelectedImage] = useState(product.images[0] || '');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants[0]
  );
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  // Lock page scroll behind the modal and close on Escape
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const title = language === 'ar' ? product.titleAr : product.title;
  const description = language === 'ar' ? product.descriptionAr : product.description;
  const category = language === 'ar' ? product.categoryAr : product.category;

  const currentPrice = product.sellingPrice + (selectedVariant ? selectedVariant.priceDelta : 0);
  const currentStock = selectedVariant ? selectedVariant.stock : product.stockQuantity;

  const handleAddToCart = () => {
    addToCart(
      {
        productId: product.id,
        variantId: selectedVariant?.id,
        title: product.title,
        titleAr: product.titleAr,
        variantTitle: selectedVariant
          ? language === 'ar'
            ? selectedVariant.titleAr
            : selectedVariant.title
          : undefined,
        sku: selectedVariant ? selectedVariant.sku : product.sku,
        price: currentPrice,
        cost: 0,
        image: product.images[0] || '',
        supplierId: product.supplierId,
        supplierName: product.supplierName
      },
      quantity
    );

    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    if (onBuyNow) {
      onBuyNow(product, selectedVariant, quantity);
    }
  };

  return (
    <div
      className="vyro-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-stone-950/60 p-3 backdrop-blur-xs sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-in zoom-in-95 relative my-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl duration-200"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
          className="absolute end-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-stone-600 shadow-sm ring-1 ring-stone-900/5 backdrop-blur-sm transition-colors hover:bg-stone-100 hover:text-stone-950 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Images Gallery */}
          <div className="bg-stone-50 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-e border-stone-200">
            <div className="aspect-square rounded-xl overflow-hidden bg-white border border-stone-200 flex items-center justify-center relative">
              <img
                src={selectedImage || product.images[0]}
                alt={title}
                className="w-full h-full object-cover"
              />
              {product.tags && product.tags.length > 0 && (
                <div className="absolute top-3 start-3 bg-stone-900 text-white text-[10px] font-bold px-2.5 py-1 rounded">
                  {product.tags[0]}
                </div>
              )}
            </div>

            {/* Thumbnail selector */}
            {product.images.length > 1 && (
              <div className="scrollbar-none mt-4 flex items-center gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`${title} ${idx + 1}`}
                    onClick={() => setSelectedImage(img)}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                      selectedImage === img
                        ? 'border-stone-900 shadow-sm'
                        : 'border-stone-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Independence & Supplier badge */}
            <div className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>
                  {language === 'ar' ? 'فحص جودة معتمد من فايرو' : 'Verified VYRO Standard'}
                </span>
              </div>
              <span>{product.sku}</span>
            </div>
          </div>

          {/* Product Details & Actions */}
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3 pe-12 text-xs text-stone-500 md:pe-10">
                <span className="truncate">{category}</span>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="font-semibold text-stone-800">{product.rating}</span>
                  <span className="text-stone-400">({product.reviewsCount})</span>
                </div>
              </div>

              <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 leading-snug">
                {title}
              </h2>

              {/* Price display */}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="text-2xl font-black text-stone-950">
                  {formatPrice(currentPrice)}
                </span>
                <span className="text-xs text-stone-400">
                  {language === 'ar' ? 'شامل الضريبة' : 'VAT included'}
                </span>
              </div>

              {/* Stock status indicator */}
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                {currentStock > 10 ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    {t('inStock')} ({currentStock} {language === 'ar' ? 'قطعة' : 'units'})
                  </span>
                ) : currentStock > 0 ? (
                  <span className="text-amber-700 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    {t('lowStock')} ({currentStock} {language === 'ar' ? 'فقط' : 'left'})
                  </span>
                ) : (
                  <span className="text-rose-700 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                    {t('outOfStock')}
                  </span>
                )}
                <span className="text-stone-300">·</span>
                <span className="text-emerald-700 font-semibold">
                  {language === 'ar' ? 'منتج أصلي 100% معتمد' : '100% Certified Genuine'}
                </span>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-stone-600 leading-relaxed">
                {description}
              </p>

              {/* Variants Selector */}
              {product.variants.length > 0 && (
                <div className="mt-6 pt-6 border-t border-stone-200">
                  <label className="block text-xs font-bold text-stone-800 mb-2">
                    {t('selectVariant')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => {
                      const vTitle = language === 'ar' ? variant.titleAr : variant.title;
                      const isSelected = selectedVariant?.id === variant.id;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedVariant(variant)}
                          className={`flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all cursor-pointer ${
                            isSelected
                              ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                              : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-400'
                          }`}
                        >
                          {variant.color && (
                            <span
                              className="w-3 h-3 rounded-full border border-white/50"
                              style={{ backgroundColor: variant.color }}
                            />
                          )}
                          <span>{vTitle}</span>
                          {variant.priceDelta !== 0 && (
                            <span className="text-[10px] opacity-80">
                              (+{formatPrice(variant.priceDelta)})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Stepper */}
              <div className="mt-6 flex items-center gap-4">
                <span className="text-xs font-bold text-stone-700">
                  {language === 'ar' ? 'الكمية:' : 'Quantity:'}
                </span>
                <div className="flex items-center overflow-hidden rounded-xl border border-stone-300 bg-white">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    aria-label={language === 'ar' ? 'تقليل الكمية' : 'Decrease quantity'}
                    className="flex h-10 w-10 items-center justify-center text-stone-700 transition-colors hover:bg-stone-100 cursor-pointer"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-10 text-center text-sm font-bold tabular-nums text-stone-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    aria-label={language === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                    className="flex h-10 w-10 items-center justify-center text-stone-700 transition-colors hover:bg-stone-100 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-8 pt-6 border-t border-stone-200 space-y-3">
              <div className="flex flex-col gap-3 min-[420px]:flex-row">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={currentStock <= 0}
                  className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${
                    currentStock <= 0
                      ? 'cursor-not-allowed bg-stone-200 text-stone-400'
                      : 'cursor-pointer bg-stone-950 text-white shadow-sm hover:bg-stone-800'
                  }`}
                >
                  {addedToast ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'ar' ? 'تمت الإضافة للسلة!' : 'Added to Cart!'}</span>
                    </>
                  ) : (
                    <span>{t('addToCart')}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={currentStock <= 0}
                  className="h-12 rounded-xl bg-amber-500 px-6 text-sm font-extrabold text-stone-950 shadow-xs transition-colors hover:bg-amber-400 cursor-pointer disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
                >
                  {t('buyNow')}
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-xs text-stone-500">
                <div className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-stone-400" />
                  <span>{language === 'ar' ? 'شحن سريع لباب بيتك' : 'Fast Courier Dispatch'}</span>
                </div>
                <span>·</span>
                <span>{language === 'ar' ? 'دفع عند الاستلام متاح' : 'Cash on Delivery Available'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
