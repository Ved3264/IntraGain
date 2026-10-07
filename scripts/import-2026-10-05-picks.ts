import { randomUUID } from 'node:crypto';
import { database, ensurePortfolioSchema } from '../src/lib/db';
import { decryptPortfolio, encryptPortfolio } from '../src/lib/portfolio-crypto';

const PICK_DAY = '2026-10-05';
const payload = {
    picks: [
        { symbol: 'NINSYS-EQ', token: '14194', entryPrice: 842.00, selectedAt: '2026-10-05T21:17:04+05:30' },
        { symbol: 'MAWANASUG-EQ', token: '17022', entryPrice: 145.96, selectedAt: '2026-10-05T21:17:17+05:30' },
        { symbol: 'GRINDWELL-EQ', token: '13560', entryPrice: 2010.00, selectedAt: '2026-10-05T21:19:40+05:30' },
    ],
};

async function main() {
    await ensurePortfolioSchema();
    const existing = await database().query<{ encrypted_payload: string }>(
        'SELECT encrypted_payload FROM portfolio_batches WHERE pick_day = $1::date', [PICK_DAY],
    );
    if (existing.rows[0]) {
        const saved = decryptPortfolio<typeof payload>(existing.rows[0].encrypted_payload);
        const savedBySymbol = new Map(saved.picks.map(pick => [pick.symbol, pick]));
        for (const pick of payload.picks) {
            const previous = savedBySymbol.get(pick.symbol) as (typeof pick & {
                nextSessionPrice?: number;
                nextSessionDay?: string;
                horizonPrices?: Record<string, { price: number; day: string }>;
            }) | undefined;
            if (previous?.nextSessionPrice !== undefined) {
                Object.assign(pick, { nextSessionPrice: previous.nextSessionPrice, nextSessionDay: previous.nextSessionDay });
            }
            if (previous?.horizonPrices) Object.assign(pick, { horizonPrices: previous.horizonPrices });
        }
    }
    const encrypted = encryptPortfolio(payload);
    await database().query(`
        INSERT INTO portfolio_batches (id, pick_day, encrypted_payload)
        VALUES ($1, $2::date, $3)
        ON CONFLICT (pick_day) DO UPDATE
        SET encrypted_payload = EXCLUDED.encrypted_payload, updated_at = NOW()
    `, [randomUUID(), PICK_DAY, encrypted]);

    const result = await database().query<{ encrypted_payload: string }>(
        'SELECT encrypted_payload FROM portfolio_batches WHERE pick_day = $1::date', [PICK_DAY],
    );
    const restored = decryptPortfolio<typeof payload>(result.rows[0].encrypted_payload);
    if (restored.picks.length !== payload.picks.length || restored.picks.some((pick, index) => pick.symbol !== payload.picks[index].symbol)) {
        throw new Error('Stored batch did not pass encrypted verification.');
    }
    if (result.rows[0].encrypted_payload.includes('NINSYS')) throw new Error('Plaintext symbol reached PostgreSQL.');
    console.log(`Imported ${restored.picks.length} encrypted picks for ${PICK_DAY}.`);
}

main()
    .catch(error => { console.error(error instanceof Error ? error.message : 'Import failed.'); process.exitCode = 1; })
    .finally(() => database().end());
