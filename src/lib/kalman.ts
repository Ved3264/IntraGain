export interface KalmanConfig {
    q_p: number; // Process noise for price
    q_v: number; // Process noise for velocity
    r: number;   // Measurement noise
    p0: number;  // Initial covariance
    threshold: number; // Trend confidence threshold
    hysteresis: number; // Hysteresis threshold (in candles)
}

export const defaultKalmanConfig: KalmanConfig = {
    q_p: 0.01,
    q_v: 0.001,
    r: 1.0,
    p0: 10.0,
    threshold: 1.0, 
    hysteresis: 2, 
};

export type TrendState = 'BULLISH' | 'BEARISH' | 'SIDEWAYS';

export interface KalmanResult {
    trend: TrendState;
    kalman_price: number;
    kalman_velocity: number;
    trend_strength: number;
    confidence: number;
    trend_changed: boolean;
}

export function detectKalmanTrend(candles: any[], config: KalmanConfig = defaultKalmanConfig): KalmanResult {
    if (!candles || candles.length === 0) {
        return {
            trend: 'SIDEWAYS',
            kalman_price: 0,
            kalman_velocity: 0,
            trend_strength: 0,
            confidence: 0,
            trend_changed: false
        };
    }

    // Attempt to extract close from standard format [timestamp, open, high, low, close, volume]
    // or from object { close: 123 }
    const getClose = (c: any) => {
        if (Array.isArray(c)) return parseFloat(c[4]);
        if (c && c.close !== undefined) return parseFloat(c.close);
        return NaN;
    };

    let initialPrice = getClose(candles[0]);
    let x = [initialPrice, 0]; // [price, velocity]
    let P = [[config.p0, 0], [0, config.p0]];

    let currentTrend: TrendState = 'SIDEWAYS';
    let pendingTrend: TrendState = 'SIDEWAYS';
    let pendingTrendCount = 0;
    let trendChanged = false;

    for (let i = 1; i < candles.length; i++) {
        const z = getClose(candles[i]);
        if (isNaN(z)) continue; // safely ignore missing data

        // Predict step
        // State transition matrix F = [[1, 1], [0, 1]]
        const x_pred = [x[0] + x[1], x[1]];
        // P_pred = F * P * F^T + Q
        const P_pred = [
            [P[0][0] + P[0][1] + P[1][0] + P[1][1] + config.q_p, P[0][1] + P[1][1]],
            [P[1][0] + P[1][1], P[1][1] + config.q_v]
        ];

        // Update step
        // Measurement matrix H = [1, 0]
        const y = z - x_pred[0]; // Measurement residual
        const S = P_pred[0][0] + config.r; // Residual covariance
        const K = [P_pred[0][0] / S, P_pred[1][0] / S]; // Kalman Gain

        x = [
            x_pred[0] + K[0] * y,
            x_pred[1] + K[1] * y
        ];

        // P = (I - K * H) * P_pred
        P = [
            [(1 - K[0]) * P_pred[0][0], (1 - K[0]) * P_pred[0][1]],
            [-K[1] * P_pred[0][0] + P_pred[1][0], -K[1] * P_pred[0][1] + P_pred[1][1]]
        ];

        // Evaluate Trend State
        const velocity = x[1];
        const velocity_uncertainty = Math.sqrt(P[1][1]);
        const trend_strength = velocity_uncertainty > 0 ? velocity / velocity_uncertainty : 0;
        
        let rawTrend: TrendState = 'SIDEWAYS';
        if (trend_strength > config.threshold) {
            rawTrend = 'BULLISH';
        } else if (trend_strength < -config.threshold) {
            rawTrend = 'BEARISH';
        }

        trendChanged = false;

        // Apply hysteresis state machine
        if (rawTrend !== currentTrend) {
            if (rawTrend === pendingTrend) {
                pendingTrendCount++;
                if (pendingTrendCount >= config.hysteresis) {
                    currentTrend = rawTrend;
                    trendChanged = true;
                    pendingTrendCount = 0;
                }
            } else {
                pendingTrend = rawTrend;
                pendingTrendCount = 1;
                if (config.hysteresis <= 1) {
                    currentTrend = rawTrend;
                    trendChanged = true;
                    pendingTrendCount = 0;
                }
            }
        } else {
            pendingTrend = currentTrend;
            pendingTrendCount = 0;
        }
    }

    const finalVelocity = x[1];
    const finalUncertainty = Math.sqrt(P[1][1]);
    const finalTrendStrength = finalUncertainty > 0 ? finalVelocity / finalUncertainty : 0;

    return {
        trend: currentTrend,
        kalman_price: x[0],
        kalman_velocity: x[1],
        trend_strength: finalTrendStrength,
        confidence: Math.abs(finalTrendStrength),
        trend_changed: trendChanged
    };
}
