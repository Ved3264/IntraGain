import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createScanService, type ScanResult } from '../lib/scan-job';

const stocks = [{ symbol: 'ONE', token: '1' }, { symbol: 'TWO', token: '2' }];
const result = (symbol: string): ScanResult => ({ symbol, price: 10, volume: 100, ema9: 9,
    rvol: 1, isAboveEma9: true, daysSinceCrossover: 2, isSupertrendBullish: true,
    timestamp: new Date().toISOString(), kalman: { trend: 'BULLISH', kalman_price: 10,
        kalman_velocity: 1, trend_strength: 1, confidence: 1, trend_changed: false } });
function directory(t: TestContext) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'intragain-scan-'));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return dir;
}

test('checkpoints survive reload and replayed requests do not duplicate results', async t => {
    const dir = directory(t);
    let calls = 0;
    const scan = async (stock: typeof stocks[number]) => { calls++; return result(stock.symbol); };
    const first = createScanService(dir, scan, stocks);
    const job = first.start();
    assert.equal(first.start().id, job.id);
    const chunk = await first.advance(job.id, 0);
    assert.equal(chunk.processed, 1);
    const resumed = createScanService(dir, scan, stocks);
    assert.equal(resumed.read()?.data[0].symbol, 'ONE');
    await resumed.advance(job.id, 0);
    assert.equal(calls, 1);
    const completed = await resumed.advance(job.id, 1);
    assert.equal(completed.status, 'completed');
    assert.deepEqual(completed.data.map(r => r.symbol), ['ONE', 'TWO']);
    await resumed.advance(job.id, 2);
    assert.equal(calls, 2);
    assert.notEqual(resumed.start().id, job.id);
    assert.equal(resumed.read()?.data.length, 0);
});

test('API errors pause at the same cursor; insufficient history counts as skipped', async t => {
    let failing = true;
    const service = createScanService(directory(t), async stock => {
        if (failing) throw new Error('Provider unavailable');
        return stock.token === '1' ? null : result(stock.symbol);
    }, stocks);
    const job = service.start();
    const failed = await service.advance(job.id, 0);
    assert.equal(failed.status, 'paused');
    assert.equal(failed.processed, 0);
    assert.equal(failed.error, 'Provider unavailable');
    failing = false;
    const retried = await service.advance(job.id, 0);
    assert.equal(retried.skipped, 1);
    assert.equal(retried.error, null);
    const completed = await service.advance(job.id, 1);
    assert.equal(completed.data.length, 1);
    assert.equal(completed.processed, 2);
});

test('simultaneous requests share the lock and unknown jobs cannot advance', async t => {
    let release!: () => void;
    const barrier = new Promise<void>(resolve => { release = resolve; });
    let calls = 0;
    const service = createScanService(directory(t), async stock => {
        calls++; await barrier; return result(stock.symbol);
    }, stocks);
    const job = service.start();
    const pending = service.advance(job.id, 0);
    const duplicate = await service.advance(job.id, 0);
    assert.equal(duplicate.processed, 0);
    release();
    assert.equal((await pending).processed, 1);
    assert.equal(calls, 1);
    await assert.rejects(service.advance('missing', 0), /no longer available/);
});
