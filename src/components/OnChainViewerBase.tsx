'use client';

import { useState } from 'react';

interface OnChainConfession {
  id: string;
  confessionText: string;
  txHash: string;
  sinCategory: string;
  sinScore: number;
  createdAt: string;
  user: {
    username: string | null;
    walletAddress: string;
  };
}

function getSolscanUrl(txHash: string): string {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : '';
  return `https://solscan.io/tx/${txHash}${cluster}`;
}

function getSolanaExplorerUrl(txHash: string): string {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/tx/${txHash}${cluster}`;
}

export function OnChainViewer({ confessions }: { confessions: OnChainConfession[] }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">⛓ On-Chain Confessions</h2>
        <p className="text-gray-400 text-sm">
          These sins are written to Solana forever. No edits. No deletes. No mercy.
        </p>
      </div>

      {confessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No on-chain confessions yet. Be the first sinner.
        </div>
      ) : (
        confessions.map((c) => (
          <div key={c.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 space-y-3">
            {/* Header */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-amber-400 font-medium">
                {c.user.username || c.user.walletAddress.slice(0, 4) + '...' + c.user.walletAddress.slice(-4)}
              </span>
              <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-800/30">
                ⛓ ON-CHAIN
              </span>
            </div>

            {/* Confession */}
            <p className="text-gray-300 text-sm">{c.confessionText}</p>

            {/* Tags */}
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded-full">
                {c.sinCategory}
              </span>
              <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 text-xs rounded-full">
                🔥 {c.sinScore}
              </span>
            </div>

            {/* Transaction links */}
            <div className="flex gap-3 pt-2 border-t border-gray-800">
              <a
                href={getSolscanUrl(c.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                View on Solscan →
              </a>
              <a
                href={getSolanaExplorerUrl(c.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Solana Explorer →
              </a>
              <span className="text-xs text-gray-600 font-mono">
                {c.txHash.slice(0, 12)}...{c.txHash.slice(-8)}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
