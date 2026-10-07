import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION = 1;

function key() {
    const value = process.env.PORTFOLIO_ENCRYPTION_KEY || '';
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length !== 32 || decoded.toString('base64') !== value) {
        throw new Error('PORTFOLIO_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
    }
    return decoded;
}

export function encryptPortfolio(value: unknown) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key(), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return [VERSION, iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decryptPortfolio<T>(value: string): T {
    const [version, encodedIv, encodedTag, encodedData] = value.split('.');
    if (Number(version) !== VERSION || !encodedIv || !encodedTag || !encodedData) throw new Error('Unsupported encrypted portfolio data.');
    const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(encodedIv, 'base64'));
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(encodedData, 'base64')), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as T;
}
