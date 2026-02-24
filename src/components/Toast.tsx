'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-card border border-gray-600 text-gray-100 px-7 py-3.5 rounded-full text-sm font-medium z-[10000] transition-transform duration-400 pointer-events-none ${toast ? 'translate-y-0' : 'translate-y-28'}`}>
        {toast}
      </div>
    </ToastContext.Provider>
  );
}
