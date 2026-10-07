import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { validAdminPasswordHash, verifyAdminPassword } from './admin-password';

export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
const IDLE_MS = 30 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
interface AuthState {
    passwordVersion: string;
    attempts: number[];
    sessions: Record<string, { expires: number; lastSeen: number }>;
}

export function createAdminAuthStore(file: string, getHash: () => string, now = Date.now) {
    let verifying = false;
    function read(): AuthState {
        const passwordHash = getHash();
        if (!validAdminPasswordHash(passwordHash)) throw new Error('Admin login is not configured.');
        const passwordVersion = digest(passwordHash);
        let state: AuthState = { passwordVersion, attempts: [], sessions: {} };
        if (fs.existsSync(file)) {
            const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as AuthState;
            if (saved.passwordVersion === passwordVersion) state = saved;
        }
        state.attempts = state.attempts.filter(attempt => attempt > now() - ATTEMPT_WINDOW_MS);
        for (const [tokenHash, session] of Object.entries(state.sessions)) {
            if (session.expires <= now() || session.lastSeen <= now() - IDLE_MS) delete state.sessions[tokenHash];
        }
        return state;
    }
    function save(state: AuthState) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(`${file}.tmp`, JSON.stringify(state), { mode: 0o600 });
        fs.renameSync(`${file}.tmp`, file);
    }
    async function login(password: string) {
        const state = read();
        if (verifying || state.attempts.length >= 5) {
            return { ok: false as const, status: 429, retryAfter: verifying ? 2 : Math.max(1, Math.ceil((state.attempts[0] + ATTEMPT_WINDOW_MS - now()) / 1000)) };
        }
        state.attempts.push(now());
        save(state);
        verifying = true;
        try {
            if (!await verifyAdminPassword(password, getHash())) return { ok: false as const, status: 401, retryAfter: 0 };
            const current = read();
            const token = randomBytes(32).toString('hex');
            current.attempts = [];
            current.sessions[digest(token)] = { expires: now() + ADMIN_SESSION_SECONDS * 1000, lastSeen: now() };
            save(current);
            return { ok: true as const, token };
        } finally { verifying = false; }
    }
    function authenticate(token?: string) {
        if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
        try {
            const state = read();
            const session = state.sessions[digest(token)];
            if (!session) return false;
            session.lastSeen = now();
            save(state);
            return true;
        } catch { return false; }
    }
    function logout(token?: string) {
        const state = read();
        if (token) delete state.sessions[digest(token)];
        save(state);
    }
    return { login, authenticate, logout };
}

const shared = globalThis as typeof globalThis & { adminAuthStore?: ReturnType<typeof createAdminAuthStore> };
export const adminAuthStore = shared.adminAuthStore ??= createAdminAuthStore(
    path.join(process.cwd(), 'data', 'admin-auth.json'), () => process.env.ADMIN_PASSWORD_HASH || '',
);
