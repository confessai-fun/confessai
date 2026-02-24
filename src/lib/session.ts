import { getIronSession, IronSession } from 'iron-session';
import { NextRequest, NextResponse } from 'next/server';

export interface SessionData {
  walletAddress?: string;
  nonce?: string;
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_dev',
  cookieName: 'pump_confession_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
  },
};

// For route handlers — pass req directly
export async function getSessionFromReq(req: NextRequest, res: NextResponse): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, sessionOptions);
}

// Quick helper to get wallet from request
export async function getWalletFromReq(req: NextRequest): Promise<string | null> {
  try {
    const res = new NextResponse();
    const session = await getIronSession<SessionData>(req, res, sessionOptions);
    return session.walletAddress || null;
  } catch {
    return null;
  }
}
