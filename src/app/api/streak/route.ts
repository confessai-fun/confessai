import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

// GET /api/streak - get current user's streak info
export async function GET() {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      select: {
        baptizeStreak: true,
        lastBaptizeDate: true,
        streakMultiplier: true,
        donationCount: true,
        totalDonated: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const now = new Date();
    let activeStreak = user.baptizeStreak;
    let isActive = false;

    if (user.lastBaptizeDate) {
      const lastDate = new Date(user.lastBaptizeDate);
      const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) {
        isActive = true;
      } else {
        activeStreak = 0;
      }
    }

    let nextMilestone = 3;
    let nextMultiplier = 1.5;
    if (activeStreak >= 3) { nextMilestone = 7; nextMultiplier = 2.0; }
    if (activeStreak >= 7) { nextMilestone = activeStreak + 1; nextMultiplier = 2.0; }

    const topStreakers = await prisma.user.findMany({
      where: { baptizeStreak: { gt: 0 } },
      select: { id: true, username: true, walletAddress: true, baptizeStreak: true, streakMultiplier: true },
      orderBy: { baptizeStreak: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      streak: activeStreak,
      multiplier: user.streakMultiplier,
      isActive,
      lastBaptizeDate: user.lastBaptizeDate,
      nextMilestone,
      nextMultiplier,
      daysToNext: Math.max(0, nextMilestone - activeStreak),
      topStreakers,
    });
  } catch (err) {
    console.error('Streak GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch streak' }, { status: 500 });
  }
}
