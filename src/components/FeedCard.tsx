'use client';

import { useState, useEffect } from 'react';
import { useWallet } from './WalletProvider';
import DareCreate from './DareCreate';

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

  // Dare state (shows after successful baptism)
  const [showDare, setShowDare] = useState(false);
  const [lastBaptismTxHash, setLastBaptismTxHash] = useState('');
  const [lastBaptismAmount, setLastBaptismAmount] = useState(0);
  const [baptismStreak, setBaptismStreak] = useState<number | null>(null);

  // Dares on this confession
  const [dares, setDares] = useState<any[]>([]);
  const [daresLoaded, setDaresLoaded] = useState(false);

  const displayName = c.user?.username || (c.user?.walletAddress ? trunc(c.user.walletAddress) : 'Anon');
  const isSelfConfession = c.user?.walletAddress?.toLowerCase() === address?.toLowerCase();

  // Dare count from feed data or loaded dares
  const dareCount = c._count?.dares ?? c.dareCount ?? dares.length;

  const loadComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/comments?confessionId=${c.id}`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {}
    setCommentsLoading(false);
  };

  const loadDares = async () => {
    try {
      const res = await fetch(`/api/dare?type=confession&confessionId=${c.id}`);
      const data = await res.json();
      setDares(data.dares || []);
      setDaresLoaded(true);
    } catch {}
  };

  const toggleComments = () => {
    if (!showComments) {
      loadComments();
      if (!daresLoaded) loadDares();
    }
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

  const handleDareRespond = async (dareId: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch('/api/dare', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dareId, action }),
      });
      if (res.ok && action === 'accept') {
        const dare = dares.find(d => d.id === dareId);
        if (dare) {
          window.location.href = `/?confess&dare=${encodeURIComponent(dare.dareText)}&from=${c.id}#confess`;
        }
      }
      loadDares();
    } catch {}
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

  const handleBaptize = async () => {
    if (!isConnected || !donateAmount || donating) return;
    const amount = parseFloat(donateAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (!CHURCH_WALLET) {
      alert('Church wallet not configured');
      return;
    }

    setDonating(true);
    setShowDare(false);

    try {
      const onBase = await ensureBaseNetwork();
      if (!onBase) {
        alert('Please switch to Base network in MetaMask to baptize.');
        setDonating(false);
        return;
      }

      const halfWei = '0x' + BigInt(Math.floor((amount / 2) * 1e18)).toString(16);

      const confRes = await fetch(`/api/confession/${c.id}`);
      const confData = await confRes.json();
      const ownerWallet = confData?.confession?.user?.walletAddress;
      const isSelfBaptize = !ownerWallet || ownerWallet.toLowerCase() === address?.toLowerCase();

      let txHashChurch = '';
      let txHashOwner = '';

      if (isSelfBaptize) {
        const fullWei = '0x' + BigInt(Math.floor(amount * 1e18)).toString(16);
        txHashChurch = await window.ethereum!.request({
          method: 'eth_sendTransaction',
          params: [{ from: address, to: CHURCH_WALLET, value: fullWei, chainId: '0x2105' }],
        });
        txHashOwner = txHashChurch;
      } else {
        txHashChurch = await window.ethereum!.request({
          method: 'eth_sendTransaction',
          params: [{ from: address, to: CHURCH_WALLET, value: halfWei, chainId: '0x2105' }],
        });

        await ensureBaseNetwork();

        try {
          txHashOwner = await window.ethereum!.request({
            method: 'eth_sendTransaction',
            params: [{ from: address, to: ownerWallet, value: halfWei, chainId: '0x2105' }],
          });
        } catch (tx2Err: any) {
          console.warn('Owner tx failed/rejected, recording church-only donation');
          txHashOwner = '';
        }
      }

      const donateRes = await fetch('/api/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confessionId: c.id,
          amount: txHashOwner ? amount : amount / 2,
          txHashChurch,
          txHashOwner: txHashOwner || txHashChurch,
        }),
      });

      const donateData = await donateRes.json();

      setDonated(donated + (txHashOwner ? amount : amount / 2));
      setDonateCount(donateCount + 1);
      setDonateAmount('');
      setShowBaptize(false);

      if (donateData.streak) {
        setBaptismStreak(donateData.streak);
      }

      // Show dare option (only if not self-baptizing)
      if (!isSelfBaptize) {
        setLastBaptismTxHash(txHashChurch);
        setLastBaptismAmount(txHashOwner ? amount : amount / 2);
        setShowDare(true);
        // DON'T call onRefresh here - it will remount and lose dare state
      } else {
        onRefresh?.();
      }
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
    <div id={`confession-${c.id}`} className="bg-card border border-gray-800 rounded-xl p-4 sm:p-5 md:p-7 transition-all hover:border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">{SIN_ICONS[c.sinCategory] ? <img src={SIN_ICONS[c.sinCategory]} alt="" width={18} height={18} /> : <span className="text-xs">😈</span>}</div>
          <a href={`/user/${c.user?.id}`} className="font-mono text-sm text-gray-400 hover:text-accent transition-colors">{displayName}</a>
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

      {/* Dare origin link - if this confession was made from a dare */}
      {c.confessionText?.startsWith('[DARE]') && c.dareFromConfessionId && (
        <a
          href={`/confession/${c.dareFromConfessionId}`}
          className="flex items-center gap-2 mb-3 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs hover:bg-purple-500/15 transition-colors"
        >
          <span className="text-purple-400">⚡</span>
          <span className="text-purple-300">Dare confession — responding to this post</span>
          <span className="text-purple-400 ml-auto">→</span>
        </a>
      )}

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
          {dareCount > 0 && (
            <span className="text-purple-400 ml-0.5">· ⚡{dareCount}</span>
          )}
        </button>
        <button onClick={share} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ↗ Share
        </button>
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
              50% goes to the confessor, 50% to the Church. You&apos;ll approve 2 transactions in MetaMask. Make sure you&apos;re on Base network.
            </p>
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {[0.001, 0.005, 0.01, 0.05].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setDonateAmount(amt.toString())}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all whitespace-nowrap shrink-0 ${
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

      {/* ===== POST-BAPTISM: Streak feedback + Dare option ===== */}
      {showDare && (
        <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 font-bold text-sm">✅ Baptism Complete!</p>
                <p className="text-gray-400 text-xs mt-1">
                  {lastBaptismAmount.toFixed(4)} ETH sent — 50% to sinner, 50% to Church
                </p>
              </div>
              {baptismStreak && baptismStreak > 1 && (
                <div className={`text-center px-3 py-1.5 rounded-full ${
                  baptismStreak >= 7 ? 'bg-red-500/20 text-red-400 animate-pulse' :
                  baptismStreak >= 3 ? 'bg-orange-500/20 text-orange-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  <span className="text-sm font-bold">🔥 {baptismStreak}d streak</span>
                  <span className="text-[10px] block">
                    {baptismStreak >= 7 ? '2x multiplier!' : baptismStreak >= 3 ? '1.5x multiplier!' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {!isSelfConfession && (
            <DareCreate
              confessionId={c.id}
              txHash={lastBaptismTxHash}
              amount={lastBaptismAmount}
              onDareCreated={() => {
                loadDares();
                // Defer refresh
                setTimeout(() => onRefresh?.(), 1500);
              }}
            />
          )}

          <button
            onClick={() => { setShowDare(false); onRefresh?.(); }}
            className="w-full text-center text-xs text-gray-600 hover:text-gray-400 transition-colors py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Comments + Dares section (unified) */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-800">

          {/* === DARES on this confession === */}
          {dares.length > 0 && (
            <div className="mb-4">
              <div className="font-mono text-[10px] text-purple-400 uppercase tracking-widest mb-2">
                ⚡ Dares ({dares.length})
              </div>
              <div className="space-y-2">
                {dares.map((dare: any) => (
                  <div
                    key={dare.id}
                    className={`border rounded-lg p-3 ${
                      dare.status === 'accepted' ? 'bg-green-500/5 border-green-500/20' :
                      dare.status === 'declined' ? 'bg-red-500/5 border-red-500/20 opacity-60' :
                      dare.status === 'expired' ? 'border-gray-800 opacity-40' :
                      'bg-purple-500/5 border-purple-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400 text-xs">⚡</span>
                        <a href={`/user/${dare.fromUser?.id}`} className="font-mono text-xs text-purple-300 hover:text-purple-200 transition-colors">
                          {dare.fromUser?.username || trunc(dare.fromUser?.walletAddress || '')}
                        </a>
                        <span className="text-gray-600 text-[10px]">·</span>
                        <span className="text-[10px] text-gray-500">{timeAgo(dare.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 text-xs font-mono font-bold">⟠ {dare.amount}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono uppercase ${
                          dare.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                          dare.status === 'accepted' ? 'bg-green-500/20 text-green-400' :
                          dare.status === 'declined' ? 'bg-red-500/20 text-red-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {dare.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-white text-xs pl-5">&ldquo;{dare.dareText}&rdquo;</p>

                    {/* Accept/Decline for the dare recipient */}
                    {dare.status === 'pending' && dare.toUser?.walletAddress?.toLowerCase() === address?.toLowerCase() && (
                      <div className="flex gap-2 pl-5 mt-2">
                        <button
                          onClick={() => handleDareRespond(dare.id, 'accept')}
                          className="bg-green-600 hover:bg-green-700 text-white text-[10px] py-1 px-3 rounded-lg font-medium transition"
                        >
                          ✅ Accept & Confess
                        </button>
                        <button
                          onClick={() => handleDareRespond(dare.id, 'decline')}
                          className="bg-red-600/20 hover:bg-red-600/30 text-red-400 text-[10px] py-1 px-3 rounded-lg font-medium transition"
                        >
                          ❌ Decline
                        </button>
                      </div>
                    )}

                    {/* Link to resulting confession if dare was accepted */}
                    {dare.status === 'accepted' && dare.resultConfessionId && (
                      <a
                        href={`/confession/${dare.resultConfessionId}`}
                        className="inline-flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 pl-5 mt-1 transition-colors"
                      >
                        → View dare confession
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === COMMENTS === */}
          {commentsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-accent rounded-full animate-spin" />
              <span className="text-xs text-gray-500">Loading...</span>
            </div>
          ) : comments.length === 0 && dares.length === 0 ? (
            <p className="text-xs text-gray-600 py-2">No comments or dares yet.</p>
          ) : comments.length > 0 ? (
            <>
              {dares.length > 0 && (
                <div className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                  💬 Comments ({comments.length})
                </div>
              )}
              {comments.map((cm: any) => (
                <div key={cm.id} className="py-3">
                  <a href={`/user/${cm.user?.id}`} className="font-mono text-[11px] text-gray-500 hover:text-accent transition-colors mb-1 inline-block">
                    {cm.user?.username || (cm.user?.walletAddress ? trunc(cm.user.walletAddress) : 'Anon')}
                  </a>
                  <div className="text-sm text-gray-300">{cm.commentText}</div>
                </div>
              ))}
            </>
          ) : null}

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
