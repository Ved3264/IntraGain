import { NextResponse } from 'next/server';
import { scanService } from '@/lib/scan-job';
import { readSmallJson } from '@/lib/request';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };

export async function POST(request: Request) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    try {
        const body = await readSmallJson(request) as { action?: string; id?: string; cursor?: number } | null;
        if (body?.action === 'start') {
            return NextResponse.json({ success: true, job: scanService.start() }, { headers });
        }
        if (body?.action !== 'advance' || typeof body.id !== 'string' || typeof body.cursor !== 'number' || !Number.isInteger(body.cursor) || body.cursor < 0) {
            return NextResponse.json({ success: false, error: 'Invalid scan request.' }, { status: 400, headers });
        }
        const job = await scanService.advance(body.id, body.cursor);
        return NextResponse.json({ success: true, job }, { headers });
    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to save scan progress.' }, { status: 500, headers });
    }
}
