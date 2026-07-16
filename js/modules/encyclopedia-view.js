import {
  listGenera,
  listSubfamilies,
  listTags,
  loadEncyclopedia,
  searchSpecies,
  findSpecies,
} from './encyclopedia.js';
import { navigate } from './router.js';
import { el, escapeHtml } from './ui.js';

export async function renderEncyclopediaList(root) {
  const [data, subfamilies, genera, tags] = await Promise.all([
    loadEncyclopedia(),
    listSubfamilies(),
    listGenera(),
    listTags(),
  ]);

  root.appendChild(
    el(`
    <section class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Atlante</p>
          <h2>Enciclopedia</h2>
          <p class="muted">${data.meta.species_count} schede · offline</p>
        </div>
      </header>

      <div class="panel filters-bar filters-bar-adv">
        <label class="field grow">
          <span>Cerca</span>
          <input type="search" id="enc-q" placeholder="Nome scientifico, comune, tag..." />
        </label>
        <label class="field">
          <span>Genere</span>
          <select id="enc-genus">
            <option value="">Tutti</option>
            ${genera.map((g) => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Sottofamiglia</span>
          <select id="enc-sub">
            <option value="">Tutte</option>
            ${subfamilies.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
          </select>
        </label>
        <label class="field">
          <span>Difficoltà</span>
          <select id="enc-diff">
            <option value="">Tutte</option>
            <option value="1">1 · Principiante</option>
            <option value="2">2 · Agevole</option>
            <option value="3">3 · Intermedio</option>
            <option value="4">4 · Avanzato</option>
            <option value="5">5 · Esperto</option>
          </select>
        </label>
        <label class="field">
          <span>Tag</span>
          <select id="enc-tag">
            <option value="">Tutti</option>
            ${tags.map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
          </select>
        </label>
      </div>

      <p id="enc-count" class="meta-line" aria-live="polite"></p>
      <div id="enc-results" class="species-grid"></div>
    </section>
  `)
  );

  const results = root.querySelector('#enc-results');
  const countEl = root.querySelector('#enc-count');
  const qInput = root.querySelector('#enc-q');
  const genusInput = root.querySelector('#enc-genus');
  const subInput = root.querySelector('#enc-sub');
  const diffInput = root.querySelector('#enc-diff');
  const tagInput = root.querySelector('#enc-tag');

  async function refresh() {
    const rows = await searchSpecies({
      q: qInput.value,
      genus: genusInput.value || undefined,
      subfamily: subInput.value || undefined,
      difficulty: diffInput.value ? Number(diffInput.value) : undefined,
      tag: tagInput.value || undefined,
    });
    countEl.textContent = `${rows.length} specie`;
    results.innerHTML = rows
      .map(
        (s) => `
      <article class="species-card viz-card" data-id="${escapeHtml(s.id)}">
        <div class="species-card-top">
          <h3><em>${escapeHtml(s.scientific_name)}</em></h3>
          <span class="diff diff-${s.difficulty}">D${s.difficulty}</span>
        </div>
        <p class="muted">${escapeHtml(s.native_range || 'Range n/d')}</p>
        <p class="meta-line">${escapeHtml(s.foundation)} · ${escapeHtml(s.subfamily)}</p>
        ${(s.tags || []).length ? `<p class="enc-tags">${(s.tags || []).slice(0, 4).map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</p>` : ''}
      </article>`
      )
      .join('');

    results.querySelectorAll('.species-card').forEach((card) => {
      card.addEventListener('click', () => navigate(`#/encyclopedia/${card.dataset.id}`));
    });
  }

  [qInput, genusInput, subInput, diffInput, tagInput].forEach((elInput) => {
    elInput.addEventListener('input', () => refresh());
    elInput.addEventListener('change', () => refresh());
  });
  await refresh();
}

export async function renderSpeciesDetail(root, speciesId) {
  const s = await findSpecies(speciesId);
  if (!s) {
    root.appendChild(
      el(`<section class="page"><p>Scheda non trovata.</p>
      <button type="button" class="btn btn-ghost" data-back>Enciclopedia</button></section>`)
    );
    root.querySelector('[data-back]')?.addEventListener('click', () => navigate('#/encyclopedia'));
    return;
  }

  const t = s.temperature || {};
  const h = s.humidity || {};
  const d = s.diapause || {};

  root.appendChild(
    el(`
    <section class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">${escapeHtml(s.subfamily)}</p>
          <h2><em>${escapeHtml(s.scientific_name)}</em></h2>
          <p class="muted">${escapeHtml((s.common_names || []).join(' · ') || '—')}</p>
        </div>
        <button type="button" class="btn btn-ghost" data-back>Indietro</button>
      </header>

      <div class="stat-grid shrink">
        <article class="stat-card"><span class="stat-label">Difficoltà</span><strong class="stat-value">${s.difficulty}/5</strong></article>
        <article class="stat-card"><span class="stat-label">Fondazione</span><strong class="stat-value stat-text">${escapeHtml(s.foundation)}</strong></article>
        <article class="stat-card"><span class="stat-label">Colonia</span><strong class="stat-value stat-text">${escapeHtml(s.colony_type)}</strong></article>
      </div>

      <div class="detail-grid">
        <div class="panel">
          <h3>Temperatura</h3>
          <ul class="kv-list">
            <li><span>Nido</span><strong>${t.nest?.min_c ?? '—'}–${t.nest?.max_c ?? '—'}°C (ideale ${t.nest?.ideal_c ?? '—'}°C)</strong></li>
            <li><span>Arena</span><strong>${t.arena?.min_c ?? '—'}–${t.arena?.max_c ?? '—'}°C (ideale ${t.arena?.ideal_c ?? '—'}°C)</strong></li>
          </ul>
          <h3>Umidità</h3>
          <ul class="kv-list">
            <li><span>Nido</span><strong>${h.nest?.min_pct ?? '—'}–${h.nest?.max_pct ?? '—'}%</strong></li>
            <li><span>Arena</span><strong>${h.arena?.min_pct ?? '—'}–${h.arena?.max_pct ?? '—'}%</strong></li>
          </ul>
          <h3>Diapausa / ibernazione</h3>
          <p>${
            d.required
              ? `Richiesta. Mesi: <strong>${escapeHtml((d.months || []).join(', '))}</strong> · ${d.temperature_c?.min}–${d.temperature_c?.max}°C`
              : 'Non obbligatoria.'
          }</p>
          ${d.notes ? `<p class="muted">${escapeHtml(d.notes)}</p>` : ''}
        </div>

        <div class="panel">
          <h3>Dieta</h3>
          <ul class="kv-list">
            <li><span>Proteine</span><strong>${escapeHtml(s.diet?.protein || '—')}</strong></li>
            <li><span>Carboidrati</span><strong>${escapeHtml(s.diet?.carbohydrates || '—')}</strong></li>
            <li><span>Frequenza</span><strong>${escapeHtml(s.diet?.frequency || '—')}</strong></li>
          </ul>
          ${s.diet?.notes ? `<p class="muted">${escapeHtml(s.diet.notes)}</p>` : ''}

          <h3>Comportamento</h3>
          <ul class="kv-list">
            <li><span>Sciamatura</span><strong>${escapeHtml(s.behavior?.swarming || '—')}</strong></li>
            <li><span>Aggressività</span><strong>${escapeHtml(s.behavior?.aggression || '—')}</strong></li>
            <li><span>Fondazione</span><strong>${escapeHtml(s.behavior?.founding || '—')}</strong></li>
          </ul>
          ${s.behavior?.notes ? `<p>${escapeHtml(s.behavior.notes)}</p>` : ''}
          ${s.husbandry_notes ? `<h3>Note allevamento</h3><p>${escapeHtml(s.husbandry_notes)}</p>` : ''}
          ${(s.tags || []).length ? `<h3>Tag</h3><p class="enc-tags">${(s.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join('')}</p>` : ''}
          <p class="meta-line">Range: ${escapeHtml(s.native_range || '—')}
          ${s.size?.queen_mm ? ` · Regina ${escapeHtml(s.size.queen_mm)} mm` : ''}
          ${s.size?.worker_mm ? ` · Operaie ${escapeHtml(s.size.worker_mm)} mm` : ''}</p>
        </div>
      </div>
    </section>
  `)
  );

  root.querySelector('[data-back]').addEventListener('click', () => navigate('#/encyclopedia'));
}
