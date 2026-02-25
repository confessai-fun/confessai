import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const confessionId = searchParams.get('confessionId');
  if (!confessionId) return NextResponse.json({ error: 'Missing confessionId' }, { status: 400 });

  try {
    const comments = await prisma.comment.findMany({
      where: { confessionId },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });
    return NextResponse.json({ comments });
  } catch (err) {
    console.error('Comments GET error:', err);
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { confessionId, text } = await req.json();
  if (!confessionId || !text?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const comment = await prisma.comment.create({
      data: { confessionId, userId: user.id, commentText: text.trim() },
      include: { user: true },
    });

    await prisma.confession.update({
      where: { id: confessionId },
      data: { commentsCount: { increment: 1 } },
    });

    return NextResponse.json({ comment });
  } catch (err) {
    console.error('Comments POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
