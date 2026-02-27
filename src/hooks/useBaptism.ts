'use client';

import { useCallback, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { useWallet } from '@/components/WalletProvider';

const TREASURY_WALLET = new PublicKey(
  process.env.NEXT_PUBLIC_TREASURY_WALLET || '11111111111111111111111111111111'
);

// Revenue split: 50% to confessor, 50% to church treasury
const CONFESSOR_SHARE = 0.5;
const TREASURY_SHARE = 0.5;

interface BaptismResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useBaptism() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useSolanaWallet();
  const { isConnected } = useWallet();
  const [loading, setLoading] = useState(false);

  const baptize = useCallback(async (
    confessionId: string,
    confessorWallet: string,
    amountSOL: number,
  ): Promise<BaptismResult> => {
    if (!publicKey || !isConnected) {
      return { success: false, error: 'Wallet not connected' };
    }

    if (amountSOL <= 0) {
      return { success: false, error: 'Amount must be greater than 0' };
    }

    setLoading(true);

    try {
      const totalLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
      const confessorLamports = Math.floor(totalLamports * CONFESSOR_SHARE);
      const treasuryLamports = totalLamports - confessorLamports; // Remainder to treasury

      const confessorPubkey = new PublicKey(confessorWallet);

      // Create transaction with 2 transfers:
      // 1. 50% to the confessor (sinner)
      // 2. 50% to the church treasury
      const transaction = new Transaction();

      // Transfer to confessor
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: confessorPubkey,
          lamports: confessorLamports,
        })
      );

      // Transfer to treasury
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: TREASURY_WALLET,
          lamports: treasuryLamports,
        })
      );

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const txHash = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction({
        signature: txHash,
        blockhash,
        lastValidBlockHeight,
      });

      // Record baptism in database
      const res = await fetch('/api/baptize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confessionId,
          amount: amountSOL,
          txHash,
          confessorWallet,
        }),
      });

      if (!res.ok) {
        console.error('Failed to record baptism in DB');
      }

      setLoading(false);
      return { success: true, txHash };
    } catch (err: any) {
      setLoading(false);

      if (err?.message?.includes('User rejected')) {
        return { success: false, error: 'Transaction rejected by user' };
      }

      console.error('Baptism error:', err);
      return { success: false, error: err?.message || 'Transaction failed' };
    }
  }, [publicKey, connection, sendTransaction, isConnected]);

  return { baptize, loading };
}
