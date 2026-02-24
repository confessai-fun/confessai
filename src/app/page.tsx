'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWallet } from '@/components/WalletProvider';
import ConnectButton from '@/components/ConnectButton';
import Navbar from '@/components/Navbar';
import FeedCard from '@/components/FeedCard';
import ChatPanel from '@/components/ChatPanel';
import { useToast } from '@/components/Toast';

const SINS = [
  { icon: '/greed_icon.png', name: 'Greed', desc: '"I knew it was a rug but the APY was 40,000%"' },
  { icon: '/fomo_icon.png', name: 'FOMO', desc: '"A guy on Twitter said it\'s going to $1 so I sold my car"' },
  { icon: '/wrath_icon.png', name: 'Wrath', desc: '"I mass reported the dev\'s Twitter after getting rugged"' },
  { icon: '/sloth_icon.png', name: 'Sloth', desc: '"Too lazy to revoke approvals. Got drained 3 times."' },
  { icon: '/pride_icon.png', name: 'Pride', desc: '"I told everyone I sold the top. I absolutely did not."' },
  { icon: '/lust_icon.png', name: 'Lust', desc: '"I bought a token because the dev was attractive"' },
  { icon: '/cope_icon.png', name: 'Cope', desc: '"It\'s not a loss if I don\'t sell" - me, down 97%' },
];

const STEPS = [
  { num: '01', title: 'Connect Your Wallet', desc: 'Sign in with Ethereum. Anonymous by default.' },
  { num: '02', title: 'Confess Your Sins', desc: 'Tell Father Degen about your worst trades and degen moments.' },
  { num: '03', title: 'Receive Salvation', desc: 'AI priest analyzes your sin and prescribes penance.' },
  { num: '04', title: 'Join the Wall of Sin', desc: 'Community reacts, comments, and shares.' },
];

const SORT_OPTIONS = [
  { id: 'recent', label: '🕐 Recent', desc: 'Newest first' },
  { id: 'trending', label: '🔥 Trending', desc: 'Most engagement' },
  { id: 'sinful', label: '😈 Most Sinful', desc: 'Worst sins first' },
];

const SIN_CATEGORIES = ['Greed', 'FOMO', 'Wrath', 'Sloth', 'Pride', 'Lust', 'Cope'];
const SIN_EMOJIS: Record<string, string> = {
  Greed: '🤑', FOMO: '😱', Wrath: '😤', Sloth: '🦥', Pride: '👑', Lust: '😍', Cope: '🧘',
};

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
    <section className="max-w-3xl mx-auto px-6 pt-32 pb-20">
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
              {SIN_EMOJIS[cat]} {cat}
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

export default function Home() {
  const { address, isConnected } = useWallet();
  const toast = useToast();

  const [tab, setTab] = useState('home');
  const [confessionText, setConfessionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [salvation, setSalvation] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [stats, setStats] = useState({ c: 0, s: 0 });
  const salvationRef = useRef<HTMLDivElement>(null);

  // Animate hero stats
  useEffect(() => {
    const dur = 2000, start = performance.now();
    const anim = (now: number) => {
      const p = Math.min((now - start) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      setStats({ c: Math.floor(1247 * e), s: Math.floor(842 * e) });
      if (p < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }, []);

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
    const t = `⛪ I confessed my crypto sins at confessai.fun\n\nSin: ${salvation.sinCategory}\nSeverity: ${salvation.sinLevel}\n\nhttps://confessai.fun\n\n$CONF`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`, '_blank');
  };

  return (
    <>
      <Navbar activeTab={tab} onTabChange={setTab} />

      {/* ===== HOME ===== */}
      {tab === 'home' && (
        <>
          {/* Hero */}
          <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 relative">
            <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(255,45,45,0.15),transparent_70%)] pointer-events-none opacity-40" />
            {/* <div className="inline-flex items-center gap-2 px-5 py-2 bg-elevated border border-gray-600 rounded-full text-sm text-gray-300 font-medium mb-10 animate-fade-up">
              <span className="w-2 h-2 bg-accent rounded-full animate-blink" /> Live on Base
            </div> */}
            <h1 className="font-display text-[clamp(48px,8vw,96px)] leading-none text-white mb-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
              CONFESS YOUR<br /><span className="text-accent">CRYPTO SINS</span>
            </h1>
            <p className="text-[clamp(16px,2vw,20px)] text-gray-400 max-w-xl mb-12 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              The anonymous confessional for degens. An AI priest judges your worst trades, assigns your penance, and grants salvation. Maybe.
            </p>
            <div className="flex gap-4 flex-wrap justify-center animate-fade-up" style={{ animationDelay: '0.3s' }}>
              <button onClick={() => setTab('confess')} className="bg-accent text-white px-10 py-4 rounded-full font-bold text-base hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30 transition-all">
                ⛪ Enter the Confessional
              </button>
              <a href="#token" className="border border-gray-600 text-gray-300 px-10 py-4 rounded-full font-semibold text-base hover:border-gray-400 hover:text-white hover:-translate-y-0.5 transition-all">
                Buy $CONF
              </a>
            </div>
          </section>

          {/* Stats */}
          <section className="py-20 border-t border-gray-800/50">
            <div className="flex justify-center gap-20 max-w-4xl mx-auto px-6 max-md:flex-col max-md:gap-10 max-md:items-center">
              <div className="text-center">
                <div className="font-mono text-5xl text-white mb-2">{stats.c.toLocaleString()}</div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">Confessions Recorded</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-5xl text-accent mb-2">{stats.s.toLocaleString()}</div>
                <div className="text-sm text-gray-500 uppercase tracking-wider">Sinners Judged</div>
              </div>
            </div>
          </section>

          {/* 7 Sins */}
          <section className="py-20 border-t border-gray-800/50">
            <div className="max-w-5xl mx-auto px-6">
              <div className="font-mono text-xs text-accent uppercase tracking-[3px] text-center mb-4">Categories of Sin</div>
              <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white text-center mb-16">The Seven Deadly Sins of Crypto</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SINS.map((sin) => (
                  <div key={sin.name} className="bg-card border border-gray-800 rounded-xl p-6 hover:border-accent/30 transition-all group cursor-pointer" onClick={() => { setTab('wall'); }}>
                    <img src={sin.icon} className="text-3xl mb-3 group-hover:scale-110 transition-transform" alt={sin.name} />
                    <div className="font-display text-base text-white mb-2">{sin.name}</div>
                    <p className="text-xs text-gray-500">{sin.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="py-20 border-t border-gray-800/50">
            <div className="max-w-4xl mx-auto px-6">
              <div className="font-mono text-xs text-accent uppercase tracking-[3px] text-center mb-4">How It Works</div>
              <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white text-center mb-16">Path to Salvation</h2>
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
          <section id="token" className="py-20 border-t border-gray-800/50">
            <div className="max-w-3xl mx-auto px-6 text-center">
              <div className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">The Token</div>
              <h2 className="font-display text-[clamp(28px,4vw,44px)] text-white mb-6">$CONF</h2>
              <p className="text-gray-400 max-w-lg mx-auto mb-10">The currency of sin. Every confession is recorded on Base. Your sins are immutable, your penance is eternal.</p>
              <a href="#" className="inline-flex bg-accent text-white px-10 py-4 rounded-full font-bold text-base hover:-translate-y-0.5 hover:shadow-xl hover:shadow-accent/30 transition-all">
                Buy on Flaunch →
              </a>
            </div>
          </section>
        </>
      )}

      {/* ===== CONFESS ===== */}
      {tab === 'confess' && (
        <section className="max-w-2xl mx-auto px-6 pt-32 pb-20">
          <div className="font-mono text-xs text-accent uppercase tracking-[3px] mb-4">The Confessional</div>
          <h2 className="font-display text-2xl text-white mb-2">⛪ The Confessional</h2>
          <p className="text-gray-500 text-sm mb-8">Father Degen is listening. What have you done?</p>

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
                  <div className="text-xs text-gray-500">AI Priest · Church of $CONF</div>
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
          <section className="max-w-3xl mx-auto px-6 pt-32 pb-20">
            <div className="bg-card border border-gray-800 rounded-xl p-12 text-center">
              <div className="text-4xl mb-4">🔒</div>
              <p className="text-gray-500 mb-5">Connect your wallet to view your confessions.</p>
              <ConnectButton />
            </div>
          </section>
        )
      )}

      {/* ===== CHAT ===== */}
      {tab === 'chat' && (
        <section className="max-w-2xl mx-auto px-6 pt-32 pb-20">
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
        <section className="max-w-3xl mx-auto px-6 pt-32 pb-20">
          {profileLoading ? (
            <div className="flex flex-col items-center gap-3 py-20">
              <div className="w-10 h-10 border-[3px] border-gray-700 border-t-accent rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Loading profile...</span>
            </div>
          ) : (
            <>
              <div className="bg-card border border-gray-800 rounded-xl p-10 mb-8">
                <div className="flex items-center gap-6 max-md:flex-col max-md:text-center">
                  <div className="w-20 h-20 bg-accent rounded-full flex items-center justify-center text-4xl shrink-0">😈</div>
                  <div className="flex-1">
                    <div className="font-display text-2xl text-white mb-1">{profile?.username || trunc(address)}</div>
                    <div className="font-mono text-sm text-gray-500 mb-4">{trunc(address)}</div>
                    <div className="flex gap-8 max-md:justify-center">
                      <div className="text-center">
                        <div className="font-mono text-2xl text-accent">{profile?.sinScore || 0}</div>
                        <div className="text-[11px] text-gray-500 uppercase tracking-wider">Sin Score</div>
                      </div>
                      <div className="text-center">
                        <div className="font-mono text-2xl text-white">{profile?.totalConfessions || 0}</div>
                        <div className="text-[11px] text-gray-500 uppercase tracking-wider">Confessions</div>
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

              {/* Quick link to My Sins */}
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
            </>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 px-6 text-center border-t border-gray-800">
        <div className="flex justify-center gap-8 mb-6">
          {['𝕏 Twitter', 'Telegram', 'Flaunch'].map((l) => (
            <a key={l} href="#" className="text-sm text-gray-500 hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <p className="text-xs text-gray-600">© 2026 Confessai.fun - All sins recorded on-chain. No salvation guaranteed.</p>
      </footer>
    </>
  );
}
