import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptPortfolio, encryptPortfolio } from '../lib/portfolio-crypto';
import { indiaDay, isNseClosed } from '../lib/india-time';

test('portfolio encryption is randomized, authenticated, and round trips', () => {
    const previous = process.env.PORTFOLIO_ENCRYPTION_KEY;
    process.env.PORTFOLIO_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    try {
        const payload = { picks: [{ symbol: 'PRIVATE-EQ', entryPrice: 123.45 }] };
        const first = encryptPortfolio(payload);
        const second = encryptPortfolio(payload);
        assert.notEqual(first, second);
        assert.equal(first.includes('PRIVATE-EQ'), false);
        assert.deepEqual(decryptPortfolio(first), payload);
        const parts = first.split('.');
        const changed = Buffer.from(parts[3], 'base64');
        changed[0] ^= 1;
        const tampered = [parts[0], parts[1], parts[2], changed.toString('base64')].join('.');
        assert.throws(() => decryptPortfolio(tampered));
    } finally {
        if (previous === undefined) delete process.env.PORTFOLIO_ENCRYPTION_KEY;
        else process.env.PORTFOLIO_ENCRYPTION_KEY = previous;
    }
});

test('India market day and close are independent of server timezone', () => {
    assert.equal(indiaDay(new Date('2026-01-01T18:45:00Z')), '2026-01-02');
    assert.equal(isNseClosed(new Date('2026-01-02T09:59:00Z')), false); // 15:29 IST
    assert.equal(isNseClosed(new Date('2026-01-02T10:05:00Z')), true);  // 15:35 IST
    assert.equal(isNseClosed(new Date('2026-01-03T05:00:00Z')), true);  // Saturday
});
