import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHmac } from 'crypto';
import { ethers } from 'ethers';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';

interface SessionData {
  walletAddress?: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_dev',
  cookieName: 'confessai_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
  },
};

const NONCE_SECRET = process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_dev';

// Sign a nonce so we can verify it later without storing in session
function signNonce(nonce: string): string {
  return createHmac('sha256', NONCE_SECRET).update(nonce).digest('hex');
}

function verifyNonce(nonce: string, mac: string): boolean {
  const expected = createHmac('sha256', NONCE_SECRET).update(nonce).digest('hex');
  return expected === mac;
}

// GET /api/auth — get nonce or check session
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'nonce') {
      // Generate nonce + HMAC signature
      const nonce = randomBytes(16).toString('hex');
      const mac = signNonce(nonce);

      // Return nonce and its MAC — client sends both back on POST
      // Also set nonce in a simple cookie as backup
      const response = NextResponse.json({ nonce, mac });
      response.cookies.set('pump_nonce', `${nonce}:${mac}`, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 300, // 5 min expiry
        path: '/',
      });
      return response;
    }

    // Check existing session
    const cookieStore = cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

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
    const { address, signature, nonce, mac } = await req.json();

    // Verify nonce authenticity via HMAC (no session needed!)
    // Try client-provided MAC first, fall back to cookie
    let nonceValid = false;

    if (mac && nonce) {
      nonceValid = verifyNonce(nonce, mac);
    }

    if (!nonceValid) {
      // Try cookie-based nonce as fallback
      const nonceCookie = req.cookies.get('pump_nonce')?.value;
      if (nonceCookie) {
        const [cookieNonce, cookieMac] = nonceCookie.split(':');
        if (cookieNonce === nonce && verifyNonce(cookieNonce, cookieMac)) {
          nonceValid = true;
        }
      }
    }

    if (!nonceValid) {
      console.error('[Auth] Nonce verification failed');
      return NextResponse.json({ error: 'Invalid or expired nonce. Please try again.' }, { status: 401 });
    }

    // Build the same message that was signed on client
    const message = `Sign in to ConfessAI\n\nNonce: ${nonce}`;

    // Recover signer address from signature
    const recovered = ethers.verifyMessage(message, signature);

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      console.error('[Auth] Address mismatch — recovered:', recovered, 'claimed:', address);
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 });
    }

    // Set session
    const cookieStore = cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.walletAddress = address.toLowerCase();
    await session.save();

    // Clear nonce cookie
    const response = NextResponse.json({
      authenticated: true,
      walletAddress: session.walletAddress,
    });
    response.cookies.delete('pump_nonce');
    return response;
  } catch (err) {
    console.error('Auth POST error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}

// DELETE /api/auth — logout
export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.destroy();
    return NextResponse.json({ authenticated: false });
  } catch (err) {
    console.error('Auth DELETE error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
