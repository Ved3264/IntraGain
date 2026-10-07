import { NextResponse } from 'next/server';
import { STOCKS } from '@/lib/scanner';
import { getMarketQuotes } from '@/lib/smartapi';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET() {
    const denied = await requireAdmin();
    if (denied) return denied;
    try {
        const data = (await getMarketQuotes(STOCKS)).map(quote => ({
            symbol: quote.symbol,
            price: quote.ltp,
            previousClose: quote.previousClose,
            changePercent: quote.changePercent,
            exchangeTime: quote.exchangeTime,
        }));
        return NextResponse.json({ success: true, data, generatedAt: new Date().toISOString() }, { headers });
    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to load live market.' }, { status: 502, headers });
    }
}
