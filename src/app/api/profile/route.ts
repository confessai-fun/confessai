import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

export async function GET(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const user = await prisma.user.upsert({
      where: { walletAddress: wallet },
      update: {},
      create: { walletAddress: wallet },
    });

    const confessions = await prisma.confession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ user, confessions });
  } catch (err) {
    console.error('Profile GET error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const { username } = await req.json();

    const user = await prisma.user.update({
      where: { walletAddress: wallet },
      data: { username: username?.trim() || null },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Profile PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
