import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { randomBytes, createHash } from 'crypto';
import { ethers } from 'ethers';

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
  },
};

// GET /api/auth — get nonce or check session
export async function GET(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'nonce') {
    const nonce = randomBytes(16).toString('hex');
    session.nonce = nonce;
    await session.save();
    return new NextResponse(JSON.stringify({ nonce }), {
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(res.headers.entries()) },
    });
  }

  return new NextResponse(
    JSON.stringify({ authenticated: !!session.walletAddress, walletAddress: session.walletAddress || null }),
    { headers: { 'Content-Type': 'application/json', ...Object.fromEntries(res.headers.entries()) } }
  );
}

// POST /api/auth — verify signature
export async function POST(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);

  const { address, signature, nonce } = await req.json();

  try {
    // Verify nonce matches
    if (!session.nonce || session.nonce !== nonce) {
      return NextResponse.json({ error: 'Invalid nonce' }, { status: 401 });
    }

    // Build the same message that was signed on client
    const message = `Sign in to PumpConfession.ai\n\nNonce: ${nonce}`;

    // Recover signer address from signature
    const recovered = ethers.verifyMessage(message, signature);

    // Compare addresses (case-insensitive)
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 401 });
    }

    session.walletAddress = address.toLowerCase();
    session.nonce = undefined;
    await session.save();

    return new NextResponse(
      JSON.stringify({ authenticated: true, walletAddress: session.walletAddress }),
      { headers: { 'Content-Type': 'application/json', ...Object.fromEntries(res.headers.entries()) } }
    );
  } catch (err) {
    console.error('Auth verify error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
  }
}

// DELETE /api/auth — logout
export async function DELETE(req: NextRequest) {
  const res = new NextResponse();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  session.destroy();
  return new NextResponse(JSON.stringify({ authenticated: false }), {
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(res.headers.entries()) },
  });
}
