'use client';

import { useState, useEffect } from 'react';
import { useWallet } from './WalletProvider';

export default function ConnectButton({ className }: { className?: string }) {
  const { isConnected, connect, disconnect, truncatedAddress, username, isLoading } = useWallet();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  const noProvider = typeof window !== 'undefined' && typeof window.ethereum === 'undefined';

  if (isLoading) {
    return (
      <button className={`bg-gray-700 text-gray-400 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold ${className}`} disabled>
        ...
      </button>
    );
  }

  if (isConnected) {
    return (
      <button
        onClick={disconnect}
        className={`border border-gray-600 text-gray-300 px-3 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium hover:border-gray-400 hover:text-white transition-all flex items-center gap-1.5 sm:gap-2 ${className}`}
      >
        <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
        <span className="font-body truncate max-w-[100px] sm:max-w-[150px]">{username || truncatedAddress}</span>
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className={`bg-accent text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold hover:bg-white hover:text-black transition-all hover:-translate-y-0.5 flex items-center gap-1.5 ${className}`}
    >
      {isMobile && noProvider ? (
        <>🦊 Open in MetaMask</>
      ) : (
        <>Connect<span className="hidden sm:inline"> Wallet</span></>
      )}
    </button>
  );
}
