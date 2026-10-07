import { randomUUID } from 'node:crypto';
import { database, ensurePortfolioSchema } from './db';
import { decryptPortfolio, encryptPortfolio } from './portfolio-crypto';
import { daysAgo, indiaDay, isNseClosed } from './india-time';
import { STOCKS } from './scanner';
import { scanService } from './scan-job';
import { getHistoricalData, getMarketQuotes, getSmartAPI } from './smartapi';
import type { PortfolioAnalysis, PortfolioCohortView, PortfolioPickView } from './portfolio-types';

interface StoredPick {
    symbol: string;
    token: string;
    side?: 'buy' | 'short';
    entryPrice: number;
    referencePrice?: number;
    entryAtOpen?: boolean;
    entryDay?: string;
    selectedAt: string;
    nextSessionPrice?: number;
    nextSessionDay?: string;
    horizonPrices?: Record<string, { price: number; day: string }>;
}
interface StoredBatch { picks: StoredPick[]; }
interface BatchRow { id: string; pick_day: string; encrypted_payload: string; }

const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
export const directionalReturnPercent = (end: number, start: number, side: 'buy' | 'short') => {
    if (start <= 0) return null;
    const longReturn = (end / start - 1) * 100;
    return side === 'short' ? -longReturn : longReturn;
};

const HORIZONS = [1, 2, 15, 30] as const;
const resolutionAttempts = new Set<string>();

async function rows(days: number, startDay?: string) {
    await ensurePortfolioSchema();
    const result = await database().query<BatchRow>(`
        SELECT id, pick_day::text, encrypted_payload
        FROM portfolio_batches
        WHERE pick_day >= $1::date
        ORDER BY pick_day DESC
    `, [startDay || daysAgo(Math.max(0, days - 1))]);
    return result.rows;
}

async function updateBatch(row: BatchRow, payload: StoredBatch) {
    await database().query('UPDATE portfolio_batches SET encrypted_payload = $1, updated_at = NOW() WHERE id = $2', [encryptPortfolio(payload), row.id]);
}

async function resolveHorizons(row: BatchRow, batch: StoredBatch) {
    const today = indiaDay();
    if (row.pick_day >= today) return batch;
    const { smart_api } = await getSmartAPI();
    let changed = false;
    for (const pick of batch.picks) {
        pick.horizonPrices ||= {};
        if (pick.nextSessionPrice !== undefined && !pick.horizonPrices['1']) {
            pick.horizonPrices['1'] = { price: pick.nextSessionPrice, day: pick.nextSessionDay || today };
            changed = true;
        }
        if (HORIZONS.every(horizon => pick.horizonPrices?.[String(horizon)])) continue;
        const attemptKey = `${row.id}:${pick.token}:${today}:${isNseClosed() ? 'closed' : 'open'}`;
        if (resolutionAttempts.has(attemptKey)) continue;
        resolutionAttempts.add(attemptKey);
        let candles: Array<Array<string | number>>;
        try {
            candles = await getHistoricalData(smart_api, pick.token);
        } catch {
            continue;
        }
        const laterCandles = candles.filter((candle: Array<string | number>) => String(candle[0]).slice(0, 10) > row.pick_day);
        if (pick.entryAtOpen && !pick.entryDay && laterCandles[0]) {
            pick.referencePrice ??= pick.entryPrice;
            pick.entryPrice = Number(laterCandles[0][1]);
            pick.entryDay = String(laterCandles[0][0]).slice(0, 10);
            changed = true;
        }
        for (const horizon of HORIZONS) {
            if (pick.horizonPrices[String(horizon)]) continue;
            const candle = laterCandles[horizon - 1];
            if (!candle) continue;
            const candleDay = String(candle[0]).slice(0, 10);
            if (candleDay === today && !isNseClosed()) continue;
            pick.horizonPrices[String(horizon)] = { price: Number(candle[4]), day: candleDay };
            if (horizon === 1) {
                pick.nextSessionPrice = Number(candle[4]);
                pick.nextSessionDay = candleDay;
            }
            changed = true;
        }
        await new Promise(resolve => setTimeout(resolve, 350));
    }
    if (changed) await updateBatch(row, batch);
    return batch;
}

export async function saveTodayPicks(selections: Array<{ symbol: string; side: 'buy' | 'short' }>) {
    const unique = [...new Map(selections.map(selection => [selection.symbol, selection])).values()];
    if (unique.length === 0 || unique.length > STOCKS.length) throw new Error('Select at least one valid scanner stock.');
    const stockBySymbol = new Map(STOCKS.map(stock => [stock.symbol, stock]));
    const scanBySymbol = new Map((scanService.read()?.data || []).map(result => [result.symbol, result]));
    const selectedAt = new Date().toISOString();
    const picks: StoredPick[] = unique.map(({ symbol, side }) => {
        const stock = stockBySymbol.get(symbol);
        const result = scanBySymbol.get(symbol);
        if (!stock || !result || !Number.isFinite(result.price) || indiaDay(new Date(result.timestamp)) !== indiaDay()) {
            throw new Error(`${symbol.replace('-EQ', '')} does not have a completed scan result from today.`);
        }
        return { symbol, token: stock.token, side, entryPrice: result.price, referencePrice: result.price, entryAtOpen: true, selectedAt };
    });
    await ensurePortfolioSchema();
    const id = randomUUID();
    const pickDay = indiaDay();
    await database().query(`
        INSERT INTO portfolio_batches (id, pick_day, encrypted_payload)
        VALUES ($1, $2::date, $3)
        ON CONFLICT (pick_day) DO UPDATE
        SET encrypted_payload = EXCLUDED.encrypted_payload, updated_at = NOW()
    `, [id, pickDay, encryptPortfolio({ picks } satisfies StoredBatch)]);
    return { pickDay, count: picks.length };
}

export async function portfolioAnalysis(days: number, horizonDays = 1, startDay?: string): Promise<PortfolioAnalysis> {
    const horizon = HORIZONS.includes(horizonDays as typeof HORIZONS[number]) ? horizonDays : 1;
    const effectiveStartDay = startDay || daysAgo(Math.max(0, days - 1));
    const records = await rows(days, effectiveStartDay);
    const decoded: Array<{ row: BatchRow; batch: StoredBatch }> = [];
    for (const row of records) decoded.push({ row, batch: await resolveHorizons(row, decryptPortfolio<StoredBatch>(row.encrypted_payload)) });

    const uniqueStocks = new Map<string, { symbol: string; token: string }>();
    for (const { batch } of decoded) for (const pick of batch.picks) uniqueStocks.set(pick.token, { symbol: pick.symbol, token: pick.token });
    let liveError: string | null = null;
    const quoteMap = new Map<string, number>();
    try {
        for (const quote of await getMarketQuotes([...uniqueStocks.values()])) quoteMap.set(quote.token, quote.ltp);
    } catch (error) {
        liveError = error instanceof Error ? error.message : 'Live prices are unavailable.';
    }

    const today = indiaDay();
    const cohorts: PortfolioCohortView[] = decoded.map(({ row, batch }) => {
        const picks: PortfolioPickView[] = batch.picks.map(pick => {
            const side = pick.side === 'short' ? 'short' : 'buy';
            const currentPrice = quoteMap.get(pick.token) ?? null;
            const isLiveNextSession = row.pick_day < today && pick.nextSessionPrice === undefined && currentPrice !== null;
            const nextSessionPrice = pick.nextSessionPrice ?? (isLiveNextSession ? currentPrice : null);
            const savedHorizon = pick.horizonPrices?.[String(horizon)];
            const isLiveHorizon = row.pick_day < today && !savedHorizon && currentPrice !== null;
            const horizonPrice = savedHorizon?.price ?? (isLiveHorizon ? currentPrice : null);
            return {
                symbol: pick.symbol,
                side,
                entryPrice: pick.entryPrice,
                entryConfirmed: !pick.entryAtOpen || Boolean(pick.entryDay),
                currentPrice,
                nextSessionPrice,
                nextSessionReturnPct: nextSessionPrice === null ? null : directionalReturnPercent(nextSessionPrice, pick.entryPrice, side),
                holdingReturnPct: currentPrice === null ? null : directionalReturnPercent(currentPrice, pick.entryPrice, side),
                status: pick.nextSessionPrice !== undefined ? 'closed' : isLiveNextSession ? 'live' : 'waiting',
                horizonDays: horizon,
                horizonPrice,
                horizonReturnPct: horizonPrice === null ? null : directionalReturnPercent(horizonPrice, pick.entryPrice, side),
                horizonStatus: savedHorizon ? 'closed' : isLiveHorizon ? 'live' : 'waiting',
            };
        });
        return {
            id: row.id, pickDay: row.pick_day, picks,
            nextSessionReturnPct: average(picks.flatMap(pick => pick.nextSessionReturnPct === null ? [] : [pick.nextSessionReturnPct])),
            holdingReturnPct: average(picks.flatMap(pick => pick.holdingReturnPct === null ? [] : [pick.holdingReturnPct])),
            horizonReturnPct: average(picks.flatMap(pick => pick.horizonReturnPct === null ? [] : [pick.horizonReturnPct])),
        };
    });
    const cohortHolding = cohorts.flatMap(cohort => cohort.holdingReturnPct === null ? [] : [cohort.holdingReturnPct]);
    const investedAmount = cohortHolding.length * 10_000;
    const currentValue = cohorts.reduce((total, cohort) => total + (cohort.holdingReturnPct === null ? 0 : 10_000 * (1 + cohort.holdingReturnPct / 100)), 0);
    const nextReturns = cohorts.flatMap(cohort => cohort.picks.flatMap(pick => pick.nextSessionReturnPct === null ? [] : [pick.nextSessionReturnPct]));
    return {
        days, startDay: effectiveStartDay, horizonDays: horizon, generatedAt: new Date().toISOString(), liveError,
        summary: {
            cohorts: cohorts.length,
            picks: cohorts.reduce((sum, cohort) => sum + cohort.picks.length, 0),
            completedPicks: cohorts.reduce((sum, cohort) => sum + cohort.picks.filter(pick => pick.status === 'closed').length, 0),
            nextSessionReturnPct: average(nextReturns),
            holdingReturnPct: investedAmount ? (currentValue / investedAmount - 1) * 100 : null,
            horizonReturnPct: average(cohorts.flatMap(cohort => cohort.picks.flatMap(pick => pick.horizonReturnPct === null ? [] : [pick.horizonReturnPct]))),
            investedAmount, currentValue,
        },
        cohorts,
    };
}

export async function resolvePortfolioHistory(days = 60) {
    const analysis = await portfolioAnalysis(days);
    return { cohorts: analysis.summary.cohorts, completedPicks: analysis.summary.completedPicks, generatedAt: analysis.generatedAt };
}
