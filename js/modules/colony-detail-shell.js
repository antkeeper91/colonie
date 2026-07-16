/**
 * Master-Detail colony sheet — laboratorio completo
 */

import {
  ACCEPTANCE_LEVELS,
  COLONY_STATUSES,
  clearColonyCoverPhoto,
  createFeedingLog,
  daysSinceRegistration,
  getFeedingMenuCategories,
  getFeedingMenuItems,
  getLatestClimate,
  listFeedingLogsByColony,
  listTimelineEvents,
  setColonyCoverPhoto,
  updateColony,
} from '../db.js';
import {
  biologyPanel,
  climatePanel,
  destroyClimateChart,
  fieldPanel,
  healthPanel,
  labTabButtons,
  loadLabContext,
  mediaPanel,
  mountClimateChart,
  reproPanel,
  setupPanel,
  wireLabPanels,
} from './colony-lab.js';
import { fileToCoverDataUrl, placeholderStyle } from './photos.js';
import { el, escapeHtml, formatDate, statusBadgeClass, STATUS_LABELS, toast } from './ui.js';

const ACCEPTANCE_LABEL = {
  low: 'Bassa',
  medium: 'Media',
  high: 'Alta',
  1: 'Bassa',
  2: 'Media',
  3: 'Alta',
};

/**
 * @param {object} colony
 * @param {{ onClose?: () => void }} [opts]
 */
export async function openColonyDetailShell(colony, opts = {}) {
  if (!colony?.id) {
    toast('Colonia non valida', 'error');
    return null;
  }

  closeColonyDetailShell();

  const host = el(`<div class="md-root" id="md-root"></div>`);
  document.getElementById('app')?.appendChild(host);
  document.body.classList.add('md-open');

  await renderSheet(host, colony.id, opts);
  return host;
}

export function closeColonyDetailShell() {
  destroyClimateChart();
  document.getElementById('md-root')?.remove();
  document.body.classList.remove('md-open');
}

async function renderSheet(host, colonyId, opts = {}, activeTab = 'overview') {
  const { getColony } = await import('../db.js');
  const colony = await getColony(colonyId);
  if (!colony) {
    toast('Colonia non trovata', 'error');
    closeColonyDetailShell();
    return;
  }

  const [climate, feeds, timeline, lab] = await Promise.all([
    getLatestClimate(colonyId),
    listFeedingLogsByColony(colonyId, { limit: 25 }),
    listTimelineEvents(colonyId, { limit: 80 }),
    loadLabContext(colonyId),
  ]);

  const days = daysSinceRegistration(colony);
  const categories = getFeedingMenuCategories();

  destroyClimateChart();

  host.innerHTML = `
    <div class="md-sheet is-visible" role="dialog" aria-modal="true" aria-labelledby="md-sheet-title">
      <header class="md-sheet-header">
        <button type="button" class="md-back" data-md-close aria-label="Indietro">
          <span class="md-back-chevron" aria-hidden="true">‹</span>
          <span>Indietro</span>
        </button>
        <h2 id="md-sheet-title" class="md-sheet-title">${escapeHtml(colony.name)}</h2>
        <span class="md-header-spacer" aria-hidden="true"></span>
      </header>

      <div class="md-hero">
        ${
          colony.cover_photo
            ? `<img src="${escapeHtml(colony.cover_photo)}" alt="Foto ${escapeHtml(colony.name)}" />`
            : `<div class="md-hero-fallback colony-cover-fallback" style="${placeholderStyle(colony.species || colony.name)}"></div>`
        }
        <div class="md-hero-actions">
          <button type="button" class="md-photo-btn" data-photo-pick>📷 Foto</button>
          ${colony.cover_photo ? `<button type="button" class="md-photo-btn" data-photo-clear>Rimuovi</button>` : ''}
        </div>
        <input type="file" accept="image/*" capture="environment" id="md-photo-input" hidden />
      </div>

      <div class="md-sheet-sub">
        <em>${escapeHtml(colony.species)}</em>
        ${colony.quarantine ? `<span class="badge badge-warn">Quarantena</span>` : ''}
        <span class="${statusBadgeClass(colony.status)}" data-status="${escapeHtml(colony.status)}">
          ${escapeHtml(STATUS_LABELS[colony.status] || colony.status)}
        </span>
      </div>

      <nav class="md-segmented md-segmented-scroll" role="tablist" aria-label="Sezioni colonia">
        ${labTabButtons(activeTab)}
      </nav>

      <div class="md-sheet-body">
        ${overviewPanel(colony, days, climate, activeTab !== 'overview')}
        ${biologyPanel(lab, activeTab)}
        ${climatePanel(colony, lab, activeTab)}
        ${nutritionPanel(categories, feeds, activeTab !== 'nutrition')}
        ${healthPanel(colony, lab, activeTab)}
        ${reproPanel(colony, lab, activeTab)}
        ${setupPanel(colony, lab, activeTab)}
        ${fieldPanel(colony, activeTab)}
        ${mediaPanel(lab, activeTab)}
        ${timelinePanel(timeline, colony, activeTab !== 'timeline')}
      </div>
    </div>
  `;

  wireChrome(host, colony, opts, activeTab);
  wireOverview(host, colony, opts);
  wireNutrition(host, colony, opts);
  wirePhotos(host, colony, opts);
  wireLabPanels(host, colony, {
    onRefresh: (tab) => renderSheet(host, colony.id, opts, tab),
  });

  if (activeTab === 'climate') {
    requestAnimationFrame(() => mountClimateChart(host, lab.climateSeries));
  }
}

function overviewPanel(colony, days, climate, hidden) {
  const t = climate?.nest_temp_c;
  const h = climate?.nest_humidity_pct;
  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="overview" ${hidden ? 'hidden' : ''}>
      <div class="md-card md-days-card">
        <p class="md-days-label">Giorni dalla registrazione</p>
        <p class="md-days-value">${days}</p>
        <p class="md-muted">Dal ${escapeHtml(formatDate(colony.created_at || colony.acquisition_date))}</p>
      </div>

      <div class="md-card">
        <h3 class="md-card-title">Dati vitali</h3>
        <ul class="md-kv">
          <li><span>Specie</span><strong><em>${escapeHtml(colony.species)}</em></strong></li>
          <li><span>Fondazione</span><strong>${escapeHtml(formatDate(colony.acquisition_date))}</strong></li>
          <li><span>Temperatura</span><strong>${t != null ? `${escapeHtml(String(t))}°C` : '—'}</strong></li>
          <li><span>Umidità</span><strong>${h != null ? `${escapeHtml(String(h))}%` : '—'}</strong></li>
        </ul>
      </div>

      <div class="md-card">
        <h3 class="md-card-title">Stato biologico</h3>
        <p class="md-muted" style="margin-bottom:10px">Il cambio stato viene registrato automaticamente in Timeline.</p>
        <div class="md-status-grid" role="group" aria-label="Stato biologico">
          ${COLONY_STATUSES.map(
            (s) => `
            <button type="button" class="md-status-btn ${colony.status === s.id ? 'is-active' : ''}"
              data-set-status="${escapeHtml(s.id)}">${escapeHtml(s.label)}</button>`
          ).join('')}
        </div>
      </div>

      <div class="md-card advisor-panel" id="md-advisor-slot">
        <h3 class="md-card-title">Smart Advisor</h3>
        <div id="md-advisor-body"></div>
      </div>
    </section>
  `;
}

function nutritionPanel(categories, feeds, hidden) {
  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="nutrition" ${hidden ? 'hidden' : ''}>
      <div class="md-card">
        <h3 class="md-card-title">Nuovo pasto</h3>
        <p class="md-muted">Solo liquidi: proteici commerciali e carboidrati (zuccheri/mieli).</p>
        <form id="md-feed-form" class="md-feed-form">
          <label class="md-field">
            <span>Tipo di cibo</span>
            <select name="category" id="md-feed-category" required>
              ${categories
                .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`)
                .join('')}
            </select>
          </label>
          <label class="md-field">
            <span>Prodotto / miscela</span>
            <select name="item_id" id="md-feed-item" required></select>
          </label>
          <div class="md-field">
            <span>Accettazione</span>
            <div class="md-accept-group" role="radiogroup" aria-label="Accettazione">
              ${ACCEPTANCE_LEVELS.map(
                (a, i) => `
                <label class="md-accept-btn">
                  <input type="radio" name="acceptance_level" value="${a.id}" ${i === 1 ? 'checked' : ''} required />
                  <span>${escapeHtml(a.label)}</span>
                </label>`
              ).join('')}
            </div>
          </div>
          <label class="md-field">
            <span>Note (opzionale)</span>
            <textarea name="notes" rows="2" placeholder="Dose, residui, reazione..."></textarea>
          </label>
          <button type="submit" class="btn btn-primary md-btn-block">Salva pasto</button>
        </form>
      </div>

      <div class="md-card">
        <h3 class="md-card-title">Ultimi cibi</h3>
        ${
          feeds.length === 0
            ? `<p class="md-muted">Nessun pasto ancora. Registra la prima miscela liquida.</p>`
            : `<ul class="md-timeline md-feed-list">${feeds
                .map((f) => {
                  const acc =
                    ACCEPTANCE_LABEL[f.acceptance_level] ||
                    ACCEPTANCE_LABEL[f.acceptance_rating] ||
                    '—';
                  return `
                  <li>
                    <div class="md-tl-dot is-accent" aria-hidden="true"></div>
                    <div>
                      <strong>${escapeHtml(f.item_label)}</strong>
                      <p class="md-muted">${escapeHtml(f.category_label)} · Accettazione ${escapeHtml(acc)} · ${escapeHtml(formatDate(f.date))}</p>
                      ${f.notes ? `<p class="md-muted">${escapeHtml(f.notes)}</p>` : ''}
                    </div>
                  </li>`;
                })
                .join('')}</ul>`
        }
      </div>
    </section>
  `;
}

function timelinePanel(events, colony, hidden) {
  const boot = {
    id: 'boot',
    title: 'Colonia registrata',
    subtitle: formatDate(colony.created_at || colony.acquisition_date),
    accent: false,
  };
  const rows = events.length ? events : [boot];

  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="timeline" ${hidden ? 'hidden' : ''}>
      <div class="md-card">
        <h3 class="md-card-title">Diario di bordo</h3>
        <ul class="md-timeline">
          ${rows
            .map(
              (ev) => `
            <li>
              <div class="md-tl-dot ${ev.accent ? 'is-accent' : ''}" aria-hidden="true"></div>
              <div>
                <strong>${escapeHtml(ev.title)}</strong>
                <p class="md-muted">${escapeHtml(ev.subtitle)}${ev.date ? ` · ${escapeHtml(formatDate(ev.date))}` : ''}</p>
              </div>
            </li>`
            )
            .join('')}
        </ul>
      </div>
    </section>
  `;
}

function wireChrome(host, colony, opts, activeTab) {
  const sheet = host.querySelector('.md-sheet');
  requestAnimationFrame(() => sheet?.classList.add('is-visible'));

  host.querySelector('[data-md-close]')?.addEventListener('click', () => {
    closeColonyDetailShell();
    opts.onClose?.();
  });

  const tabs = host.querySelectorAll('[data-md-tab]');
  const panels = host.querySelectorAll('[data-md-panel]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.getAttribute('data-md-tab');
      tabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panels.forEach((p) => {
        const on = p.getAttribute('data-md-panel') === id;
        p.classList.toggle('is-active', on);
        p.hidden = !on;
      });
      if (id === 'climate') {
        import('./colony-lab.js').then(async ({ getClimateSeries, mountClimateChart }) => {
          const series = await getClimateSeries(colony.id, 60);
          mountClimateChart(host, series);
        });
      } else {
        destroyClimateChart();
      }
      tab.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    });
  });

  // Scroll active tab into view
  host.querySelector('.md-seg.is-active')?.scrollIntoView({ inline: 'center', block: 'nearest' });

  const advBody = host.querySelector('#md-advisor-body');
  if (advBody) {
    import('./advisor.js').then(async ({ generateAdvice: gen, renderAdvicePanel: render }) => {
      try {
        const result = await gen(colony.id, null, null);
        const wrap = document.createElement('div');
        render(wrap, result.tips, {
          climateChecks: result.checks,
          climateOk: !result.checks.some((c) => c.status === 'low' || c.status === 'high'),
          dietNotes: result.dietNotes,
        });
        advBody.innerHTML = wrap.innerHTML;
      } catch {
        advBody.innerHTML = `<p class="md-muted">Advisor non disponibile.</p>`;
      }
    });
  }
}

function wireOverview(host, colony, opts) {
  host.querySelectorAll('[data-set-status]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const status = btn.getAttribute('data-set-status');
      if (!status || status === colony.status) return;
      try {
        await updateColony(colony.id, { status });
        toast(`Stato → ${STATUS_LABELS[status] || status}`);
        await renderSheet(host, colony.id, opts, 'overview');
      } catch (err) {
        toast(err.message || 'Aggiornamento fallito', 'error');
      }
    });
  });
}

function wireNutrition(host, colony, opts) {
  const catSelect = host.querySelector('#md-feed-category');
  const itemSelect = host.querySelector('#md-feed-item');
  const form = host.querySelector('#md-feed-form');
  if (!catSelect || !itemSelect || !form) return;

  const fillItems = () => {
    const items = getFeedingMenuItems(catSelect.value);
    itemSelect.innerHTML = items
      .map((i) => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.label)}</option>`)
      .join('');
  };
  fillItems();
  catSelect.addEventListener('change', fillItems);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await createFeedingLog({
        colony_id: colony.id,
        category: String(fd.get('category')),
        item_id: String(fd.get('item_id')),
        acceptance_level: String(fd.get('acceptance_level')),
        notes: String(fd.get('notes') || ''),
      });
      toast('Pasto salvato');
      await renderSheet(host, colony.id, opts, 'nutrition');
    } catch (err) {
      toast(err.message || 'Salvataggio fallito', 'error');
    }
  });
}

function wirePhotos(host, colony, opts) {
  const input = host.querySelector('#md-photo-input');
  host.querySelector('[data-photo-pick]')?.addEventListener('click', () => input?.click());

  host.querySelector('[data-photo-clear]')?.addEventListener('click', async () => {
    try {
      await clearColonyCoverPhoto(colony.id);
      toast('Foto rimossa');
      await renderSheet(host, colony.id, opts, 'overview');
    } catch (err) {
      toast(err.message || 'Errore', 'error');
    }
  });

  input?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      toast('Compressione foto…');
      const dataUrl = await fileToCoverDataUrl(file);
      await setColonyCoverPhoto(colony.id, dataUrl);
      toast('Foto salvata sul dispositivo');
      await renderSheet(host, colony.id, opts, 'overview');
    } catch (err) {
      toast(err.message || 'Upload fallito', 'error');
    }
  });
}
