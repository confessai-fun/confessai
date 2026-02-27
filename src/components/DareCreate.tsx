'use client';
import { useState } from 'react';

interface DareCreateProps {
  confessionId: string;
  onDareCreated?: (dare: any) => void;
  txHash: string;    // from the baptism transaction
  amount: number;    // SOL amount of baptism
}

const DARE_SUGGESTIONS = [
  "Confess your next rug pull live 💀",
  "Post your full portfolio (no hiding) 📊",
  "Confess the trade you're most ashamed of 😭",
  "Tell us about the time you lied about being 'up overall' 📈",
  "Confess your biggest FOMO buy 🎰",
  "Admit how many hours you spend watching charts 👀",
  "Tell us about your worst shitcoin purchase 🗑️",
  "Confess the dumbest thing you've aped into 🦍",
];

export default function DareCreate({ confessionId, onDareCreated, txHash, amount }: DareCreateProps) {
  const [dareText, setDareText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!dareText.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch('/api/dare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confessionId,
          dareText: dareText.trim(),
          amount,
          txHash,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSent(true);
        onDareCreated?.(data.dare);
      } else {
        alert(data.error || 'Failed to send dare');
      }
    } catch (err) {
      console.error('Dare create error:', err);
    }
    setSending(false);
  };

  const pickSuggestion = () => {
    const random = DARE_SUGGESTIONS[Math.floor(Math.random() * DARE_SUGGESTIONS.length)];
    setDareText(random);
  };

  if (sent) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
        <p className="text-green-400 font-bold">⚡ Dare Sent!</p>
        <p className="text-gray-400 text-sm mt-1">They have 48h to accept or decline.</p>
      </div>
    );
  }

  return (
    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-bold text-purple-300 flex items-center gap-1">
          ⚡ Attach a Dare?
        </h4>
        <span className="text-xs text-gray-500">Optional</span>
      </div>

      <p className="text-xs text-gray-400 mb-2">
        Dare this sinner to confess something specific. They earn your baptism SOL if they accept!
      </p>

      <div className="relative mb-2">
        <input
          type="text"
          value={dareText}
          onChange={e => setDareText(e.target.value)}
          placeholder="I dare you to confess..."
          maxLength={280}
          className="w-full bg-black/30 border border-purple-500/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
        />
        <span className="absolute right-2 top-2 text-xs text-gray-600">{dareText.length}/280</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={pickSuggestion}
          className="text-xs text-purple-400 hover:text-purple-300 underline"
        >
          🎲 Random dare
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={!dareText.trim() || sending}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition"
        >
          {sending ? 'Sending...' : `⚡ Send Dare (${amount} SOL attached)`}
        </button>
      </div>
    </div>
  );
}
