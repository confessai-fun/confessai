'use client';

import { useState, useEffect, useRef } from 'react';

export default function ChatPanel() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoadingHistory(true);
    fetch('/api/chat')
      .then((r) => r.json())
      .then((d) => setMessages(d.messages || []))
      .finally(() => setLoadingHistory(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Add user message + typing indicator
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: 'user', content: text, createdAt: new Date().toISOString() },
      { id: 'typing', role: 'assistant', content: '...', isTyping: true },
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      // Remove typing indicator and add real response
      setMessages((prev) =>
        prev.filter((m) => m.id !== 'typing').concat(data.message ? [data.message] : [])
      );
    } catch {
      setMessages((prev) =>
        prev.filter((m) => m.id !== 'typing').concat([
          { id: `err-${Date.now()}`, role: 'assistant', content: 'Something went wrong. Try again, my child.' },
        ])
      );
    }
    setSending(false);
  };

  return (
    <div className="bg-card border border-gray-800 rounded-xl overflow-hidden h-[600px] flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-800 flex items-center gap-3">
        <div className="w-11 h-11 bg-accent rounded-full flex items-center justify-center text-xl">⛪</div>
        <div>
          <div className="font-display text-base text-white">Father Degen</div>
          <div className="text-xs text-gray-500">Your personal AI priest · Always listening</div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-3 border-gray-700 border-t-accent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Loading conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-gray-500 text-center py-16 text-sm">
            Father Degen awaits your words, my child.<br />
            Tell him about your trades, your fears, your copes.
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={m.id || i}
              className={`max-w-[80%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-accent text-white self-end rounded-br-sm'
                  : 'bg-elevated text-gray-200 self-start rounded-bl-sm border border-gray-700'
              }`}
            >
              {m.isTyping ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                m.content
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
        <input
          className="flex-1 bg-bg border border-gray-600 rounded-full px-5 py-3 text-sm text-gray-100 font-body focus:outline-none focus:border-accent"
          placeholder="Speak to Father Degen..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="bg-accent text-white px-6 py-3 rounded-full font-semibold text-sm hover:shadow-lg hover:shadow-accent/20 transition-all disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
