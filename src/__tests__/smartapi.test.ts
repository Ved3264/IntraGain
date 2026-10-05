import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getHistoricalData } from '../lib/smartapi';

test('historical request ends at the current India time, not midnight or server-local time', async () => {
    let request: Record<string, string> = {};
    const api = { getCandleData: async (params: Record<string, string>) => {
        request = params;
        return { status: true, data: [['2026-10-05', 10, 12, 9, 11, 100]] };
    } };
    const before = Date.now();
    const data = await getHistoricalData(api, '123');
    const end = Date.parse(request.todate.replace(' ', 'T') + ':00+05:30');
    assert.ok(end >= before - 60000 && end <= Date.now());
    assert.equal(request.interval, 'ONE_DAY');
    assert.equal(data.length, 1);
});

test('provider failures and malformed candles cannot masquerade as empty successful results', async () => {
    for (const response of [{ status: false, data: [] }, { status: 500 },
        { status: true, data: [['today', 10, 12, 9, 'bad', 100]] }]) {
        await assert.rejects(getHistoricalData({ getCandleData: async () => response }, '123'), /unavailable/);
    }
    assert.deepEqual(await getHistoricalData({ getCandleData: async () => ({ status: true, data: [] }) }, '123'), []);
});
