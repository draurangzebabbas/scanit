'use client';

import React, { useEffect, useState } from 'react';
import {
  getGoogleConfig,
  saveGoogleConfig,
  getProductFields,
  saveProductFields,
  clearAllProductsLocal,
  AppGoogleConfig,
  ProductField,
} from '../lib/db';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<AppGoogleConfig>({});
  const [fields, setFields] = useState<ProductField[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    getGoogleConfig().then((c) => {
      // prefill with user's URL if empty
      if (!c.webAppUrl) {
        c.webAppUrl = 'https://script.google.com/macros/s/AKfycbwHOvqDrtTsaTZawFdKeCs4tANzCmOnqmpBaYKXFa-mZOfsASvXHBVCIJzB-QULhOdaaA/exec';
      }
      setConfig(c);
    });
    getProductFields().then(setFields);
  }, []);

  const showMsg = (text: string, isError: boolean = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSaveConfig = async () => {
    await saveGoogleConfig(config);
    showMsg('✓ Google settings saved to browser successfully!');
  };

  const handleTestConnection = async () => {
    if (!config.webAppUrl) {
      showMsg('Please provide a Google Apps Script Web App URL.', true);
      return;
    }
    setIsTesting(true);
    try {
      const res = await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'getAppSetup' }),
      });
      const data = await res.json();
      if (data.success || data.data) {
        showMsg('✓ Connected successfully to Google Apps Script API!');
      } else {
        throw new Error(data.error || 'Invalid API response');
      }
    } catch (e: any) {
      showMsg(`Connection test failed: ${e?.message || 'Network error'}`, true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleAddField = () => {
    const newField: ProductField = {
      id: 'field_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: 'New Custom Field',
      type: 'text',
      required: false,
      system: false,
      options: [],
    };
    setFields((prev) => [...prev, newField]);
  };

  const handleFieldChange = (index: number, key: keyof ProductField, value: any) => {
    setFields((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveFields = async () => {
    // validation
    const names = fields.map((f) => f.name.trim().toLowerCase());
    if (names.some((n) => !n)) {
      showMsg('Every field must have a name.', true);
      return;
    }
    if (new Set(names).size !== names.length) {
      showMsg('Field names must be unique.', true);
      return;
    }
    await saveProductFields(fields);
    showMsg('✓ Product fields updated successfully!');
  };

  const handleClearDatabase = async () => {
    if (!confirm('Warning: This will clear all locally saved products in this browser. Continue?')) {
      return;
    }
    await clearAllProductsLocal();
    showMsg('✓ Local inventory storage cleared.');
  };

  return (
    <div className="mx-auto max-w-xl p-4 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Settings</h2>
        <p className="text-xs text-gray-400">
          Configure Google Drive, Sheets connection &amp; custom fields
        </p>
      </div>

      {statusMessage && (
        <div
          className={`rounded-xl p-3 text-xs font-semibold ${
            statusMessage.isError
              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Google Integration Card */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3.5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Individual Google Connection
        </h3>
        <p className="text-xs text-gray-400">
          Each user connects their own Google account by pasting their Google Apps Script Web App URL below.
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Google Apps Script Web App URL
          </label>
          <input
            type="url"
            value={config.webAppUrl || ''}
            onChange={(e) => setConfig((prev) => ({ ...prev, webAppUrl: e.target.value }))}
            className="w-full rounded-xl border border-gray-800 bg-gray-950 px-3.5 py-2 text-xs font-mono text-white focus:border-emerald-500 focus:outline-none"
            placeholder="https://script.google.com/macros/s/.../exec"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleSaveConfig}
            className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-gray-950 hover:bg-emerald-400 transition"
          >
            Save URL
          </button>
          <button
            type="button"
            disabled={isTesting}
            onClick={handleTestConnection}
            className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs font-semibold text-gray-200 hover:bg-gray-700 transition disabled:opacity-50"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* Product Fields Builder */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Product Fields Builder
          </h3>
          <button
            type="button"
            onClick={handleAddField}
            className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
          >
            + Add Field
          </button>
        </div>

        <div className="space-y-2.5">
          {fields.map((field, idx) => (
            <div
              key={field.id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-gray-800 bg-gray-950 p-3"
            >
              <input
                type="text"
                disabled={field.system}
                value={field.name}
                onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                placeholder="Field name"
                className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1.5 text-xs text-white disabled:text-gray-500"
              />

              <select
                disabled={field.system}
                value={field.type}
                onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                className="rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1.5 text-xs text-white disabled:text-gray-500"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="dropdown">Dropdown</option>
                <option value="date">Date</option>
                <option value="checkbox">Checkbox</option>
                <option value="longtext">Long Text</option>
              </select>

              <label className="flex items-center gap-1.5 text-xs text-gray-400">
                <input
                  type="checkbox"
                  disabled={field.system}
                  checked={field.required}
                  onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                  className="rounded border-gray-700 bg-gray-800"
                />
                Req
              </label>

              {!field.system && (
                <button
                  type="button"
                  onClick={() => handleRemoveField(idx)}
                  className="text-xs text-rose-400 hover:text-rose-300 p-1"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleSaveFields}
          className="w-full rounded-xl border border-gray-700 bg-gray-800 py-2.5 text-xs font-bold text-white hover:bg-gray-700 transition"
        >
          Save Product Fields
        </button>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-rose-950/40 bg-rose-950/10 p-4">
        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
          Local Storage Reset
        </h3>
        <p className="text-xs text-gray-400 mb-3">
          Wipe all scanned items stored in this browser cache.
        </p>
        <button
          type="button"
          onClick={handleClearDatabase}
          className="rounded-xl border border-rose-800 bg-rose-900/30 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-900/50 transition"
        >
          Clear Local Database
        </button>
      </div>
    </div>
  );
};
