import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { Product, SupplierConfig, ProductVariant } from '../../types/index.ts';
import { adminFetch } from '../../lib/api.ts';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Layers,
  Sparkles
} from 'lucide-react';

interface ProductsManagerProps {
  products: Product[];
  suppliers: SupplierConfig[];
  onRefreshProducts: () => void;
}

export const ProductsManager: React.FC<ProductsManagerProps> = ({
  products,
  suppliers,
  onRefreshProducts
}) => {
  const { language, formatPrice, t } = useLanguage();

  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [categoryAr, setCategoryAr] = useState('إلكترونيات');
  const [sku, setSku] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierSku, setSupplierSku] = useState('');
  const [supplierProductId, setSupplierProductId] = useState('');
  const [sellingPrice, setSellingPrice] = useState(0);
  const [supplierCost, setSupplierCost] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(10);
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openAddModal = () => {
    setEditingProduct(null);
    setIsAdding(true);
    setTitle('');
    setTitleAr('');
    setDescription('');
    setDescriptionAr('');
    setCategory('Electronics');
    setCategoryAr('إلكترونيات');
    setSku(`VYRO-ITM-${Math.floor(100 + Math.random() * 900)}`);
    setSupplierId(suppliers[0]?.id || '');
    setSupplierSku('');
    setSupplierProductId('');
    setSellingPrice(500);
    setSupplierCost(300);
    setStockQuantity(20);
    setImageUrl('https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800&q=80');
    setIsActive(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setIsAdding(false);
    setTitle(p.title);
    setTitleAr(p.titleAr);
    setDescription(p.description);
    setDescriptionAr(p.descriptionAr);
    setCategory(p.category);
    setCategoryAr(p.categoryAr);
    setSku(p.sku);
    setSupplierId(p.supplierId);
    setSupplierSku(p.supplierSku || '');
    setSupplierProductId(p.supplierProductId || '');
    setSellingPrice(p.sellingPrice);
    setSupplierCost(p.supplierCost);
    setStockQuantity(p.stockQuantity);
    setImageUrl(p.images[0] || '');
    setIsActive(p.isActive);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const selectedSup = suppliers.find((s) => s.id === supplierId);
      const payload: any = {
        title,
        titleAr,
        description,
        descriptionAr,
        category,
        categoryAr,
        sku,
        supplierId,
        supplierName: selectedSup?.name || 'Local Warehouse',
        supplierSku: supplierSku || undefined,
        supplierProductId: supplierProductId || undefined,
        sellingPrice: Number(sellingPrice),
        supplierCost: Number(supplierCost),
        stockQuantity: Number(stockQuantity),
        images: [imageUrl],
        currency: 'EGP',
        syncStatus: selectedSup?.integrationType === 'api' ? 'synced' : 'local_only',
        isActive,
        rating: editingProduct?.rating || 4.8,
        reviewsCount: editingProduct?.reviewsCount || 1,
        variants: editingProduct?.variants || [
          {
            id: `v-${Date.now()}`,
            title: 'Standard',
            titleAr: 'القياسي',
            sku: `${sku}-STD`,
            priceDelta: 0,
            stock: Number(stockQuantity)
          }
        ]
      };

      if (isAdding) {
        await adminFetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else if (editingProduct) {
        await adminFetch(`/api/products/${editingProduct.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setEditingProduct(null);
      setIsAdding(false);
      onRefreshProducts();
    } catch (err: any) {
      alert(`Product save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleProductActive = async (p: Product) => {
    try {
      await adminFetch(`/api/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !p.isActive })
      });
      onRefreshProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete product "${p.title}"?`)) return;
    try {
      await adminFetch(`/api/products/${p.id}`, { method: 'DELETE' });
      onRefreshProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (filterSupplier !== 'all' && p.supplierId !== filterSupplier) return false;
    if (filterCategory !== 'all' && !p.category.toLowerCase().includes(filterCategory.toLowerCase()))
      return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.titleAr.includes(q) ||
        p.sku.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">
            {t('productsHeader')}
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            {t('productsSub')}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addProductBtn')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بالاسم، الكود، أو SKU...' : 'Search by title or SKU...'}
            className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
          />
          <Search className="w-4 h-4 text-stone-400 absolute top-1/2 -translate-y-1/2 end-3" />
        </div>

        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-xs text-stone-700 font-medium focus:outline-none cursor-pointer"
        >
          <option value="all">
            {language === 'ar' ? 'كافة الموردين والمستودعات' : 'All Suppliers'}
          </option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'المنتج' : 'Product'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'المورد والمصدر' : 'Supplier Source'}</th>
                <th className="py-3 px-4 text-start">{t('sellingPrice')}</th>
                <th className="py-3 px-4 text-start">{t('supplierCost')}</th>
                <th className="py-3 px-4 text-start">{t('profitMargin')}</th>
                <th className="py-3 px-4 text-start">{t('stockLevel')}</th>
                <th className="py-3 px-4 text-start">{t('syncStatusLabel')}</th>
                <th className="py-3 px-4 text-end">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.map((p) => {
                const profit = p.sellingPrice - p.supplierCost;
                const margin = p.sellingPrice > 0 ? Math.round((profit / p.sellingPrice) * 100) : 0;

                return (
                  <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Product Image & Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt={p.title}
                          className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-stone-900 line-clamp-1 max-w-xs">
                            {language === 'ar' ? p.titleAr : p.title}
                          </div>
                          <span className="font-mono text-[10px] text-stone-400 uppercase">
                            {p.sku}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-800">{p.supplierName}</div>
                      {p.supplierSku && (
                        <div className="text-[10px] text-stone-400 font-mono">
                          SKU: {p.supplierSku}
                        </div>
                      )}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3 px-4 font-black text-stone-900">
                      {formatPrice(p.sellingPrice)}
                    </td>

                    {/* Supplier Cost */}
                    <td className="py-3 px-4 font-semibold text-stone-600">
                      {formatPrice(p.supplierCost)}
                    </td>

                    {/* Profit Margin */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-emerald-700">+{formatPrice(profit)}</div>
                      <div className="text-[10px] text-emerald-600">{margin}% margin</div>
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          p.stockQuantity > 5 ? 'text-stone-800' : 'text-amber-700 font-bold'
                        }`}
                      >
                        {p.stockQuantity} {language === 'ar' ? 'قطعة' : 'units'}
                      </span>
                    </td>

                    {/* Sync Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.syncStatus === 'synced'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {p.syncStatus === 'synced' ? t('syncSynced') : t('syncLocalOnly')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleProductActive(p)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                            p.isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                          }`}
                        >
                          {p.isActive ? (language === 'ar' ? 'مفعل' : 'Active') : (language === 'ar' ? 'معطل' : 'Paused')}
                        </button>

                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
                          title={t('editProduct')}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title={t('deleteProduct')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {(editingProduct || isAdding) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-stone-200 overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-base">
                {isAdding ? t('addProductBtn') : `${t('editProduct')}: ${editingProduct?.title}`}
              </h3>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsAdding(false);
                }}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'الاسم بالإنجليزية (Title EN)' : 'Title (English)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'الاسم بالعربية (Title AR)' : 'Title (Arabic)'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={titleAr}
                    onChange={(e) => setTitleAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'الفئة (EN)' : 'Category (EN)'}
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'الفئة (AR)' : 'Category (AR)'}
                  </label>
                  <input
                    type="text"
                    value={categoryAr}
                    onChange={(e) => setCategoryAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">{t('sku')} *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'المورد المسؤول' : 'Assigned Supplier'} *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-900"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'كود المورد (Supplier SKU)' : 'Supplier SKU'}
                  </label>
                  <input
                    type="text"
                    value={supplierSku}
                    onChange={(e) => setSupplierSku(e.target.value)}
                    placeholder="e.g. TG-P-8841"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'معرّف منتج المورد (External ID)' : 'Supplier External ID'}
                  </label>
                  <input
                    type="text"
                    value={supplierProductId}
                    onChange={(e) => setSupplierProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 font-mono text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {t('sellingPrice')} (EGP) *
                  </label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {t('supplierCost')} (EGP) *
                  </label>
                  <input
                    type="number"
                    required
                    value={supplierCost}
                    onChange={(e) => setSupplierCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {t('stockLevel')}
                  </label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'رابط الصورة' : 'Image URL'}
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'الوصف بالعربية' : 'Description (Arabic)'}
                  </label>
                  <textarea
                    rows={2}
                    value={descriptionAr}
                    onChange={(e) => setDescriptionAr(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'الوصف بالإنجليزية' : 'Description (English)'}
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-stone-900"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsAdding(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-white font-black shadow-sm"
                >
                  {saving ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
