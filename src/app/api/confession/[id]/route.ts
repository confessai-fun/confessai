import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

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
          select: { id: true, username: true, walletAddress: true },
        },
      },
    });

    const comments = await prisma.comment.findMany({
      where: { confessionId: confession.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { id: true, username: true, walletAddress: true },
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

// PATCH: Update confession txHash after on-chain posting
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { txHash } = await req.json();
    if (!txHash) return NextResponse.json({ error: 'Missing txHash' }, { status: 400 });

    const confession = await prisma.confession.findUnique({
      where: { id: params.id },
      include: { user: { select: { walletAddress: true } } },
    });

    if (!confession) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (confession.user.walletAddress !== wallet) return NextResponse.json({ error: 'Not your confession' }, { status: 403 });

    const updated = await prisma.confession.update({
      where: { id: params.id },
      data: { txHash, chainStatus: 'confirmed' },
    });

    return NextResponse.json({ success: true, confession: updated });
  } catch (err) {
    console.error('Confession PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
