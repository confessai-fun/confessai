import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import bs58 from 'bs58';

const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

function getTreasuryKeypair(): Keypair | null {
  const key = process.env.TREASURY_PRIVATE_KEY;
  if (!key) return null;
  try {
    // Support both base58 and JSON array formats
    if (key.startsWith('[')) {
      return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(key)));
    }
    return Keypair.fromSecretKey(bs58.decode(key));
  } catch {
    console.error('Invalid TREASURY_PRIVATE_KEY format');
    return null;
  }
}

// GET /api/pool/claim - Get user's claimable payouts
export async function GET(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return NextResponse.json({ claimable: [], claimed: [] });

    // Get all unclaimed payouts for this user
    const claimable = await prisma.poolPayout.findMany({
      where: { userId: user.id, claimed: false },
      include: {
        pool: { select: { weekStart: true, weekEnd: true, totalPool: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get recently claimed (last 10)
    const claimed = await prisma.poolPayout.findMany({
      where: { userId: user.id, claimed: true },
      include: {
        pool: { select: { weekStart: true, weekEnd: true, totalPool: true } },
      },
      orderBy: { claimedAt: 'desc' },
      take: 10,
    });

    const totalClaimable = claimable.reduce((sum, p) => sum + p.amount, 0);
    const totalClaimed = claimed.reduce((sum, p) => sum + p.amount, 0);

    return NextResponse.json({
      claimable,
      claimed,
      totalClaimable,
      totalClaimed,
    });
  } catch (err) {
    console.error('Pool claim GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

// POST /api/pool/claim - Claim a specific payout (sends SOL from treasury)
export async function POST(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { payoutId } = await req.json();

    // Can claim a specific payout or all at once
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Get payouts to claim
    let payouts;
    if (payoutId) {
      // Claim specific payout
      const payout = await prisma.poolPayout.findUnique({ where: { id: payoutId } });
      if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 });
      if (payout.userId !== user.id) return NextResponse.json({ error: 'Not your payout' }, { status: 403 });
      if (payout.claimed) return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
      payouts = [payout];
    } else {
      // Claim all unclaimed
      payouts = await prisma.poolPayout.findMany({
        where: { userId: user.id, claimed: false },
      });
    }

    if (payouts.length === 0) {
      return NextResponse.json({ error: 'Nothing to claim' }, { status: 400 });
    }

    const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Payout amount is zero' }, { status: 400 });
    }

    // Minimum payout threshold (to cover tx fees)
    const MIN_PAYOUT = 0.001; // 0.001 SOL
    if (totalAmount < MIN_PAYOUT) {
      return NextResponse.json({
        error: `Minimum claim is ${MIN_PAYOUT} SOL. Your total: ${totalAmount.toFixed(6)} SOL`,
      }, { status: 400 });
    }

    // Load treasury keypair
    const treasuryKeypair = getTreasuryKeypair();
    if (!treasuryKeypair) {
      return NextResponse.json({ error: 'Treasury not configured' }, { status: 500 });
    }

    // Check treasury balance
    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const treasuryBalance = await connection.getBalance(treasuryKeypair.publicKey);
    const lamportsNeeded = Math.ceil(totalAmount * LAMPORTS_PER_SOL) + 10000; // + fee buffer

    if (treasuryBalance < lamportsNeeded) {
      console.error(`Treasury insufficient: has ${treasuryBalance / LAMPORTS_PER_SOL} SOL, needs ${totalAmount} SOL`);
      return NextResponse.json({ error: 'Treasury funds insufficient. Contact admin.' }, { status: 500 });
    }

    // Build and send transaction
    const recipientPubkey = new PublicKey(wallet);
    const lamports = Math.floor(totalAmount * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: recipientPubkey,
        lamports,
      })
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = treasuryKeypair.publicKey;
    transaction.sign(treasuryKeypair);

    const txHash = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction({ signature: txHash, blockhash, lastValidBlockHeight });

    // Mark payouts as claimed
    const payoutIds = payouts.map(p => p.id);
    await prisma.poolPayout.updateMany({
      where: { id: { in: payoutIds } },
      data: {
        claimed: true,
        claimedAt: new Date(),
        txHash,
      },
    });

    return NextResponse.json({
      success: true,
      amount: totalAmount,
      txHash,
      payoutCount: payouts.length,
    });
  } catch (err: any) {
    console.error('Pool claim POST error:', err);
    return NextResponse.json({ error: err?.message || 'Claim failed' }, { status: 500 });
  }
}
