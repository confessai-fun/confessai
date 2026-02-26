import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

// Helper: Get current week's pool (Mon-Sun)
function getWeekBounds() {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMon));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return { weekStart, weekEnd };
}

function getStreakMultiplier(streak: number): number {
  if (streak >= 7) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

function isConsecutiveDay(lastDate: Date | null, now: Date): boolean {
  if (!lastDate) return false;
  const last = new Date(lastDate);
  const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return diff === 1;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate();
}

// POST /api/donate — record baptism donation (50/50 split) + streak + pool
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

  if (!txHashChurch && !txHashOwner) {
    return NextResponse.json({ error: 'Missing transaction hash' }, { status: 400 });
  }

  try {
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
    const isSelfBaptize = confession.user.id === donor.id;

    // 1. Create donation record
    const donation = await prisma.donation.create({
      data: {
        confessionId,
        userId: donor.id,
        amount,
        txHash: primaryTxHash,
      },
    });

    // 2. Update confession totals
    await prisma.confession.update({
      where: { id: confessionId },
      data: {
        totalDonated: { increment: amount },
        donationCount: { increment: 1 },
      },
    });

    // 3. Update donor totals
    await prisma.user.update({
      where: { id: donor.id },
      data: {
        totalDonated: { increment: amount },
        donationCount: { increment: 1 },
      },
    });

    // 4. Update confession owner earnings (50%) - only if not self-baptizing
    if (!isSelfBaptize) {
      await prisma.user.update({
        where: { id: confession.user.id },
        data: {
          totalEarned: { increment: halfAmount },
          earnedCount: { increment: 1 },
        },
      });
    }

    // 5. STREAK TRACKING
    const now = new Date();
    let newStreak = 1;

    if (donor.lastBaptizeDate && isSameDay(new Date(donor.lastBaptizeDate), now)) {
      newStreak = donor.baptizeStreak || 1;
    } else if (isConsecutiveDay(donor.lastBaptizeDate, now)) {
      newStreak = (donor.baptizeStreak || 0) + 1;
    }

    const multiplier = getStreakMultiplier(newStreak);

    await prisma.user.update({
      where: { id: donor.id },
      data: {
        baptizeStreak: newStreak,
        lastBaptizeDate: now,
        streakMultiplier: multiplier,
      },
    });

    // 6. BAPTISM POOL CONTRIBUTION (50% of church share goes to weekly pool)
    const churchShare = isSelfBaptize ? amount : halfAmount;
    const poolContribution = churchShare * 0.5;

    try {
      const { weekStart, weekEnd } = getWeekBounds();
      await prisma.baptismPool.upsert({
        where: { weekStart },
        update: { totalPool: { increment: poolContribution } },
        create: { weekStart, weekEnd, totalPool: poolContribution },
      });
    } catch (poolErr) {
      console.error('Pool contribution error (non-fatal):', poolErr);
    }

    return NextResponse.json({
      success: true,
      donation,
      streak: newStreak,
      multiplier,
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

// GET /api/donate?confessionId=xxx
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
