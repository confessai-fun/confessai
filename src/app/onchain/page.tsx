'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { CONFESSION_ABI, CONTRACT_ADDRESS, BASE_RPC, BASE_EXPLORER } from '@/lib/contract';

interface OnChainConfession {
  id: number;
  sinner: string;
  confessionText: string;
  sinCategory: string;
  sinLevel: string;
  aiResponse: string;
  timestamp: number;
  txHash?: string;
  dbId?: string;
}

const SIN_EMOJIS: Record<string, string> = {
  Greed: '🤑', FOMO: '😱', Wrath: '😤', Sloth: '🦥', Pride: '👑', Lust: '😍', Cope: '🧘',
};

const SIN_LEVEL_COLORS: Record<string, string> = {
  Venial: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  Mortal: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  Cardinal: 'text-red-400 border-red-400/30 bg-red-400/10',
  Unforgivable: 'text-red-600 border-red-600/30 bg-red-600/10',
};

function trunc(addr: string) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function OnChainViewer() {
  const [confessions, setConfessions] = useState<OnChainConfession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const PAGE_SIZE = 10;

  useEffect(() => { setMounted(true); }, []);

  const loadFromDB = useCallback(async () => {
    // Fallback: load on-chain confirmed confessions from our DB
    try {
      const res = await fetch(`/api/feed?sort=recent&limit=50`);
      const data = await res.json();
      const onchain = (data.confessions || []).filter((c: any) => c.chainStatus === 'confirmed');
      setTotal(onchain.length);
      const start = page * PAGE_SIZE;
      const sliced = onchain.slice(start, start + PAGE_SIZE);
      setConfessions(sliced.map((c: any, i: number) => ({
        id: start + i,
        sinner: c.user?.walletAddress || '0x0',
        confessionText: c.confessionText,
        sinCategory: c.sinCategory,
        sinLevel: c.sinLevel,
        aiResponse: c.aiResponse,
        timestamp: Math.floor(new Date(c.createdAt).getTime() / 1000),
        txHash: c.txHash,
        dbId: c.id,
      })));
    } catch (err: any) {
      setError('Failed to load confessions');
    }
  }, [page]);

  const loadFromContract = useCallback(async () => {
    try {
      const provider = new ethers.JsonRpcProvider(BASE_RPC);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONFESSION_ABI, provider);

      const totalBN = await contract.totalConfessions();
      const totalNum = Number(totalBN);
      setTotal(totalNum);

      if (totalNum === 0) {
        setConfessions([]);
        return;
      }

      const start = Math.max(0, totalNum - (page + 1) * PAGE_SIZE);
      const count = Math.min(PAGE_SIZE, totalNum - page * PAGE_SIZE);

      if (count <= 0) { setConfessions([]); return; }

      const raw = await contract.getConfessions(start, count);
      const parsed: OnChainConfession[] = raw.map((c: any, i: number) => ({
        id: start + i,
        sinner: c.sinner,
        confessionText: c.confessionText,
        sinCategory: c.sinCategory,
        sinLevel: c.sinLevel,
        aiResponse: c.aiResponse,
        timestamp: Number(c.timestamp),
      })).reverse();

      setConfessions(parsed);
    } catch (err: any) {
      console.error('Contract read failed, falling back to DB:', err);
      await loadFromDB();
    }
  }, [page, loadFromDB]);

  const loadConfessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (CONTRACT_ADDRESS) {
        await loadFromContract();
      } else {
        await loadFromDB();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    }
    setLoading(false);
  }, [loadFromContract, loadFromDB]);

  useEffect(() => { loadConfessions(); }, [loadConfessions]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-gray-700 border-t-[#ff2d2d] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/5 backdrop-blur-xl bg-[#0a0a0a]/80 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <span className="text-[#ff2d2d] text-2xl">✝</span>
            <span className="font-bold text-lg">ConfessAI</span>
          </a>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full text-xs font-mono text-green-400">
              ⛓ ON-CHAIN VIEWER
            </span>
            {CONTRACT_ADDRESS && (
              <a
                href={`${BASE_EXPLORER}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-gray-500 hover:text-white transition-colors"
              >
                {trunc(CONTRACT_ADDRESS)}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-12">
          <div className="font-mono text-xs text-[#ff2d2d] uppercase tracking-[3px] mb-4">
            Immutable Record
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            On-Chain Confessions
          </h1>
          <p className="text-gray-400 max-w-lg">
            Every confession is permanently stored on the Base blockchain. No edits, no deletes, no take-backs. Your sins are eternal.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-800">
          <div>
            <div className="font-mono text-3xl text-white">{total}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Total On-Chain</div>
          </div>
          <div className="w-px h-12 bg-gray-800" />
          <div>
            <div className="font-mono text-sm text-gray-400">Contract</div>
            {CONTRACT_ADDRESS ? (
              <a
                href={`${BASE_EXPLORER}/address/${CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-[#ff2d2d] hover:underline"
              >
                {CONTRACT_ADDRESS.slice(0, 20)}...
              </a>
            ) : (
              <span className="font-mono text-sm text-gray-600">Not configured</span>
            )}
          </div>
          <div className="w-px h-12 bg-gray-800" />
          <div>
            <div className="font-mono text-sm text-gray-400">Network</div>
            <div className="font-mono text-sm text-blue-400">Base (Chain ID: 8453)</div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-24">
            <div className="w-12 h-12 border-[3px] border-gray-700 border-t-[#ff2d2d] rounded-full animate-spin" />
            <span className="text-gray-500">Reading from Base blockchain...</span>
          </div>
        ) : error ? (
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-8 text-center">
            <div className="text-2xl mb-3">⚠️</div>
            <div className="text-red-400 font-medium mb-2">Failed to read contract</div>
            <div className="text-sm text-gray-500 font-mono">{error}</div>
            <button
              onClick={loadConfessions}
              className="mt-4 px-5 py-2 bg-[#ff2d2d] text-white rounded-full text-sm font-semibold hover:shadow-lg transition-all"
            >
              Retry
            </button>
          </div>
        ) : confessions.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🫥</div>
            <p className="text-gray-500">No confessions on-chain yet.</p>
          </div>
        ) : (
          <>
            {/* Confession Cards */}
            <div className="flex flex-col gap-5">
              {confessions.map((c) => (
                <div
                  key={c.id}
                  className="bg-[#111111] border border-gray-800 rounded-xl p-7 hover:border-gray-700 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center text-sm">😈</div>
                      <div>
                        <a
                          href={`${BASE_EXPLORER}/address/${c.sinner}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-gray-300 hover:text-white transition-colors"
                        >
                          {trunc(c.sinner)}
                        </a>
                        <div className="font-mono text-[11px] text-gray-600">{formatDate(c.timestamp)}</div>
                      </div>
                    </div>
                    <div className="font-mono text-xs text-gray-600 bg-gray-800/50 px-2.5 py-1 rounded">
                      #{c.id}
                    </div>
                  </div>

                  {/* Confession Text */}
                  <p className="text-gray-100 leading-relaxed mb-4">{c.confessionText}</p>

                  {/* Badges */}
                  <div className="flex gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-[#ff2d2d]/15 text-[#ff2d2d] border border-[#ff2d2d]/30">
                      {SIN_EMOJIS[c.sinCategory] || '💀'} {c.sinCategory}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider border ${SIN_LEVEL_COLORS[c.sinLevel] || 'text-gray-400 border-gray-600 bg-gray-600/10'}`}>
                      {c.sinLevel}
                    </span>
                  </div>

                  {/* AI Response */}
                  <div className="bg-[#0a0a0a] border-l-2 border-[#ff2d2d] p-4 rounded-r-lg mb-4">
                    <div className="font-mono text-[10px] text-[#ff2d2d] uppercase tracking-widest mb-2">⛪ Father Degen</div>
                    <p className="text-sm text-gray-300 leading-relaxed">{c.aiResponse}</p>
                  </div>

                  {/* On-chain proof */}
                  <div className="flex items-center gap-3 text-xs font-mono text-gray-600">
                    <span className="text-green-500">⛓</span>
                    <span>Block #{c.timestamp > 0 ? 'confirmed' : 'pending'}</span>
                    <span>•</span>
                    <span>Base L2</span>
                    {c.txHash && (
                      <>
                        <span>•</span>
                        <a href={`${BASE_EXPLORER}/tx/${c.txHash}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 transition-colors">
                          View Tx ↗
                        </a>
                      </>
                    )}
                    {c.dbId && (
                      <>
                        <span>•</span>
                        <a href={`/confession/${c.dbId}`} className="text-[#ff2d2d] hover:text-white transition-colors">
                          View Details →
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-10">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-5 py-2.5 border border-gray-700 rounded-full text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Newer
                </button>
                <span className="font-mono text-sm text-gray-500">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-5 py-2.5 border border-gray-700 rounded-full text-sm text-gray-400 hover:text-white hover:border-gray-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Older →
                </button>
              </div>
            )}
          </>
        )}

        {/* How it works note */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="bg-[#111111] border border-gray-800 rounded-xl p-8">
            <div className="font-mono text-xs text-[#ff2d2d] uppercase tracking-widest mb-3">How It Works</div>
            <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-400">
              <div>
                <div className="text-white font-medium mb-1">📝 Confess</div>
                User submits a confession through the app. AI priest judges it instantly.
              </div>
              <div>
                <div className="text-white font-medium mb-1">⛓ On-Chain</div>
                Our app wallet sends a transaction to this contract, storing the confession, category, severity, and AI response permanently.
              </div>
              <div>
                <div className="text-white font-medium mb-1">🔍 Verify</div>
                Anyone can read confessions directly from the contract — no backend needed. This page reads directly from Base.
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-gray-800 mt-12">
        <div className="flex justify-center gap-6 mb-4">
          <a href="/" className="text-sm text-gray-500 hover:text-white transition-colors">← Back to App</a>
          {CONTRACT_ADDRESS && (
            <a
              href={`${BASE_EXPLORER}/address/${CONTRACT_ADDRESS}#readContract`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Read Contract on BaseScan ↗
            </a>
          )}
        </div>
        <p className="text-xs text-gray-600">ConfessAI — All sins recorded on Base. No salvation guaranteed. confessai.fun</p>
      </footer>
    </div>
  );
}
