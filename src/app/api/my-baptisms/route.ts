import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

export async function GET(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return NextResponse.json({ donations: [] });

    const donations = await prisma.donation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        confession: {
          select: {
            id: true,
            confessionText: true,
            sinCategory: true,
            sinLevel: true,
            aiResponse: true,
          },
        },
      },
    });

    return NextResponse.json({
      donations,
      totalDonated: user.totalDonated,
      donationCount: user.donationCount,
    });
  } catch (err) {
    console.error('My baptisms error:', err);
    return NextResponse.json({ donations: [], totalDonated: 0, donationCount: 0 });
  }
}
