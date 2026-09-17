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
    <div className="mx-auto max-w-xl p-4 space-y-5">
      {/* Hero Scan Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 mb-3">
            Offline-First • Zero Latency
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Ready to Hunt Products?
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-400 max-w-sm">
            Instant barcode detection. Data &amp; photos save locally in milliseconds, then sync in background.
          </p>

          <button
            onClick={onStartScan}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 py-4 text-center text-base font-black text-gray-950 shadow-xl shadow-emerald-500/25 hover:opacity-95 active:scale-[0.99] transition"
          >
            <span className="text-xl">📷</span>
            <span>SCAN PRODUCT</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-3.5 text-center">
          <span className="block text-xl font-extrabold text-white">{total}</span>
          <span className="text-[11px] font-medium text-gray-400">Total Scanned</span>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-3.5 text-center">
          <span className="block text-xl font-extrabold text-emerald-400">{synced}</span>
          <span className="text-[11px] font-medium text-gray-400">Synced to Drive</span>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-3.5 text-center">
          <span className="block text-xl font-extrabold text-amber-400">{pending}</span>
          <span className="text-[11px] font-medium text-gray-400">In Sync Queue</span>
        </div>
      </div>

      {/* Recent Scans Section */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Recent Scans
          </h3>
          {products.length > 0 && (
            <button
              onClick={onViewHistory}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              View All ({products.length}) →
            </button>
          )}
        </div>

        {recent.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">
            No products scanned yet. Tap &quot;Scan Product&quot; to begin!
          </p>
        ) : (
          <div className="space-y-2.5">
            {recent.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950 p-2.5"
              >
                <div className="flex items-center gap-3">
                  {p.photos && p.photos.length > 0 ? (
                    <img
                      src={p.photos[0].dataUrl}
                      alt={p.fields?.title || 'Product'}
                      className="h-10 w-10 rounded-lg object-cover border border-gray-800"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 text-sm">
                      📦
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[180px]">
                      {p.fields?.title || 'Untitled Product'}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400">{p.upc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      p.syncStatus === 'synced'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {p.syncStatus === 'synced' ? '✓ Synced' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
