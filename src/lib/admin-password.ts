import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

function derive(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => scrypt(password, salt, 64,
        { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 },
        (error, value) => error ? reject(error) : resolve(value)));
}

export function validAdminPasswordHash(value: string) {
    return /^scrypt:131072:8:1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(value);
}

export async function hashAdminPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    return `scrypt:131072:8:1:${salt}:${(await derive(password, salt)).toString('hex')}`;
}

export async function verifyAdminPassword(password: string, encoded: string) {
    if (!validAdminPasswordHash(encoded) || !password || Buffer.byteLength(password) > 256) return false;
    const parts = encoded.split(':');
    return timingSafeEqual(await derive(password, parts[4]), Buffer.from(parts[5], 'hex'));
}
