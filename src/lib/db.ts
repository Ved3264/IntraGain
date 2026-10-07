import { Pool } from 'pg';

const globalDb = globalThis as typeof globalThis & { portfolioPool?: Pool; portfolioSchema?: Promise<void> };

function connectionString() {
    const value = process.env.DATABASE_URL;
    if (!value) throw new Error('DATABASE_URL is not configured.');
    return value;
}

export function database() {
    if (!globalDb.portfolioPool) {
        const url = new URL(connectionString());
        globalDb.portfolioPool = new Pool({
            connectionString: url.toString(),
            ssl: url.hostname.endsWith('.render.com') ? { rejectUnauthorized: true } : undefined,
            max: 3,
            idleTimeoutMillis: 20_000,
            connectionTimeoutMillis: 10_000,
        });
    }
    return globalDb.portfolioPool;
}

export function ensurePortfolioSchema() {
    return globalDb.portfolioSchema ??= database().query(`
        CREATE TABLE IF NOT EXISTS portfolio_batches (
            id UUID PRIMARY KEY,
            pick_day DATE NOT NULL UNIQUE,
            encrypted_payload TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS portfolio_batches_pick_day_idx ON portfolio_batches (pick_day DESC);
    `).then(() => undefined).catch(error => {
        globalDb.portfolioSchema = undefined;
        throw error;
    });
}
