import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminAuthStore } from '@/lib/admin-auth-store';
import { ADMIN_COOKIE, adminCookieOptions, privateHeaders, requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export async function POST(request: Request) {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    try {
        const cookieStore = await cookies();
        adminAuthStore.logout(cookieStore.get(ADMIN_COOKIE)?.value);
        const response = NextResponse.json({ success: true }, { headers: privateHeaders });
        response.cookies.set(ADMIN_COOKIE, '', { ...adminCookieOptions, maxAge: 0 });
        return response;
    } catch { return NextResponse.json({ error: 'Unable to sign out.' }, { status: 503, headers: privateHeaders }); }
}
