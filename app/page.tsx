'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { Dashboard } from '../components/Dashboard';
import { Scanner } from '../components/Scanner';
import { ProductForm } from '../components/ProductForm';
import { History } from '../components/History';
import { Settings } from '../components/Settings';
import { getGoogleConfig, ProductRecord } from '../lib/db';
import { getStoredAuthSession } from '../lib/googleAuth';
import { subscribeSyncStatus, processSyncQueue } from '../lib/googleSync';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'scanner' | 'history' | 'settings'>('dashboard');
  const [inProductEntry, setInProductEntry] = useState<boolean>(false);
  const [scannedUpc, setScannedUpc] = useState<string>('');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);

  const [hasSheet, setHasSheet] = useState<boolean>(false);
  const [hasDrive, setHasDrive] = useState<boolean>(false);

  useEffect(() => {
    // Online / Offline listener
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to background queue sync status
    const unsubscribe = subscribeSyncStatus((count, syncing) => {
      setPendingCount(count);
      setIsSyncing(syncing);
    });

    // Check Google config
    getGoogleConfig().then((c) => {
      setHasSheet(Boolean(c.spreadsheetUrl || c.spreadsheetId));
      setHasDrive(Boolean(c.driveFolderUrl || c.driveFolderId));
    });

    // Auto process background queue if authorized
    const session = getStoredAuthSession();
    if (session && session.accessToken) {
      processSyncQueue().catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleScanSuccess = (upc: string) => {
    setScannedUpc(upc);
    setInProductEntry(true);
  };

  const handleSaveComplete = (record: ProductRecord, scanNext: boolean) => {
    triggerToast(`✓ Product saved: ${record.id}`);
    if (scanNext) {
      setInProductEntry(false);
      setActiveTab('scanner');
    } else {
      setInProductEntry(false);
      setActiveTab('dashboard');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-gray-900 flex flex-col font-mono selection:bg-blue-500 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-blue-600 px-4 py-2 font-mono text-xs font-bold text-white shadow-xl animate-bounce">
          {toast}
        </div>
      )}

      {/* Navigation Topbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setInProductEntry(false);
          setActiveTab(tab);
        }}
        pendingCount={pendingCount}
        isSyncing={isSyncing}
        isOnline={isOnline}
        hasSheet={hasSheet}
        hasDrive={hasDrive}
      />

      {/* Main View Area */}
      <div className="flex-1 pb-16 pt-2 w-full flex flex-col items-center">
        {inProductEntry ? (
          <ProductForm
            initialUpc={scannedUpc}
            onSaveComplete={handleSaveComplete}
            onCancel={() => setInProductEntry(false)}
          />
        ) : activeTab === 'dashboard' ? (
          <Dashboard
            onStartScan={() => setActiveTab('scanner')}
            onViewHistory={() => setActiveTab('history')}
            onOpenSettings={() => setActiveTab('settings')}
          />
        ) : activeTab === 'scanner' ? (
          <Scanner
            onScanSuccess={handleScanSuccess}
            onCancel={() => setActiveTab('dashboard')}
          />
        ) : activeTab === 'history' ? (
          <History />
        ) : activeTab === 'settings' ? (
          <Settings />
        ) : null}
      </div>
    </main>
  );
}
