import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { STOCKS, scanStock } from './scanner';
import { getSmartAPI } from './smartapi';

export type ScanResult = NonNullable<Awaited<ReturnType<typeof scanStock>>>;
export interface ScanJob {
    id: string;
    status: 'running' | 'paused' | 'completed';
    processed: number;
    total: number;
    skipped: number;
    lastSymbol: string | null;
    startedAt: string;
    updatedAt: string;
    error: string | null;
    data: ScanResult[];
}

// Progress and results are committed together in one authoritative snapshot.
export function createScanService(directory: string, scan: (stock: typeof STOCKS[number]) => Promise<ScanResult | null>, stocks = STOCKS) {
    const file = path.join(directory, 'scan-job.json');
    let busy = false;
    function read(): ScanJob | null {
        return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    }
    function save(job: ScanJob) {
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(`${file}.tmp`, JSON.stringify(job));
        fs.renameSync(`${file}.tmp`, file);
        return job;
    }
    function start() {
        const existing = read();
        if (existing && existing.status !== 'completed') return existing;
        const now = new Date().toISOString();
        return save({ id: randomUUID(), status: 'running', processed: 0, total: stocks.length,
            skipped: 0, lastSymbol: null, startedAt: now, updatedAt: now, error: null, data: [] });
    }
    async function advance(id: string, cursor: number) {
        const job = read();
        if (!job || job.id !== id) throw new Error('This scan is no longer available. The server may have restarted. Reload and start a new scan.');
        // Replays and simultaneous tabs cannot advance the same cursor twice.
        if (busy || job.processed !== cursor || job.status === 'completed') return job;
        busy = true;
        try {
            const stock = stocks[job.processed];
            const result = await scan(stock);
            if (result) job.data.push(result);
            else job.skipped++;
            job.processed++;
            job.lastSymbol = stock.symbol;
            job.error = null;
            job.status = job.processed === job.total ? 'completed' : 'running';
        } catch (error) {
            job.status = 'paused';
            job.error = error instanceof Error ? error.message : 'Scan interrupted. Resume to retry.';
        } finally {
            busy = false;
        }
        job.updatedAt = new Date().toISOString();
        return save(job);
    }
    return { read, start, advance };
}

// Share the lock across route bundles in Render's single Node instance.
const globalScan = globalThis as typeof globalThis & { scanService?: ReturnType<typeof createScanService> };
export const scanService = globalScan.scanService ??= createScanService(
    path.join(process.cwd(), 'data'),
    async stock => {
        const { smart_api } = await getSmartAPI();
        try { return await scanStock(stock, smart_api); }
        finally { await new Promise(resolve => setTimeout(resolve, 500)); }
    },
);
