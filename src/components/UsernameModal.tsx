'use client';

import { useState } from 'react';
import { useWallet } from './WalletProvider';

export default function UsernameModal() {
  const { showUsernameModal, setUsername, dismissUsernameModal, truncatedAddress } = useWallet();
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!showUsernameModal) return null;

  const handleSave = async () => {
    const name = input.trim();
    if (name.length < 2) {
      setError('At least 2 characters, sinner.');
      return;
    }
    if (name.length > 20) {
      setError('Max 20 characters. Keep it humble.');
      return;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
      setError('Letters, numbers, _ . - only.');
      return;
    }

    setError('');
    setSaving(true);
    await setUsername(name);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={dismissUsernameModal} />

      {/* Modal */}
      <div className="relative bg-card border border-gray-700 rounded-2xl p-8 w-full max-w-md mx-4 animate-fade-up shadow-2xl shadow-black/50">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-accent to-transparent rounded-t-2xl" />

        {/* Icon */}
        <div className="w-16 h-16 bg-accent/15 border border-accent/30 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
          😈
        </div>

        <h2 className="font-display text-xl text-white text-center mb-2">
          Welcome, Sinner
        </h2>
        <p className="text-gray-500 text-sm text-center mb-1">
          Connected as <span className="font-mono text-gray-400">{truncatedAddress}</span>
        </p>
        <p className="text-gray-500 text-sm text-center mb-8">
          Choose a name for the Wall of Sin
        </p>

        {/* Input */}
        <div className="relative mb-2">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="DegenLord420"
            maxLength={20}
            autoFocus
            className="w-full bg-bg border border-gray-600 rounded-xl px-4 py-3.5 text-white font-body text-base placeholder:text-gray-600 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono">
            {input.length}/20
          </span>
        </div>

        {/* Error */}
        {error && (
          <p className="text-accent text-xs mb-4 pl-1">{error}</p>
        )}
        {!error && <div className="mb-4" />}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={dismissUsernameModal}
            className="flex-1 border border-gray-600 text-gray-400 py-3 rounded-xl text-sm font-semibold hover:border-gray-500 hover:text-gray-300 transition-all"
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !input.trim()}
            className="flex-1 bg-accent text-white py-3 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-accent/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Name'}
          </button>
        </div>

        <p className="text-gray-600 text-[11px] text-center mt-4">
          You can change this later in your profile
        </p>
      </div>
    </div>
  );
}
