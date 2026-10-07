import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { scanService } from '@/lib/scan-job';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'no-store' };

export async function GET() {
    const denied = await requireAdmin();
    if (denied) return denied;
    try {
        const job = scanService.read();
        if (job) return NextResponse.json({ success: true, data: job.data, job }, { headers });
        const filePath = path.join(process.cwd(), 'data', 'screener-results.json');
        if (fs.existsSync(filePath)) {
            const fileData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(fileData);
            return NextResponse.json({ success: true, data }, { headers });
        } else {
            return NextResponse.json({ success: true, data: [] }, { headers });
        }
    } catch {
        return NextResponse.json({ success: false, error: 'Unable to load saved results.' }, { status: 500, headers });
    }
}
