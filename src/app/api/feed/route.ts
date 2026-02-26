import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getWalletFromReq } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sort = searchParams.get('sort') || 'recent';
    const category = searchParams.get('category');
    const mine = searchParams.get('mine') === 'true';

    const where: any = {};
    if (category && category !== 'all') {
      where.sinCategory = category;
    }

    let currentUserId: string | null = null;
    try {
      const wallet = await getWalletFromReq();
      if (wallet) {
        const user = await prisma.user.findUnique({
          where: { walletAddress: wallet },
          select: { id: true },
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

    // Fetch limit+1 to know if there's a next page
    let confessions = await prisma.confession.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where,
      orderBy,
      include: {
        user: true,
        _count: {
          select: { dares: true },
        },
      },
    });

    // Determine if there's more
    let hasMore = confessions.length > limit;
    if (hasMore) confessions = confessions.slice(0, limit);

    // For "sinful" sort, re-order by sin level severity
    if (sort === 'sinful') {
      const sinOrder: Record<string, number> = {
        'Unforgivable': 0, 'Cardinal': 1, 'Mortal': 2, 'Venial': 3,
      };
      confessions = confessions.sort((a, b) => {
        const aOrder = sinOrder[a.sinLevel] ?? 4;
        const bOrder = sinOrder[b.sinLevel] ?? 4;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // Check likes for authenticated user - single batch query
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

    // Category counts - only on first page (no cursor), cached per sort/mine combo
    let categories: { name: string; count: number }[] = [];
    let totalCount = 0;
    if (!cursor) {
      const categoryWhere: any = {};
      if (mine && currentUserId) categoryWhere.userId = currentUserId;

      const [categoryCounts, total] = await Promise.all([
        prisma.confession.groupBy({
          by: ['sinCategory'],
          _count: { id: true },
          where: Object.keys(categoryWhere).length > 0 ? categoryWhere : undefined,
        }),
        prisma.confession.count({
          where: Object.keys(categoryWhere).length > 0 ? categoryWhere : undefined,
        }),
      ]);

      categories = categoryCounts.map((cc) => ({ name: cc.sinCategory, count: cc._count.id }));
      totalCount = total;
    }

    const nextCursor = hasMore ? confessions[confessions.length - 1].id : null;

    const result = confessions.map((c) => ({
      ...c,
      userLiked: likedIds.has(c.id),
    }));

    return NextResponse.json({
      confessions: result,
      nextCursor,
      categories,
      totalCount,
    });
  } catch (err) {
    console.error('Feed error:', err);
    return NextResponse.json({ confessions: [], nextCursor: null, categories: [], totalCount: 0 }, { status: 500 });
  }
}
