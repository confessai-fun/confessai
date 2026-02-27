import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';
const SESSION_COOKIE = 'confessai_session';

export async function getWalletFromReq(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE);
    if (!session) return null;

    const { payload, signature } = JSON.parse(Buffer.from(session.value, 'base64').toString());
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;

    const data = JSON.parse(payload);

    // Session valid for 7 days
    if (Date.now() - data.iat > 7 * 24 * 60 * 60 * 1000) return null;

    return data.walletAddress; // Now a Solana base58 address
  } catch {
    return null;
  }
}
