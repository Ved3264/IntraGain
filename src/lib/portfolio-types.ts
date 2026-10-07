export interface PortfolioPickView {
    symbol: string;
    entryPrice: number;
    currentPrice: number | null;
    nextSessionPrice: number | null;
    nextSessionReturnPct: number | null;
    holdingReturnPct: number | null;
    status: 'waiting' | 'live' | 'closed';
    horizonDays: number;
    horizonPrice: number | null;
    horizonReturnPct: number | null;
    horizonStatus: 'waiting' | 'live' | 'closed';
}

export interface PortfolioCohortView {
    id: string;
    pickDay: string;
    picks: PortfolioPickView[];
    nextSessionReturnPct: number | null;
    holdingReturnPct: number | null;
    horizonReturnPct: number | null;
}

export interface PortfolioAnalysis {
    days: number;
    startDay: string;
    horizonDays: number;
    generatedAt: string;
    liveError: string | null;
    summary: {
        cohorts: number;
        picks: number;
        completedPicks: number;
        nextSessionReturnPct: number | null;
        holdingReturnPct: number | null;
        horizonReturnPct: number | null;
        investedAmount: number;
        currentValue: number;
    };
    cohorts: PortfolioCohortView[];
}

export interface LiveQuoteView {
    symbol: string;
    price: number;
    previousClose: number;
    changePercent: number;
    exchangeTime: string | null;
}
