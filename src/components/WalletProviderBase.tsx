'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface WalletContextType {
  address: string | null;
  username: string | null;
  isConnected: boolean;
  isLoading: boolean;
  showUsernameModal: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  setUsername: (name: string) => Promise<void>;
  dismissUsernameModal: () => void;
  truncatedAddress: string;
}

const WalletContext = createContext<WalletContextType>({
  address: null, username: null, isConnected: false, isLoading: true, showUsernameModal: false,
  connect: async () => {}, disconnect: async () => {}, setUsername: async () => {},
  dismissUsernameModal: () => {}, truncatedAddress: '',
});

export function useWallet() { return useContext(WalletContext); }

function trunc(addr: string) { return addr.slice(0, 6) + '...' + addr.slice(-4); }

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUsernameModal, setShowUsernameModal] = useState(false);

    // Add inside WalletProvider, at the top of the component
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes('MetaMask') ||
        event.reason?.message?.includes('extension not found')
      ) {
        event.preventDefault(); // Suppress MetaMask's own errors
        console.warn('MetaMask extension error suppressed');
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  // Check existing session on mount
  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setAddress(d.walletAddress);
          checkUsername(d.walletAddress);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const checkUsername = async (wallet: string) => {
    try {
      const cachedName = typeof window !== 'undefined' ? localStorage.getItem(`username_${wallet}`) : null;
      if (cachedName) {
        setUsernameState(cachedName);
        setShowUsernameModal(false);
      }

      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.user?.username) {
        setUsernameState(data.user.username);
        setShowUsernameModal(false);
        if (typeof window !== 'undefined') localStorage.setItem(`username_${wallet}`, data.user.username);
      } else if (!cachedName) {
        const dismissed = typeof window !== 'undefined' && localStorage.getItem(`username_dismissed_${wallet}`);
        if (!dismissed) {
          setShowUsernameModal(true);
        }
      }
    } catch {}
  };

  // Listen for account changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;
    const handler = (accounts: string[]) => {
      if (accounts.length === 0) {
        fetch('/api/auth', { method: 'DELETE' }).catch(() => {});
        setAddress(null);
        setUsernameState(null);
        setShowUsernameModal(false);
      }
    };
    window.ethereum.on?.('accountsChanged', handler);
    return () => { window.ethereum?.removeListener?.('accountsChanged', handler); };
  }, []);

  const isMobileWithoutProvider = useCallback(() => {
    if (typeof navigator === 'undefined') return false;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    return isMobile && typeof window.ethereum === 'undefined';
  }, []);

  const connect = useCallback(async () => {
    // Mobile without MetaMask injected → deep link to MetaMask app
    if (isMobileWithoutProvider()) {
      const host = window.location.host;
      const path = window.location.pathname;
      const dappUrl = `${host}${path}`;
      window.location.href = `https://metamask.app.link/dapp/${dappUrl}`;
      return;
    }

    // Wait briefly for ethereum to be injected (MetaMask can be slow)
    let ethereum = window.ethereum;
    if (!ethereum) {
      await new Promise((r) => setTimeout(r, 500));
      ethereum = window.ethereum;
    }
    if (!ethereum) {
      await new Promise((r) => setTimeout(r, 1000));
      ethereum = window.ethereum;
    }

    if (!ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      let accounts: string[];
      try {
        accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      } catch (connErr: any) {
        // MetaMask locked, extension error, or user rejected at wallet level
        if (connErr?.code === 4001) {
          console.log('User rejected wallet connection');
        } else {
          console.warn('MetaMask connect failed:', connErr?.message || connErr);
        }
        return; // Exit gracefully — don't proceed to SIWE
      }

      if (!accounts || accounts.length === 0) return;
      const walletAddress = accounts[0];

      const nonceRes = await fetch('/api/auth?action=nonce');
      if (!nonceRes.ok) { console.error('Failed to get nonce'); return; }
      const { nonce, mac } = await nonceRes.json();

      const message = `Sign in to ConfessAI\n\nNonce: ${nonce}`;

      let signature: string;
      try {
        signature = await ethereum.request({
          method: 'personal_sign',
          params: [message, walletAddress],
        });
      } catch (signErr: any) {
        if (signErr?.code === 4001) {
          console.log('User rejected signature');
        } else {
          console.warn('Signature failed:', signErr?.message || signErr);
        }
        return; // Exit gracefully
      }

      const verifyRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, signature, nonce, mac }),
      });

      const result = await verifyRes.json();
      if (result.authenticated) {
        setAddress(result.walletAddress);
        await checkUsername(result.walletAddress);
      } else {
        console.error('Auth failed:', result.error);
      }
    } catch (err: any) {
      // Catch-all for network errors, unexpected failures
      console.error('Connect error:', err?.message || err);
    }
  }, [isMobileWithoutProvider]);

  const disconnect = useCallback(async () => {
    await fetch('/api/auth', { method: 'DELETE' }).catch(() => {});
    setAddress(null);
    setUsernameState(null);
    setShowUsernameModal(false);
  }, []);

  const setUsername = useCallback(async (name: string) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }),
      });
      const data = await res.json();
      if (data.user?.username) {
        setUsernameState(data.user.username);
        setShowUsernameModal(false);
        if (address) {
          localStorage.setItem(`username_${address}`, data.user.username);
          localStorage.removeItem(`username_dismissed_${address}`);
        }
      }
    } catch (err) {
      console.error('Set username error:', err);
    }
  }, [address]);

  const dismissUsernameModal = useCallback(() => {
    setShowUsernameModal(false);
    if (address) {
      localStorage.setItem(`username_dismissed_${address}`, 'true');
    }
  }, [address]);

  return (
    <WalletContext.Provider value={{
      address,
      username,
      isConnected: !!address,
      isLoading,
      showUsernameModal,
      connect,
      disconnect,
      setUsername,
      dismissUsernameModal,
      truncatedAddress: address ? trunc(address) : '',
    }}>
      {children}
    </WalletContext.Provider>
  );
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
