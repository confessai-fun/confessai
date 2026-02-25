import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const totalConfessions = await prisma.confession.count();
    const totalSinners = await prisma.user.count({ where: { sinScore: { gt: 0 } } });
    const onChainCount = await prisma.confession.count({ where: { chainStatus: 'confirmed' } });

    const categoryCounts = await prisma.confession.groupBy({
      by: ['sinCategory'],
      _count: { id: true },
    });

    return NextResponse.json({
      totalConfessions,
      totalSinners,
      onChainCount,
      categoryCounts: categoryCounts.map((c) => ({ name: c.sinCategory, count: c._count.id })),
    });
  } catch (err) {
    console.error('Stats error:', err);
    return NextResponse.json({ totalConfessions: 0, totalSinners: 0, onChainCount: 0, categoryCounts: [] });
  }
}
