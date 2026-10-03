const fs = require('fs');
const https = require('https');

https.get('https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const list = JSON.parse(data);
        const nseEquities = list
            .filter(i => i.exch_seg === 'NSE' && i.instrumenttype === '' && i.symbol.endsWith('-EQ'))
            .slice(0, 250)
            .map(i => ({symbol: i.symbol, token: i.token}));
        
        const file = fs.readFileSync('src/lib/scanner.ts', 'utf-8');
        const newStocks = 'export const STOCKS = ' + JSON.stringify(nseEquities, null, 4).replace(/"/g, "'") + ';';
        const updated = file.replace(/export const STOCKS = \[\s*\{[\s\S]*?\];/, newStocks);
        fs.writeFileSync('src/lib/scanner.ts', updated, 'utf-8');
        console.log('Updated scanner.ts with 250 stocks');
    });
});
