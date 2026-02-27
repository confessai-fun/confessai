'use client';

import { useState, useEffect, useCallback } from 'react';

interface OnChainConfession {
  id: string;
  confessionText: string;
  txHash: string;
  sinCategory: string;
  sinScore: number;
  sinLevel: string;
  aiResponse: string;
  createdAt: string;
  user: { username: string | null; walletAddress: string };
}

const SOLSCAN_BASE = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet'
  ? 'https://solscan.io/tx/'
  : 'https://solscan.io/tx/';
const SOLSCAN_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : '';

export default function OnChainPage() {
  const [confessions, setConfessions] = useState<OnChainConfession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadConfessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feed?onchain=true&limit=50');
      const data = await res.json();
      const onchain = (data.confessions || []).filter((c: any) => c.txHash);
      setConfessions(onchain);
    } catch (err) {
      setError('Failed to load on-chain confessions');
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadConfessions(); }, [loadConfessions]);

  const trunc = (s: string, n = 8) => s ? s.slice(0, n) + '...' + s.slice(-n) : '';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-4xl mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl md:text-4xl text-white mb-3">⛓ On-Chain Confessions</h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            These sins are written to Solana forever using the Memo Program. No edits. No deletes. No mercy.
          </p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <span className="px-3 py-1 bg-purple-900/30 text-purple-400 rounded-full border border-purple-800/30">
              🟣 Solana Mainnet
            </span>
            <span className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full border border-green-800/30">
              📜 {confessions.length} on-chain
            </span>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-10 p-5 bg-gray-900/50 rounded-xl border border-gray-800">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">How On-Chain Confessions Work</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            When you choose &quot;Store On-Chain&quot;, your confession is written to Solana using the Memo Program.
            The confession text, sin category, severity score, and AI judgment are encoded as a memo transaction.
            This data lives on-chain permanently — anyone can verify it on Solscan.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading on-chain sins...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-10">
            <p className="text-red-400 mb-3">{error}</p>
            <button onClick={loadConfessions} className="text-sm text-purple-400 hover:text-purple-300">Retry</button>
          </div>
        )}

        {/* Confessions */}
        {!loading && !error && confessions.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-4xl mb-3">⛓</p>
            <p>No on-chain confessions yet. Be the first sinner.</p>
          </div>
        )}

        <div className="space-y-4">
          {confessions.map((c) => (
            <div key={c.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              {/* Header */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-amber-400 font-medium">
                    {c.user?.username || trunc(c.user?.walletAddress || '', 4)}
                  </span>
                  <span className="text-xs text-gray-600">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-800/30 font-mono">
                  ⛓ ON-CHAIN
                </span>
              </div>

              {/* Confession text */}
              <p className="text-gray-300 text-sm mb-3">{c.confessionText}</p>

              {/* Tags */}
              <div className="flex gap-2 mb-3">
                <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded-full">{c.sinCategory}</span>
                <span className="px-2 py-0.5 bg-amber-900/30 text-amber-400 text-xs rounded-full">🔥 {c.sinScore}</span>
                <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded-full">{c.sinLevel}</span>
              </div>

              {/* AI Response */}
              {c.aiResponse && (
                <div className="mb-3 pl-3 border-l-2 border-red-800/50">
                  <p className="text-xs text-red-300 font-medium mb-1">⛪ FATHER DEGEN</p>
                  <p className="text-xs text-gray-400 italic">{c.aiResponse.slice(0, 200)}{c.aiResponse.length > 200 ? '...' : ''}</p>
                </div>
              )}

              {/* Transaction */}
              <div className="pt-3 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-600 font-mono">{trunc(c.txHash)}</span>
                <div className="flex gap-3">
                  <a
                    href={`${SOLSCAN_BASE}${c.txHash}${SOLSCAN_CLUSTER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Solscan →
                  </a>
                  <a
                    href={`https://explorer.solana.com/tx/${c.txHash}${SOLSCAN_CLUSTER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Explorer →
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Back */}
        <div className="text-center mt-12">
          <a href="/" className="text-sm text-gray-500 hover:text-white transition-colors">← Back to the Wall of Sin</a>
        </div>
      </div>
    </div>
  );
}
