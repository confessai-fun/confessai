'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@/components/WalletProvider';
import ConnectButton from '@/components/ConnectButton';
import Navbar from '@/components/Navbar';
import FeedCard from '@/components/FeedCard';
import ChatPanel from '@/components/ChatPanel';
import { useToast } from '@/components/Toast';

const VALID_TABS = ['home', 'confess', 'wall', 'leaderboard', 'chat', 'mysins', 'mybaptisms', 'profile'];

const SINS = [
  { icon: '/greed_icon.png', name: 'Greed', desc: '"I knew it was a rug but the APY was 40,000%"', gradient: 'from-yellow-500/20 to-amber-600/20', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/10' },
  { icon: '/fomo_icon.png', name: 'FOMO', desc: '"A guy on Twitter said it\'s going to $1 so I sold my car"', gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', glow: 'shadow-blue-500/10' },
  { icon: '/wrath_icon.png', name: 'Wrath', desc: '"I mass reported the dev\'s Twitter after getting rugged"', gradient: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30', glow: 'shadow-red-500/10' },
  { icon: '/sloth_icon.png', name: 'Sloth', desc: '"Too lazy to revoke approvals. Got drained 3 times."', gradient: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', glow: 'shadow-green-500/10' },
  { icon: '/pride_icon.png', name: 'Pride', desc: '"I told everyone I sold the top. I absolutely did not."', gradient: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30', glow: 'shadow-purple-500/10' },
  { icon: '/lust_icon.png', name: 'Lust', desc: '"I bought a token because the dev was attractive"', gradient: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30', glow: 'shadow-pink-500/10' },
  { icon: '/cope_icon.png', name: 'Cope', desc: '"It\'s not a loss if I don\'t sell" — me, down 97%', gradient: 'from-teal-500/20 to-cyan-500/20', border: 'border-teal-500/30', glow: 'shadow-teal-500/10' },
];

const STEPS = [
  { num: '01', title: 'Connect Wallet', desc: 'Sign in with Ethereum. Anonymous. No KYC. Just sins.' },
  { num: '02', title: 'Confess Your Sins', desc: 'Tell Father Degen your worst trades, biggest copes, and degen moments.' },
  { num: '03', title: 'Get Judged On-Chain', desc: 'AI priest classifies your sin, assigns severity, and delivers penance. Stored forever on Base.' },
  { num: '04', title: 'Baptize the Sinners', desc: 'Send ETH to baptize any confession. Top donors earn their place on the Baptism Leaderboard.' },
];

const SORT_OPTIONS = [
  { id: 'recent', label: '🕐 Recent', desc: 'Newest first' },
  { id: 'trending', label: '🔥 Trending', desc: 'Most engagement' },
  { id: 'sinful', label: '😈 Most Sinful', desc: 'Worst sins first' },
];

const SIN_CATEGORIES = ['Greed', 'FOMO', 'Wrath', 'Sloth', 'Pride', 'Lust', 'Cope'];
const SIN_ICONS: Record<string, string> = {
  Greed: '/greed_icon.png',
  FOMO: '/fomo_icon.png',
  Wrath: '/wrath_icon.png',
  Sloth: '/sloth_icon.png',
  Pride: '/pride_icon.png',
  Lust: '/lust_icon.png',
  Cope: '/cope_icon.png',
};

// Helper component for sin icon
function SinIcon({ name, size = 16 }: { name: string; size?: number }) {
  const src = SIN_ICONS[name];
  if (!src) return <span>⛪</span>;
  return <img src={src} alt={name} width={size} height={size} className="inline-block" style={{ width: size, height: size }} />;
}

function trunc(addr: string) { return addr.slice(0, 6) + '...' + addr.slice(-4); }

// Reusable Feed Section with filters and sort
function FeedSection({
  title,
  subtitle,
  isMine,
  isConnected,
  onNavigateConfess,
}: {
  title: string;
  subtitle: string;
  isMine?: boolean;
  isConnected: boolean;
  onNavigateConfess: () => void;
}) {
  const [confessions, setConfessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recent');
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30', sort });
      if (category) params.set('category', category);
      if (isMine) params.set('mine', 'true');

      const res = await fetch(`/api/feed?${params}`);
      const data = await res.json();
      setConfessions(data.confessions || []);
      setCategories(data.categories || []);
      setTotalCount(data.totalCount || 0);
    } catch {}
    setLoading(false);
  }, [sort, category, isMine]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 md:pt-32 pb-24 md:pb-20">
      <div className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">{subtitle}</div>
      <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white mb-8">{title}</h2>

      {/* Sort Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {SORT_OPTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSort(s.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              sort === s.id
                ? 'bg-accent text-white shadow-lg shadow-accent/20'
                : 'bg-card border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <button
          onClick={() => setCategory(null)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider transition-all ${
            !category
              ? 'bg-white/10 text-white border border-white/20'
              : 'bg-card border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'
          }`}
        >
          All {totalCount > 0 && <span className="ml-1 opacity-60">({totalCount})</span>}
        </button>
        {SIN_CATEGORIES.map((cat) => {
          const catData = categories.find((c) => c.name === cat);
          const count = catData?.count || 0;
          if (count === 0 && categories.length > 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setCategory(category === cat ? null : cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider transition-all ${
                category === cat
                  ? 'bg-accent/15 text-accent border border-accent/30'
                  : 'bg-card border border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-500'
              }`}
            >
              <SinIcon name={cat} size={14} /> {cat}
              {count > 0 && <span className="ml-1 opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-10 h-10 border-[3px] border-gray-700 border-t-accent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading confessions...</span>
        </div>
      ) : confessions.length === 0 ? (
        <div className="bg-card border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">🫥</div>
          <p className="text-gray-500 mb-4">
            {isMine
              ? "You haven't confessed yet."
              : category
                ? `No ${category} confessions yet.`
                : 'No confessions yet. Be the first sinner.'}
          </p>
          {isMine && (
            <button
              onClick={onNavigateConfess}
              className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-accent/20 transition-all"
            >
              ⛪ Enter the Confessional
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {confessions.map((c) => (
            <FeedCard key={c.id} confession={c} onRefresh={loadFeed} />
          ))}
        </div>
      )}
    </section>
  );
}

// My Baptisms Component
function MyBaptismsTab({ onNavigateConfess }: { onNavigateConfess: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch('/api/my-baptisms')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const shareCard = (d: any) => {
    const sinEmoji = { Greed: '💰', FOMO: '📉', Wrath: '🔥', Sloth: '💤', Pride: '👑', Lust: '💋', Cope: '🧠' }[d.confession?.sinCategory as string] || '⛪';
    const text = `🕊 I baptized a sinner on @ConfessAI ⛪\n\n${sinEmoji} Sin: ${d.confession?.sinCategory} — ${d.confession?.sinLevel}\n💰 Offering: ${d.amount.toFixed(4)} ETH\n⛓ Tx: basescan.org/tx/${d.txHash}\n\nConfess & get baptized → confessai.fun\n\n$CONFESS`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 md:pt-32 pb-24 md:pb-20">
      <div className="font-mono text-xs text-yellow-400 uppercase tracking-[3px] mb-4">Your Offerings</div>
      <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white mb-8">My Baptisms</h2>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-10 h-10 border-[3px] border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading baptisms...</span>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
              <div className="font-mono text-3xl text-yellow-400 mb-1">{(data?.totalDonated || 0).toFixed(4)}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total ETH Offered</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
              <div className="font-mono text-3xl text-yellow-400 mb-1">{data?.donationCount || 0}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total Baptisms</div>
            </div>
          </div>

          {/* Baptism Cards */}
          {(data?.donations?.length || 0) === 0 ? (
            <div className="bg-card border border-gray-800 rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">🕊</div>
              <p className="text-gray-500 mb-4">You haven't baptized any sinners yet.</p>
              <button
                onClick={onNavigateConfess}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-6 py-2.5 rounded-full text-sm font-bold hover:shadow-lg hover:shadow-yellow-500/20 transition-all"
              >
                Go to Wall of Sin →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {data.donations.map((d: any) => (
                <div key={d.id} className="bg-card border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-all">
                  {/* Baptism header */}
                  <div className="bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border-b border-yellow-500/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">🕊</span>
                      <span className="font-mono text-sm text-yellow-400 font-semibold">{d.amount.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        href={`https://basescan.org/tx/${d.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full hover:bg-green-500/20 transition-colors"
                      >
                        ⛓ {d.txHash.slice(0, 10)}...{d.txHash.slice(-6)}
                      </a>
                      <span className="text-[11px] text-gray-500">
                        {new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Confession preview */}
                  <div className="px-4 sm:px-6 py-4 sm:py-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase bg-accent/15 text-accent border border-accent/30">
                          {d.confession?.sinCategory}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase bg-white/5 text-gray-400 border border-gray-600">
                          {d.confession?.sinLevel}
                        </span>
                      </div>
                      <a
                        href={`/confession/${d.confessionId || d.confession?.id}`}
                        className="text-[11px] text-accent hover:text-white transition-colors font-mono"
                      >
                        View Confession →
                      </a>
                    </div>
                    <a
                      href={`/confession/${d.confessionId || d.confession?.id}`}
                      className="block text-sm text-gray-300 leading-relaxed mb-4 cursor-pointer hover:text-white transition-colors"
                    >
                      &ldquo;{(d.confession?.confessionText || '').slice(0, 200)}{(d.confession?.confessionText || '').length > 200 ? '...' : ''}&rdquo;
                    </a>

                    {/* Actions */}
                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={() => shareCard(d)}
                        className="inline-flex items-center gap-2 border border-yellow-500/30 text-yellow-400 px-4 py-2 rounded-full text-xs font-semibold hover:bg-yellow-500/10 transition-all"
                      >
                        ↗ Share Baptism Card on 𝕏
                      </button>
                      <a
                        href={`https://basescan.org/tx/${d.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 border border-gray-700 text-gray-400 px-4 py-2 rounded-full text-xs font-semibold hover:border-gray-500 hover:text-gray-300 transition-all"
                      >
                        ⛓ View on BaseScan
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// Leaderboard Component
function LeaderboardTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lbTab, setLbTab] = useState<'overall' | 'donors' | 'earners'>('overall');

  useEffect(() => {
    setLoading(true);
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const medalStyle = (i: number) =>
    i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-800 text-gray-400';

  const renderUserRow = (d: any, i: number, extra?: React.ReactNode) => (
    <a key={d.id} href={`/user/${d.id}`} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 hover:bg-white/[0.02] transition-colors">
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${medalStyle(i)}`}>
        {i + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate hover:text-accent transition-colors">{d.username || trunc(d.walletAddress)}</div>
        <div className="text-xs text-gray-500 truncate">
          {d.donationCount} baptism{d.donationCount !== 1 ? 's' : ''} • {d.earnedCount || 0} earned • 🔥 {d.sinScore}
          {d.ageDays !== undefined && <span> • {d.ageDays}d old</span>}
        </div>
      </div>
      {extra}
    </a>
  );

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 md:pt-32 pb-24 md:pb-20">
      <div className="font-mono text-xs text-yellow-400 uppercase tracking-[3px] mb-4">Church Treasury</div>
      <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white mb-8">Baptism Leaderboard</h2>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-10 h-10 border-[3px] border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading leaderboard...</span>
        </div>
      ) : (
        <>
          {/* Treasury Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-4 sm:p-6 text-center">
              <div className="font-mono text-2xl sm:text-3xl text-yellow-400 mb-1">{(data?.treasury?.totalETH || 0).toFixed(4)}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total ETH Donated</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-xl p-4 sm:p-6 text-center">
              <div className="font-mono text-2xl sm:text-3xl text-yellow-400 mb-1">{data?.treasury?.totalDonations || 0}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total Baptisms</div>
            </div>
          </div>

          {/* Leaderboard Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {[
              { id: 'overall' as const, label: '🏆 Overall' },
              { id: 'donors' as const, label: '🕊 Top Donors' },
              { id: 'earners' as const, label: '💰 Top Earners' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setLbTab(t.id)}
                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                  lbTab === t.id
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-card border border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Overall Leaderboard */}
          {lbTab === 'overall' && (
            <div className="bg-card border border-gray-800 rounded-xl overflow-hidden mb-8">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
                <div className="font-mono text-xs text-accent uppercase tracking-widest">🏆 Combined Leaderboard</div>
                <div className="text-[10px] text-gray-600 mt-1">Scored by: baptisms + earnings + sin score + profile age</div>
              </div>
              {(data?.topUsers?.length || 0) === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No activity yet.</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {data.topUsers.map((d: any, i: number) =>
                    renderUserRow(d, i, (
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm text-accent">{d.compositeScore} pts</div>
                        <div className="text-[10px] text-gray-600">{d.totalDonated.toFixed(4)} / {(d.totalEarned || 0).toFixed(4)} ETH</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Top Donors */}
          {lbTab === 'donors' && (
            <div className="bg-card border border-gray-800 rounded-xl overflow-hidden mb-8">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
                <div className="font-mono text-xs text-yellow-400 uppercase tracking-widest">🕊 Most Generous Baptizers</div>
              </div>
              {(data?.topDonors?.length || 0) === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No donations yet.</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {data.topDonors.map((d: any, i: number) =>
                    renderUserRow(d, i, (
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm text-yellow-400">{d.totalDonated.toFixed(4)} ETH</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Top Earners */}
          {lbTab === 'earners' && (
            <div className="bg-card border border-gray-800 rounded-xl overflow-hidden mb-8">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
                <div className="font-mono text-xs text-green-400 uppercase tracking-widest">💰 Top Earners (Confessions that got baptized)</div>
              </div>
              {(data?.topEarners?.length || 0) === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">No earnings yet. Confess harder.</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {data.topEarners.map((d: any, i: number) =>
                    renderUserRow(d, i, (
                      <div className="text-right shrink-0">
                        <div className="font-mono text-sm text-green-400">{(d.totalEarned || 0).toFixed(4)} ETH</div>
                        <div className="text-[10px] text-gray-600">{d.earnedCount || 0} baptisms received</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recent Donations */}
          <div className="bg-card border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-800">
              <div className="font-mono text-xs text-gray-400 uppercase tracking-widest">Recent Baptisms</div>
            </div>
            {(data?.recentDonations?.length || 0) === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">No recent baptisms.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {data.recentDonations.map((d: any) => (
                  <div key={d.id} className="px-4 sm:px-6 py-3 flex items-center gap-2 sm:gap-3">
                    <span className="text-yellow-400 shrink-0">🕊</span>
                    <div className="flex-1 min-w-0 text-xs sm:text-sm">
                      <a href={`/user/${d.user?.id}`} className="text-white hover:text-accent transition-colors">{d.user?.username || trunc(d.user?.walletAddress || '')}</a>
                      <span className="text-gray-500"> baptized </span>
                      <a href={`/confession/${d.confessionId || d.confession?.id}`} className="text-gray-400 hover:text-white transition-colors truncate">
                        &ldquo;{(d.confession?.confessionText || '').slice(0, 30)}...&rdquo;
                      </a>
                    </div>
                    <div className="font-mono text-xs text-yellow-400 shrink-0">{d.amount.toFixed(4)} ETH</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default function Home() {
  const { address, isConnected } = useWallet();
  const toast = useToast();

  // Read initial tab from URL hash
  const getTabFromHash = () => {
    if (typeof window === 'undefined') return 'home';
    const hash = window.location.hash.replace('#', '');
    return VALID_TABS.includes(hash) ? hash : 'home';
  };

  const [tab, setTabState] = useState('home');

  // Sync tab → URL hash
  const setTab = useCallback((newTab: string) => {
    setTabState(newTab);
    if (typeof window !== 'undefined') {
      const newHash = newTab === 'home' ? '' : `#${newTab}`;
      window.history.replaceState(null, '', `/${newHash}`);
    }
  }, []);

  // Read hash on mount + listen for popstate (browser back/forward)
  useEffect(() => {
    setTabState(getTabFromHash());
    const onHashChange = () => setTabState(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    window.addEventListener('popstate', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('popstate', onHashChange);
    };
  }, []);
  const [confessionText, setConfessionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [salvation, setSalvation] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [stats, setStats] = useState({ confessions: 0, sinners: 0, onChain: 0 });
  const [displayStats, setDisplayStats] = useState({ confessions: 0, sinners: 0, onChain: 0 });
  const salvationRef = useRef<HTMLDivElement>(null);

  // Fetch real stats from API
  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => {
        setStats({
          confessions: d.totalConfessions || 0,
          sinners: d.totalSinners || 0,
          onChain: d.onChainCount || 0,
        });
      })
      .catch(() => {});
  }, []);

  // Animate counter when stats change
  useEffect(() => {
    if (stats.confessions === 0 && stats.sinners === 0) return;
    const dur = 1800, start = performance.now();
    const anim = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplayStats({
        confessions: Math.floor(stats.confessions * e),
        sinners: Math.floor(stats.sinners * e),
        onChain: Math.floor(stats.onChain * e),
      });
      if (p < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }, [stats]);

  useEffect(() => {
    if (isConnected && tab === 'profile') {
      setProfileLoading(true);
      fetch('/api/profile').then((r) => r.json()).then((d) => {
        setProfile(d.user);
      }).finally(() => setProfileLoading(false));
    }
  }, [isConnected, tab]);

  const submitConfession = async () => {
    if (!isConnected) { toast('Connect wallet first'); return; }
    const text = confessionText.trim();
    if (text.length < 10) { toast('Too short. Surely your sins run deeper.'); return; }

    setLoading(true); setSalvation(null);
    try {
      const res = await fetch('/api/confess', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confession: text }),
      });
      const data = await res.json();
      setSalvation(data.ai);
      setTimeout(() => salvationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    } catch { toast('Father Degen is meditating. Try again.'); }
    setLoading(false);
  };

  const shareToTwitter = () => {
    if (!salvation) return;
    const t = `⛪ I confessed my crypto sins on ConfessAI\n\nSin: ${salvation.sinCategory}\nSeverity: ${salvation.sinLevel}\n\nhttps://confessai.fun\n\n$CONFESS`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`, '_blank');
  };

  return (
    <>
      <Navbar activeTab={tab} onTabChange={setTab} />

      {/* ===== HOME ===== */}
      {tab === 'home' && (
        <>
          {/* Hero */}
          <section className="min-h-[85vh] md:min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-20 md:pt-32 pb-16 md:pb-20 relative">
            <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(255,45,45,0.15),transparent_70%)] pointer-events-none opacity-40" />
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-elevated border border-gray-600 rounded-full text-sm text-gray-300 font-medium mb-10 animate-fade-up">
              <span className="w-2 h-2 bg-accent rounded-full animate-blink" /> Live on Base · confessai.fun
            </div>
            <h1 className="font-display text-[clamp(48px,8vw,96px)] leading-none text-white mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              CONFESS YOUR<br /><span className="text-accent">CRYPTO SINS</span>
            </h1>
            <p className="text-[clamp(16px,2vw,20px)] text-gray-400 max-w-xl mb-12 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              The on-chain confessional for degens. An AI priest judges your worst trades, assigns your penance, and lets the community baptize your sins with ETH. Every confession is permanent. No edits. No deletes. No mercy.
            </p>
            <div className="flex gap-3 sm:gap-4 flex-col sm:flex-row justify-center animate-fade-up w-full sm:w-auto px-4 sm:px-0" style={{ animationDelay: '0.3s' }}>
              <button onClick={() => setTab('confess')} className="bg-accent text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30 transition-all">
                ⛪ Enter the Confessional
              </button>
              <button onClick={() => setTab('leaderboard')} className="border border-gray-600 text-gray-300 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-semibold text-sm sm:text-base hover:border-gray-400 hover:text-white hover:-translate-y-0.5 transition-all">
                🕊 Baptism Leaderboard
              </button>
            </div>
          </section>

          {/* Stats */}
          <section className="py-12 md:py-20 border-t border-gray-800/50">
            <div className="flex justify-center gap-8 md:gap-16 max-w-5xl mx-auto px-4 sm:px-6 max-sm:flex-col max-sm:gap-6 max-sm:items-center">
              <div className="text-center group">
                <div className="font-mono text-4xl md:text-6xl font-bold text-white mb-2 tabular-nums tracking-tight">
                  {displayStats.confessions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">Confessions</div>
              </div>
              <div className="hidden sm:block w-px h-20 bg-gradient-to-b from-transparent via-gray-700 to-transparent" />
              <div className="text-center group">
                <div className="font-mono text-4xl md:text-6xl font-bold text-accent mb-2 tabular-nums tracking-tight">
                  {displayStats.sinners.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">Sinners Judged</div>
              </div>
              <div className="hidden sm:block w-px h-20 bg-gradient-to-b from-transparent via-gray-700 to-transparent" />
              <div className="text-center group">
                <div className="font-mono text-4xl md:text-6xl font-bold mb-2 tabular-nums tracking-tight text-green-400">
                  {displayStats.onChain.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> On-Chain
                </div>
              </div>
            </div>
          </section>

          {/* 7 Sins */}
          <section className="py-12 md:py-20 border-t border-gray-800/50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
              <div className="font-mono text-xs text-accent uppercase tracking-[3px] text-center mb-4">Categories of Sin</div>
              <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white text-center mb-16">The 7 Deadly Sins of Crypto</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SINS.map((sin) => (
                  <div
                    key={sin.name}
                    className={`bg-gradient-to-br ${sin.gradient} border ${sin.border} rounded-xl p-4 sm:p-6 hover:shadow-xl ${sin.glow} hover:scale-[1.03] transition-all duration-300 cursor-pointer group`}
                    onClick={() => setTab('wall')}
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sin.gradient} border ${sin.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 overflow-hidden`}>
                      <img src={sin.icon} alt={sin.name} width={32} height={32} />
                    </div>
                    <div className="font-display text-base text-white mb-2">{sin.name}</div>
                    <p className="text-xs text-gray-400 leading-relaxed">{sin.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="py-12 md:py-20 border-t border-gray-800/50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="font-mono text-xs text-accent uppercase tracking-[3px] text-center mb-4">How It Works</div>
              <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white text-center mb-16">Confess → Get Judged → Get Baptized</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {STEPS.map((step) => (
                  <div key={step.num} className="bg-card border border-gray-800 rounded-xl p-8 relative">
                    <div className="font-mono text-5xl text-accent/15 absolute top-5 right-6">{step.num}</div>
                    <div className="font-display text-lg text-white mb-2">{step.title}</div>
                    <p className="text-sm text-gray-400">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Token */}
          <section id="token" className="py-12 md:py-20 border-t border-gray-800/50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <div className="font-mono text-xs text-yellow-400 uppercase tracking-[3px] mb-4">Baptism Economy</div>
              <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white mb-6">🕊 Baptize & Be Saved</h2>
              <p className="text-gray-400 max-w-lg mx-auto mb-6">See a confession that hits too close to home? Baptize it. Send ETH directly to the Church of $CONFESS and your offering is recorded on-chain forever.</p>
              <p className="text-gray-500 max-w-lg mx-auto mb-10 text-sm">Top donors climb the Baptism Leaderboard. The bigger the offering, the faster the salvation. Father Degen is always watching.</p>
              <div className="flex gap-3 sm:gap-4 justify-center flex-col sm:flex-row px-4 sm:px-0">
                <button onClick={() => setTab('wall')} className="inline-flex justify-center bg-accent text-white px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30 transition-all">
                  ⛪ Start Confessing
                </button>
                <button onClick={() => setTab('leaderboard')} className="inline-flex justify-center border border-yellow-500/30 text-yellow-400 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-bold text-sm sm:text-base hover:bg-yellow-500/10 hover:-translate-y-0.5 transition-all">
                  🕊 View Leaderboard
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ===== CONFESS ===== */}
      {tab === 'confess' && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 pt-20 md:pt-32 pb-24 md:pb-20">
          <div className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">The Confessional</div>
          <h2 className="font-display text-2xl text-white mb-2">⛪ The Confessional</h2>
          <p className="text-gray-500 text-sm mb-8">Father Degen is listening. Unburden your soul, sinner.</p>

          {isConnected ? (
            <>
              <textarea
                className="w-full min-h-[140px] bg-bg border border-gray-600 rounded-lg p-4 text-gray-100 font-body text-sm resize-y leading-relaxed placeholder:text-gray-600 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors"
                value={confessionText}
                onChange={(e) => setConfessionText(e.target.value)}
                placeholder={"Forgive me Father, for I have sinned...\n\nTell us about your worst trade, your biggest cope, your most degen moment..."}
                maxLength={500}
              />
              <div className="text-right text-xs text-gray-600 font-mono mt-2">{confessionText.length}/500</div>
              <button
                onClick={submitConfession}
                disabled={loading}
                className="w-full mt-5 bg-accent text-white py-4 rounded-lg font-bold text-base relative transition-all hover:shadow-lg hover:shadow-accent/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Father Degen is judging...
                  </span>
                ) : (
                  '⛪ Confess Your Sin'
                )}
              </button>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-5">Connect your wallet to enter the confessional.<br />Your sins await judgment.</p>
              <ConnectButton />
            </div>
          )}

          {salvation && (
            <div ref={salvationRef} className="mt-8 bg-bg border border-accent/30 rounded-xl p-8 animate-fade-up">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-accent rounded-full flex items-center justify-center text-xl">⛪</div>
                <div>
                  <div className="font-display text-base text-white">Father Degen</div>
                  <div className="text-xs text-gray-500">AI Priest · Church of $CONFESS</div>
                </div>
              </div>
              <div className="flex gap-2 mb-5">
                <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold uppercase bg-accent/15 text-accent border border-accent/30">{salvation.sinCategory}</span>
                <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold uppercase bg-white/5 text-gray-300 border border-gray-600">{salvation.sinLevel}</span>
              </div>
              <p className="text-gray-200 leading-relaxed mb-5">{salvation.response}</p>
              <div className="bg-card border-l-[3px] border-accent p-4 rounded-r-lg mb-5">
                <div className="font-mono text-[11px] text-accent uppercase tracking-widest mb-1">Your Penance</div>
                <div className="text-sm text-gray-300">{salvation.penance}</div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <button onClick={shareToTwitter} className="border border-accent text-accent px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-accent hover:text-white transition-all">Share on 𝕏</button>
                <button onClick={() => { setSalvation(null); setConfessionText(''); }} className="border border-gray-600 text-gray-300 px-6 py-2.5 rounded-full text-sm font-semibold hover:border-white hover:text-white transition-all">Confess Again</button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ===== WALL (Enhanced) ===== */}
      {tab === 'wall' && (
        <FeedSection
          title="The Wall of Sin"
          subtitle="Public Confessions"
          isConnected={isConnected}
          onNavigateConfess={() => setTab('confess')}
        />
      )}

      {/* ===== MY SINS ===== */}
      {tab === 'mysins' && (
        isConnected ? (
          <FeedSection
            title="My Confessions"
            subtitle="Your Sin Ledger"
            isMine
            isConnected={isConnected}
            onNavigateConfess={() => setTab('confess')}
          />
        ) : (
          <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 md:pt-32 pb-24 md:pb-20">
            <div className="bg-card border border-gray-800 rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <p className="text-gray-500 mb-5">Connect your wallet to view your confessions.</p>
              <ConnectButton />
            </div>
          </section>
        )
      )}

      {/* ===== MY BAPTISMS ===== */}
      {tab === 'mybaptisms' && isConnected && (
        <MyBaptismsTab onNavigateConfess={() => setTab('wall')} />
      )}

      {/* ===== LEADERBOARD ===== */}
      {tab === 'leaderboard' && <LeaderboardTab />}

      {/* ===== CHAT ===== */}
      {tab === 'chat' && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 pt-20 md:pt-32 pb-24 md:pb-20">
          <div className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">Private Session</div>
          <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white mb-16">Chat with Father Degen</h2>
          {isConnected ? <ChatPanel /> : (
            <div className="bg-card border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 mb-5">Connect your wallet to speak with Father Degen privately.</p>
              <ConnectButton />
            </div>
          )}
        </section>
      )}

      {/* ===== PROFILE ===== */}
      {tab === 'profile' && isConnected && address && (
        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 md:pt-32 pb-24 md:pb-20">
          {profileLoading ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="w-10 h-10 border-[3px] border-gray-700 border-t-accent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Loading profile...</span>
            </div>
          ) : (
            <>
              <div className="bg-card border border-gray-800 rounded-xl p-5 sm:p-8 md:p-10 mb-8">
                <div className="flex items-center gap-4 sm:gap-6 max-sm:flex-col max-sm:text-center">
                  <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center text-4xl shrink-0">😈</div>
                  <div className="flex-1">
                    <div className="font-display text-2xl text-white mb-1">{profile?.username || trunc(address)}</div>
                    <div className="font-mono text-sm text-gray-500 mb-4">{trunc(address)}</div>
                    <div className="flex gap-4 sm:gap-6 max-sm:justify-center flex-wrap">
                      <div className="text-center">
                        <div className="font-mono text-xl sm:text-2xl text-accent">{profile?.sinScore || 0}</div>
                        <div className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider">Sin Score</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-xl sm:text-2xl text-white">{profile?.totalConfessions || 0}</div>
                        <div className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider">Confessions</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-xl sm:text-2xl text-yellow-400">{(profile?.totalDonated || 0).toFixed(4)}</div>
                        <div className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider">ETH Donated</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-xl sm:text-2xl text-green-400">{(profile?.totalEarned || 0).toFixed(4)}</div>
                        <div className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider">ETH Earned</div>
                      </div>
                      <div className="text-center cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setTab('mybaptisms')}>
                        <div className="font-mono text-xl sm:text-2xl text-gray-300">{profile?.donationCount || 0}</div>
                        <div className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-wider underline decoration-dotted">Baptisms →</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sin Score Breakdown */}
                {profile?.sinScore > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <div className="font-mono text-[11px] text-gray-500 uppercase tracking-widest mb-3">Sin Level</div>
                    <div className="w-full h-3 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min((profile.sinScore / 500) * 100, 100)}%`,
                          background: profile.sinScore > 300
                            ? 'linear-gradient(90deg, #ff2d2d, #ff0000)'
                            : profile.sinScore > 100
                              ? 'linear-gradient(90deg, #ff8c00, #ff2d2d)'
                              : 'linear-gradient(90deg, #ffd700, #ff8c00)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-600">
                      <span>Saint</span>
                      <span>Sinner</span>
                      <span>Damned</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="flex flex-col gap-3">
                <a
                  href={`/user/${profile?.id}`}
                  className="w-full bg-card border border-gray-800 rounded-xl p-5 flex items-center justify-between hover:border-gray-600 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">👤</span>
                    <div className="text-left">
                      <div className="text-white font-medium text-sm">View Public Profile</div>
                      <div className="text-gray-500 text-xs">See how others see you • Share your profile</div>
                    </div>
                  </div>
                  <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
                </a>
                <button
                  onClick={() => setTab('mysins')}
                  className="w-full bg-card border border-gray-800 rounded-xl p-5 flex items-center justify-between hover:border-gray-600 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📜</span>
                    <div className="text-left">
                      <div className="text-white font-medium text-sm">View My Confessions</div>
                      <div className="text-gray-500 text-xs">{profile?.totalConfessions || 0} confessions • Filter by category</div>
                    </div>
                  </div>
                  <span className="text-gray-500 group-hover:text-white transition-colors">→</span>
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 md:py-12 px-4 sm:px-6 text-center border-t border-gray-800 pb-20 md:pb-12">
        <div className="flex justify-center gap-4 sm:gap-8 mb-6 flex-wrap">
          {['𝕏 Twitter', 'Telegram', 'Flaunch'].map((l) => (
            <a key={l} href="#" className="text-sm text-gray-500 hover:text-white transition-colors">{l}</a>
          ))}
          <a href="/onchain" className="text-sm text-green-500 hover:text-green-400 transition-colors">⛓ On-Chain Viewer</a>
        </div>
        <p className="text-xs text-gray-600">© 2026 ConfessAI — All sins recorded on Base. No edits. No deletes. No salvation guaranteed. confessai.fun</p>
      </footer>
    </>
  );
}
