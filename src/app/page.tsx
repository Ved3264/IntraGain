'use client';
import { useState, useEffect, useRef } from 'react';
import type { ScanJob } from '@/lib/scan-job';

interface Result {
  symbol: string;
  price: number;
  volume: number;
  ema9: number;
  rvol: number;
  isAboveEma9: boolean;
  daysSinceCrossover: number;
  isSupertrendBullish: boolean;
  kalman?: {
    trend: string;
    kalman_price: number;
    kalman_velocity: number;
    trend_strength: number;
    confidence: number;
    trend_changed: boolean;
  };
  timestamp: string;
}

export default function Home() {
  const [data, setData] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<ScanJob | null>(null);
  const [scanError, setScanError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const scanning = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [fetching, setFetching] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const [filterEma, setFilterEma] = useState('all');
  const [filterRvol, setFilterRvol] = useState('all');
  const [filterSupertrend, setFilterSupertrend] = useState('all');
  const [filterKalman, setFilterKalman] = useState('all');

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initial = saved || 'dark';
    // Restore the browser preference after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    const initialController = new AbortController();
    void (async () => {
      try {
        const res = await fetch('/api/results', { cache: 'no-store', signal: initialController.signal });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Unable to load results.');
        if (initialController.signal.aborted) return;
        setData(json.data);
        setJob(json.job || null);
      } catch (error) {
        if (!initialController.signal.aborted) setScanError(error instanceof Error ? error.message : 'Unable to load results.');
      } finally {
        if (!initialController.signal.aborted) setFetching(false);
      }
    })();
    return () => { initialController.abort(); controller.current?.abort(); };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  useEffect(() => {
    if (!loading) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [loading]);

  const handleScan = async () => {
    if (scanning.current) return;
    scanning.current = true;
    controller.current = new AbortController();
    const signal = controller.current.signal;
    setLoading(true);
    setScanError('');
    setElapsed(0);
    setCurrentPage(1);
    const applyJob = (next: ScanJob) => { setJob(next); setData(next.data); };
    const requestChunk = async (body: object): Promise<ScanJob> => {
      // Retry the same cursor so a lost response cannot duplicate work.
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await fetch('/api/scan', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body), cache: 'no-store',
            signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
          });
          const json = await res.json();
          if (!res.ok || !json.success) throw new Error(json.error || 'The server could not continue this scan.');
          return json.job;
        } catch (error) {
          if (signal.aborted || attempt >= 2) throw error;
          setScanError('Connection interrupted. Reconnecting to saved progress...');
          await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
    };
    try {
      let current = await requestChunk({ action: 'start' });
      applyJob(current);
      do {
        if (signal.aborted) return;
        current = await requestChunk({ action: 'advance', id: current.id, cursor: current.processed });
        if (signal.aborted) return;
        applyJob(current);
        setScanError('');
        if (current.status === 'paused') throw new Error(current.error || 'Scan paused. Resume to retry.');
        if (current.status !== 'completed') await new Promise(resolve => setTimeout(resolve, 100));
      } while (current.status !== 'completed');
    } catch (error) {
      if (!signal.aborted) setScanError(error instanceof Error ? error.message : 'Scan interrupted. Resume to continue.');
    } finally {
      scanning.current = false;
      if (!signal.aborted) setLoading(false);
    }
  };

  const getRvolClass = (rvol: number) => {
    if (rvol >= 3.0) return 'rvol-extreme';
    if (rvol >= 2.0) return 'rvol-very-strong';
    if (rvol >= 1.5) return 'rvol-strong';
    return 'rvol-normal';
  };

  const filteredData = data.filter(item => {
    if (searchQuery && !item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterEma === 'above' && !item.isAboveEma9) return false;
    if (filterEma === 'below' && item.isAboveEma9) return false;
    if (filterRvol === 'extreme' && item.rvol < 3.0) return false;
    if (filterRvol === 'verystrong' && item.rvol < 2.0) return false;
    if (filterRvol === 'strong' && item.rvol < 1.5) return false;
    if (filterRvol === 'normal' && item.rvol >= 1.5) return false;
    if (filterSupertrend === 'bullish' && !item.isSupertrendBullish) return false;
    if (filterSupertrend === 'bearish' && item.isSupertrendBullish) return false;
    if (filterKalman !== 'all') {
      if (!item.kalman) return false;
      if (filterKalman.toUpperCase() !== item.kalman.trend) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const bullishCount = data.filter(d => d.isSupertrendBullish).length;
  const bearishCount = data.length - bullishCount;
  const kalmanBullish = data.filter(d => d.kalman?.trend === 'BULLISH').length;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <main className="container">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <div className="logo">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h1 className="title">Valgo</h1>
            <p className="subtitle">Algorithmic trend & volume analysis</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
          <button className="btn" onClick={handleScan} disabled={loading || fetching}>
            {loading ? (
              <><div className="loader"></div> Scanning...</>
            ) : (
              <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg> {job && job.status !== 'completed' ? 'Resume Scan' : 'Run Scan'}</>
            )}
          </button>
        </div>
      </div>

      {(loading || job || scanError) && (
        <section className="scan-progress" aria-label="Scan progress" aria-busy={loading}>
          <div className="scan-progress-heading">
            <strong>{loading ? 'Scanning market data' : job?.status === 'completed' ? 'Scan complete' : 'Scan paused'}</strong>
            <span>{job ? Math.floor(job.processed / job.total * 100) : 0}%</span>
          </div>
          <div className={`scan-progress-track ${loading ? 'is-running' : ''}`} role="progressbar"
            aria-label="Stocks processed" aria-valuemin={0} aria-valuemax={job?.total || 100} aria-valuenow={job?.processed || 0}>
            <div className="scan-progress-fill" style={{ width: `${job ? job.processed / job.total * 100 : 0}%` }} />
          </div>
          <p role="status">{job ? `${job.processed} / ${job.total} stocks processed - ${job.data.length} updated - ${job.skipped} skipped (insufficient history)` : 'Connecting to server...'}</p>
          {loading && <p>{elapsed}s elapsed this session - {job?.lastSymbol ? `Last saved: ${job.lastSymbol.replace('-EQ', '')}` : 'Preparing scan'} - Results update as each chunk finishes.</p>}
          {!loading && job && job.status !== 'completed' && <p>Completed chunks are saved. Click Resume Scan to continue. Keep this tab open while scanning.</p>}
          {job?.status === 'completed' && <p>Updated {new Date(job.updatedAt).toLocaleString()}.</p>}
          {scanError && <p className="scan-error" role="alert">{scanError}</p>}
        </section>
      )}

      {/* Summary Cards */}
      {!fetching && data.length > 0 && (
        <div className="summary-cards fade-in">
          <div className="card">
            <div className="card-title">Total Scanned</div>
            <div className="card-value">{data.length}</div>
          </div>
          <div className="card">
            <div className="card-title">Hurst Bullish</div>
            <div className="card-value success">{bullishCount}</div>
          </div>
          <div className="card">
            <div className="card-title">Hurst Bearish</div>
            <div className="card-value danger">{bearishCount}</div>
          </div>
          <div className="card">
            <div className="card-title">Kalman Bullish</div>
            <div className="card-value purple">{kalmanBullish}</div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div className="panel fade-in">
        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group" style={{ flex: 1, minWidth: 180 }}>
            <label>Search</label>
            <input
              type="text"
              className="filter-input"
              placeholder="Symbol…"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="filter-group">
            <label>EMA 9</label>
            <select className="filter-select" value={filterEma} onChange={e => { setFilterEma(e.target.value); setCurrentPage(1); }}>
              <option value="all">All</option>
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>
          <div className="filter-group">
            <label>RVOL</label>
            <select className="filter-select" value={filterRvol} onChange={e => { setFilterRvol(e.target.value); setCurrentPage(1); }}>
              <option value="all">All</option>
              <option value="extreme">Extreme ≥3</option>
              <option value="verystrong">Strong ≥2</option>
              <option value="strong">Moderate ≥1.5</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Hurst</label>
            <select className="filter-select" value={filterSupertrend} onChange={e => { setFilterSupertrend(e.target.value); setCurrentPage(1); }}>
              <option value="all">All</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Kalman</label>
            <select className="filter-select" value={filterKalman} onChange={e => { setFilterKalman(e.target.value); setCurrentPage(1); }}>
              <option value="all">All</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="sideways">Sideways</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {fetching ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <span>Loading results…</span>
          </div>
        ) : paginatedData.length > 0 ? (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>EMA 9</th>
                    <th>EMA Trend</th>
                    <th>Days</th>
                    <th>Hurst</th>
                    <th>Kalman</th>
                    <th>RVOL</th>
                    <th>Date</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="symbol-cell">{row.symbol.replace('-EQ', '')}</td>
                      <td className="price-cell">₹{row.price?.toFixed(2)}</td>
                      <td className="price-cell">₹{row.ema9?.toFixed(2)}</td>
                      <td>
                        <span className={`badge ${row.isAboveEma9 ? 'above' : 'below'}`}>
                          {row.isAboveEma9 ? '↑ Above' : '↓ Below'}
                        </span>
                      </td>
                      <td>{row.daysSinceCrossover}d</td>
                      <td>
                        <span className={`badge ${row.isSupertrendBullish ? 'above' : 'below'}`}>
                          {row.isSupertrendBullish ? '↑ Bull' : '↓ Bear'}
                        </span>
                      </td>
                      <td>
                        {row.kalman ? (
                          <span className={`badge ${row.kalman.trend === 'BULLISH' ? 'above' : row.kalman.trend === 'BEARISH' ? 'below' : 'neutral'}`}>
                            {row.kalman.trend === 'BULLISH' ? '↑' : row.kalman.trend === 'BEARISH' ? '↓' : '→'} {row.kalman.trend}
                          </span>
                        ) : (
                          <span className="badge neutral">N/A</span>
                        )}
                      </td>
                      <td className={getRvolClass(row.rvol)}>{row.rvol?.toFixed(2)}x</td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                        {new Date(row.timestamp).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                        {new Date(row.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <div className="pagination-info">
                  {startIndex + 1}–{Math.min(startIndex + pageSize, filteredData.length)} of {filteredData.length} results
                </div>
                <div className="pagination-controls">
                  <button className="btn-page" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                    ← Prev
                  </button>
                  <div className="page-numbers">
                    {getPageNumbers().map((p, i) =>
                      typeof p === 'number' ? (
                        <button key={i} className={`page-num ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>
                          {p}
                        </button>
                      ) : (
                        <span key={i} className="page-num" style={{ cursor: 'default' }}>…</span>
                      )
                    )}
                  </div>
                  <button className="btn-page" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="empty-state-title">
              {data.length === 0 ? 'No scan data yet' : 'No matching results'}
            </div>
            <div className="empty-state-text">
              {data.length === 0
                ? 'Click "Run Scan" to fetch and analyze market data from Angel One SmartAPI.'
                : 'Try adjusting your filters or search query to see results.'}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
