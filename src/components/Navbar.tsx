'use client';

import { useState, useEffect } from 'react';
import { useWallet } from './WalletProvider';
import ConnectButton from './ConnectButton';

interface NavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavProps) {
  const { isConnected } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu on tab change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeTab]);

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const allTabs: { id: string; label: string; icon: string; href?: string; authOnly?: boolean }[] = [
    { id: 'confess', label: 'Confess', icon: '⛪' },
    { id: 'wall', label: 'Wall', icon: '📜' },
    { id: 'leaderboard', label: 'Baptism', icon: '🕊' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'onchain', label: 'On-Chain', icon: '⛓', href: '/onchain' },
    { id: 'mysins', label: 'My Sins', icon: '😈', authOnly: true },
    { id: 'profile', label: 'Profile', icon: '👤', authOnly: true },
  ];

  const tabs = allTabs.filter((t) => !t.authOnly || isConnected);

  // Bottom bar: show most important tabs (max 5)
  const bottomIds = ['confess', 'wall', 'leaderboard', 'chat', ...(isConnected ? ['profile'] : ['onchain'])];
  const bottomTabs = tabs.filter((t) => bottomIds.includes(t.id)).slice(0, 5);

  const handleTabClick = (id: string) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ===== TOP NAV BAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 md:px-8 py-3 md:py-4 flex justify-between items-center backdrop-blur-xl bg-bg/80 border-b border-white/5">
        {/* Logo */}
        <div
          className="font-display text-base md:text-lg text-white flex items-center gap-2 cursor-pointer shrink-0"
          onClick={() => handleTabClick('home')}
        >
          <span className="text-accent text-xl md:text-2xl">✝</span>
          <span className="hidden xs:inline">ConfessAI</span>
          <span className="xs:hidden">CAI</span>
        </div>

        {/* Desktop tabs */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          {tabs.map((tab) =>
            tab.href ? (
              <a
                key={tab.id}
                href={tab.href}
                className="text-sm font-medium uppercase tracking-wider text-gray-400 hover:text-white transition-colors whitespace-nowrap"
              >
                {tab.label}
              </a>
            ) : (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`text-sm font-medium uppercase tracking-wider transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'text-accent' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            )
          )}
          <ConnectButton />
        </div>

        {/* Mobile: connect + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <ConnectButton className="!px-3 !py-1.5 !text-xs" />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 text-gray-400 active:text-white transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <span className="text-xl leading-none">✕</span>
            ) : (
              <>
                <span className="block w-5 h-0.5 bg-current rounded-full" />
                <span className="block w-5 h-0.5 bg-current rounded-full" />
                <span className="block w-5 h-0.5 bg-current rounded-full" />
              </>
            )}
          </button>
        </div>
      </nav>

      {/* ===== MOBILE DROPDOWN MENU ===== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          {/* Menu panel */}
          <div
            className="absolute top-[53px] left-0 right-0 bg-bg/95 backdrop-blur-xl border-b border-gray-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-2 px-3 max-h-[70vh] overflow-y-auto">
              {tabs.map((tab) =>
                tab.href ? (
                  <a
                    key={tab.id}
                    href={tab.href}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-gray-400 hover:text-white active:bg-white/5 transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="text-lg w-7 text-center">{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.label}</span>
                  </a>
                ) : (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'text-accent bg-accent/10'
                        : 'text-gray-400 hover:text-white active:bg-white/5'
                    }`}
                  >
                    <span className="text-lg w-7 text-center">{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-bg/95 backdrop-blur-xl border-t border-gray-800/80">
        <div className="flex justify-around items-center h-14 px-1 pb-[env(safe-area-inset-bottom,0px)]">
          {bottomTabs.map((tab) =>
            tab.href ? (
              <a
                key={tab.id}
                href={tab.href}
                className="flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-0 flex-1 text-gray-500"
              >
                <span className="text-[17px] leading-none">{tab.icon}</span>
                <span className="text-[9px] font-medium tracking-wide leading-none mt-0.5">{tab.label}</span>
              </a>
            ) : (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1 min-w-0 flex-1 transition-colors ${
                  activeTab === tab.id ? 'text-accent' : 'text-gray-500 active:text-gray-300'
                }`}
              >
                <span className="text-[17px] leading-none">{tab.icon}</span>
                <span className="text-[9px] font-medium tracking-wide leading-none mt-0.5">{tab.label}</span>
              </button>
            )
          )}
        </div>
      </div>
    </>
  );
}
