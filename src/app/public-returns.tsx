'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';

type PickStatus = 'waiting' | 'live' | 'closed';

interface PublicPick {
  symbol: string;
  entryPrice: number;
  horizonPrice: number | null;
  returnPct: number | null;
  status: PickStatus;
}

interface PublicCohort {
  pickDay: string;
  horizonReturnPct: number | null;
  picks: PublicPick[];
}

interface PublicReturnData {
  days: number;
  startDay: string;
  horizonDays: number;
  generatedAt: string;
  summary: { cohorts: number; picks: number; horizonReturnPct: number | null };
  cohorts: PublicCohort[];
}

const HORIZONS = [1, 2, 15, 30] as const;
const signed = (value: number | null) => value === null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const tone = (value: number | null) => value === null ? 'flat' : value > 0 ? 'gain' : value < 0 ? 'loss' : 'flat';
const money = (value: number | null) => value === null ? 'Pending' : new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);

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

function calendarTone(cohort?: PublicCohort) {
  if (!cohort || cohort.picks.length === 0) return 'empty';
  if (cohort.horizonReturnPct === null || cohort.picks.some(pick => pick.status !== 'closed')) return 'pending';
  return cohort.horizonReturnPct > 0 ? 'gain' : cohort.horizonReturnPct < 0 ? 'loss' : 'flat';
}

function statusLabel(status: PickStatus) {
  if (status === 'closed') return 'Final';
  if (status === 'live') return 'Live so far';
  return 'Waiting';
}

export default function PublicReturns() {
  const [rangeMode, setRangeMode] = useState<'month' | 'days'>('month');
  const [customDays, setCustomDays] = useState(16);
  const [horizonDays, setHorizonDays] = useState<(typeof HORIZONS)[number]>(1);
  const [data, setData] = useState<PublicReturnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError('');
    const query = rangeMode === 'month'
      ? `range=month&horizon=${horizonDays}`
      : `range=days&days=${customDays}&horizon=${horizonDays}`;
    try {
      const response = await fetch(`/api/returns?${query}`, { cache: 'no-store', signal: AbortSignal.timeout(45_000) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Returns are temporarily unavailable.');
      setData(result.data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Returns are temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, [customDays, horizonDays, rangeMode]);

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(true), 60_000);
    return () => { clearTimeout(initial); clearInterval(timer); };
  }, [load]);

  const calendar = useMemo(() => {
    if (!data) return { blanks: 0, days: [] as string[], byDay: new Map<string, PublicCohort>() };
    const endDay = dayFromDate(new Date(data.generatedAt));
    return {
      blanks: new Date(`${data.startDay}T00:00:00Z`).getUTCDay(),
      days: enumerateDays(data.startDay, endDay),
      byDay: new Map(data.cohorts.map(cohort => [cohort.pickDay, cohort])),
    };
  }, [data]);
  const calendarRows = Math.max(1, Math.ceil((calendar.blanks + calendar.days.length) / 7));
  const denseCalendar = calendar.days.length > 42;
  const calendarGap = denseCalendar ? 4 : 8;
  const calendarCellHeight = Math.max(22, Math.min(74, Math.floor((360 - (calendarRows - 1) * calendarGap) / calendarRows)));
  const calendarStyle = { '--calendar-cell-height': `${calendarCellHeight}px` } as CSSProperties;

  return <main className="public-shell">
    <header className="public-header">
      <Link className="public-logo" href="/"><span>V</span><div><b>Valgo</b><small>Daily return tracker</small></div></Link>
      <Link className="admin-link" href="/admin">Admin</Link>
    </header>

    <section className="public-hero">
      <div><p className="eyebrow">PUBLISHED PERFORMANCE</p><h1>Returns across every recommendation.</h1><p>Choose which recommendation dates to inspect, then measure every stock after 1, 2, 15, or 30 trading sessions.</p></div>
    </section>

    <section className="public-filter-panel" aria-label="Return controls">
      <div className="public-filter-group">
        <div><span>Recommendation dates</span><small>Which published picks appear below</small></div>
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

    <section className="public-summary">
      <article><span>{horizonDays}-day return</span><strong className={tone(data?.summary.horizonReturnPct ?? null)}>{signed(data?.summary.horizonReturnPct ?? null)}</strong><small>Average across available picks</small></article>
      <article><span>Published picks</span><strong>{data?.summary.picks ?? 0}</strong><small>Across {data?.summary.cohorts ?? 0} recommendation days</small></article>
      <article><span>Date window</span><strong className="summary-window">{rangeMode === 'month' ? 'This month' : `${customDays} days`}</strong><small>{horizonDays}-session performance selected</small></article>
    </section>

    {error && <div className="portfolio-alert" role="alert">{error}</div>}

    {data && <section className="return-calendar" aria-labelledby="return-calendar-title">
      <div className="calendar-heading">
        <div><p className="eyebrow">DAILY MAP</p><h2 id="return-calendar-title">Recommendation calendar</h2><small>Hover or focus a colored day to see its stocks and prices.</small></div>
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
                {cohort.picks.map(pick => <div className="tooltip-pick" key={pick.symbol}><b>{pick.symbol.replace('-EQ', '')}</b><span>{money(pick.entryPrice)} → {money(pick.horizonPrice)}</span><strong className={tone(pick.returnPct)}>{signed(pick.returnPct)}</strong></div>)}
              </div>
            </>}
          </div>;
        })}
      </div>
    </section>}

    {!loading && data?.cohorts.length === 0 ? <section className="portfolio-empty public-empty"><div>○</div><h3>No published returns in this range</h3><p>Choose a wider date window, or check again after new picks are published.</p></section> :
      <section className="public-days">
        {data?.cohorts.map(cohort => <article className="public-day" key={cohort.pickDay}>
          <header><div><time>{new Date(`${cohort.pickDay}T00:00:00Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</time><small>{cohort.picks.length} published stock{cohort.picks.length === 1 ? '' : 's'}</small></div><div><span>{horizonDays}-day return <b className={tone(cohort.horizonReturnPct)}>{signed(cohort.horizonReturnPct)}</b></span></div></header>
          <div className="public-return-table"><div className="public-return-row table-labels"><span>Symbol</span><span>Entry price</span><span>{horizonDays}-day price</span><span>Return</span><span>Status</span></div>
            {cohort.picks.map(pick => <div className="public-return-row" key={pick.symbol}><strong>{pick.symbol.replace('-EQ', '')}</strong><span>{money(pick.entryPrice)}</span><span>{money(pick.horizonPrice)}</span><span className={tone(pick.returnPct)}>{signed(pick.returnPct)}</span><span><i className={`status-dot ${pick.status}`} />{statusLabel(pick.status)}</span></div>)}
          </div>
        </article>)}
      </section>}

    {loading && !data && <div className="public-loading" role="status">Loading published returns…</div>}
    {data && <footer className="public-footer">Updated {new Date(data.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · Returns exclude fees, taxes and slippage.</footer>}
  </main>;
}
