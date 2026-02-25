'use client';

import { useState } from 'react';
import { useWallet } from './WalletProvider';

function timeAgo(d: string) {
  const sec = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function trunc(addr: string) { return addr.slice(0, 6) + '...' + addr.slice(-4); }

const SIN_ICONS: Record<string, string> = {
  Greed: '/greed_icon.png', FOMO: '/fomo_icon.png', Wrath: '/wrath_icon.png',
  Sloth: '/sloth_icon.png', Pride: '/pride_icon.png', Lust: '/lust_icon.png', Cope: '/cope_icon.png',
};

const CHURCH_WALLET = process.env.NEXT_PUBLIC_CHURCH_WALLET || '';

export default function FeedCard({ confession: c, onRefresh }: { confession: any; onRefresh?: () => void }) {
  const { isConnected, address } = useWallet();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [liked, setLiked] = useState(c.userLiked || false);
  const [likeCount, setLikeCount] = useState(c.likesCount);
  const [liking, setLiking] = useState(false);

  // Baptize state
  const [showBaptize, setShowBaptize] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [donating, setDonating] = useState(false);
  const [donated, setDonated] = useState(c.totalDonated || 0);
  const [donateCount, setDonateCount] = useState(c.donationCount || 0);

  const displayName = c.user?.username || (c.user?.walletAddress ? trunc(c.user.walletAddress) : 'Anon');

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/comments?confessionId=${c.id}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {}
    setCommentsLoading(false);
  };

  const toggleComments = () => {
    if (!showComments) loadComments();
    setShowComments(!showComments);
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
        body: JSON.stringify({ confessionId: c.id }),
      });
    } catch {
      setLiked(liked);
      setLikeCount(likeCount);
    }
    setLiking(false);
  };

  const postComment = async () => {
    if (!isConnected || !commentText.trim() || posting) return;
    setPosting(true);
    try {
      await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confessionId: c.id, text: commentText }),
      });
      setCommentText('');
      await loadComments();
    } catch {}
    setPosting(false);
  };

  const handleBaptize = async () => {
    if (!isConnected || !donateAmount || donating) return;
    const amount = parseFloat(donateAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (!CHURCH_WALLET) {
      alert('Church wallet not configured');
      return;
    }

    setDonating(true);
    try {
      // Send ETH on-chain via MetaMask
      const weiHex = '0x' + BigInt(Math.floor(amount * 1e18)).toString(16);

      const txHash = await window.ethereum!.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: CHURCH_WALLET,
          value: weiHex,
        }],
      });

      // Record donation in DB
      await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confessionId: c.id,
          amount,
          txHash,
        }),
      });

      setDonated(donated + amount);
      setDonateCount(donateCount + 1);
      setDonateAmount('');
      setShowBaptize(false);
      onRefresh?.();
    } catch (err: any) {
      if (err?.code !== 4001) {
        console.error('Baptize error:', err);
      }
    }
    setDonating(false);
  };

  const share = () => {
    const t = `⛪ Someone confessed on @ConfessAI:\n\n"${c.confessionText.slice(0, 100)}..."\n\nVerdict: ${c.sinCategory} — ${c.sinLevel}\n\nhttps://confessai.fun/confession/${c.id}\n\n$CONFESS`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`, '_blank');
  };

  return (
    <div id={`confession-${c.id}`} className="bg-card border border-gray-800 rounded-xl p-7 transition-all hover:border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">{SIN_ICONS[c.sinCategory] ? <img src={SIN_ICONS[c.sinCategory]} alt="" width={18} height={18} /> : <span className="text-xs">😈</span>}</div>
          <span className="font-mono text-sm text-gray-400">{displayName}</span>
          {c.user?.sinScore > 0 && <span className="font-mono text-xs text-accent">🔥 {c.user.sinScore}</span>}
        </div>
        <div className="flex items-center gap-3">
          {c.chainStatus === 'confirmed' && c.txHash && (
            <a
              href={`https://basescan.org/tx/${c.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded-full text-[10px] font-mono text-green-400 hover:bg-green-500/20 transition-colors"
            >
              ⛓ ON-CHAIN
            </a>
          )}
          {c.chainStatus === 'pending' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-[10px] font-mono text-yellow-400">
              ⏳ PENDING
            </span>
          )}
          <a href={`/confession/${c.id}`} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{timeAgo(c.createdAt)}</a>
        </div>
      </div>

      {/* Confession */}
      <a href={`/confession/${c.id}`} className="block text-gray-100 mb-4 leading-relaxed hover:text-white transition-colors">{c.confessionText}</a>

      {/* Badges */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 inline-flex items-center gap-1.5">
          {SIN_ICONS[c.sinCategory] && <img src={SIN_ICONS[c.sinCategory]} alt="" width={14} height={14} className="inline-block" />}
          {c.sinCategory}
        </span>
        <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-white/5 text-gray-300 border border-gray-600">
          {c.sinLevel}
        </span>
        {/* Donation badge */}
        {donated > 0 && (
          <span className="px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold uppercase tracking-wider bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
            🕊 {donated.toFixed(4)} ETH baptized
          </span>
        )}
      </div>

      {/* AI Response */}
      <div className="bg-bg border-l-2 border-accent p-4 rounded-r-lg mb-4">
        <div className="font-mono text-[11px] text-accent uppercase tracking-widest mb-2">⛪ Father Degen</div>
        <p className="text-sm text-gray-300 leading-relaxed">{c.aiResponse}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-5 items-center flex-wrap">
        <button
          onClick={handleLike}
          disabled={liking}
          className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? 'text-accent' : 'text-gray-500 hover:text-gray-300'} ${liking ? 'opacity-50' : ''}`}
        >
          {liked ? '❤️' : '🤍'} {likeCount}
        </button>
        <button onClick={toggleComments} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          💬 {c.commentsCount}
        </button>
        <button onClick={share} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ↗ Share
        </button>
        {/* Baptize button */}
        {isConnected && (
          <button
            onClick={() => setShowBaptize(!showBaptize)}
            className="flex items-center gap-1.5 text-sm text-yellow-400 hover:text-yellow-300 transition-colors ml-auto"
          >
            🕊 Baptize {donateCount > 0 && `(${donateCount})`}
          </button>
        )}
      </div>

      {/* Baptize Panel */}
      {showBaptize && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/20 rounded-lg p-5">
            <div className="font-mono text-[11px] text-yellow-400 uppercase tracking-widest mb-3">
              🕊 Church of $CONFESS — Baptism Offering
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Donate ETH to the Church to baptize this sinner. The bigger the offering, the greater the salvation. All donations are on-chain and visible to the congregation.
            </p>
            <div className="flex gap-2 mb-3">
              {[0.001, 0.005, 0.01, 0.05].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setDonateAmount(amt.toString())}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                    donateAmount === amt.toString()
                      ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  {amt} ETH
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.001"
                min="0.0001"
                className="flex-1 bg-bg border border-gray-600 rounded-lg px-4 py-2.5 text-sm text-gray-100 font-mono focus:outline-none focus:border-yellow-500"
                placeholder="Custom amount (ETH)"
                value={donateAmount}
                onChange={(e) => setDonateAmount(e.target.value)}
              />
              <button
                onClick={handleBaptize}
                disabled={donating || !donateAmount || parseFloat(donateAmount) <= 0}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-6 py-2.5 rounded-lg text-sm font-bold hover:shadow-lg hover:shadow-yellow-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {donating ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Baptizing...
                  </span>
                ) : (
                  '🕊 Baptize'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          {commentsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-accent rounded-full animate-spin" />
              <span className="text-xs text-gray-500">Loading comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-600 py-2">No comments yet.</p>
          ) : (
            comments.map((cm: any) => (
              <div key={cm.id} className="py-3">
                <div className="font-mono text-[11px] text-gray-500 mb-1">
                  {cm.user?.username || (cm.user?.walletAddress ? trunc(cm.user.walletAddress) : 'Anon')}
                </div>
                <div className="text-sm text-gray-300">{cm.commentText}</div>
              </div>
            ))
          )}
          {isConnected && (
            <div className="flex gap-2 mt-3">
              <input
                className="flex-1 bg-bg border border-gray-600 rounded-full px-4 py-2.5 text-sm text-gray-100 font-body focus:outline-none focus:border-accent"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && postComment()}
                disabled={posting}
              />
              <button
                onClick={postComment}
                disabled={posting || !commentText.trim()}
                className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-accent/20 transition-all disabled:opacity-40"
              >
                {posting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Post'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
