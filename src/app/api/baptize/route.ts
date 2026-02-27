import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';
import { Connection, PublicKey } from '@solana/web3.js';

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export async function POST(req: NextRequest) {
  try {
    const wallet = await getWalletFromReq();
    if (!wallet) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { confessionId, amount, txHash, confessorWallet } = await req.json();

    if (!confessionId || !amount || !txHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify transaction on-chain (optional but recommended)
    try {
      const connection = new Connection(SOLANA_RPC);
      const tx = await connection.getTransaction(txHash, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 400 });
      }

      if (tx.meta?.err) {
        return NextResponse.json({ error: 'Transaction failed on-chain' }, { status: 400 });
      }
    } catch (verifyErr) {
      console.warn('Could not verify tx on-chain, proceeding anyway:', verifyErr);
      // In production, you might want to fail here instead
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get confession
    const confession = await prisma.confession.findUnique({
      where: { id: confessionId },
      select: { id: true, userId: true },
    });

    if (!confession) {
      return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    }

    // Record donation/baptism
    const donation = await prisma.donation.create({
      data: {
        amount,
        txHash,
        userId: user.id,
        confessionId,
      },
    });

    // Update user stats (streak, total donated, etc.)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalDonated: { increment: amount },
        donationCount: { increment: 1 },
      },
    });

    // Update recipient stats
    if (confession.userId) {
      await prisma.user.update({
        where: { id: confession.userId },
        data: {
          totalEarned: { increment: amount * 0.5 }, // 50% to sinner
        },
      });
    }

    return NextResponse.json({ success: true, donation });
  } catch (err) {
    console.error('Baptize error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
