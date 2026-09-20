'use client';

import React, { useEffect, useState } from 'react';
import { getAllProducts, ProductRecord } from '../lib/db';

interface DashboardProps {
  onStartScan: () => void;
  onViewHistory: () => void;
  onOpenSettings: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartScan,
  onViewHistory,
  onOpenSettings,
}) => {
  const [products, setProducts] = useState<ProductRecord[]>([]);

  useEffect(() => {
    getAllProducts().then(setProducts);
  }, []);

  const total = products.length;
  const synced = products.filter((p) => p.syncStatus === 'synced').length;
  const pending = products.filter((p) => p.syncStatus === 'pending' || p.syncStatus === 'failed').length;
  const recent = products.slice(0, 4);

  return (
    <section className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-mono">
      {/* Hero Container */}
      <article className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <header className="max-w-xl space-y-2">
            <span className="inline-block rounded bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 border border-blue-200">
              Offline-First • Barcode &amp; Inventory Engine
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Scanit Inventory Monitor
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
              Scan product UPC/EAN barcodes instantly. Photos and custom item attributes save locally in milliseconds and sync directly to your Google Sheet &amp; Drive.
            </p>
          </header>

          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 min-w-[200px]">
            <button
              onClick={onStartScan}
              className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-3 px-5 text-sm font-semibold text-white shadow-sm transition"
              aria-label="Scan Product Barcode"
            >
              <span>📷</span>
              <span>Scan Barcode</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 dark:bg-slate-800/60 py-2.5 px-4 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              aria-label="Configure Google Drive & Sheets"
            >
              <span>⚙️</span>
              <span>Configure Google</span>
            </button>
          </div>
        </div>
      </article>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Total Scanned</span>
            <span>📦</span>
          </div>
          <span className="block text-2xl font-bold text-gray-900">{total}</span>
          <p className="text-[11px] text-gray-400">Items stored in browser</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Synced to Google</span>
            <span>✓</span>
          </div>
          <span className="block text-2xl font-bold text-blue-600">{synced}</span>
          <p className="text-[11px] text-gray-400">Rows in Google Sheet</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Sync Queue</span>
            <span>⚙</span>
          </div>
          <span className="block text-2xl font-bold text-amber-500">{pending}</span>
          <p className="text-[11px] text-gray-400">Pending background upload</p>
        </div>
      </div>

      {/* Recent Inventory Scans */}
      <article className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Recent Scanned Products
          </h2>
          {products.length > 0 && (
            <button
              onClick={onViewHistory}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View All ({products.length}) →
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            No products scanned yet. Click &quot;Scan Barcode&quot; to start!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recent.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="flex items-center gap-3">
                  {p.photos && p.photos.length > 0 ? (
                    <img
                      src={p.photos[0].dataUrl}
                      alt={p.fields?.title || 'Product'}
                      className="h-11 w-11 rounded border border-gray-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded bg-gray-200 text-base">
                      📦
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-gray-900 truncate max-w-[140px]">
                      {p.fields?.title || 'Untitled Product'}
                    </p>
                    <p className="font-mono text-[10px] text-gray-500">{p.upc}</p>
                  </div>
                </div>

                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                    p.syncStatus === 'synced'
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                  }`}
                >
                  {p.syncStatus === 'synced' ? '✓ Synced' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
};
