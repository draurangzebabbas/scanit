'use client';

import React, { useEffect, useState } from 'react';
import { getAllProducts, deleteProductLocal, ProductRecord } from '../lib/db';
import { processSyncQueue, syncSingleProduct } from '../lib/googleSync';

export const History: React.FC = () => {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'synced'>('all');
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);

  const loadProducts = async () => {
    const list = await getAllProducts();
    setProducts(list);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this product from local inventory?')) return;
    await deleteProductLocal(id);
    await loadProducts();
  };

  const handleSyncSingle = async (p: ProductRecord) => {
    await syncSingleProduct(p);
    await loadProducts();
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    await processSyncQueue();
    await loadProducts();
    setIsSyncingAll(false);
  };

  const exportCSV = () => {
    if (!products.length) return;
    const headers = ['Record ID', 'Timestamp', 'UPC', 'Title', 'COG', 'Quantity', 'Sync Status', 'Drive Folder'];
    const rows = products.map((p) => [
      `"${p.id}"`,
      `"${p.timestamp}"`,
      `"${p.upc}"`,
      `"${p.fields?.title || ''}"`,
      `"${p.fields?.cog || ''}"`,
      `"${p.fields?.quantity || ''}"`,
      `"${p.syncStatus}"`,
      `"${p.driveFolderUrl || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `product_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.upc.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      String(p.fields?.title || '').toLowerCase().includes(search.toLowerCase());

    if (filter === 'pending') return matchesSearch && (p.syncStatus === 'pending' || p.syncStatus === 'failed');
    if (filter === 'synced') return matchesSearch && p.syncStatus === 'synced';
    return matchesSearch;
  });

  const pendingCount = products.filter((p) => p.syncStatus === 'pending' || p.syncStatus === 'failed').length;

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-5 font-mono">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Local Inventory</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {products.length} products stored locally in browser
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{isSyncingAll ? 'Syncing...' : `Sync All (${pendingCount})`}</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by UPC, Title, or ID..."
          className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-mono text-gray-900 dark:text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />

        <div className="flex rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-1">
          {(['all', 'pending', 'synced'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`rounded px-3 py-1 text-xs font-semibold capitalize transition ${
                filter === mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-8 text-center text-xs text-gray-400">
          No products found matching criteria.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const isSynced = item.syncStatus === 'synced';
            const isFailed = item.syncStatus === 'failed';

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-4 transition"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-start gap-3.5">
                  {item.photos && item.photos.length > 0 ? (
                    <img
                      src={item.photos[0].dataUrl}
                      alt={item.fields?.title || 'Product'}
                      className="h-14 w-14 rounded border border-gray-200 dark:border-gray-800 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded bg-gray-100 dark:bg-slate-800 text-lg border border-gray-200 dark:border-gray-800">
                      📦
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                      {item.fields?.title || 'Untitled Product'}
                    </h4>
                    <p className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      UPC: {item.upc}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span>COG: ${item.fields?.cog || 0}</span>
                      <span>•</span>
                      <span>Qty: {item.fields?.quantity || 1}</span>
                      <span>•</span>
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    {item.syncError && (
                      <p className="text-[10px] text-rose-500 max-w-xs truncate">
                        ⚠️ {item.syncError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Status Pill & Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-gray-100 dark:border-gray-800 pt-2 sm:pt-0">
                  {isSynced ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded px-2.5 py-0.5">
                      <span>✓ Synced</span>
                      {item.driveFolderUrl && (
                        <a
                          href={item.driveFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline ml-1"
                        >
                          Drive ↗
                        </a>
                      )}
                    </div>
                  ) : isFailed ? (
                    <button
                      onClick={() => handleSyncSingle(item)}
                      className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded px-2.5 py-0.5 hover:bg-rose-100"
                    >
                      Failed (Retry)
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded px-2.5 py-0.5">
                      Pending Sync
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-[11px] text-gray-400 hover:text-rose-500 transition"
                    title="Delete Record"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
