import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const confession = await prisma.confession.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, username: true, walletAddress: true, sinScore: true },
        },
      },
    });

    if (!confession) {
      return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    }

    const donations = await prisma.donation.findMany({
      where: { confessionId: confession.id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { username: true, walletAddress: true },
        },
      },
    });

    const comments = await prisma.comment.findMany({
      where: { confessionId: confession.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { username: true, walletAddress: true },
        },
      },
    });

    return NextResponse.json({
      confession,
      donations,
      comments,
      totalDonated: confession.totalDonated,
      donationCount: confession.donationCount,
    });
  } catch (err) {
    console.error('Confession detail error:', err);
    return NextResponse.json({ error: 'Failed to load confession' }, { status: 500 });
  }
}
