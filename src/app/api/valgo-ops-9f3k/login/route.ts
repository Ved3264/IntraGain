import { NextResponse } from 'next/server';
import { adminAuthStore } from '@/lib/admin-auth-store';
import { ADMIN_COOKIE, adminCookieOptions, privateHeaders, sameOrigin } from '@/lib/admin-auth';
import { readSmallJson } from '@/lib/request';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    if (!sameOrigin(request)) return NextResponse.json({ error: 'Request origin denied.' }, { status: 403, headers: privateHeaders });
    let password: string;
    try {
        const body = await readSmallJson(request) as { password?: unknown } | null;
        if (typeof body?.password !== 'string' || !body.password || Buffer.byteLength(body.password) > 256) throw new Error();
        password = body.password;
    } catch {
        return NextResponse.json({ error: 'Enter a valid password.' }, { status: 400, headers: privateHeaders });
    }
    try {
        const result = await adminAuthStore.login(password);
        if (!result.ok) return NextResponse.json({ error: result.status === 429 ? 'Too many attempts. Try again later.' : 'Incorrect password.' }, {
            status: result.status,
            headers: { ...privateHeaders, ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}) },
        });
        const response = NextResponse.json({ success: true }, { headers: privateHeaders });
        response.cookies.set(ADMIN_COOKIE, result.token, adminCookieOptions);
        return response;
    } catch {
        return NextResponse.json({ error: 'Admin sign-in is not configured.' }, { status: 503, headers: privateHeaders });
    }
}
