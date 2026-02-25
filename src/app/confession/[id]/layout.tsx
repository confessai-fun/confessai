import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const confession = await prisma.confession.findUnique({
      where: { id: params.id },
      select: { confessionText: true, sinCategory: true, sinLevel: true },
    });

    if (!confession) {
      return { title: 'Confession Not Found — ConfessAI' };
    }

    const preview = confession.confessionText.slice(0, 120) + (confession.confessionText.length > 120 ? '...' : '');
    const title = `⛪ ${confession.sinCategory} — ${confession.sinLevel} | ConfessAI`;
    const description = `"${preview}" — Judged by Father Degen on-chain. $CONFESS`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch {
    return { title: 'ConfessAI' };
  }
}

export default function ConfessionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
