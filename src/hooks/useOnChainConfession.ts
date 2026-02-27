'use client';

import { useCallback, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import {
  Transaction,
  TransactionInstruction,
  PublicKey,
} from '@solana/web3.js';

// Solana Memo Program ID
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

interface OnChainResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export function useOnChainConfession() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useSolanaWallet();
  const [loading, setLoading] = useState(false);

  const writeOnChain = useCallback(async (
    confessionText: string,
    sinCategory: string,
    sinScore: number,
  ): Promise<OnChainResult> => {
    if (!publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    setLoading(true);

    try {
      // Create memo data — compact JSON stored on-chain
      const memoData = JSON.stringify({
        app: 'ConfessAI',
        sin: confessionText.slice(0, 280), // Limit to keep tx small
        cat: sinCategory,
        score: sinScore,
        ts: Date.now(),
      });

      // Create memo instruction
      const memoInstruction = new TransactionInstruction({
        keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memoData, 'utf-8'),
      });

      const transaction = new Transaction().add(memoInstruction);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const txHash = await sendTransaction(transaction, connection);

      await connection.confirmTransaction({
        signature: txHash,
        blockhash,
        lastValidBlockHeight,
      });

      setLoading(false);
      return { success: true, txHash };
    } catch (err: any) {
      setLoading(false);

      if (err?.message?.includes('User rejected')) {
        return { success: false, error: 'Transaction rejected' };
      }

      console.error('On-chain confession error:', err);
      return { success: false, error: err?.message || 'Failed to write on-chain' };
    }
  }, [publicKey, connection, sendTransaction]);

  return { writeOnChain, loading };
}
