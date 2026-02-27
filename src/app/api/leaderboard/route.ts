import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/leaderboard — combined leaderboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get all users with any activity - use simple query that works even without new columns
    let users: any[];
    try {
      users = await prisma.user.findMany({
        where: {
          OR: [
            { totalDonated: { gt: 0 } },
            { donationCount: { gt: 0 } },
            { sinScore: { gt: 0 } },
            { totalConfessions: { gt: 0 } },
          ],
        },
        select: {
          id: true,
          username: true,
          walletAddress: true,
          totalDonated: true,
          donationCount: true,
          totalEarned: true,
          earnedCount: true,
          sinScore: true,
          totalConfessions: true,
          createdAt: true,
        },
      });
    } catch (selectErr) {
      // Fallback if totalEarned/earnedCount columns don't exist yet
      console.warn('Leaderboard: new columns may not exist, using fallback query');
      const rawUsers = await prisma.user.findMany({
        where: {
          OR: [
            { totalDonated: { gt: 0 } },
            { donationCount: { gt: 0 } },
            { sinScore: { gt: 0 } },
            { totalConfessions: { gt: 0 } },
          ],
        },
      });
      users = rawUsers.map((u: any) => ({
        ...u,
        totalEarned: u.totalEarned ?? 0,
        earnedCount: u.earnedCount ?? 0,
      }));
    }

    // Calculate composite score
    const now = Date.now();
    const scored = users.map((u: any) => {
      const ageDays = Math.floor((now - new Date(u.createdAt).getTime()) / 86400000);
      const totalEarned = u.totalEarned || 0;
      const earnedCount = u.earnedCount || 0;
      const compositeScore = Math.round(
        (u.totalDonated * 50) +
        (u.donationCount * 10) +
        (totalEarned * 100) +
        (earnedCount * 15) +
        (u.sinScore) +
        (ageDays * 0.5)
      );
      return { ...u, totalEarned, earnedCount, compositeScore, ageDays };
    });

    // Sort by composite score
    scored.sort((a: any, b: any) => b.compositeScore - a.compositeScore);
    const topUsers = scored.slice(0, limit);

    // Top donors
    const topDonors = [...scored]
      .filter((u: any) => u.totalDonated > 0)
      .sort((a: any, b: any) => b.totalDonated - a.totalDonated)
      .slice(0, 10);

    // Top earners
    const topEarners = [...scored]
      .filter((u: any) => (u.totalEarned || 0) > 0)
      .sort((a: any, b: any) => (b.totalEarned || 0) - (a.totalEarned || 0))
      .slice(0, 10);

    // Treasury
    const treasury = await prisma.donation.aggregate({
      _sum: { amount: true },
      _count: { id: true },
    });

    // Recent donations
    const recentDonations = await prisma.donation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, username: true, walletAddress: true } },
        confession: { select: { id: true, confessionText: true, sinCategory: true, userId: true } },
      },
    });

    return NextResponse.json({
      topUsers,
      topDonors,
      topEarners,
      treasury: {
        totalSOL: treasury._sum.amount || 0,
        totalDonations: treasury._count.id || 0,
      },
      recentDonations,
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({
      topUsers: [], topDonors: [], topEarners: [],
      treasury: { totalSOL: 0, totalDonations: 0 }, recentDonations: [],
    });
  }
}
