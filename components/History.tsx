'use client';

import React, { useEffect, useState } from 'react';
import { getAllProducts, deleteProductLocal, getProductFields, ProductRecord, ProductField } from '../lib/db';
import { processSyncQueue, syncSingleProduct } from '../lib/googleSync';

export const History: React.FC = () => {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [configuredFields, setConfiguredFields] = useState<ProductField[]>([]);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'synced'>('all');
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null);

  const loadData = async () => {
    const list = await getAllProducts();
    const fieldsDef = await getProductFields();
    setProducts(list);
    setConfiguredFields(fieldsDef);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to remove this product from local browser memory?')) return;
    await deleteProductLocal(id);
    if (selectedProduct && selectedProduct.id === id) {
      setSelectedProduct(null);
    }
    await loadData();
  };

  const handleSyncSingle = async (p: ProductRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await syncSingleProduct(p);
    await loadData();
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    await processSyncQueue();
    await loadData();
    setIsSyncingAll(false);
  };

  const exportCSV = async () => {
    if (!products.length) return;
    const currentFields = configuredFields.length > 0 ? configuredFields : await getProductFields();

    // Build headers: Record ID, Timestamp, UPC, then all dynamic custom fields, then Sync Status & Drive info
    const dynamicHeaders = currentFields.map((f) => f.name);
    const headers = ['Record ID', 'Timestamp', 'UPC', ...dynamicHeaders, 'Sync Status', 'Drive Folder URL', 'Photo Count'];

    const rows = products.map((p) => {
      const dynamicVals = currentFields.map((f) => {
        const val = p.fields?.[f.id] !== undefined ? p.fields[f.id] : p.fields?.[f.name] || '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });

      return [
        `"${p.id}"`,
        `"${p.timestamp}"`,
        `"${p.upc}"`,
        ...dynamicVals,
        `"${p.syncStatus}"`,
        `"${p.driveFolderUrl || ''}"`,
        `"${p.photos ? p.photos.length : 0}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Strictly search by UPC
  const filtered = products.filter((p) => {
    const searchTrim = search.trim().toLowerCase();
    const matchesSearch = !searchTrim || p.upc.toLowerCase().includes(searchTrim);

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
          <h2 className="text-xl font-bold text-gray-900">Local Inventory</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {products.length} products saved in browser memory
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={isSyncingAll}
              className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{isSyncingAll ? 'Syncing...' : `Sync All (${pendingCount})`}</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-100 transition shadow-sm flex items-center gap-1.5"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search Bar (UPC Only) & Filter Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by UPC barcode..."
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3.5 py-2 text-xs font-mono text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none shadow-sm"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
        </div>

        <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          {(['all', 'pending', 'synced'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`rounded px-3 py-1 text-xs font-semibold capitalize transition ${
                filter === mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Products List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-400">
          No products found matching UPC search.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const isSynced = item.syncStatus === 'synced';
            const isFailed = item.syncStatus === 'failed';

            return (
              <div
                key={item.id}
                onClick={() => setSelectedProduct(item)}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-md transition cursor-pointer overflow-hidden"
              >
                {/* Left: Product Photo & Basic Info (UPC + Date) */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {item.photos && item.photos.length > 0 ? (
                    <img
                      src={item.photos[0].dataUrl}
                      alt={`Product ${item.upc}`}
                      className="h-14 w-14 rounded-lg border border-gray-200 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xl border border-gray-200">
                      📦
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900 tracking-wide">
                        UPC: {item.upc}
                      </span>
                      {item.photos && item.photos.length > 1 && (
                        <span className="rounded bg-blue-50 text-blue-600 px-1.5 py-0.5 text-[10px] font-semibold">
                          +{item.photos.length - 1} photos
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">
                      📅 {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Right: Sync Status Badge, View Details, and Delete */}
                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-gray-100 pt-2 sm:pt-0 flex-shrink-0">
                  {isSynced ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 whitespace-nowrap">
                      <span>✓ Synced</span>
                      {item.driveFolderUrl && (
                        <a
                          href={item.driveFolderUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline ml-1 text-emerald-800 font-bold"
                        >
                          Drive ↗
                        </a>
                      )}
                    </div>
                  ) : isFailed ? (
                    <button
                      onClick={(e) => handleSyncSingle(item, e)}
                      className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1 hover:bg-rose-100 whitespace-nowrap"
                    >
                      Failed (Retry)
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 whitespace-nowrap">
                      Pending Sync
                    </span>
                  )}

                  <button
                    onClick={() => setSelectedProduct(item)}
                    className="rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 transition"
                  >
                    👁 Details
                  </button>

                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="rounded-lg border border-rose-200 bg-white hover:bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 transition"
                    title="Delete record from local browser memory"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW DETAILS MODAL POPUP */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-white border border-gray-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 font-mono">
                  Product Details: {selectedProduct.upc}
                </h3>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                  ID: {selectedProduct.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Photos Carousel/Grid */}
            {selectedProduct.photos && selectedProduct.photos.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Product Photos ({selectedProduct.photos.length})
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {selectedProduct.photos.map((photo, pIdx) => (
                    <a
                      key={pIdx}
                      href={photo.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={`Photo ${pIdx + 1}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Custom Fields Grid */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Product Attributes &amp; Custom Fields
              </label>

              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 divide-y divide-gray-200/60">
                {configuredFields.length > 0 ? (
                  configuredFields.map((field) => {
                    const rawVal =
                      selectedProduct.fields?.[field.id] !== undefined
                        ? selectedProduct.fields[field.id]
                        : selectedProduct.fields?.[field.name];

                    const displayVal =
                      typeof rawVal === 'boolean'
                        ? rawVal
                          ? '✓ Yes'
                          : '✕ No'
                        : rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== ''
                        ? String(rawVal)
                        : '—';

                    return (
                      <div key={field.id} className="flex items-start justify-between py-2 text-xs">
                        <span className="font-semibold text-gray-700">{field.name}:</span>
                        <span className="font-mono text-gray-900 font-bold text-right ml-4">
                          {displayVal}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  Object.entries(selectedProduct.fields || {}).map(([key, val]) => (
                    <div key={key} className="flex items-start justify-between py-2 text-xs">
                      <span className="font-semibold text-gray-700 capitalize">{key}:</span>
                      <span className="font-mono text-gray-900 font-bold text-right ml-4">
                        {String(val)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sync & Timestamp Info */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Scan Timestamp:</span>
                <span className="font-mono text-gray-800">{new Date(selectedProduct.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cloud Sync Status:</span>
                <span className="font-bold text-blue-600 capitalize">{selectedProduct.syncStatus}</span>
              </div>
              {selectedProduct.driveFolderUrl && (
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500">Google Drive Photos:</span>
                  <a
                    href={selectedProduct.driveFolderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Open Drive Folder ↗
                  </a>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                onClick={(e) => handleDelete(selectedProduct.id, e)}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
              >
                ✕ Remove from Local Memory
              </button>

              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-lg bg-gray-900 hover:bg-gray-800 px-5 py-2 text-xs font-bold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

