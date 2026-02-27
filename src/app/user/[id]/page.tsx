'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

function timeAgo(d: string) {
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)}d ago`;
  return `${Math.floor(sec / 2592000)}mo ago`;
}

function trunc(addr: string) { return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : 'Anon'; }

function profileAge(date: string) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}mo`;
}

const SIN_ICONS: Record<string, string> = {
  Greed: '/greed_icon.png', FOMO: '/fomo_icon.png', Wrath: '/wrath_icon.png',
  Sloth: '/sloth_icon.png', Pride: '/pride_icon.png', Lust: '/lust_icon.png', Cope: '/cope_icon.png',
};

export default function UserProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'confessions' | 'baptisms' | 'earned'>('confessions');

  useEffect(() => {
    fetch(`/api/user/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-gray-700 border-t-accent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">👤</div>
          <h1 className="font-display text-2xl text-white mb-2">Sinner Not Found</h1>
          <p className="text-gray-500 mb-6">This soul doesn&apos;t exist in our records.</p>
          <button onClick={() => router.push('/')} className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-bold">
            ← Back to Wall of Sin
          </button>
        </div>
      </div>
    );
  }

  const u = data.user;
  const displayName = u.username || trunc(u.walletAddress);

  const tabs = [
    { id: 'confessions' as const, label: `📜 Confessions (${data.confessions?.length || 0})` },
    { id: 'baptisms' as const, label: `🕊 Baptisms Given (${data.baptismsGiven?.length || 0})` },
    { id: 'earned' as const, label: `💰 Earned (${data.donationsEarned?.length || 0})` },
  ];

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <button onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push('/#leaderboard');
          }} className="font-display text-base sm:text-lg text-white hover:text-accent transition-colors">
            ← Back
          </button>
          <span className="font-mono text-sm text-gray-500">Sinner Profile</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-24 md:pb-20">
        {/* Profile Card */}
        <div className="bg-card border border-gray-800 rounded-xl p-5 sm:p-8 mb-6">
          <div className="flex items-center gap-4 sm:gap-6 max-sm:flex-col max-sm:text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-accent rounded-full flex items-center justify-center text-3xl sm:text-4xl shrink-0">😈</div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-xl sm:text-2xl text-white mb-1 truncate">{displayName}</div>
              <div className="font-mono text-xs sm:text-sm text-gray-500 mb-1">{trunc(u.walletAddress)}</div>
              <div className="text-xs text-gray-600">Member for {profileAge(u.createdAt)}</div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-gray-800">
            <div className="text-center">
              <div className="font-mono text-xl sm:text-2xl text-accent">{u.sinScore}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sin Score</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-xl sm:text-2xl text-white">{u.totalConfessions}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Confessions</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-xl sm:text-2xl text-yellow-400">{(u.totalDonated || 0).toFixed(4)}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">SOL Donated</div>
            </div>
            <div className="text-center">
              <div className="font-mono text-xl sm:text-2xl text-green-400">{(u.totalEarned || 0).toFixed(4)}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">SOL Earned</div>
            </div>
            <div className="text-center col-span-2 sm:col-span-1">
              <div className="font-mono text-xl sm:text-2xl text-gray-300">{u.donationCount}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Baptisms</div>
            </div>
          </div>

          {/* Sin Level Bar */}
          {u.sinScore > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="w-full h-3 bg-bg rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${Math.min((u.sinScore / 500) * 100, 100)}%`,
                    background: u.sinScore > 300
                      ? 'linear-gradient(90deg, #ff2d2d, #ff0000)'
                      : u.sinScore > 100
                        ? 'linear-gradient(90deg, #ff8c00, #ff2d2d)'
                        : 'linear-gradient(90deg, #ffd700, #ff8c00)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-600">
                <span>Saint</span><span>Sinner</span><span>Damned</span>
              </div>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                activeTab === t.id
                  ? 'bg-accent text-white shadow-lg shadow-accent/20'
                  : 'bg-card border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Confessions Tab */}
        {activeTab === 'confessions' && (
          <div className="flex flex-col gap-4">
            {(data.confessions?.length || 0) === 0 ? (
              <div className="bg-card border border-gray-800 rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">🫥</div>
                <p className="text-gray-500">No confessions yet.</p>
              </div>
            ) : (
              data.confessions.map((c: any) => (
                <a key={c.id} href={`/confession/${c.id}`} className="block bg-card border border-gray-800 rounded-xl p-4 sm:p-5 hover:border-gray-700 transition-all group">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase bg-accent/15 text-accent border border-accent/30 inline-flex items-center gap-1">
                      {SIN_ICONS[c.sinCategory] && <img src={SIN_ICONS[c.sinCategory]} alt="" width={12} height={12} />}
                      {c.sinCategory}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase bg-white/5 text-gray-400 border border-gray-600">{c.sinLevel}</span>
                    <span className="text-xs text-gray-600 ml-auto">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed group-hover:text-white transition-colors line-clamp-3">
                    &ldquo;{c.confessionText}&rdquo;
                  </p>
                  <div className="flex gap-4 mt-3 text-xs text-gray-500">
                    <span>❤️ {c.likesCount}</span>
                    <span>💬 {c.commentsCount}</span>
                    {c.totalDonated > 0 && <span>🕊 {c.totalDonated.toFixed(4)} SOL</span>}
                  </div>
                </a>
              ))
            )}
          </div>
        )}

        {/* Baptisms Given Tab */}
        {activeTab === 'baptisms' && (
          <div className="flex flex-col gap-3">
            {(data.baptismsGiven?.length || 0) === 0 ? (
              <div className="bg-card border border-gray-800 rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">🕊</div>
                <p className="text-gray-500">No baptisms given yet.</p>
              </div>
            ) : (
              data.baptismsGiven.map((d: any) => (
                <a key={d.id} href={`/confession/${d.confession?.id}`} className="block bg-card border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-yellow-400 font-semibold">🕊 {d.amount.toFixed(4)} SOL</span>
                    <span className="text-xs text-gray-600">{timeAgo(d.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-accent/15 text-accent border border-accent/30">
                      {d.confession?.sinCategory}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">&ldquo;{(d.confession?.confessionText || '').slice(0, 150)}&rdquo;</p>
                </a>
              ))
            )}
          </div>
        )}

        {/* Donations Earned Tab */}
        {activeTab === 'earned' && (
          <div className="flex flex-col gap-3">
            {(data.donationsEarned?.length || 0) === 0 ? (
              <div className="bg-card border border-gray-800 rounded-xl p-12 text-center">
                <div className="text-4xl mb-4">💰</div>
                <p className="text-gray-500">No donations earned yet. Confess harder.</p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 sm:p-6 text-center mb-2">
                  <div className="font-mono text-2xl sm:text-3xl text-green-400 mb-1">{(u.totalEarned || 0).toFixed(4)} SOL</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Total Earned from {u.earnedCount || 0} baptisms</div>
                </div>
                {data.donationsEarned.map((d: any) => (
                  <div key={d.id} className="bg-card border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-mono text-sm font-semibold">+{(d.amount / 2).toFixed(4)} SOL</span>
                        <span className="text-xs text-gray-600">earned</span>
                      </div>
                      <span className="text-xs text-gray-600">{timeAgo(d.createdAt)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      Baptized by{' '}
                      <a href={`/user/${d.user?.id}`} className="text-gray-400 hover:text-accent transition-colors">
                        {d.user?.username || trunc(d.user?.walletAddress || '')}
                      </a>
                    </div>
                    <a href={`/confession/${d.confession?.id}`} className="text-xs text-gray-400 hover:text-white transition-colors line-clamp-1">
                      &ldquo;{(d.confession?.confessionText || '').slice(0, 100)}&rdquo;
                    </a>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
