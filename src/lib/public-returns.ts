import type { PortfolioAnalysis } from './portfolio-types';

export function sanitizePublicReturns(analysis: PortfolioAnalysis) {
    return {
        days: analysis.days,
        startDay: analysis.startDay,
        horizonDays: analysis.horizonDays,
        generatedAt: analysis.generatedAt,
        summary: {
            cohorts: analysis.summary.cohorts,
            picks: analysis.summary.picks,
            horizonReturnPct: analysis.summary.horizonReturnPct,
        },
        cohorts: analysis.cohorts.map(cohort => ({
            pickDay: cohort.pickDay,
            horizonReturnPct: cohort.horizonReturnPct,
            picks: cohort.picks.map(pick => ({
                symbol: pick.symbol,
                entryPrice: pick.entryPrice,
                horizonPrice: pick.horizonPrice,
                returnPct: pick.horizonReturnPct,
                status: pick.horizonStatus,
            })),
        })),
    };
}
