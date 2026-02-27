import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint calculates and records weekly pool winners
// Call via: Vercel Cron, Railway Cron, or manual trigger
// It does NOT send SOL — it creates PoolPayout records that users claim

// Secure with a cron secret so random people can't trigger it
const CRON_SECRET = process.env.CRON_SECRET || '';

function getWeekBounds(offset = 0) {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMon + (offset * 7)));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return { weekStart, weekEnd };
}

// POST /api/pool/distribute - Calculate and record weekly winners
export async function POST(req: NextRequest) {
  // Auth: either cron secret header or admin wallet
  const authHeader = req.headers.get('authorization');
  const cronAuth = authHeader === `Bearer ${CRON_SECRET}`;

  if (!cronAuth && CRON_SECRET) {
    // Try admin wallet auth
    const { getWalletFromReq } = await import('@/lib/session');
    const wallet = await getWalletFromReq();
    const adminWallet = process.env.ADMIN_WALLET;
    if (!wallet || !adminWallet || wallet !== adminWallet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Distribute LAST WEEK's pool
    const { weekStart: lastWeekStart, weekEnd: lastWeekEnd } = getWeekBounds(-1);

    // Check if pool exists and hasn't been distributed
    let pool = await prisma.baptismPool.findUnique({ where: { weekStart: lastWeekStart } });

    if (!pool) {
      return NextResponse.json({ error: 'No pool found for last week', weekStart: lastWeekStart.toISOString() }, { status: 400 });
    }

    if (pool.distributed) {
      return NextResponse.json({ message: 'Already distributed', poolId: pool.id });
    }

    if (pool.totalPool <= 0) {
      // Mark as distributed even if empty
      await prisma.baptismPool.update({
        where: { id: pool.id },
        data: { distributed: true },
      });
      return NextResponse.json({ message: 'Pool was empty, marked as distributed' });
    }

    // Get top 10 baptizers from last week
    const topBaptizers = await prisma.donation.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: lastWeekStart, lt: lastWeekEnd } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    if (topBaptizers.length === 0) {
      await prisma.baptismPool.update({
        where: { id: pool.id },
        data: { distributed: true },
      });
      return NextResponse.json({ message: 'No baptizers last week' });
    }

    // Get user data for streak multipliers
    const userIds = topBaptizers.map(b => b.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, walletAddress: true, streakMultiplier: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // Sort by effective score (amount × streak multiplier)
    const sorted = topBaptizers
      .map(b => ({
        userId: b.userId,
        totalBaptized: b._sum.amount || 0,
        count: b._count.id || 0,
        multiplier: userMap[b.userId]?.streakMultiplier || 1,
        effectiveScore: (b._sum.amount || 0) * (userMap[b.userId]?.streakMultiplier || 1),
        wallet: userMap[b.userId]?.walletAddress || '',
        username: userMap[b.userId]?.username || null,
      }))
      .sort((a, b) => b.effectiveScore - a.effectiveScore);

    // Payout shares: 1st=25%, 2nd=15%, 3rd=12%, 4-5th=9%, 6-10th=6%
    const payoutShares = [0.25, 0.15, 0.12, 0.09, 0.09, 0.06, 0.06, 0.06, 0.06, 0.06];

    const payouts = [];

    for (let i = 0; i < sorted.length; i++) {
      const share = payoutShares[i] || 0;
      const payoutAmount = pool.totalPool * share;

      if (payoutAmount <= 0) continue;

      const payout = await prisma.poolPayout.create({
        data: {
          poolId: pool.id,
          userId: sorted[i].userId,
          rank: i + 1,
          amount: payoutAmount,
          claimed: false,
        },
      });

      payouts.push({
        rank: i + 1,
        username: sorted[i].username,
        wallet: sorted[i].wallet,
        totalBaptized: sorted[i].totalBaptized,
        effectiveScore: sorted[i].effectiveScore,
        share: `${(share * 100).toFixed(0)}%`,
        payoutAmount,
        payoutId: payout.id,
      });
    }

    // Mark pool as distributed
    await prisma.baptismPool.update({
      where: { id: pool.id },
      data: { distributed: true },
    });

    return NextResponse.json({
      success: true,
      pool: {
        weekStart: lastWeekStart.toISOString(),
        totalPool: pool.totalPool,
      },
      winners: payouts,
      totalDistributed: payouts.reduce((sum, p) => sum + p.payoutAmount, 0),
    });
  } catch (err) {
    console.error('Pool distribute error:', err);
    return NextResponse.json({ error: 'Distribution failed' }, { status: 500 });
  }
}

// GET: Check distribution status
export async function GET() {
  try {
    const { weekStart: lastWeekStart } = getWeekBounds(-1);
    const { weekStart: currentWeekStart } = getWeekBounds();

    const lastPool = await prisma.baptismPool.findUnique({
      where: { weekStart: lastWeekStart },
      include: {
        payouts: {
          orderBy: { rank: 'asc' },
        },
      },
    });

    const currentPool = await prisma.baptismPool.findUnique({
      where: { weekStart: currentWeekStart },
    });

    return NextResponse.json({
      lastWeek: lastPool ? {
        weekStart: lastPool.weekStart,
        totalPool: lastPool.totalPool,
        distributed: lastPool.distributed,
        winners: lastPool.payouts.map(p => ({
          rank: p.rank,
          userId: p.userId,
          amount: p.amount,
          claimed: p.claimed,
          claimedAt: p.claimedAt,
          txHash: p.txHash,
        })),
      } : null,
      currentWeek: currentPool ? {
        weekStart: currentPool.weekStart,
        totalPool: currentPool.totalPool,
      } : null,
    });
  } catch (err) {
    console.error('Pool distribute GET error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
