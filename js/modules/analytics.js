/**
 * Analytics — population time series & growth metrics (offline, from IndexedDB logs)
 */

import { db, listColonies } from '../db.js';

/**
 * Growth logs that carry a numeric population estimate.
 * @param {number|null} [colonyId]
 */
export async function listPopulationLogs(colonyId = null) {
  let rows = await db.logs.where('log_type').equals('growth').toArray();
  rows = rows.filter((r) => {
    const n = Number(r.population);
    return r.population != null && r.population !== '' && Number.isFinite(n) && n >= 0;
  });
  if (colonyId != null) {
    rows = rows.filter((r) => r.colony_id === colonyId);
  }
  return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

/**
 * Build chart points.
 * - single colony: raw population snapshots
 * - all colonies: running sum of last-known population per colony
 * @param {object[]} logs sorted asc
 * @param {'all'|number} scope
 */
export function buildPopulationSeries(logs, scope = 'all') {
  if (!logs.length) return [];

  if (scope !== 'all') {
    return logs
      .filter((l) => l.colony_id === scope)
      .map((l) => ({
        t: new Date(l.date).getTime(),
        label: formatAxisDate(l.date),
        value: Number(l.population),
        colony_id: l.colony_id,
      }));
  }

  const lastByColony = new Map();
  const points = [];

  for (const log of logs) {
    lastByColony.set(log.colony_id, Number(log.population));
    let total = 0;
    for (const v of lastByColony.values()) total += v;
    points.push({
      t: new Date(log.date).getTime(),
      label: formatAxisDate(log.date),
      value: total,
      colony_id: null,
    });
  }

  return points;
}

/**
 * Dashboard KPIs derived from population series + colonies.
 * @param {object[]} series from buildPopulationSeries
 * @param {object[]} colonies
 * @param {object[]} logs all population logs in scope
 */
export function computeGrowthMetrics(series, colonies, logs) {
  const lastKnownByColony = new Map();
  for (const log of logs) {
    lastKnownByColony.set(log.colony_id, Number(log.population));
  }

  let estimatedTotal = 0;
  for (const v of lastKnownByColony.values()) estimatedTotal += v;

  const withEstimate = lastByColonyCount(lastKnownByColony);
  const monthlyRate = averageMonthlyGrowthRate(series);
  const lastDelta = lastPeriodDelta(series);

  return {
    estimatedTotal,
    coloniesTracked: withEstimate,
    coloniesTotal: colonies.length,
    sampleCount: logs.length,
    avgMonthlyGrowthPct: monthlyRate,
    lastDeltaAbs: lastDelta.abs,
    lastDeltaPct: lastDelta.pct,
    firstValue: series[0]?.value ?? null,
    lastValue: series.length ? series[series.length - 1].value : null,
  };
}

function lastByColonyCount(map) {
  return map.size;
}

/**
 * Average month-over-month % change using end-of-month snapshots.
 * @param {{ t: number, value: number }[]} series
 * @returns {number|null} percent (e.g. 12.5) or null if insufficient data
 */
export function averageMonthlyGrowthRate(series) {
  if (!series || series.length < 2) return null;

  const byMonth = new Map();
  for (const p of series) {
    const d = new Date(p.t);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, p.value);
  }

  const keys = [...byMonth.keys()].sort();
  if (keys.length < 2) {
    // Fallback: overall CAGR normalized to months between first and last point
    return cagrMonthlyPct(series[0], series[series.length - 1]);
  }

  const changes = [];
  for (let i = 1; i < keys.length; i += 1) {
    const prev = byMonth.get(keys[i - 1]);
    const curr = byMonth.get(keys[i]);
    if (prev > 0) changes.push(((curr - prev) / prev) * 100);
    else if (prev === 0 && curr > 0) changes.push(100);
  }

  if (!changes.length) return cagrMonthlyPct(series[0], series[series.length - 1]);
  return round1(changes.reduce((a, b) => a + b, 0) / changes.length);
}

function cagrMonthlyPct(first, last) {
  if (!first || !last || first.value <= 0 || last.value <= 0) return null;
  const months = Math.max((last.t - first.t) / (1000 * 60 * 60 * 24 * 30.4375), 1 / 30);
  if (months < 0.25) return null;
  const ratio = last.value / first.value;
  const monthly = (ratio ** (1 / months) - 1) * 100;
  return round1(monthly);
}

function lastPeriodDelta(series) {
  if (!series || series.length < 2) return { abs: null, pct: null };
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  const abs = last.value - prev.value;
  const pct = prev.value > 0 ? round1((abs / prev.value) * 100) : null;
  return { abs, pct };
}

export function formatMetricPct(value) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${round1(value)}%`;
}

export function formatMetricInt(value) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('it-IT').format(Math.round(value));
}

function formatAxisDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' });
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Convenience: full analytics bundle for dashboard */
export async function getPopulationAnalytics(scope = 'all') {
  const colonies = await listColonies();
  const colonyId = scope === 'all' ? null : Number(scope);
  const allLogs = await listPopulationLogs(null);
  const scopedLogs = colonyId == null ? allLogs : allLogs.filter((l) => l.colony_id === colonyId);
  const series = buildPopulationSeries(allLogs, scope === 'all' ? 'all' : colonyId);
  const metrics = computeGrowthMetrics(series, colonies, scopedLogs);
  return { colonies, series, metrics, logs: scopedLogs };
}
