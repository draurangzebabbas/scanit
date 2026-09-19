'use client';

import React from 'react';

interface NavbarProps {
  activeTab: 'dashboard' | 'scanner' | 'history' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'scanner' | 'history' | 'settings') => void;
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  hasSheet: boolean;
  hasDrive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  isSyncing,
  isOnline,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => setActiveTab('dashboard')}
          aria-label="Scanit Home"
        >
          <img
            src="/images/android-chrome-192x192.png"
            alt="Scanit Logo"
            className="h-8 w-8 rounded-lg object-cover shadow-sm border border-gray-200 dark:border-gray-800"
          />
          <span className="font-mono font-bold text-gray-900 dark:text-white tracking-tight text-lg">
            Scanit
          </span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Online/Offline Status Badge */}
          <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 dark:bg-slate-900 px-2.5 py-1 text-xs font-mono text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-800">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            <span className="hidden sm:inline text-[11px]">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {pendingCount > 0 ? (
            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs font-medium border ${
                isSyncing
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
              }`}
            >
              <span className="animate-spin text-[10px]">⚙</span>
              <span>{isSyncing ? 'Syncing...' : `${pendingCount} Queued`}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span>✓ Synced</span>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={() => setActiveTab('scanner')}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 font-mono text-xs font-semibold text-white shadow-sm transition"
          >
            <span>📷</span>
            <span>Scan UPC</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="mx-auto flex max-w-5xl border-t border-gray-200 dark:border-gray-800 px-4" aria-label="Main Navigation">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'scanner', label: 'Scan Barcode', icon: '📷' },
          { id: 'history', label: 'Inventory', icon: '📦', badge: pendingCount > 0 ? pendingCount : null },
          { id: 'settings', label: 'Settings', icon: '⚙️' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex flex-1 items-center justify-center gap-2 py-2.5 font-mono text-xs font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 rounded bg-amber-100 dark:bg-amber-950 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
