'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider, useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';
import dynamic from 'next/dynamic';

// Dynamically import WalletModalProvider to avoid SSR issues
const WalletModalProviderDynamic = dynamic(
  async () => {
    const { WalletModalProvider } = await import('@solana/wallet-adapter-react-ui');
    return { default: WalletModalProvider };
  },
  { ssr: false }
);

// ============================================
// App-level wallet context
// ============================================
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

function trunc(addr: string) {
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

// ============================================
// Inner component that uses Solana wallet hooks
// ============================================
function WalletContextProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected, connecting, disconnect: solanaDisconnect } = useSolanaWallet();
  const { connection } = useConnection();

  const [address, setAddress] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);

  useEffect(() => {
    fetch('/api/auth')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated) {
          setAddress(d.walletAddress);
          setHasAuthenticated(true);
          checkUsername(d.walletAddress);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (publicKey && connected && !hasAuthenticated && signMessage) {
      authenticateWallet();
    }
  }, [publicKey, connected, hasAuthenticated]);

  useEffect(() => {
    if (!connected && !connecting && hasAuthenticated) {
      handleDisconnect();
    }
  }, [connected, connecting]);

  const authenticateWallet = async () => {
    if (!publicKey || !signMessage) return;
    try {
      const walletAddress = publicKey.toBase58();
      const nonceRes = await fetch('/api/auth?action=nonce');
      if (!nonceRes.ok) { console.error('Failed to get nonce'); return; }
      const { nonce, mac } = await nonceRes.json();
      const message = `Sign in to ConfessAI\n\nNonce: ${nonce}`;
      const encodedMessage = new TextEncoder().encode(message);
      let signature: Uint8Array;
      try {
        signature = await signMessage(encodedMessage);
      } catch (err: any) {
        if (err?.message?.includes('User rejected')) console.log('User rejected signature');
        else console.warn('Signature failed:', err?.message || err);
        return;
      }
      const signatureBase58 = bs58.encode(signature);
      const verifyRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, signature: signatureBase58, nonce, mac }),
      });
      const result = await verifyRes.json();
      if (result.authenticated) {
        setAddress(result.walletAddress);
        setHasAuthenticated(true);
        await checkUsername(result.walletAddress);
      } else {
        console.error('Auth failed:', result.error);
      }
    } catch (err) {
      console.error('Authentication error:', err);
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/auth', { method: 'DELETE' }).catch(() => {});
    setAddress(null);
    setUsernameState(null);
    setShowUsernameModal(false);
    setHasAuthenticated(false);
  };

  const checkUsername = async (wallet: string) => {
    try {
      const cachedName = typeof window !== 'undefined' ? localStorage.getItem(`username_${wallet}`) : null;
      if (cachedName) { setUsernameState(cachedName); setShowUsernameModal(false); }
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.user?.username) {
        setUsernameState(data.user.username);
        setShowUsernameModal(false);
        if (typeof window !== 'undefined') localStorage.setItem(`username_${wallet}`, data.user.username);
      } else if (!cachedName) {
        const dismissed = typeof window !== 'undefined' && localStorage.getItem(`username_dismissed_${wallet}`);
        if (!dismissed) setShowUsernameModal(true);
      }
    } catch {}
  };

  const connect = useCallback(async () => {
    if (publicKey && connected && !hasAuthenticated && signMessage) await authenticateWallet();
  }, [publicKey, connected, hasAuthenticated, signMessage]);

  const disconnect = useCallback(async () => {
    try { await solanaDisconnect(); } catch {}
    await handleDisconnect();
  }, [solanaDisconnect]);

  const setUsername = useCallback(async (name: string) => {
    try {
      const res = await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: name }) });
      const data = await res.json();
      if (data.user?.username) {
        setUsernameState(data.user.username);
        setShowUsernameModal(false);
        if (address) { localStorage.setItem(`username_${address}`, data.user.username); localStorage.removeItem(`username_dismissed_${address}`); }
      }
    } catch (err) { console.error('Set username error:', err); }
  }, [address]);

  const dismissUsernameModal = useCallback(() => {
    setShowUsernameModal(false);
    if (address) localStorage.setItem(`username_dismissed_${address}`, 'true');
  }, [address]);

  return (
    <WalletContext.Provider value={{
      address, username, isConnected: !!address && hasAuthenticated, isLoading, showUsernameModal,
      connect, disconnect, setUsername, dismissUsernameModal, truncatedAddress: address ? trunc(address) : '',
    }}>
      {children}
    </WalletContext.Provider>
  );
}

// ============================================
// Outer provider — sets up Solana connection + wallets
// ============================================
export function WalletProvider({ children }: { children: ReactNode }) {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as WalletAdapterNetwork) || WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProviderDynamic>
          <WalletContextProvider>
            {children}
          </WalletContextProvider>
        </WalletModalProviderDynamic>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
