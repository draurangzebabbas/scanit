'use client';

import React, { useEffect, useState } from 'react';

// SVG icon components
const IconShield = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);
const IconSheet = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    <path d="M8 13h2" />
    <path d="M14 13h2" />
    <path d="M8 17h2" />
    <path d="M14 17h2" />
  </svg>
);
const IconFolder = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </svg>
);
const IconSliders = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="4" y1="21" y2="14" />
    <line x1="4" x2="4" y1="6" y2="3" />
    <line x1="12" x2="12" y1="21" y2="12" />
    <line x1="12" x2="12" y1="4" y2="3" />
    <line x1="20" x2="20" y1="21" y2="16" />
    <line x1="20" x2="20" y1="8" y2="3" />
    <line x1="1" x2="7" y1="14" y2="14" />
    <line x1="9" x2="15" y1="12" y2="12" />
    <line x1="17" x2="23" y1="16" y2="16" />
  </svg>
);

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

  // Product Fields state
  const [fields, setFields] = useState<ProductField[]>([]);

  // Modal Popup state for Adding / Editing Fields
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [modalName, setModalName] = useState<string>('');
  const [modalType, setModalType] = useState<ProductField['type']>('text');
  const [modalRequired, setModalRequired] = useState<boolean>(false);
  const [modalOptions, setModalOptions] = useState<string[]>([]);
  const [modalOptionInput, setModalOptionInput] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Custom naming states for creating Sheet and Drive Folder (Scanit defaults)
  const [newSheetName, setNewSheetName] = useState<string>('Scanit Database');
  const [newFolderName, setNewFolderName] = useState<string>('Scanit Photos');

  const [sheetInput, setSheetInput] = useState<string>('');
  const [folderInput, setFolderInput] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [isProcessingSheet, setIsProcessingSheet] = useState<boolean>(false);
  const [isProcessingFolder, setIsProcessingFolder] = useState<boolean>(false);

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
    });
  }, []);

  const showMsg = (text: string, isError: boolean = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => setStatusMessage(null), 4500);
  };



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
      const res = await createSpreadsheet(session.accessToken, nameToUse, fields);
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
      // Sync current custom fields as headers into the connected sheet
      if (fields.length > 0) {
        saveProductFieldsToSheet(session.accessToken, info.spreadsheetId, fields).catch((err) =>
          console.error('Header sync on connect failed:', err)
        );
      }
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

  /* ================= PRODUCT FIELDS BUILDER & MODAL POPUP ================= */
  const openAddFieldModal = () => {
    setEditingFieldIndex(null);
    setModalName('');
    setModalType('text');
    setModalRequired(false);
    setModalOptions([]);
    setModalOptionInput('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditFieldModal = (index: number) => {
    const f = fields[index];
    setEditingFieldIndex(index);
    setModalName(f.name);
    setModalType(f.type);
    setModalRequired(Boolean(f.required));
    setModalOptions(f.options || []);
    setModalOptionInput('');
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleAddModalOption = () => {
    if (!modalOptionInput.trim()) return;
    const newOpts = modalOptionInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setModalOptions((prev) => {
      const combined = [...prev];
      newOpts.forEach((opt) => {
        if (!combined.some((o) => o.toLowerCase() === opt.toLowerCase())) {
          combined.push(opt);
        }
      });
      return combined;
    });
    setModalOptionInput('');
  };

  const handleRemoveModalOption = (optIndex: number) => {
    setModalOptions((prev) => prev.filter((_, i) => i !== optIndex));
  };

  const handleSaveModalField = async () => {
    const trimmedName = modalName.trim();
    if (!trimmedName) {
      setModalError('Please enter a field name.');
      return;
    }

    const isDuplicate = fields.some(
      (f, idx) => idx !== editingFieldIndex && f.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setModalError('A field with this name already exists.');
      return;
    }

    if (modalType === 'dropdown' && modalOptions.length === 0) {
      setModalError('Please add at least one option for the dropdown field.');
      return;
    }

    const updatedField: ProductField = {
      id:
        editingFieldIndex !== null
          ? fields[editingFieldIndex].id
          : 'field_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: trimmedName,
      type: modalType,
      required: modalRequired,
      system: false,
      options: modalType === 'dropdown' ? modalOptions : [],
    };

    let nextFields: ProductField[];
    if (editingFieldIndex !== null) {
      nextFields = [...fields];
      nextFields[editingFieldIndex] = updatedField;
    } else {
      nextFields = [...fields, updatedField];
    }

    setFields(nextFields);

    // Save & sync directly from popup modal
    try {
      await saveProductFields(nextFields);
      if (session && session.accessToken && config.spreadsheetId) {
        saveProductFieldsToSheet(session.accessToken, config.spreadsheetId, nextFields).catch((err) =>
          console.error('Background sheet headers sync failed:', err)
        );
      }
      showMsg(`✓ Field "${updatedField.name}" saved!`);
    } catch (e: any) {
      showMsg('Failed to save field.', true);
    }

    setIsModalOpen(false);
  };

  const handleRemoveField = async (index: number) => {
    const nextFields = fields.filter((_, i) => i !== index);
    setFields(nextFields);
    try {
      await saveProductFields(nextFields);
      if (session && session.accessToken && config.spreadsheetId) {
        saveProductFieldsToSheet(session.accessToken, config.spreadsheetId, nextFields).catch((err) =>
          console.error('Background sheet headers sync failed:', err)
        );
      }
      showMsg('✓ Field deleted.');
    } catch (e) {
      showMsg('Failed to delete field.', true);
    }
  };

  const handleMoveField = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const copy = [...fields];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setFields(copy);
    try {
      await saveProductFields(copy);
      if (session && session.accessToken && config.spreadsheetId) {
        saveProductFieldsToSheet(session.accessToken, config.spreadsheetId, copy).catch((err) =>
          console.error('Background sheet headers sync failed:', err)
        );
      }
    } catch (e) { }
  };

  const handleClearDatabase = async () => {
    if (!confirm('Warning: This will clear all locally saved products in this browser. Continue?')) {
      return;
    }
    await clearAllProductsLocal();
    showMsg('✓ Local inventory storage cleared.');
  };

  return (
    <section className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6 font-mono">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Settings &amp; Integration</h1>
        <p className="text-xs text-gray-500 mt-1">
          Connect your Google Account, Sheets, Drive folder, and configure custom product fields.
        </p>
      </header>

      {statusMessage && (
        <div
          className={`rounded-lg p-3 text-xs font-semibold ${statusMessage.isError
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* 1. GOOGLE OAUTH CARD */}
      <article className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-600"><IconShield /></span>
            <div>
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                1. Google Account Connection
              </h2>
              <p className="text-[11px] text-gray-500">Authorize direct browser access to your Google Drive &amp; Sheets</p>
            </div>
          </div>
          {session && (
            <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              Connected
            </span>
          )}
        </div>

        {session ? (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3.5">
            <div className="flex items-center gap-3">
              {session.picture ? (
                <img src={session.picture} alt="Avatar" className="h-8 w-8 rounded-full border border-gray-200" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-xs">
                  {session.email ? session.email[0].toUpperCase() : 'G'}
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-gray-900">{session.name || 'Google User'}</p>
                <p className="text-[10px] font-mono text-gray-500">{session.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
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

      {/* 2. PRODUCT FIELDS BUILDER */}
      <article className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-600"><IconSliders /></span>
            <div>
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                2. Product Fields Builder
              </h2>
              <p className="text-[11px] text-gray-500">Configure custom product fields before creating Google Sheet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openAddFieldModal}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition flex items-center gap-1 cursor-pointer"
          >
            <span>+</span> Add Field
          </button>
        </div>

        {/* Guide Banner */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 space-y-1">
          <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
            <span>💡</span> How Custom Fields Work
          </p>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            Add fields to match your workflow (e.g. Size, Color, Condition, Location). You can delete the existing fields and add your own custom fields.
          </p>
        </div>

        <div className="space-y-2.5">
          {fields.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-6 text-center">
              <p className="text-xs text-gray-400 italic mb-3">No custom product fields configured.</p>
              <button
                type="button"
                onClick={openAddFieldModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition"
              >
                + Add Your First Field
              </button>
            </div>
          ) : (
            fields.map((field, idx) => (
              <div
                key={field.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 hover:border-gray-300 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveField(idx, 'up')}
                      className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1 font-bold"
                      title="Move Up"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      disabled={idx === fields.length - 1}
                      onClick={() => handleMoveField(idx, 'down')}
                      className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-20 px-1 font-bold"
                      title="Move Down"
                    >
                      ▼
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-gray-900 truncate">{field.name}</span>
                      {field.required && (
                        <span className="rounded bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Required
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                      <span className="capitalize font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-[10px]">
                        Type: {field.type}
                      </span>
                      {field.type === 'dropdown' && (
                        <span className="text-[10px] text-blue-600 font-medium truncate">
                          ({(field.options || []).length} options: {(field.options || []).join(', ') || 'None'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => openEditFieldModal(idx)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 transition"
                  >
                    ✏ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(idx)}
                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Field"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      {/* 3. GOOGLE DRIVE FOLDER CARD */}
      <article className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-blue-500"><IconFolder /></span>
            <div>
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                3. Google Drive Folder Connection
              </h2>
              <p className="text-[11px] text-gray-500">Save product photos directly to your Google Drive</p>
            </div>
          </div>
          {config.driveFolderId && (
            <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              Connected
            </span>
          )}
        </div>

        {config.driveFolderId ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">{config.driveFolderName || 'Scanit Photos'}</p>
                <p className="text-[10px] font-mono text-gray-500 truncate">ID: {config.driveFolderId}</p>
              </div>
              <button
                type="button"
                onClick={handleDisconnectFolder}
                className="text-xs text-rose-500 hover:underline ml-3 flex-shrink-0"
              >
                Disconnect
              </button>
            </div>
            {config.driveFolderUrl && (
              <a
                href={config.driveFolderUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold"
              >
                <span>Open Drive Folder</span>
                <span>↗</span>
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create New Custom Named Folder */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-2">
              <label className="block text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Create New Folder with Custom Name
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name (e.g. Scanit Photos 2026)"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-900 focus:border-blue-500 focus:outline-none"
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
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Or connect existing folder</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="Paste Google Drive Folder URL or ID"
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-900 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={isProcessingFolder || !session}
                onClick={handleConnectExistingFolder}
                className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200 transition disabled:opacity-50"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </article>

      {/* 4. GOOGLE SHEETS CARD (Locked until Product Fields exist) */}
      <article className={`rounded-xl border bg-white p-5 space-y-4 ${fields.length === 0 ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-green-600"><IconSheet /></span>
            <div>
              <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                4. Google Sheet Connection
              </h2>
              <p className="text-[11px] text-gray-500">Store inventory product rows and dynamic fields</p>
            </div>
          </div>
          {config.spreadsheetId ? (
            <span className="rounded bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              Connected
            </span>
          ) : fields.length === 0 ? (
            <span className="rounded bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              🔒 Locked
            </span>
          ) : null}
        </div>

        {fields.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800 font-semibold space-y-1">
            <p>🔒 Google Sheet connection is locked.</p>
            <p className="text-[11px] font-normal text-amber-700">
              Please create at least one product field in section <strong>"2. Product Fields Builder"</strong> above before creating or connecting a Google Sheet.
            </p>
          </div>
        ) : config.spreadsheetId ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">{config.spreadsheetName || 'Scanit Database'}</p>
                <p className="text-[10px] font-mono text-gray-500 truncate">ID: {config.spreadsheetId}</p>
              </div>
              <button
                type="button"
                onClick={handleDisconnectSheet}
                className="text-xs text-rose-500 hover:underline ml-3 flex-shrink-0"
              >
                Disconnect
              </button>
            </div>
            {config.spreadsheetUrl && (
              <a
                href={config.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-green-700 hover:underline font-semibold"
              >
                <span>Open Google Sheet</span>
                <span>↗</span>
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create New Custom Named Sheet */}
            <div className="rounded-lg border border-green-100 bg-green-50/40 p-3 space-y-2">
              <label className="block text-[11px] font-bold text-green-700 uppercase tracking-wider">
                Create New Sheet with Custom Name
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={newSheetName}
                  onChange={(e) => setNewSheetName(e.target.value)}
                  placeholder="Enter sheet name (e.g. Scanit Database 2026)"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-900 focus:border-green-500 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isProcessingSheet || !session || fields.length === 0}
                  onClick={handleCreateSheet}
                  className="rounded-lg bg-green-600 hover:bg-green-500 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isProcessingSheet ? 'Creating...' : '+ Create Sheet'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 my-1">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Or connect existing sheet</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="Paste Google Sheet URL or ID"
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-900 focus:border-green-500 focus:outline-none"
              />
              <button
                type="button"
                disabled={isProcessingSheet || !session || fields.length === 0}
                onClick={handleConnectExistingSheet}
                className="rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-xs font-bold text-gray-800 hover:bg-gray-200 transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Connect
              </button>
            </div>
          </div>
        )}
      </article>

      {/* DANGER ZONE */}
      <article className="rounded-xl border border-rose-200 bg-rose-50/30 p-4">
        <h2 className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
          Local Storage Reset
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Wipe all scanned items stored in this browser cache.
        </p>
        <button
          type="button"
          onClick={handleClearDatabase}
          className="rounded-lg border border-rose-300 bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-200 transition"
        >
          Clear Local Database
        </button>
      </article>

      {/* MODAL POPUP FOR ADDING / EDITING FIELD */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-gray-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {editingFieldIndex !== null ? 'Edit Product Field' : 'Add New Product Field'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
                title="Close Popup"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-600">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              {/* Field Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Field Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalName}
                  onChange={(e) => {
                    setModalName(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  placeholder="e.g. Brand, Color, Condition, Location"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 font-mono focus:border-blue-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  Field Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modalType}
                  onChange={(e) => {
                    setModalType(e.target.value as ProductField['type']);
                    if (modalError) setModalError(null);
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-xs text-gray-900 font-mono focus:border-blue-500 focus:outline-none"
                >
                  <option value="text">Text (Single Line)</option>
                  <option value="number">Number</option>
                  <option value="dropdown">Dropdown / Select</option>
                  <option value="date">Date</option>
                  <option value="checkbox">Checkbox (Yes / No)</option>
                  <option value="longtext">Long Text (Multi-Line)</option>
                </select>
              </div>

              {/* Required Toggle - Name/Label FIRST, then Checkbox! */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3">
                <div>
                  <label htmlFor="modalRequiredToggle" className="text-xs font-bold text-gray-900 cursor-pointer block">
                    Required Field
                  </label>
                  <p className="text-[11px] text-gray-500">
                    Mandatory field when entering or scanning products
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="modalRequiredToggle"
                  checked={modalRequired}
                  onChange={(e) => setModalRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Dropdown Options Section (Visible if Type is 'dropdown') */}
              {modalType === 'dropdown' && (
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider">
                      Dropdown Options ({modalOptions.length}) <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-blue-600 font-normal">
                      (Type &amp; press Enter or separate with commas)
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={modalOptionInput}
                      onChange={(e) => setModalOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddModalOption();
                        }
                      }}
                      placeholder="e.g. Red, Blue, Green"
                      className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 font-mono focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddModalOption}
                      className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white transition"
                    >
                      + Add Option
                    </button>
                  </div>

                  {/* List of Option Tags */}
                  {modalOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {modalOptions.map((opt, optIdx) => (
                        <span
                          key={optIdx}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-blue-200 px-3 py-1 text-xs font-medium text-gray-800 shadow-sm"
                        >
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveModalOption(optIdx)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold ml-0.5"
                            title="Remove option"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-rose-500 italic">
                      No options added yet. Type options above and click "+ Add Option".
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalField}
                className="rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                {editingFieldIndex !== null ? 'Save Changes' : '+ Add Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
