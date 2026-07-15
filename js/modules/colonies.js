/**
 * Module A — Gestore Colonie & Log (UI)
 */

import {
  COLONY_STATUSES,
  LOG_TYPES_UI,
  createColony,
  createLog,
  deleteColony,
  deleteLog,
  getColony,
  getLatestClimate,
  listColonies,
  listLogsByColony,
  updateColony,
} from '../db.js';
import { findSpecies } from './encyclopedia.js';
import { generateAdvice, renderAdvicePanel } from './advisor.js';
import { mountFeedingTracker } from './feeding.js';
import { navigate } from './router.js';
import {
  LOG_LABELS,
  STATUS_LABELS,
  clear,
  confirmDialog,
  el,
  escapeHtml,
  formatDate,
  statusBadgeClass,
  toast,
} from './ui.js';

function localInputValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatClimateTag(climate) {
  const bits = [];
  if (climate.nest_temp_c != null) bits.push(`Tn ${climate.nest_temp_c}°C`);
  if (climate.nest_humidity_pct != null) bits.push(`RHn ${climate.nest_humidity_pct}%`);
  if (climate.arena_temp_c != null) bits.push(`Ta ${climate.arena_temp_c}°C`);
  if (climate.arena_humidity_pct != null) bits.push(`RHa ${climate.arena_humidity_pct}%`);
  return bits.join(' · ');
}

export async function renderColoniesList(root) {
  const colonies = await listColonies();
  root.appendChild(
    el(`
    <section class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Modulo A</p>
          <h2>Le mie colonie</h2>
        </div>
        <button type="button" class="btn btn-primary" id="btn-new-colony">+ Aggiungi</button>
      </header>
      ${
        colonies.length === 0
          ? `<div class="panel"><p class="empty-hint">Nessuna colonia salvata su questo dispositivo.</p></div>`
          : `<ul class="colony-grid">${colonies
              .map(
                (c) => `
            <li>
              <article class="colony-card" data-id="${c.id}">
                <div class="colony-card-top">
                  <h3>${escapeHtml(c.name)}</h3>
                  <span class="${statusBadgeClass(c.status)}" data-status="${escapeHtml(c.status)}">${escapeHtml(STATUS_LABELS[c.status] || c.status)}</span>
                </div>
                <p class="species-line"><em>${escapeHtml(c.species)}</em></p>
                <p class="meta-line">Acquisita ${escapeHtml(formatDate(c.acquisition_date))}</p>
                <button type="button" class="btn btn-ghost btn-sm btn-open">Apri</button>
              </article>
            </li>`
              )
              .join('')}</ul>`
      }
    </section>
  `)
  );

  root.querySelector('#btn-new-colony')?.addEventListener('click', () => navigate('#/colonies/new'));
  root.querySelectorAll('.colony-card').forEach((card) => {
    card.querySelector('.btn-open').addEventListener('click', () => navigate(`#/colonies/${card.dataset.id}`));
  });
}

export async function renderColonyForm(root, { id = null } = {}) {
  const editing = id != null;
  const colony = editing ? await getColony(id) : null;
  if (editing && !colony) {
    root.appendChild(el(`<section class="page"><p>Colonia non trovata.</p></section>`));
    return;
  }

  root.appendChild(
    el(`
    <section class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">${editing ? 'Modifica' : 'Nuova'}</p>
          <h2>${editing ? escapeHtml(colony.name) : 'Nuova colonia'}</h2>
        </div>
        <button type="button" class="btn btn-ghost" data-back>Indietro</button>
      </header>
      <form class="panel form-stack" id="colony-form">
        <label class="field">
          <span>Nome</span>
          <input name="name" required maxlength="80" value="${escapeHtml(colony?.name || '')}" placeholder="Es. Nest A — Terrazzo" />
        </label>
        <label class="field">
          <span>Specie (scientifico)</span>
          <input name="species" required maxlength="120" value="${escapeHtml(colony?.species || '')}" placeholder="Es. Lasius emarginatus" list="species-hints" />
          <datalist id="species-hints"></datalist>
        </label>
        <label class="field">
          <span>Data acquisizione</span>
          <input name="acquisition_date" type="date" value="${escapeHtml(colony?.acquisition_date || new Date().toISOString().slice(0, 10))}" />
        </label>
        <label class="field">
          <span>Status</span>
          <select name="status">
            ${COLONY_STATUSES.map(
              (s) =>
                `<option value="${s.id}" ${colony?.status === s.id ? 'selected' : ''}>${escapeHtml(s.label)}</option>`
            ).join('')}
          </select>
        </label>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">${editing ? 'Salva modifiche' : 'Crea colonia'}</button>
        </div>
      </form>
    </section>
  `)
  );

  // datalist from encyclopedia (lazy)
  import('./encyclopedia.js').then(async ({ searchSpecies }) => {
    const list = root.querySelector('#species-hints');
    if (!list) return;
    const rows = await searchSpecies({ maxDifficulty: 5 });
    list.innerHTML = rows
      .slice(0, 200)
      .map((s) => `<option value="${escapeHtml(s.scientific_name)}"></option>`)
      .join('');
  });

  root.querySelector('[data-back]').addEventListener('click', () => {
    navigate(editing ? `#/colonies/${id}` : '#/colonies');
  });

  root.querySelector('#colony-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get('name') || ''),
      species: String(fd.get('species') || ''),
      acquisition_date: String(fd.get('acquisition_date') || ''),
      status: String(fd.get('status') || 'queen_only'),
    };
    try {
      if (editing) {
        await updateColony(id, payload);
        toast('Colonia aggiornata');
        navigate(`#/colonies/${id}`);
      } else {
        const created = await createColony(payload);
        toast('Colonia creata');
        navigate(`#/colonies/${created.id}`);
      }
    } catch (err) {
      toast(err.message || 'Errore salvataggio', 'error');
    }
  });
}

export async function renderColonyDetail(root, id) {
  const colony = await getColony(id);
  if (!colony) {
    root.appendChild(el(`<section class="page"><p>Colonia non trovata.</p>
      <button type="button" class="btn btn-ghost" id="back">Torna alle colonie</button></section>`));
    root.querySelector('#back')?.addEventListener('click', () => navigate('#/colonies'));
    return;
  }

  const [logs, speciesData, latestClimate] = await Promise.all([
    listLogsByColony(id, { limit: 30 }),
    findSpecies(colony.species),
    getLatestClimate(id),
  ]);

  const advisorResult = await generateAdvice(
    id,
    latestClimate?.nest_temp_c,
    latestClimate?.nest_humidity_pct
  );

  root.appendChild(
    el(`
    <section class="page colony-detail">
      <header class="page-header">
        <div>
          <p class="eyebrow">Colonia</p>
          <h2>${escapeHtml(colony.name)}</h2>
          <p class="species-line"><em>${escapeHtml(colony.species)}</em>
            <span class="${statusBadgeClass(colony.status)}" data-status="${escapeHtml(colony.status)}">${escapeHtml(STATUS_LABELS[colony.status] || colony.status)}</span>
          </p>
          ${
            advisorResult.dietNotes
              ? `<p class="diet-notes-inline"><strong>Dieta:</strong> ${escapeHtml(advisorResult.dietNotes)}</p>`
              : ''
          }
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-ghost" data-back>Indietro</button>
          <button type="button" class="btn btn-ghost" data-edit>Modifica</button>
          <button type="button" class="btn btn-danger" data-delete>Elimina</button>
        </div>
      </header>

      <div class="detail-grid">
        <aside class="panel advisor-panel" id="advisor-slot">
          <!-- filled by Smart Advisor -->
        </aside>

        <div class="stack">
          <div class="panel" id="feeding-tracker-root"></div>

          <div class="panel">
            <div class="panel-head"><h3>Log crescita / osservazione</h3></div>
            <form id="log-form" class="form-stack">
              <label class="field">
                <span>Tipo</span>
                <select name="log_type">
                  ${LOG_TYPES_UI.map((t) => `<option value="${t.id}">${escapeHtml(t.label)}</option>`).join('')}
                </select>
              </label>
              <label class="field">
                <span>Data</span>
                <input type="datetime-local" name="date" value="${localInputValue()}" />
              </label>
              <div id="growth-box" class="growth-box" hidden>
                <label class="field">
                  <span>Popolazione stimata (n° operaie)</span>
                  <input type="number" name="population" min="0" step="1" inputmode="numeric" placeholder="Es. 48" />
                </label>
                <p class="field-label">Usato dalla Dashboard per la curva di crescita analitica.</p>
              </div>
              <fieldset class="climate-box">
                <legend>Microclima (opzionale)</legend>
                <div class="climate-grid">
                  <label class="field">
                    <span>T nido (°C)</span>
                    <input type="number" name="nest_temp_c" step="0.1" min="-5" max="50" placeholder="es. 24" />
                  </label>
                  <label class="field">
                    <span>RH nido (%)</span>
                    <input type="number" name="nest_humidity_pct" step="1" min="0" max="100" placeholder="es. 60" />
                  </label>
                  <label class="field">
                    <span>T arena (°C)</span>
                    <input type="number" name="arena_temp_c" step="0.1" min="-5" max="55" placeholder="es. 26" />
                  </label>
                  <label class="field">
                    <span>RH arena (%)</span>
                    <input type="number" name="arena_humidity_pct" step="1" min="0" max="100" placeholder="es. 40" />
                  </label>
                </div>
                <p class="field-label">Lo Smart Advisor confronta queste letture con i range della scheda specie.</p>
              </fieldset>
              <label class="field">
                <span>Dettagli</span>
                <textarea name="details" rows="3" placeholder="Note libere..."></textarea>
              </label>
              <button type="submit" class="btn btn-primary">Salva log</button>
            </form>
          </div>

          <div class="panel">
            <div class="panel-head"><h3>Cronologia log</h3></div>
            ${
              logs.length === 0
                ? `<p class="empty-hint">Nessun log ancora.</p>`
                : `<ul class="log-list">${logs
                    .map(
                      (log) => `
                  <li class="log-item">
                    <div>
                      <strong>${escapeHtml(LOG_LABELS[log.log_type] || log.log_type)}</strong>
                      <span class="meta-line">${escapeHtml(formatDate(log.date))}</span>
                      ${
                        log.feeding
                          ? `<span class="feed-tag">${escapeHtml(log.feeding.category_label || '')}: ${escapeHtml(log.feeding.item_label || '')}</span>`
                          : ''
                      }
                      ${
                        log.population != null
                          ? `<span class="feed-tag">Popolazione: ${escapeHtml(String(log.population))}</span>`
                          : ''
                      }
                      ${log.climate ? `<span class="feed-tag">${formatClimateTag(log.climate)}</span>` : ''}
                      ${log.details ? `<p>${escapeHtml(log.details)}</p>` : ''}
                    </div>
                    <button type="button" class="icon-btn" data-del-log="${log.id}" aria-label="Elimina log">×</button>
                  </li>`
                    )
                    .join('')}</ul>`
            }
          </div>
        </div>
      </div>
    </section>
  `)
  );

  await mountFeedingTracker(root.querySelector('#feeding-tracker-root'), id);

  root.querySelector('[data-back]').addEventListener('click', () => navigate('#/colonies'));
  root.querySelector('[data-edit]').addEventListener('click', () => navigate(`#/colonies/${id}/edit`));

  const advisorSlot = root.querySelector('#advisor-slot');
  const hasAlert = advisorResult.checks.some((c) => c.status === 'low' || c.status === 'high');
  renderAdvicePanel(advisorSlot, advisorResult.tips, {
    climateChecks: advisorResult.checks,
    climateOk: !hasAlert,
    dietNotes: advisorResult.dietNotes,
  });

  if (speciesData) {
    const encBtn = document.createElement('button');
    encBtn.type = 'button';
    encBtn.className = 'btn btn-ghost btn-sm';
    encBtn.textContent = 'Apri scheda enciclopedia';
    encBtn.addEventListener('click', () => navigate(`#/encyclopedia/${speciesData.id}`));
    advisorSlot.appendChild(encBtn);
  } else {
    const encBtn = document.createElement('button');
    encBtn.type = 'button';
    encBtn.className = 'btn btn-ghost btn-sm';
    encBtn.textContent = 'Sfoglia enciclopedia';
    encBtn.addEventListener('click', () => navigate('#/encyclopedia'));
    advisorSlot.appendChild(encBtn);
  }

  root.querySelector('[data-delete]').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Eliminare la colonia?',
      bodyHtml: `<p>Verranno rimossi anche tutti i log di <strong>${escapeHtml(colony.name)}</strong>. Operazione locale e irreversibile.</p>`,
      confirmLabel: 'Elimina',
      danger: true,
    });
    if (!ok) return;
    await deleteColony(id);
    toast('Colonia eliminata');
    navigate('#/colonies');
  });

  const growthBox = root.querySelector('#growth-box');
  const typeSelect = root.querySelector('[name="log_type"]');
  const syncLogExtras = () => {
    growthBox.hidden = typeSelect.value !== 'growth';
  };
  typeSelect.addEventListener('change', syncLogExtras);
  syncLogExtras();

  root.querySelector('#log-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const log_type = String(fd.get('log_type'));
    const dateRaw = String(fd.get('date') || '');
    const details = String(fd.get('details') || '');
    let population = null;
    if (log_type === 'growth') {
      const rawPop = fd.get('population');
      population = rawPop === '' || rawPop == null ? null : Number(rawPop);
    }
    const climate = {
      nest_temp_c: fd.get('nest_temp_c'),
      nest_humidity_pct: fd.get('nest_humidity_pct'),
      arena_temp_c: fd.get('arena_temp_c'),
      arena_humidity_pct: fd.get('arena_humidity_pct'),
    };
    try {
      await createLog({
        colony_id: id,
        log_type,
        date: dateRaw ? new Date(dateRaw).toISOString() : undefined,
        details,
        population,
        climate,
      });
      toast('Log salvato');
      clear(root);
      await renderColonyDetail(root, id);
    } catch (err) {
      toast(err.message || 'Errore log', 'error');
    }
  });

  root.querySelectorAll('[data-del-log]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const logId = Number(btn.getAttribute('data-del-log'));
      await deleteLog(logId);
      toast('Log eliminato');
      clear(root);
      await renderColonyDetail(root, id);
    });
  });
}

/** @deprecated stub kept for older imports */
export function renderColoniesView() {
  return '';
}
