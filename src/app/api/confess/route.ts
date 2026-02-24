import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { judgeConfession, SIN_SCORE_MAP } from '@/lib/gemini';
import { getWalletFromReq } from '@/lib/session';
import { postConfessionOnChain } from '@/lib/onchain';

export async function POST(req: NextRequest) {
  const wallet = await getWalletFromReq(req);
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { confession } = await req.json();
  if (!confession || confession.trim().length < 10) {
    return NextResponse.json({ error: 'Confession too short' }, { status: 400 });
  }

  try {
    const user = await prisma.user.upsert({
      where: { walletAddress: wallet },
      update: {},
      create: { walletAddress: wallet },
    });

    // AI judgment
    const ai = await judgeConfession(confession.trim());

    // Save to DB immediately (chainStatus: 'pending')
    const confessionRow = await prisma.confession.create({
      data: {
        userId: user.id,
        confessionText: confession.trim(),
        sinCategory: ai.sinCategory,
        sinLevel: ai.sinLevel,
        aiResponse: ai.response,
        penance: ai.penance,
        chainStatus: 'pending',
      },
      include: { user: true },
    });

    // Update user stats
    const scoreAdd = SIN_SCORE_MAP[ai.sinLevel] || 10;
    await prisma.user.update({
      where: { id: user.id },
      data: { sinScore: { increment: scoreAdd }, totalConfessions: { increment: 1 } },
    });

    // Post on-chain in background (don't block response)
    // User gets instant response, tx confirms in background
    postConfessionOnChain({
      sinnerAddress: wallet,
      confessionText: confession.trim(),
      sinCategory: ai.sinCategory,
      sinLevel: ai.sinLevel,
      aiResponse: ai.response,
    }).then(async (result) => {
      if (result) {
        await prisma.confession.update({
          where: { id: confessionRow.id },
          data: {
            txHash: result.txHash,
            onChainId: result.onChainId,
            chainStatus: 'confirmed',
          },
        });
        console.log(`[Chain] Confession ${confessionRow.id} confirmed: ${result.txHash}`);
      } else {
        await prisma.confession.update({
          where: { id: confessionRow.id },
          data: { chainStatus: 'failed' },
        });
      }
    }).catch(async (err) => {
      console.error('[Chain] Background tx error:', err);
      await prisma.confession.update({
        where: { id: confessionRow.id },
        data: { chainStatus: 'failed' },
      });
    });

    return NextResponse.json({ confession: confessionRow, ai });
  } catch (err) {
    console.error('Confess error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
