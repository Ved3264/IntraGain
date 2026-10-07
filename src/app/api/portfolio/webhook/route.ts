import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolvePortfolioHistory } from '@/lib/portfolio';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store, max-age=0' };

function authorized(request: Request) {
    const secret = process.env.PORTFOLIO_WEBHOOK_SECRET || '';
    const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const expected = Buffer.from(secret);
    const received = Buffer.from(supplied);
    return secret.length >= 32 && expected.length === received.length && timingSafeEqual(expected, received);
}

export async function POST(request: Request) {
    if (!authorized(request)) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401, headers });
    try {
        return NextResponse.json({ success: true, data: await resolvePortfolioHistory(60) }, { headers });
    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Portfolio refresh failed.' }, { status: 500, headers });
    }
}
