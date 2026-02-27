import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { prisma } from '@/lib/prisma';

const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';
const SESSION_COOKIE = 'confessai_session';

// Helper: Create HMAC for nonce integrity
function createMac(nonce: string): string {
  return crypto.createHmac('sha256', SESSION_SECRET).update(nonce).digest('hex');
}

// Helper: Verify HMAC
function verifyMac(nonce: string, mac: string): boolean {
  const expected = createMac(nonce);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
}

// Helper: Create session token
function createSession(walletAddress: string): string {
  const payload = JSON.stringify({ walletAddress, iat: Date.now() });
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
}

// Helper: Verify session token
function verifySession(token: string): { walletAddress: string } | null {
  try {
    const { payload, signature } = JSON.parse(Buffer.from(token, 'base64').toString());
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
    const data = JSON.parse(payload);
    // Session valid for 7 days
    if (Date.now() - data.iat > 7 * 24 * 60 * 60 * 1000) return null;
    return { walletAddress: data.walletAddress };
  } catch {
    return null;
  }
}

// GET: Check session or get nonce
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // Generate nonce for signing
  if (action === 'nonce') {
    const nonce = crypto.randomBytes(32).toString('hex');
    const mac = createMac(nonce);
    return NextResponse.json({ nonce, mac });
  }

  // Check existing session
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  const data = verifySession(session.value);
  if (!data) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ authenticated: true, walletAddress: data.walletAddress });
}

// POST: Verify Solana signature and create session
export async function POST(req: NextRequest) {
  try {
    const { address, signature, nonce, mac } = await req.json();

    // Validate inputs
    if (!address || !signature || !nonce || !mac) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify nonce integrity
    if (!verifyMac(nonce, mac)) {
      return NextResponse.json({ error: 'Invalid nonce' }, { status: 400 });
    }

    // Verify Solana signature
    const message = `Sign in to ConfessAI\n\nNonce: ${nonce}`;
    const encodedMessage = new TextEncoder().encode(message);

    let publicKeyBytes: Uint8Array;
    let signatureBytes: Uint8Array;

    try {
      publicKeyBytes = bs58.decode(address);
      signatureBytes = bs58.decode(signature);
    } catch {
      return NextResponse.json({ error: 'Invalid address or signature format' }, { status: 400 });
    }

    const isValid = nacl.sign.detached.verify(encodedMessage, signatureBytes, publicKeyBytes);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Upsert user in database
    await prisma.user.upsert({
      where: { walletAddress: address },
      update: { lastLogin: new Date() },
      create: { walletAddress: address },
    });

    // Create session
    const sessionToken = createSession(address);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return NextResponse.json({ authenticated: true, walletAddress: address });
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

// DELETE: Logout
export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ success: true });
}
