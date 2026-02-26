'use client';
import { useState, useEffect } from 'react';

interface PoolData {
  currentPool: {
    total: number;
    weekStart: string;
    weekEnd: string;
    daysRemaining: number;
    hoursRemaining: number;
  };
  leaderboard: Array<{
    rank: number;
    user: { id: string; username: string | null; walletAddress: string };
    totalBaptized: number;
    baptismCount: number;
    streak: number;
    multiplier: number;
    effectiveScore: number;
    projectedPayout: number;
    share: number;
  }>;
  lastWeek: {
    total: number;
    distributed: boolean;
  } | null;
}

export default function BaptismPool() {
  const [pool, setPool] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPool();
    const interval = setInterval(fetchPool, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchPool = async () => {
    try {
      const res = await fetch('/api/pool');
      const data = await res.json();
      setPool(data);
    } catch (err) {
      console.error('Pool fetch error:', err);
    }
    setLoading(false);
  };

  const shortenAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '???';

  if (loading) {
    return (
      <div className="bg-[#1a1a2e] border border-purple-500/20 rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-purple-500/20 rounded w-1/3" />
          <div className="h-20 bg-purple-500/10 rounded" />
        </div>
      </div>
    );
  }

  if (!pool) return null;

  return (
    <div className="bg-[#1a1a2e] border border-purple-500/20 rounded-2xl overflow-hidden">
      {/* Pool Header */}
      <div className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🏊 Weekly Baptism Pool
          </h3>
          <div className="text-right">
            <span className="text-xs text-gray-400">Resets in</span>
            <p className="text-yellow-400 font-bold text-sm">
              {pool.currentPool.daysRemaining}d {pool.currentPool.hoursRemaining}h
            </p>
          </div>
        </div>

        {/* Pool Amount */}
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm mb-1">Current Pool</p>
          <p className="text-4xl font-black text-green-400">
            ⟠ {pool.currentPool.total.toFixed(6)} ETH
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Top 10 baptizers split 50% of church earnings weekly
          </p>
        </div>
      </div>

      {/* Payout Distribution */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-300">Top Baptizers This Week</h4>
          <span className="text-xs text-purple-400">Rank → Payout %</span>
        </div>

        {pool.leaderboard.length === 0 ? (
          <p className="text-gray-500 text-center py-6 text-sm">No baptisms this week yet. Be the first! ✝️</p>
        ) : (
          <div className="space-y-2">
            {pool.leaderboard.map((entry) => (
              <div
                key={entry.user.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  entry.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/30' :
                  entry.rank === 2 ? 'bg-gray-400/10 border border-gray-400/20' :
                  entry.rank === 3 ? 'bg-orange-500/10 border border-orange-500/20' :
                  'bg-white/5'
                }`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${
                  entry.rank === 1 ? 'bg-yellow-500 text-black' :
                  entry.rank === 2 ? 'bg-gray-400 text-black' :
                  entry.rank === 3 ? 'bg-orange-500 text-black' :
                  'bg-white/10 text-gray-400'
                }`}>
                  {entry.rank}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-medium truncate">
                      {entry.user.username || shortenAddr(entry.user.walletAddress)}
                    </span>
                    {entry.streak >= 3 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                        🔥 {entry.streak}d ({entry.multiplier}x)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>⟠ {entry.totalBaptized.toFixed(6)}</span>
                    <span>✝️ {entry.baptismCount} baptisms</span>
                  </div>
                </div>

                {/* Projected Payout */}
                <div className="text-right">
                  <p className="text-green-400 text-sm font-bold">
                    ⟠ {entry.projectedPayout.toFixed(6)}
                  </p>
                  <p className="text-gray-500 text-xs">{(entry.share * 100).toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payout Structure Info */}
        <div className="mt-4 p-3 bg-white/5 rounded-xl">
          <p className="text-xs text-gray-400 text-center">
            <span className="text-yellow-400">🥇 25%</span> · <span className="text-gray-300">🥈 15%</span> · <span className="text-orange-400">🥉 12%</span> · 4th-5th: 9% · 6th-10th: 6%
          </p>
        </div>
      </div>

      {/* Last Week Results */}
      {pool.lastWeek && (
        <div className="border-t border-purple-500/10 p-4">
          <p className="text-xs text-gray-500 text-center">
            Last week pool: <span className="text-purple-400">⟠ {pool.lastWeek.total.toFixed(6)} ETH</span>
            {pool.lastWeek.distributed ? ' ✅ Distributed' : ' ⏳ Pending'}
          </p>
        </div>
      )}
    </div>
  );
}
