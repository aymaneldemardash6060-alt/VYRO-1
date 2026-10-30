import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { IntegrationLog, SupplierConfig } from '../../types/index.ts';
import {
  FileText,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  X,
  RefreshCw
} from 'lucide-react';

interface IntegrationLogsProps {
  logs: IntegrationLog[];
  suppliers: SupplierConfig[];
  onRefreshLogs: () => void;
}

export const IntegrationLogs: React.FC<IntegrationLogsProps> = ({
  logs,
  suppliers,
  onRefreshLogs
}) => {
  const { language, t } = useLanguage();
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [inspectLog, setInspectLog] = useState<IntegrationLog | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (filterSupplier !== 'all' && log.supplierId !== filterSupplier) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">
            {t('logsHeader')}
          </h2>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            {t('logsSub')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Supplier filter */}
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="px-3 py-2 rounded-xl border border-stone-200 bg-white text-xs text-stone-700 font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">
              {language === 'ar' ? 'كافة الموردين' : 'All Suppliers'}
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={onRefreshLogs}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'الوقت' : 'Timestamp'}</th>
                <th className="py-3 px-4 text-start">{language === 'ar' ? 'المورد' : 'Supplier'}</th>
                <th className="py-3 px-4 text-start">{t('actionCol')}</th>
                <th className="py-3 px-4 text-start">{t('endpointCol')}</th>
                <th className="py-3 px-4 text-start">{t('methodCol')}</th>
                <th className="py-3 px-4 text-start">{t('statusCodeCol')}</th>
                <th className="py-3 px-4 text-start">{t('durationCol')}</th>
                <th className="py-3 px-4 text-end">{language === 'ar' ? 'المعاينة' : 'Inspect'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLogs.map((log) => {
                const isSuccess = log.statusCode >= 200 && log.statusCode < 300;

                return (
                  <tr key={log.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4 font-bold text-stone-900 whitespace-nowrap">
                      {log.supplierName}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-stone-100 text-stone-800">
                        {log.action}
                      </span>
                    </td>

                    {/* Endpoint */}
                    <td className="py-3 px-4 font-mono text-[11px] text-stone-600 max-w-xs truncate" title={log.endpoint}>
                      {log.endpoint}
                    </td>

                    {/* Method */}
                    <td className="py-3 px-4 font-mono font-bold text-stone-700">
                      {log.method}
                    </td>

                    {/* HTTP Status Code */}
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          isSuccess
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.statusCode === 504 || log.statusCode === 503
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.statusCode}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 font-mono text-stone-500 text-[11px]">
                      {log.durationMs}ms
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3 px-4 text-end">
                      <button
                        onClick={() => setInspectLog(log)}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{t('viewPayload')}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 text-stone-200 rounded-2xl shadow-2xl max-w-2xl w-full border border-stone-800 overflow-hidden animate-in fade-in duration-200">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-stone-800 text-amber-400">
                  {inspectLog.method} {inspectLog.endpoint}
                </span>
                <span className="font-mono text-xs text-stone-400">
                  HTTP {inspectLog.statusCode} ({inspectLog.durationMs}ms)
                </span>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 rounded-lg hover:bg-stone-800 text-stone-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs font-mono">
              {inspectLog.requestPayload && (
                <div>
                  <span className="text-stone-400 block mb-1">Request Payload:</span>
                  <pre className="bg-stone-950 p-3 rounded-lg border border-stone-800 overflow-x-auto text-stone-300">
                    {JSON.stringify(inspectLog.requestPayload, null, 2)}
                  </pre>
                </div>
              )}

              {inspectLog.responsePayload && (
                <div>
                  <span className="text-stone-400 block mb-1">Response Payload:</span>
                  <pre className="bg-stone-950 p-3 rounded-lg border border-stone-800 overflow-x-auto text-emerald-400">
                    {JSON.stringify(inspectLog.responsePayload, null, 2)}
                  </pre>
                </div>
              )}

              {inspectLog.errorMessage && (
                <div>
                  <span className="text-rose-400 block mb-1">Error Message:</span>
                  <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-lg text-rose-300">
                    {inspectLog.errorMessage}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
