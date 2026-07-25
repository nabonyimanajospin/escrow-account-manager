import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Live RWF ↔ USD Currency Converter widget.
 * Usage: <CurrencyConverter />
 * Props:
 *   - defaultUSD {number} — pre-fill the USD field (e.g. from a property price)
 *   - compact {bool} — smaller inline version for embedding in cards
 */
export default function CurrencyConverter({ defaultUSD = '', compact = false }) {
  const [usd, setUsd] = useState(defaultUSD !== '' ? String(defaultUSD) : '');
  const [rwf, setRwf] = useState('');
  const [rate, setRate] = useState(null);
  const [rateDate, setRateDate] = useState('');
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  // Fetch live rate once on mount
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await axios.get(`${API}/currency/rates`);
        const r = res.data.rates?.RWF;
        setRate(r);
        setRateDate(res.data.date);
        setIsFallback(res.data.fallback || false);
        // If defaultUSD is set, pre-convert
        if (defaultUSD !== '' && r) {
          setRwf(Math.round(parseFloat(defaultUSD) * r).toLocaleString());
        }
      } catch {
        setRate(1360);
        setIsFallback(true);
      } finally {
        setLoading(false);
      }
    };
    fetchRate();
  }, [defaultUSD]);

  const handleUsdChange = (val) => {
    setUsd(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (val === '' || isNaN(val)) { setRwf(''); return; }
      if (rate) setRwf(Math.round(parseFloat(val) * rate).toLocaleString());
    }, 300);
  };

  const handleRwfChange = (val) => {
    // Remove commas for calculation
    const raw = val.replace(/,/g, '');
    setRwf(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (raw === '' || isNaN(raw)) { setUsd(''); return; }
      if (rate) setUsd((parseFloat(raw) / rate).toFixed(2));
    }, 300);
  };

  if (compact) {
    return (
      <div style={cs.compactWrap}>
        <div style={cs.compactRow}>
          <div style={cs.compactField}>
            <span style={cs.compactLabel}>USD $</span>
            <input
              style={cs.compactInput}
              type="number"
              value={usd}
              onChange={(e) => handleUsdChange(e.target.value)}
              placeholder="0"
            />
          </div>
          <span style={cs.arrow}>⇄</span>
          <div style={cs.compactField}>
            <span style={cs.compactLabel}>RWF</span>
            <input
              style={cs.compactInput}
              type="text"
              value={rwf}
              onChange={(e) => handleRwfChange(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        {rate && (
          <p style={cs.liveRate}>
            {isFallback ? '⚠ Fallback rate:' : '📡 Live:'} 1 USD = {rate.toLocaleString()} RWF
            {rateDate && ` (${rateDate})`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={cs.card}>
      <div style={cs.cardHeader}>
        <h3 style={cs.title}>💱 Currency Converter</h3>
        {loading ? (
          <span style={cs.liveTag}>Loading rate...</span>
        ) : (
          <span style={{ ...cs.liveTag, background: isFallback ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', color: isFallback ? '#f59e0b' : '#10b981' }}>
            {isFallback ? '⚠ Offline Rate' : '📡 Live Rate'}
          </span>
        )}
      </div>

      {rate && (
        <div style={cs.rateBar}>
          <span style={cs.rateText}>1 USD = <strong style={{ color: '#c8a96e' }}>{rate.toLocaleString()} RWF</strong></span>
          {rateDate && <span style={cs.rateDate}>Updated: {rateDate}</span>}
        </div>
      )}

      <div style={cs.converterRow}>
        {/* USD Input */}
        <div style={cs.inputGroup}>
          <div style={cs.currencyFlag}>🇺🇸</div>
          <div style={cs.inputWrap}>
            <label style={cs.inputLabel}>US Dollar (USD)</label>
            <div style={cs.inputInner}>
              <span style={cs.symbol}>$</span>
              <input
                id="usd-input"
                style={cs.input}
                type="number"
                min="0"
                value={usd}
                onChange={(e) => handleUsdChange(e.target.value)}
                placeholder="Enter USD amount"
              />
            </div>
          </div>
        </div>

        {/* Swap icon */}
        <div style={cs.swapBtn}>⇄</div>

        {/* RWF Input */}
        <div style={cs.inputGroup}>
          <div style={cs.currencyFlag}>🇷🇼</div>
          <div style={cs.inputWrap}>
            <label style={cs.inputLabel}>Rwandan Franc (RWF)</label>
            <div style={cs.inputInner}>
              <span style={cs.symbol}>Fr</span>
              <input
                id="rwf-input"
                style={cs.input}
                type="text"
                value={rwf}
                onChange={(e) => handleRwfChange(e.target.value)}
                placeholder="Enter RWF amount"
              />
            </div>
          </div>
        </div>
      </div>

      <p style={cs.disclaimer}>
        {isFallback
          ? '⚠ Showing fallback rate. Live rate unavailable.'
          : '✓ Exchange rate sourced from frankfurter.app (European Central Bank).'}
      </p>
    </div>
  );
}

const cs = {
  card: {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(200,169,110,0.2)',
    borderRadius: 16,
    padding: 28,
    fontFamily: "'Inter', sans-serif",
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 },
  liveTag: {
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 20,
    padding: '4px 12px',
    border: '1px solid transparent',
  },
  rateBar: {
    background: 'rgba(200,169,110,0.08)',
    border: '1px solid rgba(200,169,110,0.2)',
    borderRadius: 10,
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rateText: { color: '#e5e7eb', fontSize: 14 },
  rateDate: { color: '#6b7280', fontSize: 12 },
  converterRow: { display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' },
  inputGroup: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(200,169,110,0.2)',
    borderRadius: 12,
    padding: '14px 16px',
    minWidth: 200,
  },
  currencyFlag: { fontSize: 28 },
  inputWrap: { flex: 1 },
  inputLabel: { color: '#9ca3af', fontSize: 11, fontWeight: 500, display: 'block', marginBottom: 6 },
  inputInner: { display: 'flex', alignItems: 'center', gap: 6 },
  symbol: { color: '#c8a96e', fontWeight: 700, fontSize: 16, minWidth: 18 },
  input: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 20,
    fontWeight: 600,
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
  },
  swapBtn: {
    fontSize: 24,
    color: '#c8a96e',
    padding: '8px',
    cursor: 'default',
    flexShrink: 0,
  },
  disclaimer: { color: '#6b7280', fontSize: 12, marginTop: 16, marginBottom: 0 },
  // Compact styles
  compactWrap: { padding: '12px 0' },
  compactRow: { display: 'flex', alignItems: 'center', gap: 10 },
  compactField: { display: 'flex', alignItems: 'center', gap: 6 },
  compactLabel: { color: '#9ca3af', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' },
  compactInput: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(200,169,110,0.2)',
    borderRadius: 8,
    padding: '8px 10px',
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    width: 110,
    fontFamily: 'inherit',
  },
  arrow: { color: '#c8a96e', fontSize: 18 },
  liveRate: { color: '#9ca3af', fontSize: 11, marginTop: 6, marginBottom: 0 },
};
