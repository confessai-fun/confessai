import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

export async function POST(req: NextRequest) {
  const wallet = await getWalletFromReq(req);
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { confessionId } = await req.json();
  if (!confessionId) return NextResponse.json({ error: 'Missing confessionId' }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existing = await prisma.like.findUnique({
      where: { confessionId_userId: { confessionId, userId: user.id } },
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      await prisma.confession.update({ where: { id: confessionId }, data: { likesCount: { decrement: 1 } } });
      return NextResponse.json({ liked: false });
    } else {
      await prisma.like.create({ data: { confessionId, userId: user.id } });
      await prisma.confession.update({ where: { id: confessionId }, data: { likesCount: { increment: 1 } } });
      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    console.error('Like error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
