import { database, ensurePortfolioSchema } from '../src/lib/db';
import { decryptPortfolio, encryptPortfolio } from '../src/lib/portfolio-crypto';
import { randomUUID } from 'node:crypto';

async function main() {
    await ensurePortfolioSchema();
    const marker = { ok: true, checkedAt: new Date().toISOString() };
    const encrypted = encryptPortfolio(marker);
    if (encrypted.includes('checkedAt') || !decryptPortfolio<typeof marker>(encrypted).ok) throw new Error('Encryption round trip failed.');
    const result = await database().query("SELECT to_regclass('public.portfolio_batches') AS table_name");
    if (result.rows[0]?.table_name !== 'portfolio_batches') throw new Error('Portfolio table was not created.');
    const client = await database().connect();
    try {
        await client.query('BEGIN');
        const privatePayload = { picks: [{ symbol: 'PRIVATE-CHECK-EQ', entryPrice: 987.65 }] };
        await client.query('INSERT INTO portfolio_batches (id, pick_day, encrypted_payload) VALUES ($1, $2, $3)',
            [randomUUID(), '2099-12-31', encryptPortfolio(privatePayload)]);
        const stored = await client.query<{ encrypted_payload: string }>("SELECT encrypted_payload FROM portfolio_batches WHERE pick_day = '2099-12-31'");
        if (stored.rows[0].encrypted_payload.includes('PRIVATE-CHECK-EQ')) throw new Error('Plaintext reached PostgreSQL.');
        if (decryptPortfolio<typeof privatePayload>(stored.rows[0].encrypted_payload).picks[0].symbol !== 'PRIVATE-CHECK-EQ') throw new Error('Database encryption round trip failed.');
        await client.query('ROLLBACK');
    } finally { client.release(); }
    console.log('Portfolio database connected; schema and encrypted-at-rest transaction passed.');
    await database().end();
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Database check failed.'); process.exitCode = 1; });
