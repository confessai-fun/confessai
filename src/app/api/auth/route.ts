import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import { cookies } from 'next/headers';

interface SessionData {
  walletAddress?: string;
  nonce?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_dev',
  cookieName: 'pump_confession_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

// Helper: get session using cookies() for App Router
async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

// GET /api/auth — get nonce or check session
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'nonce') {
      const nonce = randomBytes(16).toString('hex');
      session.nonce = nonce;
      await session.save();
      return NextResponse.json({ nonce });
    }

    return NextResponse.json({
      authenticated: !!session.walletAddress,
      walletAddress: session.walletAddress || null,
    });
  } catch (err) {
    console.error('Auth GET error:', err);
    return NextResponse.json({ authenticated: false, walletAddress: null });
  }
}

// POST /api/auth — verify signature
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const { address, signature, nonce } = await req.json();

    console.log('[Auth] Verifying:', { address: address?.slice(0, 10), nonce: nonce?.slice(0, 8), sessionNonce: session.nonce?.slice(0, 8) });

    // Verify nonce matches
    if (!session.nonce || session.nonce !== nonce) {
      console.error('[Auth] Nonce mismatch — session:', session.nonce, 'client:', nonce);
      return NextResponse.json({ error: 'Invalid nonce. Please try again.' }, { status: 401 });
    }

    // Build the same message that was signed on client
    const message = `Sign in to PumpConfession.ai\n\nNonce: ${nonce}`;

    // Recover signer address from signature
    const recovered = ethers.verifyMessage(message, signature);

    // Compare addresses (case-insensitive)
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      console.error('[Auth] Address mismatch — recovered:', recovered, 'claimed:', address);
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 });
    }

    session.walletAddress = address.toLowerCase();
    session.nonce = undefined;
    await session.save();

    return NextResponse.json({
      authenticated: true,
      walletAddress: session.walletAddress,
    });
  } catch (err) {
    console.error('Auth POST error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

// DELETE /api/auth — logout
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ authenticated: false });
  } catch (err) {
    console.error('Auth DELETE error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
