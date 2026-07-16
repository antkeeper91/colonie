/**
 * Pannelli laboratorio Master-Detail (biologia, clima, salute, …)
 */

import Chart from 'chart.js/auto';
import { listColonies } from '../db.js';
import {
  FORMICARIUM_TYPES,
  HEALTH_ISSUES,
  REPRO_EVENTS,
  SETUP_ACTIONS,
  addMediaItem,
  captureGps,
  createBiologyLog,
  createClimateLog,
  createHealthLog,
  createReproductionLog,
  createSetupLog,
  deleteMediaItem,
  evaluateSetpoints,
  getClimateSeries,
  getLatestBiology,
  listBiologyLogs,
  listHealthLogs,
  listMediaItems,
  listReproductionLogs,
  listSetupLogs,
  setQuarantine,
  updateColonySetpoints,
  updateFieldData,
  updateGenealogy,
} from './lab-data.js';

export { getClimateSeries };
import { escapeHtml, formatDate, toast } from './ui.js';

let climateChart = null;

const TABS = [
  { id: 'overview', label: 'Panoramica' },
  { id: 'biology', label: 'Biologia' },
  { id: 'climate', label: 'Clima' },
  { id: 'nutrition', label: 'Nutrizione' },
  { id: 'health', label: 'Salute' },
  { id: 'repro', label: 'Riproduzione' },
  { id: 'setup', label: 'Setup' },
  { id: 'field', label: 'Campo' },
  { id: 'media', label: 'Media' },
  { id: 'timeline', label: 'Timeline' },
];

export function labTabButtons(activeTab) {
  return TABS.map(
    (t) => `
    <button type="button" class="md-seg ${activeTab === t.id ? 'is-active' : ''}" role="tab"
      aria-selected="${activeTab === t.id}" data-md-tab="${t.id}">${escapeHtml(t.label)}</button>`
  ).join('');
}

export async function loadLabContext(colonyId) {
  const [biologyLatest, biology, climateSeries, health, repro, setup, media, colonies] =
    await Promise.all([
      getLatestBiology(colonyId),
      listBiologyLogs(colonyId, 20),
      getClimateSeries(colonyId, 60),
      listHealthLogs(colonyId, 25),
      listReproductionLogs(colonyId, 25),
      listSetupLogs(colonyId, 20),
      listMediaItems(colonyId, 30),
      listColonies(),
    ]);
  return { biologyLatest, biology, climateSeries, health, repro, setup, media, colonies };
}

export function biologyPanel(ctx, active) {
  const hidden = active !== 'biology';
  const b = ctx.biologyLatest;
  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="biology" ${hidden ? 'hidden' : ''}>
      ${
        b
          ? `<div class="md-card">
        <h3 class="md-card-title">Ultimo censimento</h3>
        <ul class="md-kv">
          <li><span>Regine</span><strong>${b.queens}</strong></li>
          <li><span>Operaie</span><strong>${b.workers}</strong></li>
          <li><span>Major / Minor</span><strong>${b.majors} / ${b.minors}</strong></li>
          <li><span>Alati ♂/♀</span><strong>${b.alates_male} / ${b.alates_female}</strong></li>
          <li><span>Uova / Larve / Pupe</span><strong>${b.eggs} / ${b.larvae} / ${b.pupae}</strong></li>
          <li><span>Biomassa</span><strong>${b.biomass_g != null ? `${b.biomass_g} g` : '—'}</strong></li>
        </ul>
      </div>`
          : ''
      }
      <div class="md-card">
        <h3 class="md-card-title">Nuovo censimento</h3>
        <form id="md-bio-form" class="md-feed-form md-lab-grid">
          ${numField('queens', 'Regine', 0)}
          ${numField('workers', 'Operaie', 0)}
          ${numField('majors', 'Major', 0)}
          ${numField('minors', 'Minor', 0)}
          ${numField('alates_male', 'Alati ♂', 0)}
          ${numField('alates_female', 'Alati ♀', 0)}
          ${numField('eggs', 'Uova', 0)}
          ${numField('larvae', 'Larve', 0)}
          ${numField('pupae', 'Pupe', 0)}
          <label class="md-field">
            <span>Biomassa (g)</span>
            <input type="number" name="biomass_g" step="0.01" min="0" placeholder="opzionale" />
          </label>
          <label class="md-field md-span-2">
            <span>Note</span>
            <textarea name="notes" rows="2"></textarea>
          </label>
          <button type="submit" class="btn btn-primary md-btn-block md-span-2">Salva censimento</button>
        </form>
      </div>
      ${historyList('Storico biologia', ctx.biology, (r) => ({
        title: `Adulti ${r.queens + r.workers + r.majors + r.minors + r.alates_male + r.alates_female} · covata ${r.eggs + r.larvae + r.pupae}`,
        sub: formatDate(r.date),
      }))}
    </section>
  `;
}

export function climatePanel(colony, ctx, active) {
  const hidden = active !== 'climate';
  const sp = colony.setpoints || {};
  const last = ctx.climateSeries[ctx.climateSeries.length - 1];
  const alerts = evaluateSetpoints(colony, last);
  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="climate" ${hidden ? 'hidden' : ''}>
      <div class="md-card">
        <h3 class="md-card-title">Storico T / RH</h3>
        ${
          ctx.climateSeries.length
            ? `<div class="md-chart-wrap"><canvas id="md-climate-chart" height="180"></canvas></div>`
            : `<p class="md-muted">Nessuna lettura ancora. Registra temperatura e umidità.</p>`
        }
        ${
          alerts.length
            ? `<ul class="md-alert-list">${alerts.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
            : ''
        }
      </div>
      <div class="md-card">
        <h3 class="md-card-title">Nuova lettura</h3>
        <form id="md-climate-form" class="md-feed-form md-lab-grid">
          ${numField('nest_temp_c', 'T nido °C', null, true)}
          ${numField('nest_humidity_pct', 'RH nido %', null, true)}
          ${numField('arena_temp_c', 'T arena °C', null, true)}
          ${numField('arena_humidity_pct', 'RH arena %', null, true)}
          <label class="md-field md-span-2">
            <span>Note</span>
            <textarea name="notes" rows="2"></textarea>
          </label>
          <button type="submit" class="btn btn-primary md-btn-block md-span-2">Salva clima</button>
        </form>
      </div>
      <div class="md-card">
        <h3 class="md-card-title">Setpoint</h3>
        <form id="md-setpoints-form" class="md-feed-form md-lab-grid">
          ${numField('nest_temp_min', 'T nido min', sp.nest_temp_min, true)}
          ${numField('nest_temp_max', 'T nido max', sp.nest_temp_max, true)}
          ${numField('nest_rh_min', 'RH nido min', sp.nest_rh_min, true)}
          ${numField('nest_rh_max', 'RH nido max', sp.nest_rh_max, true)}
          ${numField('arena_temp_min', 'T arena min', sp.arena_temp_min, true)}
          ${numField('arena_temp_max', 'T arena max', sp.arena_temp_max, true)}
          <button type="submit" class="btn btn-ghost md-btn-block md-span-2">Salva setpoint</button>
        </form>
      </div>
    </section>
  `;
}

export function healthPanel(colony, ctx, active) {
  const hidden = active !== 'health';
  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="health" ${hidden ? 'hidden' : ''}>
      <div class="md-card">
        <h3 class="md-card-title">Quarantena</h3>
        <p class="md-muted">Stato attuale: <strong>${colony.quarantine ? 'ATTIVA' : 'off'}</strong></p>
        <div class="md-row-actions">
          <button type="button" class="btn btn-primary btn-sm" data-quarantine="on">Attiva</button>
          <button type="button" class="btn btn-ghost btn-sm" data-quarantine="off">Termina</button>
        </div>
      </div>
      <div class="md-card">
        <h3 class="md-card-title">Evento salute</h3>
        <form id="md-health-form" class="md-feed-form">
          <label class="md-field">
            <span>Problema</span>
            <select name="issue_type" required>
              ${HEALTH_ISSUES.map((i) => `<option value="${i.id}">${escapeHtml(i.label)}</option>`).join('')}
            </select>
          </label>
          <label class="md-field">
            <span>Severità</span>
            <select name="severity">
              <option value="low">Bassa</option>
              <option value="medium" selected>Media</option>
              <option value="high">Alta</option>
            </select>
          </label>
          <label class="md-field">
            <span>Trattamento</span>
            <input type="text" name="treatment" placeholder="es. isolamento, pulizia…" />
          </label>
          <label class="md-field">
            <span>Esito</span>
            <input type="text" name="outcome" />
          </label>
          <label class="md-field">
            <span>Note</span>
            <textarea name="notes" rows="2"></textarea>
          </label>
          <button type="submit" class="btn btn-primary md-btn-block">Salva</button>
        </form>
      </div>
      ${historyList('Storico salute', ctx.health, (r) => ({
        title: `${r.issue_label} · ${r.severity}`,
        sub: `${formatDate(r.date)}${r.treatment ? ` · ${r.treatment}` : ''}`,
      }))}
    </section>
  `;
}

export function reproPanel(colony, ctx, active) {
  const hidden = active !== 'repro';
  const g = colony.genealogy || {};
  const others = (ctx.colonies || []).filter((c) => c.id !== colony.id);
  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="repro" ${hidden ? 'hidden' : ''}>
      <div class="md-card">
        <h3 class="md-card-title">Evento riproduttivo</h3>
        <form id="md-repro-form" class="md-feed-form">
          <label class="md-field">
            <span>Tipo</span>
            <select name="event_type" required>
              ${REPRO_EVENTS.map((e) => `<option value="${e.id}">${escapeHtml(e.label)}</option>`).join('')}
            </select>
          </label>
          <label class="md-field">
            <span>Conteggio</span>
            <input type="number" name="count" min="0" step="1" placeholder="opzionale" />
          </label>
          <label class="md-field">
            <span>Note</span>
            <textarea name="notes" rows="2"></textarea>
          </label>
          <button type="submit" class="btn btn-primary md-btn-block">Salva</button>
        </form>
      </div>
      <div class="md-card">
        <h3 class="md-card-title">Genealogia</h3>
        <form id="md-genealogy-form" class="md-feed-form">
          <label class="md-field">
            <span>Colonia madre</span>
            <select name="mother_colony_id">
              <option value="">— nessuna —</option>
              ${others
                .map(
                  (c) =>
                    `<option value="${c.id}" ${g.mother_colony_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)} (${escapeHtml(c.species)})</option>`
                )
                .join('')}
            </select>
          </label>
          <label class="md-field">
            <span>Note lignaggio</span>
            <textarea name="notes" rows="2">${escapeHtml(g.notes || '')}</textarea>
          </label>
          <button type="submit" class="btn btn-ghost md-btn-block">Salva genealogia</button>
        </form>
      </div>
      ${historyList('Storico riproduzione', ctx.repro, (r) => ({
        title: r.event_label + (r.count != null ? ` ×${r.count}` : ''),
        sub: formatDate(r.date),
      }))}
    </section>
  `;
}

export function setupPanel(colony, ctx, active) {
  const hidden = active !== 'setup';
  const f = colony.formicarium || {};
  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="setup" ${hidden ? 'hidden' : ''}>
      ${
        f.type || f.volume_ml
          ? `<div class="md-card">
        <h3 class="md-card-title">Formicario attuale</h3>
        <ul class="md-kv">
          <li><span>Tipo</span><strong>${escapeHtml(f.type || '—')}</strong></li>
          <li><span>Volume</span><strong>${f.volume_ml != null ? `${f.volume_ml} ml` : '—'}</strong></li>
          <li><span>Camere</span><strong>${f.chambers ?? '—'}</strong></li>
          <li><span>Substrato</span><strong>${escapeHtml(f.substrate || '—')}</strong></li>
        </ul>
      </div>`
          : ''
      }
      <div class="md-card">
        <h3 class="md-card-title">Allestimento / trasloco</h3>
        <form id="md-setup-form" class="md-feed-form">
          <label class="md-field">
            <span>Azione</span>
            <select name="action" required>
              ${SETUP_ACTIONS.map((a) => `<option value="${a.id}">${escapeHtml(a.label)}</option>`).join('')}
            </select>
          </label>
          <label class="md-field">
            <span>Tipo formicario</span>
            <select name="formicarium_type">
              <option value="">—</option>
              ${FORMICARIUM_TYPES.map((t) => `<option value="${escapeHtml(t)}" ${f.type === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
            </select>
          </label>
          <label class="md-field">
            <span>Volume (ml)</span>
            <input type="number" name="volume_ml" min="0" step="1" value="${f.volume_ml ?? ''}" />
          </label>
          <label class="md-field">
            <span>Camere</span>
            <input type="number" name="chambers" min="0" step="1" value="${f.chambers ?? ''}" />
          </label>
          <label class="md-field">
            <span>Substrato</span>
            <input type="text" name="substrate" value="${escapeHtml(f.substrate || '')}" />
          </label>
          <label class="md-field">
            <span>Note</span>
            <textarea name="notes" rows="2">${escapeHtml(f.notes || '')}</textarea>
          </label>
          <button type="submit" class="btn btn-primary md-btn-block">Salva setup</button>
        </form>
      </div>
      ${historyList('Storico setup', ctx.setup, (r) => ({
        title: `${r.action_label}${r.formicarium_type ? ` · ${r.formicarium_type}` : ''}`,
        sub: formatDate(r.date),
      }))}
    </section>
  `;
}

export function fieldPanel(colony, active) {
  const hidden = active !== 'field';
  const f = colony.field || {};
  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="field" ${hidden ? 'hidden' : ''}>
      <div class="md-card">
        <h3 class="md-card-title">Dati di campo / legalità</h3>
        <form id="md-field-form" class="md-feed-form">
          <label class="md-field">
            <span>Data raccolta</span>
            <input type="date" name="collection_date" value="${escapeHtml((f.collection_date || '').slice(0, 10))}" />
          </label>
          <label class="md-field">
            <span>Località</span>
            <input type="text" name="location" value="${escapeHtml(f.location || '')}" />
          </label>
          <div class="md-lab-grid">
            <label class="md-field">
              <span>Latitudine</span>
              <input type="number" name="lat" step="0.00001" id="md-field-lat" value="${f.lat ?? ''}" />
            </label>
            <label class="md-field">
              <span>Longitudine</span>
              <input type="number" name="lng" step="0.00001" id="md-field-lng" value="${f.lng ?? ''}" />
            </label>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="md-gps-btn">Usa GPS</button>
          <label class="md-field">
            <span>Habitat</span>
            <input type="text" name="habitat" value="${escapeHtml(f.habitat || '')}" />
          </label>
          <label class="md-field">
            <span>Raccoglitore</span>
            <input type="text" name="collector" value="${escapeHtml(f.collector || '')}" />
          </label>
          <label class="md-field">
            <span>Permesso / rif.</span>
            <input type="text" name="permit_ref" value="${escapeHtml(f.permit_ref || '')}" />
          </label>
          <label class="md-field">
            <span>Note CITES / legalità</span>
            <textarea name="cites_notes" rows="2">${escapeHtml(f.cites_notes || '')}</textarea>
          </label>
          <button type="submit" class="btn btn-primary md-btn-block">Salva dati campo</button>
        </form>
      </div>
    </section>
  `;
}

export function mediaPanel(ctx, active) {
  const hidden = active !== 'media';
  return `
    <section class="md-panel ${hidden ? '' : 'is-active'}" role="tabpanel" data-md-panel="media" ${hidden ? 'hidden' : ''}>
      <div class="md-card">
        <h3 class="md-card-title">Galleria</h3>
        <form id="md-media-form" class="md-feed-form">
          <label class="md-field">
            <span>Foto</span>
            <input type="file" name="file" accept="image/*" capture="environment" required />
          </label>
          <label class="md-field">
            <span>Didascalia</span>
            <input type="text" name="caption" placeholder="opzionale" />
          </label>
          <button type="submit" class="btn btn-primary md-btn-block">Aggiungi foto</button>
        </form>
      </div>
      <div class="md-media-grid">
        ${
          ctx.media.length === 0
            ? `<p class="md-muted">Nessuna foto in galleria.</p>`
            : ctx.media
                .map(
                  (m) => `
              <figure class="md-media-item">
                <img src="${escapeHtml(m.data_url)}" alt="${escapeHtml(m.caption || 'Foto')}" />
                <figcaption>
                  <span>${escapeHtml(m.caption || formatDate(m.date))}</span>
                  <button type="button" class="btn btn-ghost btn-sm" data-del-media="${m.id}">Elimina</button>
                </figcaption>
              </figure>`
                )
                .join('')
        }
      </div>
    </section>
  `;
}

export function destroyClimateChart() {
  if (climateChart) {
    climateChart.destroy();
    climateChart = null;
  }
}

export function mountClimateChart(host, series) {
  destroyClimateChart();
  const canvas = host.querySelector('#md-climate-chart');
  if (!canvas || !series.length) return;

  const labels = series.map((r) => formatAxis(r.date));
  climateChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'T nido °C',
          data: series.map((r) => r.nest_temp_c),
          borderColor: '#c4a35a',
          backgroundColor: 'transparent',
          tension: 0.25,
          spanGaps: true,
          yAxisID: 'y',
        },
        {
          label: 'RH nido %',
          data: series.map((r) => r.nest_humidity_pct),
          borderColor: '#5a8f6d',
          backgroundColor: 'transparent',
          tension: 0.25,
          spanGaps: true,
          yAxisID: 'y1',
        },
        {
          label: 'T arena °C',
          data: series.map((r) => r.arena_temp_c),
          borderColor: '#8b7355',
          borderDash: [4, 3],
          backgroundColor: 'transparent',
          tension: 0.25,
          spanGaps: true,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { color: '#c8c4bc', boxWidth: 12, font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8a8680', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: {
          position: 'left',
          title: { display: true, text: '°C', color: '#8a8680' },
          ticks: { color: '#8a8680' },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
        y1: {
          position: 'right',
          title: { display: true, text: '%', color: '#8a8680' },
          ticks: { color: '#8a8680' },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

/**
 * @param {HTMLElement} host
 * @param {object} colony
 * @param {{ onRefresh: (tab: string) => Promise<void> }} api
 */
export function wireLabPanels(host, colony, api) {
  bindForm(host, '#md-bio-form', async (fd) => {
    await createBiologyLog({ colony_id: colony.id, ...Object.fromEntries(fd) });
    toast('Censimento salvato');
    await api.onRefresh('biology');
  });

  bindForm(host, '#md-climate-form', async (fd) => {
    await createClimateLog({ colony_id: colony.id, ...Object.fromEntries(fd) });
    toast('Lettura clima salvata');
    await api.onRefresh('climate');
  });

  bindForm(host, '#md-setpoints-form', async (fd) => {
    await updateColonySetpoints(colony.id, Object.fromEntries(fd));
    toast('Setpoint aggiornati');
    await api.onRefresh('climate');
  });

  bindForm(host, '#md-health-form', async (fd) => {
    await createHealthLog({ colony_id: colony.id, ...Object.fromEntries(fd) });
    toast('Evento salute salvato');
    await api.onRefresh('health');
  });

  host.querySelectorAll('[data-quarantine]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await setQuarantine(colony.id, btn.getAttribute('data-quarantine') === 'on');
        toast('Quarantena aggiornata');
        await api.onRefresh('health');
      } catch (err) {
        toast(err.message || 'Errore', 'error');
      }
    });
  });

  bindForm(host, '#md-repro-form', async (fd) => {
    await createReproductionLog({ colony_id: colony.id, ...Object.fromEntries(fd) });
    toast('Evento riproduttivo salvato');
    await api.onRefresh('repro');
  });

  bindForm(host, '#md-genealogy-form', async (fd) => {
    await updateGenealogy(colony.id, {
      mother_colony_id: fd.get('mother_colony_id'),
      notes: fd.get('notes'),
    });
    toast('Genealogia salvata');
    await api.onRefresh('repro');
  });

  bindForm(host, '#md-setup-form', async (fd) => {
    await createSetupLog({ colony_id: colony.id, ...Object.fromEntries(fd) });
    toast('Setup salvato');
    await api.onRefresh('setup');
  });

  bindForm(host, '#md-field-form', async (fd) => {
    await updateFieldData(colony.id, Object.fromEntries(fd));
    toast('Dati di campo salvati');
    await api.onRefresh('field');
  });

  host.querySelector('#md-gps-btn')?.addEventListener('click', async () => {
    try {
      toast('Rilevamento GPS…');
      const pos = await captureGps();
      const lat = host.querySelector('#md-field-lat');
      const lng = host.querySelector('#md-field-lng');
      if (lat) lat.value = String(pos.lat);
      if (lng) lng.value = String(pos.lng);
      toast('Coordinate acquisite');
    } catch (err) {
      toast(err.message || 'GPS non disponibile', 'error');
    }
  });

  const mediaForm = host.querySelector('#md-media-form');
  mediaForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(mediaForm);
    const file = fd.get('file');
    if (!(file instanceof File) || !file.size) {
      toast('Seleziona una foto', 'error');
      return;
    }
    try {
      toast('Compressione…');
      await addMediaItem(colony.id, file, String(fd.get('caption') || ''));
      toast('Foto aggiunta');
      await api.onRefresh('media');
    } catch (err) {
      toast(err.message || 'Upload fallito', 'error');
    }
  });

  host.querySelectorAll('[data-del-media]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await deleteMediaItem(Number(btn.getAttribute('data-del-media')));
        toast('Foto eliminata');
        await api.onRefresh('media');
      } catch (err) {
        toast(err.message || 'Errore', 'error');
      }
    });
  });
}

function bindForm(host, sel, handler) {
  const form = host.querySelector(sel);
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await handler(new FormData(form));
    } catch (err) {
      toast(err.message || 'Salvataggio fallito', 'error');
    }
  });
}

function numField(name, label, value, optional = false) {
  const v = value == null || value === '' ? '' : value;
  return `
    <label class="md-field">
      <span>${escapeHtml(label)}</span>
      <input type="number" name="${name}" step="any" ${optional ? '' : 'min="0"'} value="${escapeHtml(String(v))}" ${optional ? '' : ''} />
    </label>`;
}

function historyList(title, rows, mapFn) {
  if (!rows?.length) {
    return `<div class="md-card"><h3 class="md-card-title">${escapeHtml(title)}</h3><p class="md-muted">Nessun record.</p></div>`;
  }
  return `
    <div class="md-card">
      <h3 class="md-card-title">${escapeHtml(title)}</h3>
      <ul class="md-timeline">
        ${rows
          .map((r) => {
            const m = mapFn(r);
            return `<li>
              <div class="md-tl-dot" aria-hidden="true"></div>
              <div>
                <strong>${escapeHtml(m.title)}</strong>
                <p class="md-muted">${escapeHtml(m.sub)}</p>
              </div>
            </li>`;
          })
          .join('')}
      </ul>
    </div>`;
}

function formatAxis(iso) {
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  } catch {
    return String(iso).slice(0, 10);
  }
}
