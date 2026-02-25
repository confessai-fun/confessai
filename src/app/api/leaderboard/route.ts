import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/leaderboard — top donors
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Top donors by total amount
    const topDonors = await prisma.user.findMany({
      where: { totalDonated: { gt: 0 } },
      orderBy: { totalDonated: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        walletAddress: true,
        totalDonated: true,
        donationCount: true,
        sinScore: true,
      },
    });

    // Total church treasury
    const treasury = await prisma.donation.aggregate({
      _sum: { amount: true },
      _count: { id: true },
    });

    // Recent donations
    const recentDonations = await prisma.donation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { username: true, walletAddress: true } },
        confession: { select: { id: true, confessionText: true, sinCategory: true } },
      },
    });

    return NextResponse.json({
      topDonors,
      treasury: {
        totalETH: treasury._sum.amount || 0,
        totalDonations: treasury._count.id || 0,
      },
      recentDonations,
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ topDonors: [], treasury: { totalETH: 0, totalDonations: 0 }, recentDonations: [] });
  }
}
