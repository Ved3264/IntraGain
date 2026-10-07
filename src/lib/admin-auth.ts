import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_SECONDS, adminAuthStore } from './admin-auth-store';

const production = process.env.NODE_ENV === 'production';
export const ADMIN_COOKIE = production ? '__Host-valgo-admin' : 'valgo-admin';
export const adminCookieOptions = {
    httpOnly: true, secure: production, sameSite: 'strict' as const, path: '/',
    maxAge: ADMIN_SESSION_SECONDS, priority: 'high' as const,
};
export const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function isAdmin() {
    return adminAuthStore.authenticate((await cookies()).get(ADMIN_COOKIE)?.value);
}

export function sameOrigin(request: Request) {
    try {
        const configured = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
        if (production && !configured) return false;
        const expected = new URL(configured || request.url).origin;
        return request.headers.get('origin') === expected && request.headers.get('sec-fetch-site') !== 'cross-site';
    } catch { return false; }
}

export async function requireAdmin(request?: Request) {
    if (!await isAdmin()) return NextResponse.json({ success: false, error: 'Admin sign-in required.' }, { status: 401, headers: privateHeaders });
    if (request && !sameOrigin(request)) return NextResponse.json({ success: false, error: 'Request origin denied.' }, { status: 403, headers: privateHeaders });
    return null;
}
