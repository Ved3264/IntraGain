'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { LiveQuoteView, PortfolioAnalysis, PortfolioCohortView } from '@/lib/portfolio-types';
import { ADMIN_LOGIN_PATH } from '@/lib/admin-route';

const HORIZONS = [1, 2, 15, 30] as const;
const money = (value: number | null) => value === null ? 'Pending' : new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);
const signed = (value: number | null) => value === null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const tone = (value: number | null) => value === null ? 'flat' : value > 0 ? 'gain' : value < 0 ? 'loss' : 'flat';

function dayFromDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function enumerateDays(startDay: string, endDay: string) {
  const result: string[] = [];
  const cursor = new Date(`${startDay}T00:00:00Z`);
  const end = new Date(`${endDay}T00:00:00Z`);
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

function calendarTone(cohort?: PortfolioCohortView) {
  if (!cohort || cohort.picks.length === 0) return 'empty';
  if (cohort.horizonReturnPct === null || cohort.picks.some(pick => pick.horizonStatus !== 'closed')) return 'pending';
  return cohort.horizonReturnPct > 0 ? 'gain' : cohort.horizonReturnPct < 0 ? 'loss' : 'flat';
}

function statusLabel(status: 'waiting' | 'live' | 'closed') {
  if (status === 'closed') return 'Final';
  if (status === 'live') return 'Live so far';
  return 'Waiting';
}

export default function PortfolioView() {
  const [rangeMode, setRangeMode] = useState<'month' | 'days'>('month');
  const [customDays, setCustomDays] = useState(16);
  const [horizonDays, setHorizonDays] = useState<(typeof HORIZONS)[number]>(1);
  const [mode, setMode] = useState<'portfolio' | 'market'>('portfolio');
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [market, setMarket] = useState<LiveQuoteView[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    const rangeQuery = rangeMode === 'month' ? 'range=month' : `range=days&days=${customDays}`;
    try {
      const url = mode === 'portfolio' ? `/api/portfolio?${rangeQuery}&horizon=${horizonDays}` : '/api/market';
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(45_000) });
      if (response.status === 401) { window.location.replace(ADMIN_LOGIN_PATH); return; }
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to refresh live data.');
      if (mode === 'portfolio') setAnalysis(result.data);
      else setMarket(result.data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Unable to refresh live data.');
    } finally {
      setLoading(false);
    }
  }, [customDays, horizonDays, mode, rangeMode]);

  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(true), 60_000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);

  const filteredMarket = useMemo(() => market.filter(item => item.symbol.toLowerCase().includes(query.toLowerCase())), [market, query]);
  const calendar = useMemo(() => {
    if (!analysis) return { blanks: 0, days: [] as string[], byDay: new Map<string, PortfolioCohortView>() };
    return {
      blanks: new Date(`${analysis.startDay}T00:00:00Z`).getUTCDay(),
      days: enumerateDays(analysis.startDay, dayFromDate(new Date(analysis.generatedAt))),
      byDay: new Map(analysis.cohorts.map(cohort => [cohort.pickDay, cohort])),
    };
  }, [analysis]);
  const calendarRows = Math.max(1, Math.ceil((calendar.blanks + calendar.days.length) / 7));
  const denseCalendar = calendar.days.length > 42;
  const calendarGap = denseCalendar ? 4 : 8;
  const calendarCellHeight = Math.max(22, Math.min(74, Math.floor((360 - (calendarRows - 1) * calendarGap) / calendarRows)));
  const calendarStyle = { '--calendar-cell-height': `${calendarCellHeight}px` } as CSSProperties;

  return <section className="portfolio-page fade-in">
    <div className="portfolio-toolbar">
      <div>
        <p className="eyebrow">PORTFOLIO LAB</p>
        <h2>Returns across every recommendation.</h2>
        <p>Choose the recommendation window and measure every stock after a separate trading-session horizon.</p>
      </div>
      <button className="btn btn-secondary" onClick={() => void refresh()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh live'}</button>
    </div>

    <div className="portfolio-controls">
      <div className="segmented" aria-label="Portfolio view">
        <button className={mode === 'portfolio' ? 'active' : ''} onClick={() => setMode('portfolio')}>My picks</button>
        <button className={mode === 'market' ? 'active' : ''} onClick={() => setMode('market')}>All scanner stocks</button>
      </div>
    </div>

    {error && <div className="portfolio-alert" role="alert">{error}</div>}

    {mode === 'portfolio' ? <>
      <section className="public-filter-panel admin-return-filters" aria-label="Return controls">
        <div className="public-filter-group">
          <div><span>Recommendation dates</span><small>Which saved picks appear below</small></div>
          <div className="range-pills">
            <button className={rangeMode === 'month' ? 'active' : ''} onClick={() => setRangeMode('month')}>Current month</button>
            <button className={rangeMode === 'days' ? 'active' : ''} onClick={() => setRangeMode('days')}>Last</button>
            <label className={`custom-days ${rangeMode === 'days' ? 'active' : ''}`}>
              <input aria-label="Number of calendar days" type="number" min="1" max="365" value={customDays}
                onFocus={() => setRangeMode('days')}
                onChange={event => setCustomDays(Math.min(365, Math.max(1, Number(event.target.value) || 1)))} />
              <span>days</span>
            </label>
          </div>
        </div>
        <div className="public-filter-divider" />
        <div className="public-filter-group">
          <div><span>Return horizon</span><small>Trading sessions after each recommendation</small></div>
          <div className="range-pills">
            {HORIZONS.map(value => <button key={value} className={horizonDays === value ? 'active' : ''} onClick={() => setHorizonDays(value)}>{value} day{value === 1 ? '' : 's'}</button>)}
          </div>
        </div>
      </section>

      <div className="public-summary admin-return-summary">
        <article><span>{horizonDays}-day return</span><strong className={tone(analysis?.summary.horizonReturnPct ?? null)}>{signed(analysis?.summary.horizonReturnPct ?? null)}</strong><small>Average across available picks</small></article>
        <article><span>Published picks</span><strong>{analysis?.summary.picks ?? 0}</strong><small>Across {analysis?.summary.cohorts ?? 0} recommendation days</small></article>
        <article><span>Date window</span><strong className="summary-window">{rangeMode === 'month' ? 'This month' : `${customDays} days`}</strong><small>{horizonDays}-session performance selected</small></article>
      </div>

      {analysis?.liveError && <div className="portfolio-alert">Saved results are available. {analysis.liveError}</div>}

      {analysis && <section className="return-calendar" aria-labelledby="admin-return-calendar-title">
        <div className="calendar-heading">
          <div><p className="eyebrow">DAILY MAP</p><h3 id="admin-return-calendar-title">Recommendation calendar</h3><small>Hover or focus a colored day to see its stocks and prices.</small></div>
          <div className="calendar-legend" aria-label="Calendar color key"><span><i className="gain" />Gain</span><span><i className="loss" />Loss</span><span><i className="pending" />Live / pending</span><span><i className="empty" />No picks</span></div>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}</div>
        <div className={`calendar-grid ${denseCalendar ? 'dense' : ''}`} style={calendarStyle}>
          {Array.from({ length: calendar.blanks }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} />)}
          {calendar.days.map(day => {
            const cohort = calendar.byDay.get(day);
            const cellTone = calendarTone(cohort);
            const label = new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' });
            return <div className={`calendar-cell ${cellTone}`} key={day} tabIndex={cohort ? 0 : -1} aria-label={`${label}: ${cohort ? signed(cohort.horizonReturnPct) : 'no recommendations'}`}>
              <span className="calendar-date">{label}</span>
              {cohort && <><strong>{signed(cohort.horizonReturnPct)}</strong><i>{cohort.picks.length} pick{cohort.picks.length === 1 ? '' : 's'}</i>
                <div className="calendar-tooltip" role="tooltip">
                  <header><b>{new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</b><span className={tone(cohort.horizonReturnPct)}>{signed(cohort.horizonReturnPct)}</span></header>
                  {cohort.picks.map(pick => <div className="tooltip-pick" key={pick.symbol}><b>{pick.symbol.replace('-EQ', '')} <em className={`mini-side ${pick.side}`}>{pick.side === 'buy' ? 'BUY' : 'SHORT'}</em></b><span>{pick.entryConfirmed ? money(pick.entryPrice) : 'Next opening'} → {money(pick.horizonPrice)}</span><strong className={tone(pick.horizonReturnPct)}>{signed(pick.horizonReturnPct)}</strong></div>)}
                </div>
              </>}
            </div>;
          })}
        </div>
      </section>}

      {!loading && analysis?.cohorts.length === 0 ? <div className="portfolio-empty">
        <div>○</div><h3>No picks in this range</h3><p>Select stocks in the Scanner and save today’s portfolio, or choose a wider date window.</p>
      </div> : <div className="public-days admin-return-days">
        {analysis?.cohorts.map(cohort => <article className="public-day" key={cohort.id}>
          <header><div><time>{new Date(`${cohort.pickDay}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</time><small>{cohort.picks.length} saved stock{cohort.picks.length === 1 ? '' : 's'}</small></div><div><span>{horizonDays}-day return <b className={tone(cohort.horizonReturnPct)}>{signed(cohort.horizonReturnPct)}</b></span></div></header>
          <div className="public-return-table"><div className="public-return-row table-labels"><span>Symbol</span><span>Position</span><span>Entry price</span><span>{horizonDays}-day price</span><span>Return</span><span>Status</span></div>
            {cohort.picks.map(pick => <div className="public-return-row" key={pick.symbol}><strong>{pick.symbol.replace('-EQ', '')}</strong><span><i className={`mini-side ${pick.side}`}>{pick.side === 'buy' ? 'BUY' : 'SHORT'}</i></span><span>{pick.entryConfirmed ? money(pick.entryPrice) : 'At next open'}</span><span>{money(pick.horizonPrice)}</span><span className={tone(pick.horizonReturnPct)}>{signed(pick.horizonReturnPct)}</span><span><i className={`status-dot ${pick.horizonStatus}`} />{statusLabel(pick.horizonStatus)}</span></div>)}
          </div>
        </article>)}
      </div>}
      {loading && !analysis && <div className="public-loading" role="status">Loading portfolio returns…</div>}
      {analysis && <p className="portfolio-footnote">Updated {new Date(analysis.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · Live prices refresh every 60 seconds. Returns exclude fees, taxes and slippage.</p>}
    </> : <>
      <div className="market-heading"><div><h3>Live scanner universe</h3><p>{market.length} stocks · change versus previous close</p></div><input className="filter-input" placeholder="Search symbol…" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="market-grid">
        {filteredMarket.map(item => <article className="market-tile" key={item.symbol}><div><b>{item.symbol.replace('-EQ', '')}</b><small>{item.exchangeTime || 'Latest quote'}</small></div><div><strong>{money(item.price)}</strong><span className={tone(item.changePercent)}>{signed(item.changePercent)}</span></div></article>)}
      </div>
      {!loading && market.length === 0 && !error && <div className="portfolio-empty"><h3>No live quotes available</h3><p>Refresh after the market-data session is available.</p></div>}
    </>}
  </section>;
}
