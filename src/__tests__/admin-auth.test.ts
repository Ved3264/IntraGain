import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAdminAuthStore } from '../lib/admin-auth-store';
import { hashAdminPassword, verifyAdminPassword } from '../lib/admin-password';
import { sanitizePublicReturns } from '../lib/public-returns';
import type { PortfolioAnalysis } from '../lib/portfolio-types';

test('admin password is salted and verified without storing plaintext', async () => {
    const hash = await hashAdminPassword('Test-Admin@123');
    assert.equal(await verifyAdminPassword('Test-Admin@123', hash), true);
    assert.equal(await verifyAdminPassword('wrong', hash), false);
    assert.equal(hash.includes('Test-Admin@123'), false);
    assert.notEqual(hash, await hashAdminPassword('Test-Admin@123'));
});

test('sessions expire, revoke, reject tampering, and failed logins throttle', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'valgo-admin-'));
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    let now = Date.now();
    const hash = await hashAdminPassword('Test-Admin@123');
    const store = createAdminAuthStore(path.join(directory, 'state.json'), () => hash, () => now);
    const login = await store.login('Test-Admin@123');
    assert.equal(login.ok, true);
    if (!login.ok) return;
    assert.equal(store.authenticate(login.token), true);
    assert.equal(store.authenticate('0'.repeat(64)), false);
    store.logout(login.token);
    assert.equal(store.authenticate(login.token), false);
    for (let attempt = 0; attempt < 5; attempt++) assert.equal((await store.login('wrong')).status, 401);
    assert.equal((await store.login('Test-Admin@123')).status, 429);
    now += 15 * 60 * 1000;
    const renewed = await store.login('Test-Admin@123');
    assert.equal(renewed.ok, true);
    if (!renewed.ok) return;
    now += 31 * 60 * 1000;
    assert.equal(store.authenticate(renewed.token), false);
});

test('public returns expose display prices but hide private portfolio and provider data', () => {
    const full: PortfolioAnalysis = {
        days: 15, startDay: '2026-09-24', horizonDays: 2, generatedAt: '2026-10-08T00:00:00Z', liveError: 'private provider detail',
        summary: { cohorts: 1, picks: 1, completedPicks: 1, nextSessionReturnPct: 2, holdingReturnPct: 4, horizonReturnPct: 3, investedAmount: 10000, currentValue: 10400 },
        cohorts: [{ id: 'private-id', pickDay: '2026-10-07', nextSessionReturnPct: 2, holdingReturnPct: 4, horizonReturnPct: 3,
            picks: [{ symbol: 'ABC-EQ', entryPrice: 100, currentPrice: 104, nextSessionPrice: 102, nextSessionReturnPct: 2, holdingReturnPct: 4, status: 'closed', horizonDays: 2, horizonPrice: 103, horizonReturnPct: 3, horizonStatus: 'closed' }] }],
    };
    const publicData = sanitizePublicReturns(full);
    const serialized = JSON.stringify(publicData);
    for (const privateValue of ['currentPrice', 'nextSessionPrice', 'nextSessionReturnPct', 'holdingReturnPct', 'investedAmount', 'currentValue', 'private-id', 'private provider detail']) {
        assert.equal(serialized.includes(privateValue), false);
    }
    assert.equal(publicData.cohorts[0].picks[0].symbol, 'ABC-EQ');
    assert.equal(publicData.cohorts[0].picks[0].entryPrice, 100);
    assert.equal(publicData.cohorts[0].picks[0].horizonPrice, 103);
    assert.equal(publicData.cohorts[0].picks[0].returnPct, 3);
});
