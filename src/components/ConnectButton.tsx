'use client';

import dynamic from 'next/dynamic';
import { useWallet } from '@/components/WalletProvider';

const WalletMultiButtonDynamic = dynamic(
  async () => {
    const { WalletMultiButton } = await import('@solana/wallet-adapter-react-ui');
    return { default: WalletMultiButton };
  },
  { ssr: false, loading: () => <button className="px-4 py-2 bg-red-700 text-white text-sm rounded-lg opacity-50">Loading...</button> }
);

export function ConnectButton({ className }: { className?: string }) {
  const { isConnected, truncatedAddress, username, disconnect } = useWallet();

  if (isConnected) {
    return (
      <button
        onClick={disconnect}
        className={`flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 border border-red-800/50 rounded-lg hover:bg-red-900/60 transition-colors group shrink-0 ${className || ''}`}
        title="Click to disconnect"
      >
        <span className="text-amber-400 text-xs font-medium truncate max-w-[100px]">
          {username || truncatedAddress}
        </span>
        <span className="text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
      </button>
    );
  }

  return (
    <WalletMultiButtonDynamic
      className={className}
      style={{
        backgroundColor: '#dc2626',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        height: '2.5rem',
        padding: '0 1rem',
        fontFamily: 'inherit',
      }}
    />
  );
}

export default ConnectButton;
