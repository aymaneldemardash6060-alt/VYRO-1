import React, { useState } from 'react';
import { Product, ProductVariant } from '../../types/index.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useCart } from '../../context/CartContext.tsx';
import { X, Check, ShieldCheck, Truck, Star, Sparkles } from 'lucide-react';

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
        cost: product.supplierCost,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 z-10 p-2 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
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
              <div className="flex items-center gap-2 mt-4">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImage === img
                        ? 'border-stone-900 shadow-sm'
                        : 'border-stone-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="thumbnail" className="w-full h-full object-cover" />
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
              <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
                <span>{category}</span>
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
              <div className="mt-3 flex items-center gap-2 text-xs">
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
                          onClick={() => setSelectedVariant(variant)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-2 ${
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
                <div className="flex items-center border border-stone-300 rounded-lg overflow-hidden bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 hover:bg-stone-100 text-stone-700 font-bold transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="px-4 py-1 text-xs font-bold text-stone-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                    className="px-3 py-1 hover:bg-stone-100 text-stone-700 font-bold transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-8 pt-6 border-t border-stone-200 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={currentStock <= 0}
                  className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    currentStock <= 0
                      ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                      : 'bg-stone-900 hover:bg-stone-800 text-white shadow-sm'
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
                  onClick={handleBuyNow}
                  disabled={currentStock <= 0}
                  className="py-3 px-5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 transition-all cursor-pointer shadow-xs"
                >
                  {t('buyNow')}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-stone-500 pt-1">
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
