'use client';
import { useState, useEffect } from 'react';

interface Dare {
  id: string;
  dareText: string;
  amount: number;
  status: string;
  createdAt: string;
  expiresAt: string;
  confessionId: string;
  fromUser: { id: string; username: string | null; walletAddress: string };
}

interface MyDaresProps {
  onNavigateToConfess?: (dareId: string, dareText: string) => void;
}

export default function MyDares({ onNavigateToConfess }: MyDaresProps) {
  const [dares, setDares] = useState<Dare[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDares();
    const interval = setInterval(fetchDares, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDares = async () => {
    try {
      const res = await fetch('/api/dare?type=received');
      if (res.ok) {
        const data = await res.json();
        setDares(data.dares || []);
      }
    } catch (err) {
      console.error('MyDares fetch error:', err);
    }
  };

  const handleRespond = async (dareId: string, action: 'accept' | 'decline') => {
    setLoading(true);
    try {
      const res = await fetch('/api/dare', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dareId, action }),
      });
      if (res.ok) {
        fetchDares();
        if (action === 'accept') {
          const dare = dares.find(d => d.id === dareId);
          if (dare) {
            onNavigateToConfess?.(dare.id, dare.dareText);
          }
        }
      }
    } catch (err) {
      console.error('Dare respond error:', err);
    }
    setLoading(false);
  };

  const shortenAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '???';
  const pendingCount = dares.filter(d => d.status === 'pending').length;

  return (
    <>
      {/* Notification Bell */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-400 hover:text-white transition"
      >
        <span className="text-xl">⚡</span>
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Dare Panel */}
      {showPanel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-20 p-4" onClick={() => setShowPanel(false)}>
          <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-2xl max-w-md w-full max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#1a1a2e] p-4 border-b border-purple-500/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">⚡ Your Dares</h3>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>

            <div className="p-4">
              {dares.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No dares yet. Your sins must be boring 😴</p>
              ) : (
                <div className="space-y-3">
                  {dares.map(dare => (
                    <div key={dare.id} className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-purple-400 text-sm font-medium">
                          From: {dare.fromUser.username || shortenAddr(dare.fromUser.walletAddress)}
                        </span>
                        <span className="text-green-400 text-sm font-bold">◎ {dare.amount} SOL</span>
                      </div>

                      <p className="text-white text-sm mb-3">&quot;{dare.dareText}&quot;</p>

                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-500 text-xs">
                          Expires: {new Date(dare.expiresAt).toLocaleDateString()} {new Date(dare.expiresAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(dare.id, 'accept')}
                          disabled={loading}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition"
                        >
                          ✅ Accept & Confess
                        </button>
                        <button
                          onClick={() => handleRespond(dare.id, 'decline')}
                          disabled={loading}
                          className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition"
                        >
                          ❌ Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
