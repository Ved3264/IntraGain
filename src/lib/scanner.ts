import { SMA, EMA, ATR } from 'technicalindicators';
import { getHistoricalData } from './smartapi';
import { detectKalmanTrend } from './kalman';

export const STOCKS = [
    {
        'symbol': 'ORICONENT-EQ',
        'token': '10159'
    },
    {
        'symbol': 'SATIN-EQ',
        'token': '10453'
    },
    {
        'symbol': 'MARKSANS-EQ',
        'token': '10579'
    },
    {
        'symbol': 'HDFCNEXT50-EQ',
        'token': '10619'
    },
    {
        'symbol': 'ZENSARTECH-EQ',
        'token': '1076'
    },
    {
        'symbol': 'GRMOVER-EQ',
        'token': '10871'
    },
    {
        'symbol': 'GARFIBRES-EQ',
        'token': '1100'
    },
    {
        'symbol': 'MARUTI-EQ',
        'token': '10999'
    },
    {
        'symbol': 'INDORAMA-EQ',
        'token': '10993'
    },
    {
        'symbol': 'SILVERAXIS-EQ',
        'token': '11193'
    },
    {
        'symbol': 'HDFCQUAL-EQ',
        'token': '11255'
    },
    {
        'symbol': 'JAIBALAJI-EQ',
        'token': '11256'
    },
    {
        'symbol': 'IGL-EQ',
        'token': '11262'
    },
    {
        'symbol': 'SIL-EQ',
        'token': '11297'
    },
    {
        'symbol': 'PETRONET-EQ',
        'token': '11351'
    },
    {
        'symbol': 'XPROINDIA-EQ',
        'token': '11407'
    },
    {
        'symbol': 'APARINDS-EQ',
        'token': '11491'
    },
    {
        'symbol': 'WESTLIFE-EQ',
        'token': '11580'
    },
    {
        'symbol': 'NEWGEN-EQ',
        'token': '1164'
    },
    {
        'symbol': 'JPPOWER-EQ',
        'token': '11763'
    },
    {
        'symbol': 'GOKEX-EQ',
        'token': '11778'
    },
    {
        'symbol': 'ALLDIGI-EQ',
        'token': '11798'
    },
    {
        'symbol': '63MOONS-EQ',
        'token': '11868'
    },
    {
        'symbol': 'GEOJITFSL-EQ',
        'token': '11896'
    },
    {
        'symbol': 'GENUSPOWER-EQ',
        'token': '11905'
    },
    {
        'symbol': 'SPLIL-EQ',
        'token': '11935'
    },
    {
        'symbol': 'BIKAJI-EQ',
        'token': '11966'
    },
    {
        'symbol': 'SASKEN-EQ',
        'token': '11983'
    },
    {
        'symbol': 'ICIL-EQ',
        'token': '11987'
    },
    {
        'symbol': 'SYNCOMF-EQ',
        'token': '11992'
    },
    {
        'symbol': 'SUZLON-EQ',
        'token': '12018'
    },
    {
        'symbol': 'RENUKA-EQ',
        'token': '12026'
    },
    {
        'symbol': 'RUSTOMJEE-EQ',
        'token': '12219'
    },
    {
        'symbol': 'GRASIM-EQ',
        'token': '1232'
    },
    {
        'symbol': 'SWSOLAR-EQ',
        'token': '12489'
    },
    {
        'symbol': 'MBAPL-EQ',
        'token': '12686'
    },
    {
        'symbol': 'UNIPARTS-EQ',
        'token': '13057'
    },
    {
        'symbol': 'KEC-EQ',
        'token': '13260'
    },
    {
        'symbol': 'AFSL-EQ',
        'token': '13288'
    },
    {
        'symbol': 'MALUPAPER-EQ',
        'token': '13352'
    },
    {
        'symbol': 'KKCL-EQ',
        'token': '13381'
    },
    {
        'symbol': 'SUNTV-EQ',
        'token': '13404'
    },
    {
        'symbol': 'RATNAMANI-EQ',
        'token': '13451'
    },
    {
        'symbol': 'PFOCUS-EQ',
        'token': '13496'
    },
    {
        'symbol': 'ALLCARGO-EQ',
        'token': '13501'
    },
    {
        'symbol': 'EMAMILTD-EQ',
        'token': '13517'
    },
    {
        'symbol': 'NECCLTD-EQ',
        'token': '13522'
    },
    {
        'symbol': 'TECHM-EQ',
        'token': '13538'
    },
    {
        'symbol': 'ANANTRAJ-EQ',
        'token': '13620'
    },
    {
        'symbol': 'TALBROAUTO-EQ',
        'token': '13648'
    },
    {
        'symbol': 'HINDCOMPOS-EQ',
        'token': '1372'
    },
    {
        'symbol': 'SHYAMTEL-EQ',
        'token': '13740'
    },
    {
        'symbol': 'HBLENGINE-EQ',
        'token': '13966'
    },
    {
        'symbol': 'HINDPETRO-EQ',
        'token': '1406'
    },
    {
        'symbol': 'ZEEMEDIA-EQ',
        'token': '14003'
    },
    {
        'symbol': 'GLOBAL-EQ',
        'token': '1415'
    },
    {
        'symbol': 'AUTOIND-EQ',
        'token': '14106'
    },
    {
        'symbol': 'UNOMINDA-EQ',
        'token': '14154'
    },
    {
        'symbol': 'NINSYS-EQ',
        'token': '14194'
    },
    {
        'symbol': 'JKTYRE-EQ',
        'token': '14435'
    },
    {
        'symbol': 'WEBELSOLAR-EQ',
        'token': '14602'
    },
    {
        'symbol': '111NSETEST-EQ',
        'token': '14774'
    },
    {
        'symbol': 'SUPREMEINF-EQ',
        'token': '15002'
    },
    {
        'symbol': 'TAKE-EQ',
        'token': '14917'
    },
    {
        'symbol': 'RHL-EQ',
        'token': '15157'
    },
    {
        'symbol': 'TARIL-EQ',
        'token': '15174'
    },
    {
        'symbol': 'GSS-EQ',
        'token': '15347'
    },
    {
        'symbol': 'PIGL-EQ',
        'token': '15716'
    },
    {
        'symbol': 'TARC-EQ',
        'token': '1581'
    },
    {
        'symbol': 'MGEL-EQ',
        'token': '1593'
    },
    {
        'symbol': 'MMP-EQ',
        'token': '16395'
    },
    {
        'symbol': 'TOUCHWOOD-EQ',
        'token': '16908'
    },
    {
        'symbol': 'INDBANK-EQ',
        'token': '16933'
    },
    {
        'symbol': 'MAWANASUG-EQ',
        'token': '17022'
    },
    {
        'symbol': 'NEXT50-EQ',
        'token': '17181'
    },
    {
        'symbol': 'SHRIPISTON-EQ',
        'token': '17186'
    },
    {
        'symbol': 'CYIENTDLM-EQ',
        'token': '17187'
    },
    {
        'symbol': 'ALBERTDAVD-EQ',
        'token': '17256'
    },
    {
        'symbol': 'ASPINWALL-EQ',
        'token': '17270'
    },
    {
        'symbol': 'LLOYDSME-EQ',
        'token': '17313'
    },
    {
        'symbol': 'UTKARSHBNK-EQ',
        'token': '17358'
    },
    {
        'symbol': 'BANKETF-EQ',
        'token': '17419'
    },
    {
        'symbol': 'NETWEB-EQ',
        'token': '17433'
    },
    {
        'symbol': 'MGL-EQ',
        'token': '17534'
    },
    {
        'symbol': 'MAHEPC-EQ',
        'token': '17603'
    },
    {
        'symbol': 'POKARNA-EQ',
        'token': '17651'
    },
    {
        'symbol': 'REFEX-EQ',
        'token': '17764'
    },
    {
        'symbol': 'JSWENERGY-EQ',
        'token': '17869'
    },
    {
        'symbol': 'MBLINFRA-EQ',
        'token': '18029'
    },
    {
        'symbol': 'LORDSCHLO-EQ',
        'token': '18232'
    },
    {
        'symbol': 'RBLBANK-EQ',
        'token': '18391'
    },
    {
        'symbol': 'JLHL-EQ',
        'token': '18553'
    },
    {
        'symbol': 'LTTS-EQ',
        'token': '18564'
    },
    {
        'symbol': 'MARATHON-EQ',
        'token': '18659'
    },
    {
        'symbol': 'MASKINVEST-EQ',
        'token': '18727'
    },
    {
        'symbol': 'YATRA-EQ',
        'token': '18760'
    },
    {
        'symbol': 'ENDURANCE-EQ',
        'token': '18822'
    },
    {
        'symbol': 'KSL-EQ',
        'token': '18889'
    },
    {
        'symbol': 'SUNDARAM-EQ',
        'token': '18931'
    },
    {
        'symbol': 'RAJRATAN-EQ',
        'token': '18962'
    },
    {
        'symbol': 'NBIFIN-EQ',
        'token': '19111'
    },
    {
        'symbol': 'LIQUIDETF-EQ',
        'token': '1927'
    },
    {
        'symbol': 'IMFA-EQ',
        'token': '19235'
    },
    {
        'symbol': 'PLAZACABLE-EQ',
        'token': '19458'
    },
    {
        'symbol': 'LMW-EQ',
        'token': '1979'
    },
    {
        'symbol': 'RADIOCITY-EQ',
        'token': '19877'
    },
    {
        'symbol': 'LICHSGFIN-EQ',
        'token': '1997'
    },
    {
        'symbol': 'AHLADA-EQ',
        'token': '2004'
    },
    {
        'symbol': 'RAMKY-EQ',
        'token': '20134'
    },
    {
        'symbol': 'ADANIENSOL-EQ',
        'token': '10217'
    },
    {
        'symbol': 'CONFIPET-EQ',
        'token': '10238'
    },
    {
        'symbol': 'DYCL-EQ',
        'token': '10417'
    },
    {
        'symbol': 'OFSS-EQ',
        'token': '10738'
    },
    {
        'symbol': 'NUCLEUS-EQ',
        'token': '10791'
    },
    {
        'symbol': 'APTECHT-EQ',
        'token': '10755'
    },
    {
        'symbol': 'OMAXAUTO-EQ',
        'token': '10922'
    },
    {
        'symbol': 'SATIA-EQ',
        'token': '11045'
    },
    {
        'symbol': 'SHK-EQ',
        'token': '11212'
    },
    {
        'symbol': 'POONAWALLA-EQ',
        'token': '11403'
    },
    {
        'symbol': 'GLAXO-EQ',
        'token': '1153'
    },
    {
        'symbol': 'TEXINFRA-EQ',
        'token': '11549'
    },
    {
        'symbol': 'GTL-EQ',
        'token': '1162'
    },
    {
        'symbol': 'DWARKESH-EQ',
        'token': '11667'
    },
    {
        'symbol': 'JINDALPHOT-EQ',
        'token': '11743'
    },
    {
        'symbol': 'ACEINTEG-EQ',
        'token': '11779'
    },
    {
        'symbol': 'IIFL-EQ',
        'token': '11809'
    },
    {
        'symbol': 'SHOPERSTOP-EQ',
        'token': '11813'
    },
    {
        'symbol': 'MANGALAM-EQ',
        'token': '11817'
    },
    {
        'symbol': 'GLAND-EQ',
        'token': '1186'
    },
    {
        'symbol': 'KENNAMET-EQ',
        'token': '11841'
    },
    {
        'symbol': 'JSWHL-EQ',
        'token': '11880'
    },
    {
        'symbol': 'PRAXIS-EQ',
        'token': '1204'
    },
    {
        'symbol': 'FIVESTAR-EQ',
        'token': '12032'
    },
    {
        'symbol': 'AMBUJACEM-EQ',
        'token': '1270'
    },
    {
        'symbol': 'VIMTALABS-EQ',
        'token': '13101'
    },
    {
        'symbol': 'REPRO-EQ',
        'token': '13126'
    },
    {
        'symbol': 'SAKUMA-EQ',
        'token': '13251'
    },
    {
        'symbol': 'HDFCBANK-EQ',
        'token': '1333'
    },
    {
        'symbol': 'KEI-EQ',
        'token': '13310'
    },
    {
        'symbol': 'KAMDHENU-EQ',
        'token': '13457'
    },
    {
        'symbol': 'JKLAKSHMI-EQ',
        'token': '13491'
    },
    {
        'symbol': 'INFOMEDIA-EQ',
        'token': '13693'
    },
    {
        'symbol': 'GESHIP-EQ',
        'token': '13776'
    },
    {
        'symbol': 'SOBHA-EQ',
        'token': '13826'
    },
    {
        'symbol': 'BANCOINDIA-EQ',
        'token': '13880'
    },
    {
        'symbol': 'ASMS-EQ',
        'token': '14064'
    },
    {
        'symbol': 'BALKRISHNA-EQ',
        'token': '10181'
    },
    {
        'symbol': 'IGPL-EQ',
        'token': '14086'
    },
    {
        'symbol': 'SYNGENE-EQ',
        'token': '10243'
    },
    {
        'symbol': 'PTL-EQ',
        'token': '14101'
    },
    {
        'symbol': 'TIMKEN-EQ',
        'token': '14198'
    },
    {
        'symbol': 'DGCONTENT-EQ',
        'token': '10346'
    },
    {
        'symbol': 'HSCL-EQ',
        'token': '14334'
    },
    {
        'symbol': 'SHARDAMOTR-EQ',
        'token': '10530'
    },
    {
        'symbol': 'KRBL-EQ',
        'token': '10577'
    },
    {
        'symbol': 'HLVLTD-EQ',
        'token': '1448'
    },
    {
        'symbol': 'TCI-EQ',
        'token': '10580'
    },
    {
        'symbol': 'LOYALTEX-EQ',
        'token': '10590'
    },
    {
        'symbol': 'DIVGIITTS-EQ',
        'token': '14479'
    },
    {
        'symbol': 'BALAMINES-EQ',
        'token': '14501'
    },
    {
        'symbol': 'GSLSU-EQ',
        'token': '14599'
    },
    {
        'symbol': 'JSWDULUX-EQ',
        'token': '1467'
    },
    {
        'symbol': '091NSETEST-EQ',
        'token': '14769'
    },
    {
        'symbol': '101NSETEST-EQ',
        'token': '14772'
    },
    {
        'symbol': 'MNC-EQ',
        'token': '10676'
    },
    {
        'symbol': 'WSI-EQ',
        'token': '14828'
    },
    {
        'symbol': 'IFBIND-EQ',
        'token': '1485'
    },
    {
        'symbol': 'OMAXE-EQ',
        'token': '14853'
    },
    {
        'symbol': 'CIEINDIA-EQ',
        'token': '14937'
    },
    {
        'symbol': 'MAGNUM-EQ',
        'token': '14957'
    },
    {
        'symbol': 'CCCL-EQ',
        'token': '14992'
    },
    {
        'symbol': 'MOVALUE-EQ',
        'token': '10825'
    },
    {
        'symbol': 'SVLL-EQ',
        'token': '15121'
    },
    {
        'symbol': 'KIRLPNU-EQ',
        'token': '15180'
    },
    {
        'symbol': 'BRIGADE-EQ',
        'token': '15184'
    },
    {
        'symbol': 'BANKIETF-EQ',
        'token': '11037'
    },
    {
        'symbol': 'AGRITECH-EQ',
        'token': '11072'
    },
    {
        'symbol': 'DANGEE-EQ',
        'token': '1110'
    },
    {
        'symbol': 'IDFCFIRSTB-EQ',
        'token': '11184'
    },
    {
        'symbol': 'WELSPUNLIV-EQ',
        'token': '11253'
    },
    {
        'symbol': 'HDFCVALUE-EQ',
        'token': '11260'
    },
    {
        'symbol': 'AVG-EQ',
        'token': '15589'
    },
    {
        'symbol': 'GMMPFAUDLR-EQ',
        'token': '1570'
    },
    {
        'symbol': 'ATALREAL-EQ',
        'token': '15649'
    },
    {
        'symbol': 'APOLLOTYRE-EQ',
        'token': '163'
    },
    {
        'symbol': 'APOLLO-EQ',
        'token': '1134'
    },
    {
        'symbol': 'GICHSGFIN-EQ',
        'token': '1139'
    },
    {
        'symbol': 'PVTBANIETF-EQ',
        'token': '11386'
    },
    {
        'symbol': 'ITI-EQ',
        'token': '1675'
    },
    {
        'symbol': 'UBL-EQ',
        'token': '16713'
    },
    {
        'symbol': 'SILVERAG-EQ',
        'token': '16777'
    },
    {
        'symbol': 'ARCHIDPLY-EQ',
        'token': '16795'
    },
    {
        'symbol': 'ZOTA-EQ',
        'token': '11394'
    },
    {
        'symbol': 'RKFORGE-EQ',
        'token': '11411'
    },
    {
        'symbol': 'SICAGEN-EQ',
        'token': '16875'
    },
    {
        'symbol': 'THYROCARE-EQ',
        'token': '17032'
    },
    {
        'symbol': 'PILANIINVS-EQ',
        'token': '11445'
    },
    {
        'symbol': 'KRIDHANINF-EQ',
        'token': '11480'
    },
    {
        'symbol': 'HDFCLOWVOL-EQ',
        'token': '11547'
    },
    {
        'symbol': 'GUFICBIO-EQ',
        'token': '11606'
    },
    {
        'symbol': 'GNFC-EQ',
        'token': '1174'
    },
    {
        'symbol': 'VISHAL-EQ',
        'token': '11773'
    },
    {
        'symbol': 'SENCO-EQ',
        'token': '17271'
    },
    {
        'symbol': 'WELCORP-EQ',
        'token': '11821'
    },
    {
        'symbol': 'VHL-EQ',
        'token': '11892'
    },
    {
        'symbol': 'DCXINDIA-EQ',
        'token': '11895'
    },
    {
        'symbol': 'MHRIL-EQ',
        'token': '17333'
    },
    {
        'symbol': 'VINATIORGA-EQ',
        'token': '17364'
    },
    {
        'symbol': 'KANSAINER-EQ',
        'token': '1196'
    },
    {
        'symbol': 'MSPL-EQ',
        'token': '11919'
    },
    {
        'symbol': 'FCSSOFT-EQ',
        'token': '11999'
    },
    {
        'symbol': 'CONTROLPR-EQ',
        'token': '17477'
    },
    {
        'symbol': 'ASALCBR-EQ',
        'token': '17598'
    },
    {
        'symbol': 'AURIONPRO-EQ',
        'token': '12022'
    },
    {
        'symbol': 'PSUBANKADD-EQ',
        'token': '17616'
    },
    {
        'symbol': 'KAYNES-EQ',
        'token': '12092'
    },
    {
        'symbol': 'HDFCNIFIT-EQ',
        'token': '12101'
    },
    {
        'symbol': 'NIITMTS-EQ',
        'token': '17747'
    },
    {
        'symbol': 'DELTAMAGNT-EQ',
        'token': '1214'
    },
    {
        'symbol': 'ATL-EQ',
        'token': '17778'
    },
    {
        'symbol': 'TRF-EQ',
        'token': '17987'
    },
    {
        'symbol': 'UNITEDTEA-EQ',
        'token': '17999'
    },
    {
        'symbol': 'GREAVESCOT-EQ',
        'token': '1235'
    },
    {
        'symbol': 'JUBLFOOD-EQ',
        'token': '18096'
    },
    {
        'symbol': 'VPRPL-EQ',
        'token': '18341'
    },
    {
        'symbol': 'PERSISTENT-EQ',
        'token': '18365'
    },
    {
        'symbol': 'N1NSETEST-EQ',
        'token': '12848'
    },
    {
        'symbol': 'SAMHI-EQ',
        'token': '18614'
    },
    {
        'symbol': 'NUVAMA-EQ',
        'token': '18721'
    },
    {
        'symbol': 'KALAMANDIR-EQ',
        'token': '18755'
    },
    {
        'symbol': 'TARAPUR-EQ',
        'token': '18827'
    },
    {
        'symbol': 'ITDC-EQ',
        'token': '19299'
    },
    {
        'symbol': 'V1NSETEST-EQ',
        'token': '12863'
    },
    {
        'symbol': 'SARVESHWAR-EQ',
        'token': '12913'
    },
    {
        'symbol': 'ABB-EQ',
        'token': '13'
    },
    {
        'symbol': 'IIFLCAPS-EQ',
        'token': '13072'
    },
    {
        'symbol': 'PRAKASHSTL-EQ',
        'token': '19599'
    },
    {
        'symbol': 'HARRMALAYA-EQ',
        'token': '1313'
    },
    {
        'symbol': 'BLUEJET-EQ',
        'token': '19686'
    },
    {
        'symbol': 'JITFINFRA-EQ',
        'token': '19691'
    },
    {
        'symbol': 'VAKRANGEE-EQ',
        'token': '13342'
    },
    {
        'symbol': 'SDBL-EQ',
        'token': '1338'
    },
    {
        'symbol': 'ADFFOODS-EQ',
        'token': '19761'
    },
    {
        'symbol': 'PIONEEREMB-EQ',
        'token': '13463'
    },
    {
        'symbol': 'GRINDWELL-EQ',
        'token': '13560'
    },
    {
        'symbol': 'ACE-EQ',
        'token': '13587'
    },
    {
        'symbol': 'HGM-EQ',
        'token': '13592'
    },
    {
        'symbol': 'JHS-EQ',
        'token': '13720'
    },
    {
        'symbol': 'DCBBANK-EQ',
        'token': '13725'
    },
    {
        'symbol': 'CPCAP-EQ',
        'token': '20086'
    }
];

export async function scanStock(stock: typeof STOCKS[number], smart_api: Parameters<typeof getHistoricalData>[0]) {
    // Hurst Supertrend Smooth Trend settings
    const h_period = 80;
    const h_lag = 15;
    const kf_gain = 0.10;
    const atr_len = 14;
    const atr_base = 2.0;
    const atr_hscale = 4.0;

    function calcVariance(arr: number[]): number {
        if (arr.length === 0) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        const sqDiffs = arr.map(val => Math.pow(val - mean, 2));
        return sqDiffs.reduce((a, b) => a + b, 0) / arr.length;
    }

    {
        console.log(`Fetching data for ${stock.symbol}...`);
        const candles = await getHistoricalData(smart_api, stock.token);
        
        if (!candles || candles.length < 50) {
            console.log(`Not enough data for ${stock.symbol}`);
            return null;
        }

        // candles format: [timestamp, open, high, low, close, volume]
        const highs = candles.map((c: (string | number)[]) => Number(c[2]));
        const lows = candles.map((c: (string | number)[]) => Number(c[3]));
        const closes = candles.map((c: (string | number)[]) => Number(c[4]));
        const volumes = candles.map((c: (string | number)[]) => Number(c[5]));

        const ema9 = EMA.calculate({ period: 9, values: closes });
        const smaVol20 = SMA.calculate({ period: 20, values: volumes });
        const atrValues = ATR.calculate({ high: highs, low: lows, close: closes, period: atr_len });

        const latestClose = closes[closes.length - 1];
        const latestVolume = volumes[volumes.length - 1];
        const latestEma9 = ema9[ema9.length - 1];
        const avgVolume = smaVol20[smaVol20.length - 1];

        const rvol = avgVolume > 0 ? latestVolume / avgVolume : 0;

        const isAboveEma9 = latestClose > latestEma9;
        let daysSinceCrossover = 0;

        // Trace backward to find how many days it has been in the current state
        for (let i = ema9.length - 1; i >= 0; i--) {
            const c = closes[i + 8]; // offset by 8 because EMA(9) starts at index 8
            const e = ema9[i];
            const currAbove = c > e;
            if (currAbove !== isAboveEma9) {
                break;
            }
            daysSinceCrossover++;
        }

        // Hurst Adaptive Supertrend Calculation
        const kfArray: number[] = [];
        const trendArray: number[] = [];
        const upBandArray: number[] = [];
        const dnBandArray: number[] = [];
        
        for (let i = 0; i < closes.length; i++) {
            if (i < h_period + h_lag) {
                kfArray.push(closes[i]);
                trendArray.push(1);
                upBandArray.push(closes[i]);
                dnBandArray.push(closes[i]);
                continue;
            }

            const diff1: number[] = [];
            const diffq: number[] = [];
            for (let j = 0; j < h_period; j++) {
                const idx = i - h_period + 1 + j;
                diff1.push(closes[idx] - closes[idx - 1]);
                diffq.push(closes[idx] - closes[idx - h_lag]);
            }

            const var1 = calcVariance(diff1);
            const varq = calcVariance(diffq);

            let H_raw = Math.log(varq / Math.max(var1, 1e-10)) / (2.0 * Math.log(h_lag));
            if (isNaN(H_raw)) H_raw = 0.5;
            const H = Math.max(0.0, Math.min(H_raw, 1.0));
            const safeH = H || 0.5;

            const adaptive_gain = Math.max(Math.min(kf_gain * (0.5 + safeH), 0.99), 0.01);
            
            const prevKf = kfArray[i - 1];
            const currentKf = prevKf + adaptive_gain * (closes[i] - prevKf);
            kfArray.push(currentKf);

            let currentAtr = 0;
            if (i >= atr_len && atrValues.length > (i - atr_len)) {
                currentAtr = atrValues[i - atr_len];
            } else if (atrValues.length > 0) {
                currentAtr = atrValues[atrValues.length - 1];
            }

            const h_mult = atr_base + atr_hscale * (1.0 - safeH);
            const band = currentAtr * h_mult;

            const prevT = trendArray[i - 1];
            const prevUp = upBandArray[i - 1];
            const prevDn = dnBandArray[i - 1];

            const upBandRaw = currentKf - band;
            const dnBandRaw = currentKf + band;

            const currentUpBand = (prevT === 1) ? Math.max(upBandRaw, prevUp) : upBandRaw;
            const currentDnBand = (prevT === -1) ? Math.min(dnBandRaw, prevDn) : dnBandRaw;

            upBandArray.push(currentUpBand);
            dnBandArray.push(currentDnBand);

            let currentTrend = prevT;
            if (currentKf > prevDn) {
                currentTrend = 1;
            } else if (currentKf < prevUp) {
                currentTrend = -1;
            }
            trendArray.push(currentTrend);
        }

        const isSupertrendBullish = trendArray[trendArray.length - 1] === 1;

        // Kalman Filter Trend Detection
        const kalmanResult = detectKalmanTrend(candles);

        return {
            symbol: stock.symbol,
            price: latestClose,
            volume: latestVolume,
            ema9: latestEma9,
            rvol: rvol,
            isAboveEma9,
            daysSinceCrossover,
            isSupertrendBullish,
            kalman: kalmanResult,
            timestamp: new Date().toISOString()
        };
        
    }
}
