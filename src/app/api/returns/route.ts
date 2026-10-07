import { NextResponse } from 'next/server';
import { portfolioAnalysis } from '@/lib/portfolio';
import { sanitizePublicReturns } from '@/lib/public-returns';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=30' };
type PublicData = ReturnType<typeof sanitizePublicReturns>;
const shared = globalThis as typeof globalThis & { publicReturnsCache?: Map<string, { expires: number; promise: Promise<PublicData> }> };
const cache = shared.publicReturnsCache ??= new Map();

export async function GET(request: Request) {
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
        const cacheKey = `${mode}:${effectiveDays}:${horizon}:${startDay || ''}`;
        let entry = cache.get(cacheKey);
        if (!entry || entry.expires <= Date.now()) {
            entry = { expires: Date.now() + 30_000, promise: portfolioAnalysis(effectiveDays, horizon, startDay).then(sanitizePublicReturns) };
            cache.set(cacheKey, entry);
            entry.promise.catch(() => { if (cache.get(cacheKey) === entry) cache.delete(cacheKey); });
        }
        const data = await entry.promise;
        return NextResponse.json({ success: true, data }, { headers });
    } catch {
        return NextResponse.json({ success: false, error: 'Returns are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
}
