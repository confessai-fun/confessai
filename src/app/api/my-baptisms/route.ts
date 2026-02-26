import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

export async function GET(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '10');

    const user = await prisma.user.findUnique({
      where: { walletAddress: wallet },
      select: { id: true, totalDonated: true, donationCount: true },
    });
    if (!user) return NextResponse.json({ donations: [], totalDonated: 0, donationCount: 0, nextCursor: null });

    const donations = await prisma.donation.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        confession: {
          select: {
            id: true,
            confessionText: true,
            sinCategory: true,
            sinLevel: true,
          },
        },
      },
    });

    const hasMore = donations.length > limit;
    const page = hasMore ? donations.slice(0, limit) : donations;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    return NextResponse.json({
      donations: page,
      totalDonated: user.totalDonated,
      donationCount: user.donationCount,
      nextCursor,
    });
  } catch (err) {
    console.error('My baptisms error:', err);
    return NextResponse.json({ donations: [], totalDonated: 0, donationCount: 0, nextCursor: null });
  }
}
