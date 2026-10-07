import { NextResponse } from 'next/server';
import { portfolioAnalysis, saveTodayPicks } from '@/lib/portfolio';
import { readSmallJson } from '@/lib/request';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET(request: Request) {
    const denied = await requireAdmin();
    if (denied) return denied;
    try {
        const parameters = new URL(request.url).searchParams;
        const mode = parameters.get('range') === 'days' ? 'days' : 'month';
        const requestedDays = Number(parameters.get('days') || '30');
        const days = Number.isInteger(requestedDays) ? Math.min(365, Math.max(1, requestedDays)) : 30;
        const requestedHorizon = Number(parameters.get('horizon') || '1');
        const horizon = [1, 2, 15, 30].includes(requestedHorizon) ? requestedHorizon : 1;
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        const startDay = mode === 'month' ? `${today.slice(0, 8)}01` : undefined;
        const effectiveDays = mode === 'month' ? Number(today.slice(8, 10)) : days;
        return NextResponse.json({ success: true, data: await portfolioAnalysis(effectiveDays, horizon, startDay) }, { headers });
    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to load portfolio.' }, { status: 500, headers });
    }
}

export async function POST(request: Request) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    try {
        const body = await readSmallJson(request, 16 * 1024) as { picks?: unknown } | null;
        if (!Array.isArray(body?.picks) || !body.picks.every(pick => {
            if (!pick || typeof pick !== 'object') return false;
            const candidate = pick as { symbol?: unknown; side?: unknown };
            return typeof candidate.symbol === 'string' && (candidate.side === 'buy' || candidate.side === 'short');
        })) {
            return NextResponse.json({ success: false, error: 'Assign Buy or Short to every selected stock.' }, { status: 400, headers });
        }
        return NextResponse.json({ success: true, data: await saveTodayPicks(body.picks as Array<{ symbol: string; side: 'buy' | 'short' }>) }, { headers });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save portfolio.';
        return NextResponse.json({ success: false, error: message }, { status: message.includes('does not have') || message.includes('Select') ? 400 : 500, headers });
    }
}
