'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/components/WalletProvider';

function timeAgo(d: string) {
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function trunc(addr: string) { return addr ? addr.slice(0, 6) + '...' + addr.slice(-4) : 'Anon'; }

const SIN_COLORS: Record<string, { gradient: string; border: string; icon: string; img: string }> = {
  Greed: { gradient: 'from-yellow-500/20 to-amber-600/20', border: 'border-yellow-500/30', icon: '💰', img: '/greed_icon.png' },
  FOMO: { gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', icon: '📉', img: '/fomo_icon.png' },
  Wrath: { gradient: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30', icon: '🔥', img: '/wrath_icon.png' },
  Sloth: { gradient: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', icon: '💤', img: '/sloth_icon.png' },
  Pride: { gradient: 'from-purple-500/20 to-violet-500/20', border: 'border-purple-500/30', icon: '👑', img: '/pride_icon.png' },
  Lust: { gradient: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30', icon: '💋', img: '/lust_icon.png' },
  Cope: { gradient: 'from-teal-500/20 to-cyan-500/20', border: 'border-teal-500/30', icon: '🧠', img: '/cope_icon.png' },
};

const CHURCH_WALLET = process.env.NEXT_PUBLIC_CHURCH_WALLET || '';

export default function ConfessionPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { isConnected, address } = useWallet();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Baptize
  const [showBaptize, setShowBaptize] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [donating, setDonating] = useState(false);

  // Like
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  // Comment
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetch(`/api/confession/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setData(d);
          setLikeCount(d.confession?.likesCount || 0);
        }
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const reload = () => {
    fetch(`/api/confession/${id}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setData(d); });
  };

  const handleLike = async () => {
    if (!isConnected || liking) return;
    setLiking(true);
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    try {
      await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confessionId: id }),
      });
    } catch {
      setLiked(!liked);
      setLikeCount(liked ? likeCount : likeCount - 1);
    }
    setLiking(false);
  };

  const handleComment = async () => {
    if (!commentText.trim() || posting) return;
    setPosting(true);
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confessionId: id, text: commentText }),
      });
      setCommentText('');
      reload();
    } catch {}
    setPosting(false);
  };

  const ensureBaseNetwork = async (): Promise<boolean> => {
    try {
      const chainId = await window.ethereum!.request({ method: 'eth_chainId' });
      if (chainId === '0x2105') return true;
      try {
        await window.ethereum!.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
        return true;
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
          return true;
        }
        return false;
      }
    } catch { return false; }
  };

  const handleBaptize = async (amt: string) => {
    if (!window.ethereum || !isConnected || donating) return;
    const val = parseFloat(amt);
    if (!val || val <= 0) return;
    setDonating(true);
    try {
      const onBase = await ensureBaseNetwork();
      if (!onBase) {
        alert('Please switch to Base network in MetaMask to baptize.');
        setDonating(false);
        return;
      }

      const ownerWallet = c.user?.walletAddress;
      const isSelfBaptize = !ownerWallet || ownerWallet.toLowerCase() === address?.toLowerCase();

      let txHashChurch = '';
      let txHashOwner = '';

      if (isSelfBaptize) {
        const fullWei = '0x' + BigInt(Math.round(val * 1e18)).toString(16);
        txHashChurch = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from: address, to: CHURCH_WALLET, value: fullWei, chainId: '0x2105' }],
        });
        txHashOwner = txHashChurch;
      } else {
        const halfWei = '0x' + BigInt(Math.round((val / 2) * 1e18)).toString(16);
        txHashChurch = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{ from: address, to: CHURCH_WALLET, value: halfWei, chainId: '0x2105' }],
        });
        await ensureBaseNetwork();
        try {
          txHashOwner = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [{ from: address, to: ownerWallet, value: halfWei, chainId: '0x2105' }],
          });
        } catch {
          console.warn('Owner tx failed, recording church-only');
          txHashOwner = '';
        }
      }

      await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confessionId: id,
          amount: txHashOwner ? val : val / 2,
          txHashChurch,
          txHashOwner: txHashOwner || txHashChurch,
        }),
      });
      setShowBaptize(false);
      setDonateAmount('');
      reload();
    } catch (e: any) {
      console.error('Baptize error:', e);
    }
    setDonating(false);
  };

  const shareTwitter = () => {
    if (!data?.confession) return;
    const c = data.confession;
    const icon = SIN_COLORS[c.sinCategory]?.icon || '⛪';
    const text = `${icon} I confessed my crypto sin on @ConfessAI\n\n"${c.confessionText.slice(0, 100)}${c.confessionText.length > 100 ? '...' : ''}"\n\n⛪ Father Degen judged me: ${c.sinCategory} — ${c.sinLevel}\n\nConfess yours → confessai.fun/confession/${c.id}\n\n$CONFESS`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-gray-700 border-t-accent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Loading confession...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.confession) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😈</div>
          <h1 className="font-display text-2xl text-white mb-2">Sin Not Found</h1>
          <p className="text-gray-500 mb-6">This confession doesn't exist or has been lost to the void.</p>
          <button onClick={() => router.push('/')} className="bg-accent text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-red-600 transition-colors">
            ← Back to Wall of Sin
          </button>
        </div>
      </div>
    );
  }

  const c = data.confession;
  const sinStyle = SIN_COLORS[c.sinCategory] || SIN_COLORS.Greed;
  const displayName = c.user?.username || trunc(c.user?.walletAddress);

  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/80 backdrop-blur-md border-b border-gray-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <button onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push('/#wall');
          }} className="font-display text-base sm:text-lg text-white hover:text-accent transition-colors">
            ← Back
          </button>
          <button
            onClick={shareTwitter}
            className="text-sm text-gray-400 hover:text-white transition-colors font-mono"
          >
            ↗ Share on 𝕏
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-20">
        {/* Sin category header */}
        <div className={`bg-gradient-to-r ${sinStyle.gradient} border ${sinStyle.border} rounded-xl sm:rounded-2xl p-5 sm:p-8 mb-6`}>
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/30 flex items-center justify-center overflow-hidden shrink-0">
              <img src={sinStyle.img} alt={c.sinCategory} width={28} height={28} className="sm:w-9 sm:h-9" />
            </div>
            <div>
              <div className="flex gap-2 mb-1">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-accent/20 text-accent border border-accent/40">
                  {c.sinCategory}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-white/10 text-white border border-white/20">
                  {c.sinLevel}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                <a href={`/user/${c.user?.id}`} className="font-mono hover:text-accent transition-colors">😈 {displayName}</a>
                {c.user?.sinScore > 0 && <span className="text-accent font-mono text-xs">🔥 {c.user.sinScore}</span>}
                <span>·</span>
                <span>{timeAgo(c.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* The confession text */}
          <p className="text-base sm:text-xl text-white leading-relaxed font-medium">
            &ldquo;{c.confessionText}&rdquo;
          </p>
        </div>

        {/* On-chain status */}
        {c.chainStatus === 'confirmed' && c.txHash && (
          <div className="flex items-center gap-3 mb-6 px-1">
            <a
              href={`https://basescan.org/tx/${c.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-sm font-mono text-green-400 hover:bg-green-500/20 transition-colors"
            >
              ⛓ Permanently on-chain — View on BaseScan →
            </a>
          </div>
        )}

        {/* AI Response */}
        <div className="bg-card border border-gray-800 rounded-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-accent/5 to-transparent border-b border-gray-800 px-6 py-4">
            <div className="font-mono text-xs text-accent uppercase tracking-widest flex items-center gap-2">
              ⛪ Father Degen&apos;s Judgment
            </div>
          </div>
          <div className="px-6 py-5">
            <p className="text-gray-300 leading-relaxed">{c.aiResponse}</p>
          </div>
        </div>

        {/* Actions bar */}
        <div className="bg-card border border-gray-800 rounded-xl px-4 sm:px-6 py-3 sm:py-4 mb-6 flex items-center gap-3 sm:gap-6 flex-wrap">
          <button
            onClick={handleLike}
            disabled={liking || !isConnected}
            className={`flex items-center gap-2 text-sm transition-colors ${liked ? 'text-accent' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {liked ? '❤️' : '🤍'} {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </button>
          <span className="text-gray-600">·</span>
          <span className="text-sm text-gray-500">💬 {data.comments?.length || c.commentsCount || 0} comments</span>
          <span className="text-gray-600">·</span>
          <button onClick={shareTwitter} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            ↗ Share
          </button>
          {isConnected && (
            <button
              onClick={() => setShowBaptize(!showBaptize)}
              className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors ml-auto flex items-center gap-1.5"
            >
              🕊 Baptize {data.donationCount > 0 && `(${data.donationCount})`}
            </button>
          )}
        </div>

        {/* Baptize Panel */}
        {showBaptize && (
          <div className="bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-xl p-6 mb-6">
            <div className="font-mono text-xs text-yellow-400 uppercase tracking-widest mb-4">
              🕊 Church of $CONFESS — Baptism Offering
            </div>
            <div className="flex gap-2 flex-wrap mb-4">
              {['0.001', '0.005', '0.01', '0.05'].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleBaptize(amt)}
                  disabled={donating}
                  className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg font-mono text-sm text-yellow-400 hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                >
                  {amt} ETH
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder="Custom amount..."
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
                className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-4 py-2 font-mono text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 outline-none"
              />
              <button
                onClick={() => handleBaptize(donateAmount)}
                disabled={donating || !donateAmount}
                className="px-5 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black rounded-lg font-bold text-sm hover:shadow-lg hover:shadow-yellow-500/20 transition-all disabled:opacity-50"
              >
                {donating ? 'Baptizing...' : '🕊 Baptize'}
              </button>
            </div>
          </div>
        )}

        {/* Baptisms / Donations */}
        {data.donations?.length > 0 && (
          <div className="bg-card border border-gray-800 rounded-xl overflow-hidden mb-6">
            <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <div className="font-mono text-xs text-yellow-400 uppercase tracking-widest">
                🕊 Baptism Offerings ({data.donationCount})
              </div>
              <div className="font-mono text-sm text-yellow-400">
                {(data.totalDonated || 0).toFixed(4)} ETH total
              </div>
            </div>
            <div className="divide-y divide-gray-800/50">
              {data.donations.map((d: any) => (
                <div key={d.id} className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span className="text-yellow-400 text-sm shrink-0">🕊</span>
                    <a href={`/user/${d.user?.id}`} className="font-mono text-xs sm:text-sm text-gray-300 truncate hover:text-accent transition-colors">
                      {d.user?.username || trunc(d.user?.walletAddress)}
                    </a>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-xs text-gray-500">{timeAgo(d.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="font-mono text-xs sm:text-sm text-yellow-400 font-semibold">{d.amount.toFixed(4)} ETH</span>
                    <a
                      href={`https://basescan.org/tx/${d.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full hover:bg-green-500/20 transition-colors"
                    >
                      ⛓ tx
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="bg-card border border-gray-800 rounded-xl overflow-hidden">
          <div className="border-b border-gray-800 px-6 py-4">
            <div className="font-mono text-xs text-gray-500 uppercase tracking-widest">
              💬 Comments ({data.comments?.length || 0})
            </div>
          </div>

          {/* Comment input */}
          {isConnected && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-800/50">
              <div className="flex gap-2 sm:gap-3">
                <input
                  type="text"
                  placeholder="Drop a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                  maxLength={280}
                  className="flex-1 min-w-0 bg-black/30 border border-gray-700 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-white placeholder-gray-600 focus:border-accent/50 outline-none"
                />
                <button
                  onClick={handleComment}
                  disabled={posting || !commentText.trim()}
                  className="px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {posting ? '...' : 'Post'}
                </button>
              </div>
            </div>
          )}

          {/* Comment list */}
          <div className="divide-y divide-gray-800/50">
            {(data.comments?.length || 0) === 0 ? (
              <div className="px-6 py-8 text-center text-gray-600 text-sm">
                No comments yet. Be the first to judge this sinner.
              </div>
            ) : (
              data.comments.map((cm: any) => (
                <div key={cm.id} className="px-6 py-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <a href={`/user/${cm.user?.id}`} className="font-mono text-xs text-gray-400 hover:text-accent transition-colors">
                      {cm.user?.username || trunc(cm.user?.walletAddress)}
                    </a>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-xs text-gray-600">{timeAgo(cm.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-300">{cm.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
