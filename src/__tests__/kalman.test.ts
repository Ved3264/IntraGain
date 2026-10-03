import * as assert from 'node:assert';
import { detectKalmanTrend, defaultKalmanConfig } from '../lib/kalman';

// Generate mock candles
function generateCandles(prices: number[]) {
    return prices.map(p => ({ close: p }));
}

async function runTests() {
    console.log("Running Kalman Trend Detection Tests...");

    // 1. Sideways (constant price)
    let candles = generateCandles([100, 100, 100, 100, 100, 100]);
    let result = detectKalmanTrend(candles);
    assert.strictEqual(result.trend, 'SIDEWAYS', 'Constant price should be SIDEWAYS');

    // 2. Bullish (steadily increasing price)
    candles = generateCandles([100, 102, 104, 106, 108, 110, 112]);
    result = detectKalmanTrend(candles);
    assert.strictEqual(result.trend, 'BULLISH', 'Increasing price should be BULLISH');
    assert.ok(result.kalman_velocity > 0, 'Velocity should be positive');

    // 3. Bearish (steadily decreasing price)
    candles = generateCandles([100, 98, 96, 94, 92, 90, 88]);
    result = detectKalmanTrend(candles);
    assert.strictEqual(result.trend, 'BEARISH', 'Decreasing price should be BEARISH');
    assert.ok(result.kalman_velocity < 0, 'Velocity should be negative');

    // 4. Noisy Sideways
    candles = generateCandles([100, 101, 99, 100.5, 99.5, 100.2, 99.8, 100.1, 99.9]);
    result = detectKalmanTrend(candles);
    assert.strictEqual(result.trend, 'SIDEWAYS', 'Noisy flat market should be filtered to SIDEWAYS');

    // 5. Sudden Trend Change (Bullish to Bearish)
    // First 5 candles bullish, then huge drop and bearish
    let prices = [100, 102, 104, 106, 108, 90, 88, 86, 84, 82];
    result = detectKalmanTrend(generateCandles(prices));
    assert.strictEqual(result.trend, 'BEARISH', 'Trend should change to BEARISH after drop');

    // 6. Test configuration overrides
    const sensitiveConfig = { ...defaultKalmanConfig, threshold: 0.1, hysteresis: 1 };
    let sensitiveResult = detectKalmanTrend(generateCandles([100, 100.5, 101]), sensitiveConfig);
    assert.strictEqual(sensitiveResult.trend, 'BULLISH', 'Sensitive config should detect trend faster');

    console.log("All tests passed!");
}

runTests().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
