// @ts-expect-error The SDK does not ship TypeScript declarations.
import { SmartAPI } from 'smartapi-javascript';
import { TOTP } from 'totp-generator';

let cachedSession: { smart_api: SmartAPI; session: unknown } | undefined;
let authenticatedAt = 0;

export function clearSmartAPISession() { cachedSession = undefined; }

export async function getSmartAPI() {
    if (cachedSession && Date.now() - authenticatedAt < 30 * 60 * 1000) return cachedSession;
    const smart_api = new SmartAPI({
        api_key: process.env.ANGEL_API_KEY,
        timeout: 8000,
    });

    try {
        const { otp: totp } = await TOTP.generate(process.env.ANGEL_TOTP_SECRET as string);
        const session = await smart_api.generateSession(
            process.env.ANGEL_CLIENT_CODE,
            process.env.ANGEL_PASSWORD,
            totp
        );
        if (!session?.status || !session?.data?.jwtToken) {
            throw new Error('Angel One authentication failed. Check the server credentials.');
        }
        authenticatedAt = Date.now();
        cachedSession = { smart_api, session };
        return cachedSession;
    } catch {
        throw new Error('Angel One authentication failed. Check the server credentials.');
    }
}

export async function getHistoricalData(smart_api: SmartAPI, symbolToken: string, exchange = 'NSE') {
    // 200 days historical data. SmartAPI limits daily data fetch sometimes, we will fetch last 300 days
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 300);

    function formatDate(date: Date) {
        // SmartAPI expects exchange-local time, independent of Render's timezone.
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(date);
        const value = (name: string) => parts.find(part => part.type === name)?.value;
        return `${value('year')}-${value('month')}-${value('day')} ${value('hour')}:${value('minute')}`;
    }

    try {
        const response = await smart_api.getCandleData({
            exchange: exchange,
            symboltoken: symbolToken,
            interval: "ONE_DAY",
            fromdate: formatDate(fromDate),
            todate: formatDate(toDate)
        });
        
        if (response?.status === true && Array.isArray(response.data)) {
            if (!response.data.every((row: unknown) => Array.isArray(row) && row.length >= 6 &&
                row.slice(1, 6).every(value => value !== null && value !== '' && Number.isFinite(Number(value))))) {
                throw new Error('Malformed candle data');
            }
            return response.data;
        }
        throw new Error('Invalid market-data response');
    } catch {
        clearSmartAPISession();
        throw new Error('Angel One market data is unavailable. Resume to retry the current stock.');
    }
}

export interface MarketQuote {
    symbol: string;
    token: string;
    ltp: number;
    previousClose: number;
    changePercent: number;
    exchangeTime: string | null;
}

export async function getMarketQuotes(stocks: Array<{ symbol: string; token: string }>): Promise<MarketQuote[]> {
    if (stocks.length === 0) return [];
    const { smart_api } = await getSmartAPI();
    const quotes: MarketQuote[] = [];
    for (let offset = 0; offset < stocks.length; offset += 50) {
        const batch = stocks.slice(offset, offset + 50);
        const response = await smart_api.marketData({ mode: 'FULL', exchangeTokens: { NSE: batch.map(stock => stock.token) } });
        if (response?.status !== true || !Array.isArray(response?.data?.fetched)) {
            clearSmartAPISession();
            throw new Error('Live market prices are temporarily unavailable.');
        }
        const symbolByToken = new Map(batch.map(stock => [stock.token, stock.symbol]));
        for (const item of response.data.fetched) {
            const token = String(item.symbolToken);
            const ltp = Number(item.ltp);
            const previousClose = Number(item.close);
            if (!symbolByToken.has(token) || !Number.isFinite(ltp) || !Number.isFinite(previousClose)) continue;
            quotes.push({
                symbol: symbolByToken.get(token)!, token, ltp, previousClose,
                changePercent: previousClose ? (ltp / previousClose - 1) * 100 : Number(item.percentChange) || 0,
                exchangeTime: typeof item.exchFeedTime === 'string' ? item.exchFeedTime : null,
            });
        }
        if (offset + 50 < stocks.length) await new Promise(resolve => setTimeout(resolve, 350));
    }
    return quotes;
}
