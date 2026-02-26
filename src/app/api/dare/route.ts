import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

// GET /api/dare - get dares for current user
export async function GET(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'received';
  const confessionId = searchParams.get('confessionId');

  let where: any = {};
  if (type === 'received') {
    where = { toUserId: user.id, status: 'pending' };
  } else if (type === 'given') {
    where = { fromUserId: user.id };
  } else if (type === 'confession' && confessionId) {
    where = { confessionId };
  }

  try {
    const dares = await prisma.dare.findMany({
      where,
      include: {
        fromUser: { select: { id: true, username: true, walletAddress: true } },
        toUser: { select: { id: true, username: true, walletAddress: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ dares });
  } catch (err) {
    console.error('Dare GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch dares' }, { status: 500 });
  }
}

// POST /api/dare - create a new dare
export async function POST(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const donor = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (!donor) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { confessionId, dareText, amount, txHash } = await req.json();

  if (!confessionId || !dareText || !amount || !txHash) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (dareText.length > 280) {
    return NextResponse.json({ error: 'Dare too long (max 280 chars)' }, { status: 400 });
  }

  try {
    const confession = await prisma.confession.findUnique({
      where: { id: confessionId },
      select: { userId: true },
    });

    if (!confession) {
      return NextResponse.json({ error: 'Confession not found' }, { status: 404 });
    }

    if (confession.userId === donor.id) {
      return NextResponse.json({ error: "Can't dare yourself" }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const dare = await prisma.dare.create({
      data: {
        confessionId,
        fromUserId: donor.id,
        toUserId: confession.userId,
        dareText,
        amount,
        txHash,
        expiresAt,
      },
      include: {
        fromUser: { select: { id: true, username: true } },
      },
    });

    return NextResponse.json({ dare });
  } catch (err) {
    console.error('Dare POST error:', err);
    return NextResponse.json({ error: 'Failed to create dare' }, { status: 500 });
  }
}

// PATCH /api/dare - accept or decline a dare
export async function PATCH(req: NextRequest) {
  const wallet = await getWalletFromReq();
  if (!wallet) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { dareId, action } = await req.json();

  if (!dareId || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const dare = await prisma.dare.findUnique({ where: { id: dareId } });

    if (!dare) return NextResponse.json({ error: 'Dare not found' }, { status: 404 });
    if (dare.toUserId !== user.id) return NextResponse.json({ error: 'Not your dare' }, { status: 403 });
    if (dare.status !== 'pending') return NextResponse.json({ error: 'Dare already responded to' }, { status: 400 });

    if (new Date() > dare.expiresAt) {
      await prisma.dare.update({ where: { id: dareId }, data: { status: 'expired' } });
      return NextResponse.json({ error: 'Dare expired' }, { status: 400 });
    }

    if (action === 'accept') {
      const updated = await prisma.dare.update({
        where: { id: dareId },
        data: { status: 'accepted', acceptedAt: new Date() },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          totalEarned: { increment: dare.amount },
          earnedCount: { increment: 1 },
        },
      });

      return NextResponse.json({ dare: updated, message: 'Dare accepted! Now confess your dare.' });
    } else {
      const updated = await prisma.dare.update({
        where: { id: dareId },
        data: { status: 'declined' },
      });
      return NextResponse.json({ dare: updated, message: 'Dare declined.' });
    }
  } catch (err) {
    console.error('Dare PATCH error:', err);
    return NextResponse.json({ error: 'Failed to update dare' }, { status: 500 });
  }
}
