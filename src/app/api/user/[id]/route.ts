import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/user/[id] — public user profile with paginated sections
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const confessionsCursor = searchParams.get('confessionsCursor');
    const baptismsCursor = searchParams.get('baptismsCursor');
    const earnedCursor = searchParams.get('earnedCursor');
    const limit = 10;

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        username: true,
        walletAddress: true,
        sinScore: true,
        totalConfessions: true,
        totalDonated: true,
        donationCount: true,
        totalEarned: true,
        earnedCount: true,
        baptizeStreak: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Paginated confessions
    const confessionsRaw = await prisma.confession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(confessionsCursor ? { cursor: { id: confessionsCursor }, skip: 1 } : {}),
      select: {
        id: true,
        confessionText: true,
        sinCategory: true,
        sinLevel: true,
        likesCount: true,
        commentsCount: true,
        totalDonated: true,
        donationCount: true,
        createdAt: true,
      },
    });
    const confessionsHasMore = confessionsRaw.length > limit;
    const confessions = confessionsHasMore ? confessionsRaw.slice(0, limit) : confessionsRaw;

    // Paginated baptisms given
    const baptismsGivenRaw = await prisma.donation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(baptismsCursor ? { cursor: { id: baptismsCursor }, skip: 1 } : {}),
      include: {
        confession: {
          select: { id: true, confessionText: true, sinCategory: true },
        },
      },
    });
    const baptismsHasMore = baptismsGivenRaw.length > limit;
    const baptismsGiven = baptismsHasMore ? baptismsGivenRaw.slice(0, limit) : baptismsGivenRaw;

    // Paginated donations earned
    const donationsEarnedRaw = await prisma.donation.findMany({
      where: {
        confession: { userId: user.id },
        userId: { not: user.id },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(earnedCursor ? { cursor: { id: earnedCursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, username: true, walletAddress: true } },
        confession: { select: { id: true, confessionText: true, sinCategory: true } },
      },
    });
    const earnedHasMore = donationsEarnedRaw.length > limit;
    const donationsEarned = earnedHasMore ? donationsEarnedRaw.slice(0, limit) : donationsEarnedRaw;

    return NextResponse.json({
      user,
      confessions,
      confessionsNextCursor: confessionsHasMore ? confessions[confessions.length - 1].id : null,
      baptismsGiven,
      baptismsNextCursor: baptismsHasMore ? baptismsGiven[baptismsGiven.length - 1].id : null,
      donationsEarned,
      earnedNextCursor: earnedHasMore ? donationsEarned[donationsEarned.length - 1].id : null,
    });
  } catch (err) {
    console.error('User profile error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
