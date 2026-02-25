import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'recent'; // recent | trending | sinful
    const category = searchParams.get('category'); // Greed, FOMO, etc. or null for all
    const mine = searchParams.get('mine') === 'true'; // only my confessions

    // Build where clause
    const where: any = {};
    if (category && category !== 'all') {
      where.sinCategory = category;
    }

    // Get current user if authenticated
    let currentUserId: string | null = null;
    try {
      const wallet = await getWalletFromReq();
      if (wallet) {
        const user = await prisma.user.findUnique({
          where: { walletAddress: wallet },
        });
        if (user) currentUserId = user.id;
      }
    } catch {}

    if (mine) {
      if (!currentUserId) {
        return NextResponse.json({ confessions: [], nextCursor: null, categories: [] });
      }
      where.userId = currentUserId;
    }

    // Build orderBy
    let orderBy: any;
    switch (sort) {
      case 'trending':
        orderBy = [{ likesCount: 'desc' }, { commentsCount: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'sinful':
        orderBy = [{ createdAt: 'desc' }];
        break;
      default:
        orderBy = { createdAt: 'desc' };
    }

    let confessions = await prisma.confession.findMany({
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where,
      orderBy,
      include: { user: true },
    });

    // For "sinful" sort, re-order by sin level severity
    if (sort === 'sinful') {
      const sinOrder: Record<string, number> = {
        'Unforgivable': 0,
        'Cardinal': 1,
        'Mortal': 2,
        'Venial': 3,
      };
      confessions = confessions.sort((a, b) => {
        const aOrder = sinOrder[a.sinLevel] ?? 4;
        const bOrder = sinOrder[b.sinLevel] ?? 4;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // Check likes for authenticated user
    let likedIds = new Set<string>();
    if (currentUserId && confessions.length > 0) {
      const likes = await prisma.like.findMany({
        where: {
          userId: currentUserId,
          confessionId: { in: confessions.map((c) => c.id) },
        },
        select: { confessionId: true },
      });
      likedIds = new Set(likes.map((l) => l.confessionId));
    }

    // Get category counts for filter pills
    const categoryWhere: any = {};
    if (mine && currentUserId) categoryWhere.userId = currentUserId;
    
    const categoryCounts = await prisma.confession.groupBy({
      by: ['sinCategory'],
      _count: { id: true },
      where: Object.keys(categoryWhere).length > 0 ? categoryWhere : undefined,
    });

    const totalCount = await prisma.confession.count({
      where: Object.keys(categoryWhere).length > 0 ? categoryWhere : undefined,
    });

    const result = confessions.map((c) => ({
      ...c,
      userLiked: likedIds.has(c.id),
    }));

    return NextResponse.json({
      confessions: result,
      nextCursor: confessions.length === limit ? confessions[confessions.length - 1].id : null,
      categories: categoryCounts.map((cc) => ({ name: cc.sinCategory, count: cc._count.id })),
      totalCount,
    });
  } catch (err) {
    console.error('Feed error:', err);
    return NextResponse.json({ confessions: [], nextCursor: null, categories: [], totalCount: 0 }, { status: 500 });
  }
}
