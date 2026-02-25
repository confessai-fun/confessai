'use client';

import { useWallet } from './WalletProvider';
import ConnectButton from './ConnectButton';

interface NavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navbar({ activeTab, onTabChange }: NavProps) {
  const { isConnected } = useWallet();

  const tabs: { id: string; label: string; href?: string }[] = [
    { id: 'confess', label: 'Confess' },
    { id: 'wall', label: 'Wall' },
    { id: 'leaderboard', label: '🕊 Baptism' },
    { id: 'chat', label: 'Chat' },
    { id: 'onchain', label: '⛓ On-Chain', href: '/onchain' },
    ...(isConnected
      ? [
          { id: 'mysins', label: 'My Sins' },
          { id: 'profile', label: 'Profile' },
        ]
      : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-8 py-4 flex justify-between items-center backdrop-blur-xl bg-bg/80 border-b border-white/5">
      <div
        className="font-display text-lg text-white flex items-center gap-2.5 cursor-pointer"
        onClick={() => onTabChange('home')}
      >
        <span className="text-accent text-2xl animate-pulse-glow">✝</span>
        ConfessAI
      </div>

      <div className="flex items-center gap-6">
        {tabs.map((tab) =>
          tab.href ? (
            <a
              key={tab.id}
              href={tab.href}
              className="hidden md:block text-sm font-medium uppercase tracking-wider text-gray-400 hover:text-white transition-colors"
            >
              {tab.label}
            </a>
          ) : (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`hidden md:block text-sm font-medium uppercase tracking-wider transition-colors ${
                activeTab === tab.id ? 'text-accent' : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          )
        )}
        <ConnectButton />
      </div>
    </nav>
  );
}
