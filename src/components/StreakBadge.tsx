'use client';
import { useState, useEffect } from 'react';

interface StreakData {
  streak: number;
  multiplier: number;
  isActive: boolean;
  nextMilestone: number;
  nextMultiplier: number;
  daysToNext: number;
  topStreakers: Array<{
    id: string;
    username: string | null;
    walletAddress: string;
    baptizeStreak: number;
    streakMultiplier: number;
  }>;
}

interface StreakBadgeProps {
  compact?: boolean; // small inline badge vs full widget
}

export default function StreakBadge({ compact = false }: StreakBadgeProps) {
  const [data, setData] = useState<StreakData | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchStreak();
  }, []);

  const fetchStreak = async () => {
    try {
      const res = await fetch('/api/streak');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error('Streak fetch error:', err);
    }
  };

  const shortenAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '???';

  if (!data) return null;

  // Compact badge (for header/profile)
  if (compact) {
    if (data.streak === 0) return null;
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
        data.streak >= 7 ? 'bg-red-500/20 text-red-400 animate-pulse' :
        data.streak >= 3 ? 'bg-orange-500/20 text-orange-400' :
        'bg-yellow-500/20 text-yellow-400'
      }`}>
        🔥 {data.streak}d ({data.multiplier}x)
      </span>
    );
  }

  // Full widget
  return (
    <div className="bg-[#1a1a2e] border border-orange-500/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🔥 Baptism Streaks
          </h3>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-orange-400 hover:text-orange-300"
          >
            {showDetails ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {/* Your Streak */}
      <div className="p-4">
        <div className="text-center mb-4">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 ${
            data.streak >= 7 ? 'bg-red-500/20 border-2 border-red-500 animate-pulse' :
            data.streak >= 3 ? 'bg-orange-500/20 border-2 border-orange-500' :
            data.streak > 0 ? 'bg-yellow-500/20 border-2 border-yellow-500/50' :
            'bg-white/5 border-2 border-gray-700'
          }`}>
            <div className="text-center">
              <span className="text-2xl font-black text-white">{data.streak}</span>
              <p className="text-[10px] text-gray-400">DAYS</p>
            </div>
          </div>

          <p className="text-white font-bold">
            {data.streak === 0 ? 'No streak yet' :
             data.streak >= 7 ? '🔥 ON FIRE! 2x Multiplier' :
             data.streak >= 3 ? '⚡ Hot streak! 1.5x Multiplier' :
             `${data.daysToNext} more days to 1.5x!`}
          </p>

          {data.multiplier > 1 && (
            <p className="text-green-400 text-sm mt-1">
              Your baptisms count as <span className="font-bold">{data.multiplier}x</span> in the weekly pool
            </p>
          )}
        </div>

        {/* Progress to next milestone */}
        {data.streak > 0 && data.streak < 7 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Current: {data.multiplier}x</span>
              <span>Next: {data.nextMultiplier}x at {data.nextMilestone} days</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  data.streak >= 3 ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(100, (data.streak / data.nextMilestone) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Multiplier tiers */}
        {showDetails && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className={`text-center p-2 rounded-lg ${data.streak >= 1 && data.streak < 3 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-white/5'}`}>
                <p className="text-xs text-gray-400">1-2 days</p>
                <p className="text-white font-bold">1x</p>
              </div>
              <div className={`text-center p-2 rounded-lg ${data.streak >= 3 && data.streak < 7 ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-white/5'}`}>
                <p className="text-xs text-gray-400">3-6 days</p>
                <p className="text-orange-400 font-bold">1.5x</p>
              </div>
              <div className={`text-center p-2 rounded-lg ${data.streak >= 7 ? 'bg-red-500/20 border border-red-500/30 animate-pulse' : 'bg-white/5'}`}>
                <p className="text-xs text-gray-400">7+ days</p>
                <p className="text-red-400 font-bold">2x</p>
              </div>
            </div>

            {/* Top Streakers */}
            {data.topStreakers.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-300 mb-2">🏆 Top Streakers</h4>
                <div className="space-y-1">
                  {data.topStreakers.slice(0, 5).map((user, i) => (
                    <div key={user.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-4">{i + 1}.</span>
                        <span className="text-white text-sm">
                          {user.username || shortenAddr(user.walletAddress)}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${
                        user.baptizeStreak >= 7 ? 'text-red-400' :
                        user.baptizeStreak >= 3 ? 'text-orange-400' : 'text-yellow-400'
                      }`}>
                        🔥 {user.baptizeStreak}d ({user.streakMultiplier}x)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        {!data.isActive && (
          <p className="text-center text-gray-500 text-xs mt-3">
            Baptize someone today to {data.streak > 0 ? 'keep your streak!' : 'start a streak!'}
          </p>
        )}
      </div>
    </div>
  );
}
