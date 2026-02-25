import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

// POST /api/donate — record a donation after user sends ETH on-chain
export async function POST(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { confessionId, amount, txHash } = await req.json();

  if (!confessionId || !amount || !txHash) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  try {
    // Check confession exists
    const confession = await prisma.confession.findUnique({ where: { id: confessionId } });
    if (!confession) {
      return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    }

    // Check txHash not already recorded (prevent duplicates)
    const existing = await prisma.donation.findFirst({ where: { txHash } });
    if (existing) {
      return NextResponse.json({ error: 'Donation already recorded' }, { status: 409 });
    }

    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Create donation record
    const donation = await prisma.donation.create({
      data: {
        confessionId,
        userId: user.id,
        amount,
        txHash,
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

    // Update user totals
    await prisma.user.update({
      where: { id: user.id },
      data: {
        totalDonated: { increment: amount },
        donationCount: { increment: 1 },
      },
    });

    return NextResponse.json({ success: true, donation });
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
      include: { user: { select: { username: true, walletAddress: true } } },
      take: 20,
    });

    return NextResponse.json({ donations });
  } catch (err) {
    console.error('Get donations error:', err);
    return NextResponse.json({ donations: [] });
  }
}
