'use client';
import { useState, useEffect } from 'react';

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
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    fetchResults();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterEma, filterRvol, filterSupertrend, filterKalman, searchQuery]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  };

  const fetchResults = async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/results');
      const json = await res.json();
      if (json.success && json.data) setData(json.data);
    } catch (err) {
      console.error(err);
    }
    setFetching(false);
  };

  const handleScan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        alert('Scan failed. Ensure .env.local has valid Angel One API credentials.');
      }
    } catch (err) {
      console.error(err);
      alert('Error running scan.');
    }
    setLoading(false);
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
  const extremeVolCount = data.filter(d => d.rvol >= 3.0).length;
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
            <h1 className="title">IntraGain</h1>
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
          <button className="btn" onClick={handleScan} disabled={loading}>
            {loading ? (
              <><div className="loader"></div> Scanning...</>
            ) : (
              <><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg> Run Scan</>
            )}
          </button>
        </div>
      </div>

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
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>EMA 9</label>
            <select className="filter-select" value={filterEma} onChange={e => setFilterEma(e.target.value)}>
              <option value="all">All</option>
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
          </div>
          <div className="filter-group">
            <label>RVOL</label>
            <select className="filter-select" value={filterRvol} onChange={e => setFilterRvol(e.target.value)}>
              <option value="all">All</option>
              <option value="extreme">Extreme ≥3</option>
              <option value="verystrong">Strong ≥2</option>
              <option value="strong">Moderate ≥1.5</option>
              <option value="normal">Normal</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Hurst</label>
            <select className="filter-select" value={filterSupertrend} onChange={e => setFilterSupertrend(e.target.value)}>
              <option value="all">All</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Kalman</label>
            <select className="filter-select" value={filterKalman} onChange={e => setFilterKalman(e.target.value)}>
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
                        {new Date(row.timestamp).toLocaleTimeString()}
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
