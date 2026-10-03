// @ts-ignore
import { SmartAPI } from 'smartapi-javascript';
import { TOTP } from 'totp-generator';

export async function getSmartAPI() {
    const smart_api = new SmartAPI({
        api_key: process.env.ANGEL_API_KEY,
    });

    const totpRes = await TOTP.generate(process.env.ANGEL_TOTP_SECRET as string);
    const totp = totpRes.otp;

    try {
        const session = await smart_api.generateSession(
            process.env.ANGEL_CLIENT_CODE,
            process.env.ANGEL_PASSWORD,
            totp
        );
        return { smart_api, session };
    } catch (error) {
        console.error("SmartAPI Login Error:", error);
        throw error;
    }
}

export async function getHistoricalData(smart_api: any, symbolToken: string, exchange = 'NSE') {
    // 200 days historical data. SmartAPI limits daily data fetch sometimes, we will fetch last 300 days
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 300);

    function formatDate(date: Date) {
        return date.getFullYear() + '-' + 
            String(date.getMonth() + 1).padStart(2, '0') + '-' + 
            String(date.getDate()).padStart(2, '0') + ' 00:00';
    }

    try {
        const response = await smart_api.getCandleData({
            exchange: exchange,
            symboltoken: symbolToken,
            interval: "ONE_DAY",
            fromdate: formatDate(fromDate),
            todate: formatDate(toDate)
        });
        
        if (response.status && response.data) {
            return response.data;
        }
        return [];
    } catch (error) {
        console.error("Error fetching historical data for", symbolToken, error);
        return [];
    }
}
