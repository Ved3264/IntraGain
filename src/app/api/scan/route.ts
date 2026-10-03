import { NextResponse } from 'next/server';
import { runScan } from '@/lib/scanner';

export async function POST() {
    try {
        const results = await runScan();
        return NextResponse.json({ success: true, data: results });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
