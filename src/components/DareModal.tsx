'use client';
import { useState, useEffect } from 'react';

interface Dare {
  id: string;
  dareText: string;
  amount: number;
  status: string;
  createdAt: string;
  expiresAt: string;
  fromUser: { id: string; username: string | null; walletAddress: string };
  toUser: { id: string; username: string | null; walletAddress: string };
}

interface DareModalProps {
  confessionId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  confessionOwnerId?: string;
}

export default function DareModal({ confessionId, isOpen, onClose, currentUserId, confessionOwnerId }: DareModalProps) {
  const [dares, setDares] = useState<Dare[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchDares();
  }, [isOpen]);

  const fetchDares = async () => {
    try {
      const res = await fetch(`/api/dare?type=confession&confessionId=${confessionId}`);
      const data = await res.json();
      setDares(data.dares || []);
    } catch (err) {
      console.error('Fetch dares error:', err);
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
      const data = await res.json();
      if (res.ok) {
        fetchDares();
        if (action === 'accept') {
          alert('Dare accepted! Now post a confession to complete it.');
        }
      } else {
        alert(data.error || 'Failed');
      }
    } catch (err) {
      console.error('Dare respond error:', err);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  const shortenAddr = (addr: string) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '???';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-purple-500/30 rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            ⚡ Dares
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        {dares.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No dares yet. Be the first to dare this sinner!</p>
        ) : (
          <div className="space-y-3">
            {dares.map(dare => (
              <div key={dare.id} className={`rounded-xl p-4 border ${
                dare.status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/5' :
                dare.status === 'accepted' ? 'border-green-500/30 bg-green-500/5' :
                'border-gray-500/30 bg-gray-500/5'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-purple-400 text-sm font-medium">
                    {dare.fromUser.username || shortenAddr(dare.fromUser.walletAddress)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    dare.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    dare.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                    dare.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {dare.status}
                  </span>
                </div>

                <p className="text-white text-sm mb-2">&quot;{dare.dareText}&quot;</p>

                <div className="flex items-center justify-between">
                  <span className="text-green-400 text-sm font-bold">◎ {dare.amount} SOL</span>

                  {dare.status === 'pending' && (
                    <span className="text-gray-500 text-xs">
                      Expires: {new Date(dare.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Show accept/decline if current user is the dare recipient */}
                {dare.status === 'pending' && currentUserId === dare.toUser.id && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleRespond(dare.id, 'accept')}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition"
                    >
                      ✅ Accept Dare
                    </button>
                    <button
                      onClick={() => handleRespond(dare.id, 'decline')}
                      disabled={loading}
                      className="flex-1 bg-red-600/30 hover:bg-red-600/50 text-red-400 text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition"
                    >
                      ❌ Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
