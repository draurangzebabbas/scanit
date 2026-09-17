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
  hasSheet,
  hasDrive,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 font-black text-gray-950 shadow-lg shadow-emerald-500/20 text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-tight">Product Hunt</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium">Instant Barcode &amp; Inventory</p>
          </div>
        </div>

        {/* Sync & Online Badges */}
        <div className="flex items-center gap-2">
          {/* Online badge */}
          <div className="flex items-center gap-1.5 rounded-full bg-gray-900 px-2.5 py-1 text-xs text-gray-300 border border-gray-800">
            <span
              className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}
            />
            <span className="hidden sm:inline text-[11px] font-medium">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Sync Queue Badge */}
          {pendingCount > 0 ? (
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${
                isSyncing
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
              }`}
            >
              <span className="inline-block animate-spin text-[10px]">⚙</span>
              <span>
                {isSyncing ? 'Syncing...' : `${pendingCount} Queued`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              <span>✓ All Synced</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="mx-auto flex max-w-4xl border-t border-gray-900 px-4">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'scanner', label: 'Scan UPC', icon: '📷' },
          { id: 'history', label: 'Products', icon: '📦', badge: pendingCount > 0 ? pendingCount : null },
          { id: 'settings', label: 'Settings', icon: '⚙️' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'text-emerald-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
