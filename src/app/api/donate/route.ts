import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

// POST /api/donate — record baptism donation (50% to confessor, 50% to church)
export async function POST(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { confessionId, amount, txHashChurch, txHashOwner } = await req.json();

  if (!confessionId || !amount) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  // Need at least one tx hash
  if (!txHashChurch && !txHashOwner) {
    return NextResponse.json({ error: 'Missing transaction hash' }, { status: 400 });
  }

  try {
    // Check confession exists and get owner
    const confession = await prisma.confession.findUnique({
      where: { id: confessionId },
      include: { user: { select: { id: true, walletAddress: true } } },
    });
    if (!confession) {
      return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    }

    // Prevent duplicate recording
    if (txHashChurch) {
      const existing = await prisma.donation.findFirst({ where: { txHash: txHashChurch } });
      if (existing) return NextResponse.json({ error: 'Donation already recorded' }, { status: 409 });
    }
    if (txHashOwner) {
      const existing = await prisma.donation.findFirst({ where: { txHash: txHashOwner } });
      if (existing) return NextResponse.json({ error: 'Donation already recorded' }, { status: 409 });
    }

    const donor = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!donor) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const halfAmount = amount / 2;
    const primaryTxHash = txHashChurch || txHashOwner;

    // Create donation record (total amount, store both tx hashes)
    const donation = await prisma.donation.create({
      data: {
        confessionId,
        userId: donor.id,
        amount,
        txHash: primaryTxHash,
      },
    });

    // Update confession totals
    await prisma.confession.update({
      where: { id: confessionId },
      data: {
        totalDonated: { increment: amount },
        donationCount: { increment: 1 },
      },
    });

    // Update donor totals (full amount they sent)
    await prisma.user.update({
      where: { id: donor.id },
      data: {
        totalDonated: { increment: amount },
        donationCount: { increment: 1 },
      },
    });

    // Update confession owner earnings (50%)
    if (confession.user.id !== donor.id) {
      // Only credit earnings if not self-baptizing
      await prisma.user.update({
        where: { id: confession.user.id },
        data: {
          totalEarned: { increment: halfAmount },
          earnedCount: { increment: 1 },
        },
      });
    }

    return NextResponse.json({
      success: true,
      donation,
      split: {
        church: halfAmount,
        owner: halfAmount,
        ownerWallet: confession.user.walletAddress,
      },
    });
  } catch (err) {
    console.error('Donate error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// GET /api/donate?confessionId=xxx — get donations for a confession
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const confessionId = searchParams.get('confessionId');

  if (!confessionId) {
    return NextResponse.json({ error: 'Missing confessionId' }, { status: 400 });
  }

  try {
    const donations = await prisma.donation.findMany({
      where: { confessionId },
      orderBy: { amount: 'desc' },
      include: { user: { select: { id: true, username: true, walletAddress: true } } },
      take: 20,
    });

    return NextResponse.json({ donations });
  } catch (err) {
    console.error('Get donations error:', err);
    return NextResponse.json({ donations: [] });
  }
}
