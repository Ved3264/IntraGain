import type { PortfolioAnalysis } from './portfolio-types';

export function sanitizePublicReturns(analysis: PortfolioAnalysis) {
    const recommendationCohort = analysis.cohorts.find(cohort => cohort.picks.some(pick => pick.status !== 'closed'));
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
        recommendations: recommendationCohort ? {
            publishedDay: recommendationCohort.pickDay,
            picks: recommendationCohort.picks.map(pick => ({
                symbol: pick.symbol,
                side: pick.side,
                liveReturnPct: pick.nextSessionReturnPct,
                status: pick.status,
            })),
        } : null,
        cohorts: analysis.cohorts.map(cohort => ({
            pickDay: cohort.pickDay,
            horizonReturnPct: cohort.horizonReturnPct,
            picks: cohort.picks.map(pick => ({
                symbol: pick.symbol,
                side: pick.side,
                entryPrice: pick.entryPrice,
                entryConfirmed: pick.entryConfirmed,
                horizonPrice: pick.horizonPrice,
                returnPct: pick.horizonReturnPct,
                status: pick.horizonStatus,
            })),
        })),
    };
}
