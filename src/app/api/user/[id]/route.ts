import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/user/[id] — public user profile
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
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
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Recent confessions
    const confessions = await prisma.confession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
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

    // Baptisms given (donations made by this user)
    const baptismsGiven = await prisma.donation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        confession: {
          select: { id: true, confessionText: true, sinCategory: true },
        },
      },
    });

    // Donations earned (donations received on user's confessions)
    const donationsEarned = await prisma.donation.findMany({
      where: {
        confession: { userId: user.id },
        userId: { not: user.id }, // exclude self-baptisms
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { id: true, username: true, walletAddress: true } },
        confession: { select: { id: true, confessionText: true, sinCategory: true } },
      },
    });

    return NextResponse.json({
      user,
      confessions,
      baptismsGiven,
      donationsEarned,
    });
  } catch (err) {
    console.error('User profile error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
