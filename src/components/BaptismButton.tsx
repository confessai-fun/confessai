'use client';

import { useState } from 'react';
import { useBaptism } from '@/hooks/useBaptism';
import { useWallet } from '@/components/WalletProvider';

interface BaptismButtonProps {
  confessionId: string;
  confessorWallet: string;
  onSuccess?: (txHash: string) => void;
}

export function BaptismButton({ confessionId, confessorWallet, onSuccess }: BaptismButtonProps) {
  const { isConnected } = useWallet();
  const { baptize, loading } = useBaptism();
  const [amount, setAmount] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const presetAmounts = [0.01, 0.05, 0.1, 0.5];

  const handleBaptize = async (sol: number) => {
    setError('');
    setSuccess('');

    const result = await baptize(confessionId, confessorWallet, sol);

    if (result.success) {
      setSuccess(`Baptized! Tx: ${result.txHash?.slice(0, 8)}...`);
      setShowInput(false);
      setAmount('');
      onSuccess?.(result.txHash!);
    } else {
      setError(result.error || 'Baptism failed');
    }
  };

  if (!isConnected) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-gray-800 text-gray-500 text-sm rounded-lg cursor-not-allowed"
      >
        💧 Connect to Baptize
      </button>
    );
  }

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="px-4 py-2 bg-blue-900/50 text-blue-400 text-sm rounded-lg hover:bg-blue-900/70 transition-colors border border-blue-800/50"
      >
        💧 Baptize with SOL
      </button>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
      {/* Preset amounts */}
      <div className="flex gap-2 flex-wrap">
        {presetAmounts.map((preset) => (
          <button
            key={preset}
            onClick={() => handleBaptize(preset)}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-900/30 text-blue-400 text-xs rounded-lg hover:bg-blue-900/50 transition-colors border border-blue-800/30 disabled:opacity-50"
          >
            {preset} SOL
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Custom SOL amount"
          step="0.001"
          min="0.001"
          className="flex-1 px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => amount && handleBaptize(parseFloat(amount))}
          disabled={loading || !amount}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? '⏳' : '💧 Send'}
        </button>
      </div>

      {/* Cancel */}
      <button
        onClick={() => { setShowInput(false); setError(''); }}
        className="text-xs text-gray-500 hover:text-gray-400"
      >
        Cancel
      </button>

      {/* Status */}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-green-400">{success}</p>}
    </div>
  );
}
