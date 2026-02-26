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
    const trimmed = username?.trim() || null;

    // Validate username
    if (trimmed) {
      // Length check
      if (trimmed.length < 3 || trimmed.length > 20) {
        return NextResponse.json({ error: 'Username must be 3-20 characters' }, { status: 400 });
      }

      // Only allow alphanumeric, underscore, dash
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return NextResponse.json({ error: 'Username can only contain letters, numbers, _ and -' }, { status: 400 });
      }

      // Check uniqueness (case-insensitive)
      const existing = await prisma.user.findFirst({
        where: {
          username: { equals: trimmed, mode: 'insensitive' },
          NOT: { walletAddress: wallet },
        },
      });

      if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
    }

    const user = await prisma.user.update({
      where: { walletAddress: wallet },
      data: { username: trimmed },
    });

    return NextResponse.json({ user });
  } catch (err: any) {
    // Catch Prisma unique constraint error as fallback
    if (err?.code === 'P2002' && err?.meta?.target?.includes('username')) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }
    console.error('Profile PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
