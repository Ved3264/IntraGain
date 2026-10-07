import fs from 'node:fs';
import path from 'node:path';
import { hashAdminPassword } from '../src/lib/admin-password';

async function main() {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
    if (password.length < 10 || Buffer.byteLength(password) > 256) throw new Error();
    const hash = await hashAdminPassword(password);
    const file = path.join(process.cwd(), '.env.development.local');
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const remaining = existing.split(/\r?\n/).filter(line => !/^ADMIN_PASSWORD_HASH\s*=/.test(line)).join('\n').trimEnd();
    fs.writeFileSync(file, `${remaining}\nADMIN_PASSWORD_HASH=${hash}\n`, { mode: 0o600 });
    console.log('Admin password hash saved. Restart the development server.');
}
main().catch(() => { console.error('Unable to set admin password.'); process.exitCode = 1; });
