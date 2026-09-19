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
import {
  getStoredAuthSession,
  requestGoogleAccessToken,
  clearAuthSession,
  GoogleUserSession,
} from '../lib/googleAuth';
import {
  createSpreadsheet,
  fetchSpreadsheetInfo,
  createDriveFolder,
  fetchDriveFolderInfo,
  saveProductFieldsToSheet,
} from '../lib/googleApi';
import { processSyncQueue } from '../lib/googleSync';

export const Settings: React.FC = () => {
  const [session, setSession] = useState<GoogleUserSession | null>(null);
  const [config, setConfig] = useState<AppGoogleConfig>({});
  
  // Product Fields state & saved snapshot for dirty detection
  const [fields, setFields] = useState<ProductField[]>([]);
  const [savedFieldsSnapshot, setSavedFieldsSnapshot] = useState<string>('[]');

  // Custom naming states for creating Sheet and Drive Folder (Scanit defaults)
  const [newSheetName, setNewSheetName] = useState<string>('Scanit Database');
  const [newFolderName, setNewFolderName] = useState<string>('Scanit Photos');

  const [sheetInput, setSheetInput] = useState<string>('');
  const [folderInput, setFolderInput] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [isProcessingSheet, setIsProcessingSheet] = useState<boolean>(false);
  const [isProcessingFolder, setIsProcessingFolder] = useState<boolean>(false);
  const [isSavingFields, setIsSavingFields] = useState<boolean>(false);

  useEffect(() => {
    setSession(getStoredAuthSession());
    getGoogleConfig().then((c) => {
      setConfig(c);
      if (c.spreadsheetUrl || c.spreadsheetId) {
        setSheetInput(c.spreadsheetUrl || c.spreadsheetId || '');
      }
      if (c.driveFolderUrl || c.driveFolderId) {
        setFolderInput(c.driveFolderUrl || c.driveFolderId || '');
      }
    });
    getProductFields().then((f) => {
      setFields(f);
      setSavedFieldsSnapshot(JSON.stringify(f));
    });
  }, []);

  const showMsg = (text: string, isError: boolean = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 4500);
  };

  // Check if fields have un-saved modifications
  const isFieldsDirty = JSON.stringify(fields) !== savedFieldsSnapshot;

  /* ================= GOOGLE AUTH ================= */
  const handleGoogleAuth = async () => {
    setIsAuthorizing(true);
    try {
      const newSession = await requestGoogleAccessToken();
      setSession(newSession);
      showMsg(`✓ Connected Google Account: ${newSession.email || 'Authorized'}`);
      processSyncQueue();
    } catch (err: any) {
      showMsg(err?.message || 'Google Authorization failed.', true);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleSignOut = () => {
    clearAuthSession();
    setSession(null);
    showMsg('Signed out of Google account.');
  };

  /* ================= SHEETS ================= */
  const handleCreateSheet = async () => {
    if (!session || !session.accessToken) {
      showMsg('Please connect your Google account first.', true);
      return;
    }
    const nameToUse = newSheetName.trim() || 'Scanit Database';
    setIsProcessingSheet(true);
    try {
      const res = await createSpreadsheet(session.accessToken, nameToUse);
      const updatedConfig = {
        ...config,
        spreadsheetId: res.spreadsheetId,
        spreadsheetName: res.spreadsheetName,
        spreadsheetUrl: res.spreadsheetUrl,
      };
      await saveGoogleConfig(updatedConfig);
      setConfig(updatedConfig);
      setSheetInput(res.spreadsheetUrl);
      showMsg(`✓ New Google Sheet "${res.spreadsheetName}" created successfully!`);
    } catch (err: any) {
      showMsg(`Failed to create sheet: ${err?.message || 'Error'}`, true);
    } finally {
      setIsProcessingSheet(false);
    }
  };

  const handleConnectExistingSheet = async () => {
    if (!session || !session.accessToken) {
      showMsg('Please connect your Google account first.', true);
      return;
    }
    if (!sheetInput.trim()) {
      showMsg('Please enter a Google Sheet URL or ID.', true);
      return;
    }
    setIsProcessingSheet(true);
    try {
      const info = await fetchSpreadsheetInfo(session.accessToken, sheetInput);
      const updatedConfig = {
        ...config,
        spreadsheetId: info.spreadsheetId,
        spreadsheetName: info.spreadsheetName,
        spreadsheetUrl: info.spreadsheetUrl,
      };
      await saveGoogleConfig(updatedConfig);
      setConfig(updatedConfig);
      showMsg(`✓ Connected to Sheet: ${info.spreadsheetName}`);
    } catch (err: any) {
      showMsg(`Could not connect sheet: ${err?.message || 'Error'}`, true);
    } finally {
      setIsProcessingSheet(false);
    }
  };

  const handleDisconnectSheet = async () => {
    const updated = { ...config, spreadsheetId: '', spreadsheetUrl: '', spreadsheetName: '' };
    await saveGoogleConfig(updated);
    setConfig(updated);
    setSheetInput('');
    showMsg('Google Sheet disconnected.');
  };

  /* ================= DRIVE FOLDER ================= */
  const handleCreateFolder = async () => {
    if (!session || !session.accessToken) {
      showMsg('Please connect your Google account first.', true);
      return;
    }
    const nameToUse = newFolderName.trim() || 'Scanit Photos';
    setIsProcessingFolder(true);
    try {
      const res = await createDriveFolder(session.accessToken, nameToUse);
      const updatedConfig = {
        ...config,
        driveFolderId: res.folderId,
        driveFolderName: res.folderName,
        driveFolderUrl: res.folderUrl,
      };
      await saveGoogleConfig(updatedConfig);
      setConfig(updatedConfig);
      setFolderInput(res.folderUrl);
      showMsg(`✓ New Google Drive folder "${res.folderName}" created successfully!`);
    } catch (err: any) {
      showMsg(`Failed to create Drive folder: ${err?.message || 'Error'}`, true);
    } finally {
      setIsProcessingFolder(false);
    }
  };

  const handleConnectExistingFolder = async () => {
    if (!session || !session.accessToken) {
      showMsg('Please connect your Google account first.', true);
      return;
    }
    if (!folderInput.trim()) {
      showMsg('Please enter a Google Drive folder URL or ID.', true);
      return;
    }
    setIsProcessingFolder(true);
    try {
      const info = await fetchDriveFolderInfo(session.accessToken, folderInput);
      const updatedConfig = {
        ...config,
        driveFolderId: info.folderId,
        driveFolderName: info.folderName,
        driveFolderUrl: info.folderUrl,
      };
      await saveGoogleConfig(updatedConfig);
      setConfig(updatedConfig);
      showMsg(`✓ Connected to Drive folder: ${info.folderName}`);
    } catch (err: any) {
      showMsg(`Could not connect Drive folder: ${err?.message || 'Error'}`, true);
    } finally {
      setIsProcessingFolder(false);
    }
  };

  const handleDisconnectFolder = async () => {
    const updated = { ...config, driveFolderId: '', driveFolderUrl: '', driveFolderName: '' };
    await saveGoogleConfig(updated);
    setConfig(updated);
    setFolderInput('');
    showMsg('Google Drive folder disconnected.');
  };

  /* ================= PRODUCT FIELDS BUILDER ================= */
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
    if (!isFieldsDirty) return;

    const names = fields.map((f) => f.name.trim().toLowerCase());
    if (names.some((n) => !n)) {
      showMsg('Every field must have a name.', true);
      return;
    }
    if (new Set(names).size !== names.length) {
      showMsg('Field names must be unique.', true);
      return;
    }

    setIsSavingFields(true);
    try {
      await saveProductFields(fields);
      setSavedFieldsSnapshot(JSON.stringify(fields));

      if (session && session.accessToken && config.spreadsheetId) {
        try {
          await saveProductFieldsToSheet(session.accessToken, config.spreadsheetId, fields);
          showMsg('✓ Product fields saved & synced to Google Sheet!');
          return;
        } catch (e: any) {
          console.error('Failed to sync fields to Google Sheet:', e);
        }
      }

      showMsg('✓ Product fields updated!');
    } catch (e: any) {
      showMsg('Failed to save fields.', true);
    } finally {
      setIsSavingFields(false);
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm('Warning: This will clear all locally saved products in this browser. Continue?')) {
      return;
    }
    await clearAllProductsLocal();
    showMsg('✓ Local inventory storage cleared.');
  };

  return (
    <section className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6 font-mono">
      <header>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings &amp; Integration</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Connect your Google Account, Sheets, Drive folder, and configure custom product fields.
        </p>
      </header>

      {statusMessage && (
        <div
          className={`rounded-lg p-3 text-xs font-semibold ${
            statusMessage.isError
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* 1. GOOGLE OAUTH CARD */}
      <article className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔐</span>
            <div>
              <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                1. Google Account Connection
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Authorize direct browser access to your Google Drive &amp; Sheets</p>
            </div>
          </div>
          {session && (
            <span className="rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              Connected
            </span>
          )}
        </div>

        {session ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-950/50 p-3.5">
            <div className="flex items-center gap-3">
              {session.picture ? (
                <img src={session.picture} alt="Avatar" className="h-8 w-8 rounded-full border border-gray-200 dark:border-gray-800" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
                  {session.email ? session.email[0].toUpperCase() : 'G'}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{session.name || 'Google User'}</p>
                <p className="text-[10px] font-mono text-gray-500">{session.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isAuthorizing}
            onClick={handleGoogleAuth}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 py-3 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
            aria-label="Connect Google Account"
          >
            <span>🌐</span>
            <span>{isAuthorizing ? 'Authorizing with Google...' : 'Connect Google Account (Sign In)'}</span>
          </button>
        )}
      </article>

      {/* 2. GOOGLE SHEETS CARD */}
      <article className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                2. Google Sheet Connection
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Store inventory product rows and dynamic fields</p>
            </div>
          </div>
          {config.spreadsheetId && (
            <span className="rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              Connected
            </span>
          )}
        </div>

        {config.spreadsheetId ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-950/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{config.spreadsheetName || 'Scanit Database'}</p>
                <p className="text-[10px] font-mono text-gray-500">ID: {config.spreadsheetId}</p>
              </div>
              <button
                type="button"
                onClick={handleDisconnectSheet}
                className="text-xs text-rose-500 hover:underline"
              >
                Disconnect
              </button>
            </div>
            {config.spreadsheetUrl && (
              <a
                href={config.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                <span>Open Google Sheet</span>
                <span>↗</span>
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create New Custom Named Sheet */}
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-2">
              <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Create New Sheet with Custom Name
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="Enter sheet name (e.g. Scanit Database 2026)"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isProcessingSheet || !session}
                  onClick={handleCreateSheet}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {isProcessingSheet ? 'Creating...' : '+ Create Sheet'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 my-1">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Or connect existing sheet</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="Paste Google Sheet URL or ID"
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={isProcessingSheet || !session}
                onClick={handleConnectExistingSheet}
                className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </article>

      {/* 3. GOOGLE DRIVE FOLDER CARD */}
      <article className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📁</span>
            <div>
              <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                3. Google Drive Folder Connection
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Save product photos directly to your Google Drive</p>
            </div>
          </div>
          {config.driveFolderId && (
            <span className="rounded bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
              Connected
            </span>
          )}
        </div>

        {config.driveFolderId ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-950/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-900 dark:text-white">{config.driveFolderName || 'Scanit Photos'}</p>
                <p className="text-[10px] font-mono text-gray-500">ID: {config.driveFolderId}</p>
              </div>
              <button
                type="button"
                onClick={handleDisconnectFolder}
                className="text-xs text-rose-500 hover:underline"
              >
                Disconnect
              </button>
            </div>
            {config.driveFolderUrl && (
              <a
                href={config.driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                <span>Open Drive Folder</span>
                <span>↗</span>
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create New Custom Named Folder */}
            <div className="rounded-lg border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 p-3 space-y-2">
              <label className="block text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Create New Folder with Custom Name
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name (e.g. Scanit Photos 2026)"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isProcessingFolder || !session}
                  onClick={handleCreateFolder}
                  className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  {isProcessingFolder ? 'Creating...' : '+ Create Folder'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 my-1">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Or connect existing folder</span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-800" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="Paste Google Drive Folder URL or ID"
                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={isProcessingFolder || !session}
                onClick={handleConnectExistingFolder}
                className="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </article>

      {/* 4. PRODUCT FIELDS BUILDER */}
      <article className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              4. Product Fields Builder
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Add, edit, or delete any product attribute field</p>
          </div>
          <button
            type="button"
            onClick={handleAddField}
            className="rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
          >
            + Add Field
          </button>
        </div>

        <div className="space-y-2.5">
          {fields.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-2">No fields configured. Click "+ Add Field" to create fields.</p>
          ) : (
            fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-950/50 p-3"
              >
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                  placeholder="Field name"
                  className="flex-1 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />

                <select
                  value={field.type}
                  onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                  className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown</option>
                  <option value="date">Date</option>
                  <option value="checkbox">Checkbox</option>
                  <option value="longtext">Long Text</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleRemoveField(idx)}
                  className="text-xs text-rose-500 hover:text-rose-600 p-1.5 font-bold"
                  title="Delete Field"
                >
                  ✕ Delete
                </button>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          disabled={!isFieldsDirty || isSavingFields}
          onClick={handleSaveFields}
          className={`w-full rounded-lg py-2.5 text-xs font-bold transition shadow-sm ${
            isFieldsDirty
              ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer opacity-100'
              : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
          }`}
        >
          {isSavingFields
            ? 'Saving...'
            : isFieldsDirty
            ? 'Save Product Fields'
            : '✓ Product Fields Saved'}
        </button>
      </article>

      {/* DANGER ZONE */}
      <article className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 p-4">
        <h2 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
          Local Storage Reset
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Wipe all scanned items stored in this browser cache.
        </p>
        <button
          type="button"
          onClick={handleClearDatabase}
          className="rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/30 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-200 transition"
        >
          Clear Local Database
        </button>
      </article>
    </section>
  );
};
