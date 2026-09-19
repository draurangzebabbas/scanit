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

// Lucide-style SVG icons (inline, no dependency)
const IconDashboard = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="7" height="9" x="3" y="3" rx="1"/>
    <rect width="7" height="5" x="14" y="3" rx="1"/>
    <rect width="7" height="9" x="14" y="12" rx="1"/>
    <rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
);

const IconScanBarcode = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
    <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
    <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
    <path d="M8 7v10"/>
    <path d="M12 7v10"/>
    <path d="M17 7v10"/>
  </svg>
);

const IconInventory = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
    <path d="m3.3 7 8.7 5 8.7-5"/>
    <path d="M12 22V12"/>
  </svg>
);

const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const tabs = [
  { id: 'dashboard', label: 'Dashboard', Icon: IconDashboard },
  { id: 'scanner',   label: 'Scan',      Icon: IconScanBarcode },
  { id: 'history',   label: 'Inventory', Icon: IconInventory,  hasBadge: true },
  { id: 'settings',  label: 'Settings',  Icon: IconSettings },
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  isSyncing,
  isOnline,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm">
      {/* Top bar: Brand + status chips */}
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
        {/* Brand */}
        <button
          onClick={() => setActiveTab('dashboard')}
          aria-label="Scanit Home"
          className="flex items-center gap-2 focus:outline-none"
        >
          <img
            src="/images/android-chrome-192x192.png"
            alt="Scanit Logo"
            className="h-7 w-7 rounded-lg object-cover shadow-sm border border-gray-200"
          />
          <span className="font-mono font-bold text-gray-900 tracking-tight text-base leading-none">
            Scanit
          </span>
        </button>

        {/* Status chips */}
        <div className="flex items-center gap-2">
          {/* Online / Offline dot */}
          <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-mono text-gray-600 border border-gray-200">
            <span
              className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}
            />
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Sync indicator */}
          {pendingCount > 0 ? (
            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] font-medium border ${
                isSyncing
                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                  : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}
            >
              <span className={isSyncing ? 'animate-spin inline-block' : ''}>⚙</span>
              <span>{isSyncing ? 'Syncing…' : `${pendingCount} Queued`}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-mono text-emerald-600 border border-emerald-200">
              <span>✓ Synced</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom tab bar */}
      <nav
        className="mx-auto flex max-w-5xl border-t border-gray-100 px-2"
        aria-label="Main Navigation"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showBadge = (tab as any).hasBadge && pendingCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 font-mono text-[10px] sm:text-[11px] font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span className="relative flex items-center justify-center">
                <tab.Icon />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white leading-4 text-center">
                    {pendingCount}
                  </span>
                )}
              </span>
              <span className="leading-none">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t bg-blue-600" />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
