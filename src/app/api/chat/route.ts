import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { chatWithPriest } from '@/lib/gemini';
import { getWalletFromReq } from '@/lib/session';

export async function GET(req: NextRequest) {
  const wallet = await getWalletFromReq(req);
  if (!wallet) return NextResponse.json({ messages: [] });

  try {
    const user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
    if (!user) return NextResponse.json({ messages: [] });

    const messages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error('Chat GET error:', err);
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: NextRequest) {
  const wallet = await getWalletFromReq(req);
  if (!wallet) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

  try {
    const user = await prisma.user.upsert({
      where: { walletAddress: wallet },
      update: {},
      create: { walletAddress: wallet },
    });

    // Save user message
    await prisma.chatMessage.create({
      data: { userId: user.id, role: 'user', content: message.trim() },
    });

    // Get history
    const history = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
      select: { role: true, content: true },
    });

    // AI response
    const aiText = await chatWithPriest(history);

    const saved = await prisma.chatMessage.create({
      data: { userId: user.id, role: 'assistant', content: aiText },
    });

    return NextResponse.json({ message: saved });
  } catch (err) {
    console.error('Chat POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
