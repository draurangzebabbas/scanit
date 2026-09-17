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
    <div className="mx-auto max-w-2xl p-4">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">Local Inventory</h2>
          <p className="text-xs text-gray-400">
            {products.length} products stored locally in browser
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{isSyncingAll ? 'Syncing...' : `Sync All (${pendingCount})`}</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by UPC, Title, or ID..."
          className="flex-1 rounded-xl border border-gray-800 bg-gray-900/60 px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
        />

        <div className="flex rounded-xl border border-gray-800 bg-gray-900/60 p-1">
          {(['all', 'pending', 'synced'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
                filter === mode
                  ? 'bg-gray-800 text-white shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-8 text-center text-gray-500">
          <p className="text-sm">No products found matching criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isSynced = item.syncStatus === 'synced';
            const isFailed = item.syncStatus === 'failed';

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900/60 p-4 hover:border-gray-700 transition"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-start gap-3.5">
                  {item.photos && item.photos.length > 0 ? (
                    <img
                      src={item.photos[0].dataUrl}
                      alt={item.fields?.title || 'Product'}
                      className="h-16 w-16 rounded-xl object-cover border border-gray-800 flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gray-800 text-xl border border-gray-700">
                      📦
                    </div>
                  )}

                  <div>
                    <h4 className="font-bold text-white text-sm">
                      {item.fields?.title || 'Untitled Product'}
                    </h4>
                    <p className="font-mono text-xs text-emerald-400 mt-0.5">
                      UPC: {item.upc}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <span>COG: ${item.fields?.cog || 0}</span>
                      <span>•</span>
                      <span>Qty: {item.fields?.quantity || 1}</span>
                      <span>•</span>
                      <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                    </div>
                    {item.syncError && (
                      <p className="text-[11px] text-rose-400 mt-1 max-w-xs truncate">
                        ⚠️ {item.syncError}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Status Pill & Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-gray-800 pt-2 sm:pt-0">
                  {isSynced ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
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
                      className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-2.5 py-0.5 hover:bg-rose-500/20"
                    >
                      Failed (Retry)
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5">
                      Pending Sync
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-gray-500 hover:text-rose-400 p-1 transition"
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
