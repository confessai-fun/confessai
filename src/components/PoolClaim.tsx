'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/components/WalletProvider';

interface Payout {
  id: string;
  rank: number;
  amount: number;
  claimed: boolean;
  claimedAt: string | null;
  txHash: string | null;
  pool: {
    weekStart: string;
    totalPool: number;
  };
}

const SOLSCAN_CLUSTER = process.env.NEXT_PUBLIC_SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : '';

export default function PoolClaim() {
  const { isConnected } = useWallet();
  const [claimable, setClaimable] = useState<Payout[]>([]);
  const [claimed, setClaimed] = useState<Payout[]>([]);
  const [totalClaimable, setTotalClaimable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const fetchPayouts = useCallback(async () => {
    if (!isConnected) return;
    try {
      const res = await fetch('/api/pool/claim');
      if (!res.ok) return;
      const data = await res.json();
      setClaimable(data.claimable || []);
      setClaimed(data.claimed || []);
      setTotalClaimable(data.totalClaimable || 0);
    } catch {}
    setLoading(false);
  }, [isConnected]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const handleClaim = async (payoutId?: string) => {
    setClaiming(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/pool/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutId: payoutId || null }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(`Claimed ${data.amount.toFixed(6)} SOL! Tx: ${data.txHash?.slice(0, 12)}...`);
        await fetchPayouts();
      } else {
        setError(data.error || 'Claim failed');
      }
    } catch (err: any) {
      setError('Network error');
    }
    setClaiming(false);
  };

  const formatWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isConnected || loading) return null;
  if (claimable.length === 0 && claimed.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-yellow-900/20 to-amber-900/20 border border-yellow-800/30 rounded-xl p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-display text-yellow-400 flex items-center gap-2">
          🏆 Pool Rewards
        </h3>
        {totalClaimable > 0 && (
          <span className="text-xs bg-green-900/40 text-green-400 px-2 py-1 rounded-full border border-green-800/30">
            {totalClaimable.toFixed(6)} SOL available
          </span>
        )}
      </div>

      {/* Claimable Payouts */}
      {claimable.length > 0 && (
        <div className="space-y-3 mb-4">
          {claimable.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-black/30 rounded-lg px-4 py-3 border border-yellow-800/20">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 font-bold text-sm">
                    #{p.rank}
                  </span>
                  <span className="text-gray-400 text-xs">
                    Week of {formatWeek(p.pool.weekStart)}
                  </span>
                </div>
                <div className="text-green-400 font-mono text-sm mt-0.5">
                  ◎ {p.amount.toFixed(6)} SOL
                </div>
              </div>
              <button
                onClick={() => handleClaim(p.id)}
                disabled={claiming}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claiming ? '⏳' : 'Claim'}
              </button>
            </div>
          ))}

          {/* Claim All button */}
          {claimable.length > 1 && (
            <button
              onClick={() => handleClaim()}
              disabled={claiming}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50"
            >
              {claiming ? '⏳ Claiming...' : `Claim All (◎ ${totalClaimable.toFixed(6)} SOL)`}
            </button>
          )}
        </div>
      )}

      {/* No claimable */}
      {claimable.length === 0 && (
        <p className="text-gray-500 text-sm mb-4">
          No unclaimed rewards. Baptize sinners to compete for the weekly pool!
        </p>
      )}

      {/* Status messages */}
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      {success && (
        <p className="text-green-400 text-xs mb-3">
          {success}
        </p>
      )}

      {/* Claimed History */}
      {claimed.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
          >
            {showHistory ? '▾ Hide' : '▸ Show'} claim history ({claimed.length})
          </button>

          {showHistory && (
            <div className="mt-2 space-y-2">
              {claimed.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs text-gray-500 px-3 py-2 bg-black/20 rounded-lg">
                  <div>
                    <span className="text-gray-400">#{p.rank}</span>
                    <span className="mx-2">·</span>
                    <span>{formatWeek(p.pool.weekStart)}</span>
                    <span className="mx-2">·</span>
                    <span className="text-green-500 font-mono">◎ {p.amount.toFixed(6)}</span>
                  </div>
                  {p.txHash && (
                    <a
                      href={`https://solscan.io/tx/${p.txHash}${SOLSCAN_CLUSTER}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Tx →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
