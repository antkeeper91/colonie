/**
 * Tracker Nutrizionale — feeding_logs UI + helpers
 * Default selects: Carboidrati (Mieli/Nettari) + Liquidi Proteici Commerciali
 */

import {
  createFeedingLog,
  deleteFeedingLog,
  getFeedingMenuCategories,
  getFeedingMenuItems,
  getProteinAcceptanceStats,
  listFeedingLogsByColony,
} from '../db.js';
import { escapeHtml, formatDate, toast } from './ui.js';

function localInputValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function starsHtml(rating, max = 5) {
  const n = Number(rating) || 0;
  let out = '';
  for (let i = 1; i <= max; i += 1) {
    out += `<span class="star ${i <= n ? 'is-on' : ''}" aria-hidden="true">★</span>`;
  }
  return out;
}

function ratingInputHtml() {
  return `
    <div class="star-rating" role="radiogroup" aria-label="Voto di accettazione">
      ${[1, 2, 3, 4, 5]
        .map(
          (n) => `
        <label class="star-option" title="${n} stell${n === 1 ? 'a' : 'e'}">
          <input type="radio" name="acceptance_rating" value="${n}" />
          <span class="star-face" data-value="${n}">★</span>
        </label>`
        )
        .join('')}
    </div>
    <p class="field-label">Obbligatorio per i liquidi proteici commerciali (1 = rifiutato, 5 = ottima accettazione).</p>
  `;
}

/**
 * Mount Tracker Nutrizionale into a container.
 * @param {HTMLElement} container
 * @param {number} colonyId
 * @param {{ onChange?: () => void }} [opts]
 */
export async function mountFeedingTracker(container, colonyId, opts = {}) {
  const categories = getFeedingMenuCategories();
  const [rows, proteinStats] = await Promise.all([
    listFeedingLogsByColony(colonyId, { limit: 20 }),
    getProteinAcceptanceStats(colonyId),
  ]);

  container.innerHTML = `
    <div class="panel-head">
      <h3>Tracker Nutrizionale</h3>
    </div>
    <p class="muted tracker-intro">Pasti focalizzati su carboidrati e formule proteiche liquide. Nessun insetto vivo nelle opzioni di default.</p>

    <form id="feeding-tracker-form" class="form-stack">
      <label class="field">
        <span>Categoria</span>
        <select name="category" id="feed-category" required>
          ${categories
            .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`)
            .join('')}
        </select>
      </label>
      <label class="field">
        <span>Alimento</span>
        <select name="item_id" id="feed-item" required></select>
      </label>
      <label class="field">
        <span>Data pasto</span>
        <input type="datetime-local" name="date" value="${localInputValue()}" />
      </label>
      <div id="rating-box" class="rating-box" hidden>
        <span class="field-label">Voto di accettazione</span>
        ${ratingInputHtml()}
      </div>
      <label class="field">
        <span>Note</span>
        <textarea name="notes" rows="2" placeholder="Dose, reazione, residui..."></textarea>
      </label>
      <button type="submit" class="btn btn-primary">Registra pasto</button>
    </form>

    ${
      proteinStats.length
        ? `<div class="protein-stats">
            <h4>Ranking formule proteiche</h4>
            <ul class="protein-rank">
              ${proteinStats
                .map(
                  (s) => `
                <li>
                  <span>${escapeHtml(s.item_label)}</span>
                  <span class="rank-meta">${starsHtml(Math.round(s.avg_rating))} <em>${s.avg_rating}/5 · ${s.samples} voti</em></span>
                </li>`
                )
                .join('')}
            </ul>
          </div>`
        : ''
    }

    <div class="feeding-history">
      <h4>Ultimi pasti</h4>
      ${
        rows.length === 0
          ? `<p class="empty-hint">Nessun pasto registrato.</p>`
          : `<ul class="log-list">${rows
              .map(
                (f) => `
            <li class="log-item">
              <div>
                <strong>${escapeHtml(f.item_label)}</strong>
                <span class="meta-line">${escapeHtml(f.category_label)} · ${escapeHtml(formatDate(f.date))}</span>
                ${
                  f.acceptance_rating != null
                    ? `<div class="star-readout" aria-label="Accettazione ${f.acceptance_rating} su 5">${starsHtml(f.acceptance_rating)}</div>`
                    : ''
                }
                ${f.notes ? `<p>${escapeHtml(f.notes)}</p>` : ''}
              </div>
              <button type="button" class="icon-btn" data-del-feed="${f.id}" aria-label="Elimina pasto">×</button>
            </li>`
              )
              .join('')}</ul>`
      }
    </div>
  `;

  const categorySelect = container.querySelector('#feed-category');
  const itemSelect = container.querySelector('#feed-item');
  const ratingBox = container.querySelector('#rating-box');

  function syncItemsAndRating() {
    const cat = categorySelect.value;
    const items = getFeedingMenuItems(cat);
    itemSelect.innerHTML = items
      .map((i) => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.label)}</option>`)
      .join('');
    ratingBox.hidden = cat !== 'protein_liquid';
    if (cat !== 'protein_liquid') {
      container.querySelectorAll('input[name="acceptance_rating"]').forEach((r) => {
        r.checked = false;
      });
    }
    paintStars();
  }

  function paintStars() {
    const checked = container.querySelector('input[name="acceptance_rating"]:checked');
    const val = checked ? Number(checked.value) : 0;
    container.querySelectorAll('.star-face').forEach((face) => {
      const v = Number(face.dataset.value);
      face.classList.toggle('is-on', v <= val && val > 0);
    });
  }

  categorySelect.addEventListener('change', syncItemsAndRating);
  container.querySelectorAll('input[name="acceptance_rating"]').forEach((input) => {
    input.addEventListener('change', paintStars);
  });
  // Hover preview
  container.querySelectorAll('.star-option').forEach((label) => {
    label.addEventListener('mouseenter', () => {
      const v = Number(label.querySelector('input')?.value || 0);
      container.querySelectorAll('.star-face').forEach((face) => {
        face.classList.toggle('is-preview', Number(face.dataset.value) <= v);
      });
    });
    label.addEventListener('mouseleave', () => {
      container.querySelectorAll('.star-face').forEach((face) => face.classList.remove('is-preview'));
      paintStars();
    });
  });

  syncItemsAndRating();

  container.querySelector('#feeding-tracker-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category = String(fd.get('category'));
    const item_id = String(fd.get('item_id'));
    const dateRaw = String(fd.get('date') || '');
    const notes = String(fd.get('notes') || '');
    const ratingRaw = fd.get('acceptance_rating');

    try {
      await createFeedingLog({
        colony_id: colonyId,
        category,
        item_id,
        notes,
        date: dateRaw ? new Date(dateRaw).toISOString() : undefined,
        acceptance_rating: category === 'protein_liquid' ? Number(ratingRaw) : null,
      });
      toast('Pasto registrato');
      await mountFeedingTracker(container, colonyId, opts);
      opts.onChange?.();
    } catch (err) {
      toast(err.message || 'Errore salvataggio pasto', 'error');
    }
  });

  container.querySelectorAll('[data-del-feed]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await deleteFeedingLog(Number(btn.getAttribute('data-del-feed')));
      toast('Pasto eliminato');
      await mountFeedingTracker(container, colonyId, opts);
      opts.onChange?.();
    });
  });
}
