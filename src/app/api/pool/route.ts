import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMon + (offset * 7)));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return { weekStart, weekEnd };
}

// GET /api/pool - current week pool + top baptizers
export async function GET() {
  try {
    const { weekStart, weekEnd } = getWeekBounds();
    const { weekStart: lastWeekStart } = getWeekBounds(-1);

    const currentPool = await prisma.baptismPool.findUnique({ where: { weekStart } });

    // Top 10 baptizers this week
    const topBaptizers = await prisma.donation.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: weekStart, lt: weekEnd } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const userIds = topBaptizers.map(b => b.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, walletAddress: true, baptizeStreak: true, streakMultiplier: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const payoutShares = [0.25, 0.15, 0.12, 0.09, 0.09, 0.06, 0.06, 0.06, 0.06, 0.06];
    const poolTotal = currentPool?.totalPool || 0;

    const leaderboard = topBaptizers.map((b, i) => {
      const u = userMap[b.userId];
      const effectiveScore = (b._sum.amount || 0) * (u?.streakMultiplier || 1);
      return {
        rank: i + 1,
        user: u || { id: b.userId, username: null, walletAddress: '' },
        totalBaptized: b._sum.amount || 0,
        baptismCount: b._count.id || 0,
        streak: u?.baptizeStreak || 0,
        multiplier: u?.streakMultiplier || 1,
        effectiveScore,
        projectedPayout: 0,
        share: 0,
      };
    });

    leaderboard.sort((a, b) => b.effectiveScore - a.effectiveScore);
    leaderboard.forEach((item, i) => {
      item.rank = i + 1;
      item.share = payoutShares[i] || 0;
      item.projectedPayout = poolTotal * (payoutShares[i] || 0);
    });

    const lastPool = await prisma.baptismPool.findUnique({
      where: { weekStart: lastWeekStart },
      include: { payouts: true },
    });

    const now = new Date();
    const msRemaining = weekEnd.getTime() - now.getTime();
    const hoursRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60)));

    return NextResponse.json({
      currentPool: {
        total: poolTotal,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        daysRemaining: Math.max(0, Math.floor(hoursRemaining / 24)),
        hoursRemaining: hoursRemaining % 24,
      },
      leaderboard,
      lastWeek: lastPool ? {
        total: lastPool.totalPool,
        distributed: lastPool.distributed,
        payouts: lastPool.payouts,
      } : null,
    });
  } catch (err) {
    console.error('Pool GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch pool data' }, { status: 500 });
  }
}

// POST /api/pool - distribute last week's pool (admin only)
export async function POST(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminWallet = process.env.ADMIN_WALLET?.toLowerCase();
  if (!adminWallet || wallet.toLowerCase() !== adminWallet) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    const { weekStart: lastWeekStart } = getWeekBounds(-1);
    const pool = await prisma.baptismPool.findUnique({ where: { weekStart: lastWeekStart } });

    if (!pool || pool.distributed) {
      return NextResponse.json({ error: 'No pool to distribute or already distributed' }, { status: 400 });
    }

    const lastWeekEnd = new Date(lastWeekStart);
    lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() + 7);

    const topBaptizers = await prisma.donation.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    if (topBaptizers.length === 0) {
      return NextResponse.json({ error: 'No baptizers last week' }, { status: 400 });
    }

    const userIds = topBaptizers.map(b => b.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, streakMultiplier: true },
    });
    const multiplierMap = Object.fromEntries(users.map(u => [u.id, u.streakMultiplier]));

    const sorted = topBaptizers
      .map(b => ({
        userId: b.userId,
        effectiveScore: (b._sum.amount || 0) * (multiplierMap[b.userId] || 1),
      }))
      .sort((a, b) => b.effectiveScore - a.effectiveScore);

    const payoutShares = [0.25, 0.15, 0.12, 0.09, 0.09, 0.06, 0.06, 0.06, 0.06, 0.06];
    const payouts = [];

    for (let i = 0; i < sorted.length; i++) {
      const payoutAmount = pool.totalPool * (payoutShares[i] || 0);
      const payout = await prisma.poolPayout.create({
        data: {
          poolId: pool.id,
          userId: sorted[i].userId,
          rank: i + 1,
          amount: payoutAmount,
        },
      });
      payouts.push(payout);

      await prisma.user.update({
        where: { id: sorted[i].userId },
        data: {
          totalEarned: { increment: payoutAmount },
          earnedCount: { increment: 1 },
        },
      });
    }

    await prisma.baptismPool.update({
      where: { id: pool.id },
      data: { distributed: true },
    });

    return NextResponse.json({ success: true, payouts });
  } catch (err) {
    console.error('Pool distribute error:', err);
    return NextResponse.json({ error: 'Failed to distribute pool' }, { status: 500 });
  }
}
