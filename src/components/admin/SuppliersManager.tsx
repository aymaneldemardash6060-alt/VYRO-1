import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { SupplierConfig, Currency } from '../../types/index.ts';
import { adminFetch } from '../../lib/api.ts';
import {
  Server,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings,
  ShieldCheck,
  Zap,
  Globe,
  Sliders,
  X,
  Lock
} from 'lucide-react';

interface SuppliersManagerProps {
  suppliers: SupplierConfig[];
  onRefreshSuppliers: () => void;
}

export const SuppliersManager: React.FC<SuppliersManagerProps> = ({
  suppliers,
  onRefreshSuppliers
}) => {
  const { language, t } = useLanguage();

  const [testingSupplierId, setTestingSupplierId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; latency?: number } | null>(null);

  const [syncingSupplierId, setSyncingSupplierId] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Edit/Config Modal state
  const [editingSupplier, setEditingSupplier] = useState<SupplierConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form states for modal
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formType, setFormType] = useState<'api' | 'manual'>('api');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formAuthMethod, setFormAuthMethod] = useState<'bearer' | 'api_key_header' | 'none'>('bearer');
  const [formApiKeySecret, setFormApiKeySecret] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('EGY');
  const [formCurrency, setFormCurrency] = useState<Currency>('EGP');
  const [formMarkup, setFormMarkup] = useState(30);
  const [formAutoSubmit, setFormAutoSubmit] = useState(false);
  const [formAutoSyncInv, setFormAutoSyncInv] = useState(false);
  const [formSyncInterval, setFormSyncInterval] = useState(60);
  const [modalSaving, setModalSaving] = useState(false);

  const openEditModal = (supplier: SupplierConfig) => {
    setEditingSupplier(supplier);
    setIsAddingNew(false);
    setFormName(supplier.name);
    setFormCode(supplier.code);
    setFormType(supplier.integrationType === 'manual' ? 'manual' : 'api');
    setFormBaseUrl(supplier.baseUrl || '');
    setFormAuthMethod(supplier.authMethod === 'api_key_header' ? 'api_key_header' : 'bearer');
    setFormApiKeySecret(''); // Never prefill secret for security
    setFormCountryCode(supplier.countryCode);
    setFormCurrency(supplier.currency);
    setFormMarkup(supplier.settings.markupPercentage || 30);
    setFormAutoSubmit(supplier.settings.autoSubmitOrders);
    setFormAutoSyncInv(supplier.settings.autoSyncInventory);
    setFormSyncInterval(supplier.settings.syncIntervalMinutes || 60);
  };

  const openAddModal = () => {
    setEditingSupplier(null);
    setIsAddingNew(true);
    setFormName('');
    setFormCode('');
    setFormType('api');
    setFormBaseUrl('https://api.supplier.com');
    setFormAuthMethod('bearer');
    setFormApiKeySecret('');
    setFormCountryCode('EGY');
    setFormCurrency('EGP');
    setFormMarkup(30);
    setFormAutoSubmit(false);
    setFormAutoSyncInv(false);
    setFormSyncInterval(60);
  };

  const handleTestConnection = async (supplier: SupplierConfig) => {
    setTestingSupplierId(supplier.id);
    setTestResult(null);

    try {
      const res = await adminFetch(`/api/suppliers/${supplier.id}/test`, { method: 'POST' });
      const data = await res.json();

      if (data.success && data.result.success) {
        setTestResult({
          id: supplier.id,
          success: true,
          message: data.result.message || 'API connection verified successfully',
          latency: data.result.latencyMs
        });
      } else {
        setTestResult({
          id: supplier.id,
          success: false,
          message: data.result?.message || data.error || 'Connection failed'
        });
      }
      onRefreshSuppliers();
    } catch (err: any) {
      setTestResult({
        id: supplier.id,
        success: false,
        message: err.message || 'Network error executing server-side ping'
      });
    } finally {
      setTestingSupplierId(null);
    }
  };

  const handleSyncSupplier = async (supplier: SupplierConfig) => {
    setSyncingSupplierId(supplier.id);
    setSyncResult(null);

    try {
      const res = await adminFetch(`/api/suppliers/${supplier.id}/sync`, { method: 'POST' });
      const data = await res.json();

      setSyncResult({
        id: supplier.id,
        success: data.success,
        message: data.message || 'Sync operation finished'
      });
      onRefreshSuppliers();
    } catch (err: any) {
      setSyncResult({
        id: supplier.id,
        success: false,
        message: err.message
      });
    } finally {
      setSyncingSupplierId(null);
    }
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSaving(true);

    try {
      const payload: any = {
        name: formName,
        code: formCode,
        integrationType: formType,
        baseUrl: formBaseUrl,
        authMethod: formType === 'manual' ? 'none' : formAuthMethod,
        countryCode: formCountryCode,
        currency: formCurrency,
        settings: {
          autoSubmitOrders: formAutoSubmit,
          autoSyncInventory: formAutoSyncInv,
          autoSyncPricing: false,
          syncIntervalMinutes: formSyncInterval,
          stockThreshold: 3,
          markupPercentage: formMarkup,
          settlementCycleDays: 14,
          codFeePercent: 2.0
        }
      };

      if (formApiKeySecret.trim()) {
        payload.apiKeySecret = formApiKeySecret.trim();
      }

      if (isAddingNew) {
        payload.capabilities = {
          supportsProductSync: formType === 'api',
          supportsInventorySync: formType === 'api',
          supportsPricingSync: formType === 'api',
          supportsAutoOrderSubmission: formType === 'api',
          supportsTrackingSync: formType === 'api',
          supportsCancellation: true,
          supportsWebhooks: formType === 'api'
        };
        await adminFetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else if (editingSupplier) {
        await adminFetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      setEditingSupplier(null);
      setIsAddingNew(false);
      onRefreshSuppliers();
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setModalSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">
            {t('suppliersHeader')}
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            {t('suppliersSub')}
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addSupplierBtn')}</span>
        </button>
      </div>

      {/* Suppliers Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {suppliers.map((supplier) => {
          const isTesting = testingSupplierId === supplier.id;
          const isSyncing = syncingSupplierId === supplier.id;
          const result = testResult && testResult.id === supplier.id ? testResult : null;
          const syncRes = syncResult && syncResult.id === supplier.id ? syncResult : null;

          return (
            <div
              key={supplier.id}
              className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-6 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Top Title & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-stone-900">{supplier.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 uppercase font-bold">
                        {supplier.code}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">{supplier.notes}</p>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shrink-0 ${
                      supplier.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : supplier.status === 'degraded'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-stone-200 text-stone-700'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {supplier.status === 'active'
                      ? t('statusActive')
                      : supplier.status === 'degraded'
                      ? t('statusDegraded')
                      : supplier.status}
                  </span>
                </div>

                {/* Specs / Configuration Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-stone-50 p-3.5 rounded-xl border border-stone-100">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">
                      {t('supplierType')}
                    </span>
                    <span className="font-semibold text-stone-800 uppercase">
                      {supplier.integrationType}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">
                      {t('countryCode')} / {language === 'ar' ? 'العملة' : 'Currency'}
                    </span>
                    <span className="font-semibold text-stone-800">
                      {supplier.countryCode} ({supplier.currency})
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">
                      {t('baseUrl')}
                    </span>
                    <span className="font-mono text-stone-700 text-[11px] truncate block">
                      {supplier.baseUrl || 'Internal VYRO Queue (No external HTTP)'}
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">
                      {t('apiKeyMasked')}
                    </span>
                    <span className="font-mono text-stone-600 text-[11px] flex items-center gap-1">
                      <Lock className="w-3 h-3 text-stone-400" />
                      <span>{supplier.apiKeyMasked || 'None / Direct Warehouse'}</span>
                    </span>
                  </div>

                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">
                      {t('markupRule')}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      +{supplier.settings.markupPercentage}% Markup
                    </span>
                  </div>
                </div>

                {/* Capabilities Badges (Unboxed / Clean) */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-600 block">
                    {language === 'ar' ? 'القدرات المدعومة بالربط:' : 'Adapter Capabilities:'}
                  </span>
                  <div className="flex flex-wrap gap-1 text-[10px] font-medium text-stone-600">
                    <span className="px-2 py-0.5 rounded bg-stone-100">
                      {supplier.capabilities.supportsAutoOrderSubmission ? '✓ Auto Order' : '— Manual Order'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-100">
                      {supplier.capabilities.supportsInventorySync ? '✓ Inventory Sync' : '— Local Stock'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-100">
                      {supplier.capabilities.supportsTrackingSync ? '✓ Tracking Sync' : '— Internal Dispatch'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-stone-100">
                      {supplier.capabilities.supportsCancellation ? '✓ Cancellation' : '— No Cancel'}
                    </span>
                  </div>
                </div>

                {/* Feedback Banners for Test Connection & Sync */}
                {result && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                      result.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="font-bold block">
                        {result.success ? t('connectionSuccess') : t('connectionFailed')}
                        {result.latency && ` (${result.latency}ms)`}
                      </span>
                      <span className="text-[11px] opacity-90">{result.message}</span>
                    </div>
                  </div>
                )}

                {syncRes && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    {syncRes.message}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleTestConnection(supplier)}
                  disabled={isTesting}
                  className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-bounce text-amber-500' : 'text-stone-500'}`} />
                  <span>{isTesting ? t('loading') : t('testConnectionBtn')}</span>
                </button>

                {supplier.capabilities.supportsProductSync && (
                  <button
                    onClick={() => handleSyncSupplier(supplier)}
                    disabled={isSyncing}
                    className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-500' : 'text-stone-500'}`} />
                    <span>{isSyncing ? t('loading') : t('syncCatalogBtn')}</span>
                  </button>
                )}

                <button
                  onClick={() => openEditModal(supplier)}
                  className="ms-auto px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{t('configureBtn')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Add Modal */}
      {(editingSupplier || isAddingNew) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-stone-200 overflow-hidden animate-in fade-in duration-200">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-base">
                {isAddingNew ? t('addSupplierBtn') : `${t('configureBtn')}: ${editingSupplier?.name}`}
              </h3>
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setIsAddingNew(false);
                }}
                className="p-1.5 rounded-full hover:bg-stone-100 text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'اسم المورد' : 'Supplier Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'الكود الداخلي' : 'Internal Code'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="e.g. taager / cairo_hub"
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-900 font-mono focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('supplierType')}
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-900 bg-white"
                  >
                    <option value="api">Automated REST API</option>
                    <option value="manual">Manual Fulfillment (Local Queue)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('countryCode')}
                  </label>
                  <select
                    value={formCountryCode}
                    onChange={(e) => setFormCountryCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-900 bg-white"
                  >
                    <option value="EGY">EGY (Egypt)</option>
                    <option value="SAU">SAU (Saudi Arabia)</option>
                    <option value="ARE">ARE (UAE)</option>
                  </select>
                </div>

                {formType === 'api' && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {t('baseUrl')}
                      </label>
                      <input
                        type="url"
                        value={formBaseUrl}
                        onChange={(e) => setFormBaseUrl(e.target.value)}
                        placeholder="https://api.taager.com"
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        {language === 'ar' ? 'مفتاح الـ API السري (يتم تشفيره على الخادم)' : 'Secret API Token (Encrypted)'}
                      </label>
                      <input
                        type="password"
                        value={formApiKeySecret}
                        onChange={(e) => setFormApiKeySecret(e.target.value)}
                        placeholder={editingSupplier?.apiKeyMasked || 'Enter new Bearer token or leave blank to keep'}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {t('markupRule')} (%)
                  </label>
                  <input
                    type="number"
                    value={formMarkup}
                    onChange={(e) => setFormMarkup(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {language === 'ar' ? 'فترة التزامن (دقائق)' : 'Sync Interval (mins)'}
                  </label>
                  <input
                    type="number"
                    value={formSyncInterval}
                    onChange={(e) => setFormSyncInterval(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs text-stone-900"
                  />
                </div>

                <div className="col-span-2 space-y-2 pt-2 border-t border-stone-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                    <input
                      type="checkbox"
                      checked={formAutoSubmit}
                      onChange={(e) => setFormAutoSubmit(e.target.checked)}
                      className="rounded text-stone-900"
                    />
                    <span>{t('autoSubmitRule')}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                    <input
                      type="checkbox"
                      checked={formAutoSyncInv}
                      onChange={(e) => setFormAutoSyncInv(e.target.checked)}
                      className="rounded text-stone-900"
                    />
                    <span>{language === 'ar' ? 'مزامنة المخزون تلقائياً' : 'Auto Sync Inventory'}</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSupplier(null);
                    setIsAddingNew(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-white text-xs font-black shadow-sm"
                >
                  {modalSaving ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
