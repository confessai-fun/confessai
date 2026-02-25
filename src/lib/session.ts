import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  walletAddress?: string;
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_dev',
  cookieName: 'confessai_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
  },
};

// Get session using cookies() — Next.js 14 (synchronous cookies())
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// Quick helper to get wallet address
export async function getWalletFromReq(): Promise<string | null> {
  try {
    const session = await getSession();
    return session.walletAddress || null;
  } catch {
    return null;
  }
}
