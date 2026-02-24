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

  // Check existing session on mount
  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setAddress(d.walletAddress);
          // Check if user has username
          checkUsername(d.walletAddress);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const checkUsername = async (wallet: string) => {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.user?.username) {
        setUsernameState(data.user.username);
      } else {
        setShowUsernameModal(true);
      }
    } catch {}
  };

  // Listen for account changes
  useEffect(() => {
    if (typeof window.ethereum === 'undefined') return;
    const handler = (accounts: string[]) => {
      if (accounts.length === 0) {
        fetch('/api/auth', { method: 'DELETE' });
        setAddress(null);
        setUsernameState(null);
        setShowUsernameModal(false);
      }
    };
    window.ethereum.on?.('accountsChanged', handler);
    return () => { window.ethereum?.removeListener?.('accountsChanged', handler); };
  }, []);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      const accounts: string[] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) return;
      const walletAddress = accounts[0];

      const nonceRes = await fetch('/api/auth?action=nonce');
      const { nonce } = await nonceRes.json();

      const message = `Sign in to PumpConfession.ai\n\nNonce: ${nonce}`;

      const signature: string = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      const verifyRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, signature, nonce }),
      });

      const result = await verifyRes.json();
      if (result.authenticated) {
        setAddress(result.walletAddress);
        // After successful connect, check if username exists
        await checkUsername(result.walletAddress);
      } else {
        console.error('Auth failed:', result.error);
      }
    } catch (err: any) {
      if (err?.code === 4001) {
        console.log('User rejected');
      } else {
        console.error('Connect error:', err);
      }
    }
  }, []);

  const disconnect = useCallback(async () => {
    await fetch('/api/auth', { method: 'DELETE' });
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
      }
    } catch (err) {
      console.error('Set username error:', err);
    }
  }, []);

  const dismissUsernameModal = useCallback(() => {
    setShowUsernameModal(false);
  }, []);

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
