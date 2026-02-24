'use client';

import { useWallet } from './WalletProvider';

export default function ConnectButton({ className }: { className?: string }) {
  const { isConnected, connect, disconnect, truncatedAddress, username, isLoading } = useWallet();

  if (isLoading) {
    return (
      <button className={`bg-gray-700 text-gray-400 px-6 py-2.5 rounded-full text-sm font-semibold ${className}`} disabled>
        ...
      </button>
    );
  }

  if (isConnected) {
    return (
      <button
        onClick={disconnect}
        className={`border border-gray-600 text-gray-300 px-6 py-2.5 rounded-full text-sm font-medium hover:border-gray-400 hover:text-white transition-all flex items-center gap-2 ${className}`}
      >
        <span className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="font-body">{username || truncatedAddress}</span>
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className={`bg-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-white hover:text-black transition-all hover:-translate-y-0.5 ${className}`}
    >
      Connect Wallet
    </button>
  );
}
