import Chart from 'chart.js/auto';
import { getColonyStats } from '../db.js';
import { getEncyclopediaStats } from './encyclopedia.js';
import {
  formatMetricInt,
  formatMetricPct,
  getPopulationAnalytics,
} from './analytics.js';
import { navigate } from './router.js';
import { escapeHtml, STATUS_LABELS, el, statusBadgeClass } from './ui.js';

/** @type {Chart|null} */
let populationChart = null;

export function destroyDashboardChart() {
  if (populationChart) {
    populationChart.destroy();
    populationChart = null;
  }
}

export async function renderDashboard(root, { colonyScope = 'all' } = {}) {
  destroyDashboardChart();

  const [stats, enc, analytics] = await Promise.all([
    getColonyStats(),
    getEncyclopediaStats(),
    getPopulationAnalytics(colonyScope),
  ]);

  const { colonies, series, metrics } = analytics;
  const recent = colonies.slice(0, 5);
  const hasSeries = series.length > 0;

  root.appendChild(
    el(`
    <section class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Centro di controllo</p>
          <h2>Dashboard analitica</h2>
        </div>
        <button type="button" class="btn btn-primary" data-go="#/colonies/new">+ Nuova colonia</button>
      </header>

      <div class="stat-grid analytics-kpi">
        <article class="stat-card">
          <span class="stat-label">Colonie</span>
          <strong class="stat-value">${stats.total}</strong>
        </article>
        <article class="stat-card">
          <span class="stat-label">Popolazione stimata</span>
          <strong class="stat-value">${formatMetricInt(metrics.estimatedTotal)}</strong>
          <span class="stat-hint">${metrics.coloniesTracked}/${metrics.coloniesTotal} con dato</span>
        </article>
        <article class="stat-card stat-card-accent">
          <span class="stat-label">Crescita media mensile</span>
          <strong class="stat-value ${growthClass(metrics.avgMonthlyGrowthPct)}">${formatMetricPct(metrics.avgMonthlyGrowthPct)}</strong>
          <span class="stat-hint">su rilevamenti popolazione</span>
        </article>
        <article class="stat-card">
          <span class="stat-label">Δ ultimo rilievo</span>
          <strong class="stat-value ${growthClass(metrics.lastDeltaPct)}">${
            metrics.lastDeltaAbs == null
              ? '—'
              : `${metrics.lastDeltaAbs > 0 ? '+' : ''}${formatMetricInt(metrics.lastDeltaAbs)}`
          }</strong>
          <span class="stat-hint">${metrics.lastDeltaPct == null ? 'servono ≥2 punti' : formatMetricPct(metrics.lastDeltaPct)}</span>
        </article>
        <article class="stat-card">
          <span class="stat-label">Rilevamenti</span>
          <strong class="stat-value">${metrics.sampleCount}</strong>
          <span class="stat-hint">log crescita con n° operaie</span>
        </article>
      </div>

      <div class="panel chart-panel">
        <div class="panel-head chart-head">
          <div>
            <h3>Curva di crescita popolazione</h3>
            <p class="muted chart-sub">Serie storica da log “Crescita” con conteggio operaie</p>
          </div>
          <label class="field field-inline">
            <span>Colonia</span>
            <select id="chart-colony-scope">
              <option value="all" ${colonyScope === 'all' ? 'selected' : ''}>Tutte (aggregato)</option>
              ${colonies
                .map(
                  (c) =>
                    `<option value="${c.id}" ${String(colonyScope) === String(c.id) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
                )
                .join('')}
            </select>
          </label>
        </div>
        <div class="chart-wrap ${hasSeries ? '' : 'is-empty'}">
          <canvas id="population-chart" aria-label="Grafico popolazione nel tempo"></canvas>
          ${
            hasSeries
              ? ''
              : `<div class="chart-empty">
                   <p>Nessun dato popolazione ancora.</p>
                   <p class="muted">Apri una colonia → log tipo <strong>Crescita</strong> → inserisci il numero di operaie.</p>
                 </div>`
          }
        </div>
      </div>

      <div class="stat-grid status-strip">
        <article class="stat-card compact"><span class="stat-label">Solo regina</span><strong>${stats.byStatus.queen_only}</strong></article>
        <article class="stat-card compact"><span class="stat-label">Fondazione</span><strong>${stats.byStatus.founding}</strong></article>
        <article class="stat-card compact"><span class="stat-label">Stabilite</span><strong>${stats.byStatus.established}</strong></article>
        <article class="stat-card compact"><span class="stat-label">Enciclopedia</span><strong>${enc.count}</strong></article>
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3>Colonie recenti</h3>
          <button type="button" class="btn btn-ghost btn-sm" data-go="#/colonies">Vedi tutte</button>
        </div>
        ${
          recent.length === 0
            ? `<p class="empty-hint">Nessuna colonia ancora. Crea la prima per attivare analytics e Smart Advisor.</p>`
            : `<ul class="list-rows">${recent
                .map(
                  (c) => `
              <li>
                <button type="button" class="list-row" data-go="#/colonies/${c.id}">
                  <span class="list-main">
                    <strong>${escapeHtml(c.name)}</strong>
                    <em>${escapeHtml(c.species)}</em>
                  </span>
                  <span class="${statusBadgeClass(c.status)}" data-status="${escapeHtml(c.status)}">${escapeHtml(STATUS_LABELS[c.status] || c.status)}</span>
                </button>
              </li>`
                )
                .join('')}</ul>`
        }
      </div>
    </section>
  `)
  );

  root.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.getAttribute('data-go')));
  });

  root.querySelector('#chart-colony-scope')?.addEventListener('change', async (e) => {
    const value = e.target.value;
    const { clear } = await import('./ui.js');
    clear(root);
    await renderDashboard(root, { colonyScope: value === 'all' ? 'all' : Number(value) });
  });

  if (hasSeries) {
    const canvas = root.querySelector('#population-chart');
    const theme = getChartTheme();
    populationChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: series.map((p) => p.label),
        datasets: [
          {
            label: colonyScope === 'all' ? 'Popolazione aggregata' : 'Popolazione colonia',
            data: series.map((p) => p.value),
            borderColor: theme.accent,
            backgroundColor: theme.accentFill,
            pointBackgroundColor: theme.accent,
            pointRadius: series.length > 40 ? 2 : 3,
            pointHoverRadius: 5,
            borderWidth: 2,
            fill: true,
            tension: 0.25,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            labels: { color: theme.text, boxWidth: 12 },
          },
          tooltip: {
            backgroundColor: theme.tooltipBg,
            titleColor: theme.text,
            bodyColor: theme.muted,
            borderColor: theme.border,
            borderWidth: 1,
            callbacks: {
              label(ctx) {
                return ` ${formatMetricInt(ctx.parsed.y)} operaie`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: theme.muted, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
            grid: { color: theme.grid },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: theme.muted,
              callback(v) {
                return formatMetricInt(v);
              },
            },
            grid: { color: theme.grid },
            title: { display: true, text: 'Operaie (stima)', color: theme.muted },
          },
        },
      },
    });
  }
}

function growthClass(pct) {
  if (pct == null) return '';
  if (pct > 0) return 'is-up';
  if (pct < 0) return 'is-down';
  return '';
}

function getChartTheme() {
  const styles = getComputedStyle(document.documentElement);
  const accent = styles.getPropertyValue('--accent').trim() || '#30d158';
  const text = styles.getPropertyValue('--text').trim() || '#ffffff';
  const muted = styles.getPropertyValue('--text-muted').trim() || '#8e8e93';
  const border = styles.getPropertyValue('--border').trim() || 'rgba(84, 84, 88, 0.45)';
  const elevated = styles.getPropertyValue('--bg-elevated').trim() || '#1c1c1e';
  return {
    accent,
    accentFill: hexToRgba(accent, 0.18),
    text,
    muted,
    border,
    grid: hexToRgba(muted, 0.15),
    tooltipBg: elevated,
  };
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return `rgba(61, 155, 110, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
