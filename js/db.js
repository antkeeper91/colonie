/**
 * AntKeep Pro — IndexedDB via Dexie.js
 * Schema: colonies + logs + feeding_logs | Offline-first
 */

import Dexie from 'dexie';

/** @typedef {'queen_only' | 'eggs' | 'first_workers' | 'founding' | 'established'} ColonyStatus */
/** @typedef {'feeding' | 'growth' | 'observation'} LogType */
/** @typedef {'carbohydrates' | 'protein_liquid'} FeedingCategory */
/** @typedef {'low' | 'medium' | 'high'} AcceptanceLevel */

/**
 * Menu nutrizionale di default (Tracker).
 * Focus: liquidi proteici commerciali + carboidrati (zuccheri/mieli).
 * Gli insetti vivi NON sono tra le opzioni di default.
 */
export const FEEDING_MENU = Object.freeze({
  protein_liquid: {
    id: 'protein_liquid',
    label: 'Liquidi Proteici Commerciali',
    items: [
      { id: 'proteinshake', label: 'Proteinshake / formula proteica' },
      { id: 'insectivore_nectar', label: 'Nectar insettivoro commerciale' },
      { id: 'liquid_invertebrate', label: 'Estratto invertebrati liquido' },
      { id: 'ant_protein_gel', label: 'Gel proteico per formiche' },
      { id: 'egg_protein_mix', label: 'Mix uovo/proteine liquido' },
      { id: 'custom_protein', label: 'Altra formula commerciale' },
    ],
  },
  carbohydrates: {
    id: 'carbohydrates',
    label: 'Carboidrati (Zuccheri/Mieli)',
    items: [
      { id: 'honey_diluted', label: 'Miele diluito' },
      { id: 'nectar', label: 'Nettare / sciroppo' },
      { id: 'sugar_water', label: 'Acqua zuccherata' },
      { id: 'agave', label: 'Sciroppo d’agave diluito' },
      { id: 'fruit_syrup', label: 'Sciroppo di frutta' },
      { id: 'honeydew', label: 'Melata / honeydew' },
    ],
  },
});

/** @deprecated use FEEDING_MENU — kept for compat brief */
export const FEEDING_OPTIONS = FEEDING_MENU;

export const ACCEPTANCE_LEVELS = Object.freeze([
  { id: 'low', label: 'Bassa', rating: 1 },
  { id: 'medium', label: 'Media', rating: 2 },
  { id: 'high', label: 'Alta', rating: 3 },
]);

export const COLONY_STATUSES = Object.freeze([
  { id: 'queen_only', label: 'Solo regina' },
  { id: 'eggs', label: 'Uova' },
  { id: 'first_workers', label: 'Prime operaie' },
  { id: 'founding', label: 'Fondazione' },
  { id: 'established', label: 'Stabilita' },
]);

export const LOG_TYPES = Object.freeze([
  { id: 'growth', label: 'Crescita' },
  { id: 'observation', label: 'Osservazione' },
  { id: 'feeding', label: 'Alimentazione (legacy)' },
]);

/** Tipi log nel form colonie (feeding gestito da Tracker Nutrizionale) */
export const LOG_TYPES_UI = Object.freeze([
  { id: 'growth', label: 'Crescita' },
  { id: 'observation', label: 'Osservazione' },
]);

class AntKeepDB extends Dexie {
  constructor() {
    super('AntKeepPro');

    this.version(1).stores({
      colonies: '++id, name, species, status, acquisition_date',
      logs: '++id, colony_id, log_type, date, [colony_id+date]',
    });

    this.version(2).stores({
      colonies: '++id, name, species, status, acquisition_date',
      logs: '++id, colony_id, log_type, date, [colony_id+date]',
      feeding_logs: '++id, colony_id, date, category, item_id, [colony_id+date]',
    });

    this.version(3).stores({
      colonies: '++id, name, species, status, acquisition_date, quarantine',
      logs: '++id, colony_id, log_type, date, event_kind, [colony_id+date]',
      feeding_logs: '++id, colony_id, date, category, item_id, [colony_id+date]',
      biology_logs: '++id, colony_id, date, [colony_id+date]',
      climate_logs: '++id, colony_id, date, [colony_id+date]',
      health_logs: '++id, colony_id, date, issue_type, [colony_id+date]',
      reproduction_logs: '++id, colony_id, date, event_type, [colony_id+date]',
      setup_logs: '++id, colony_id, date, action, [colony_id+date]',
      media_items: '++id, colony_id, date, kind, [colony_id+date]',
    });

    /** @type {Dexie.Table} */
    this.colonies = this.table('colonies');
    /** @type {Dexie.Table} */
    this.logs = this.table('logs');
    /** @type {Dexie.Table} */
    this.feeding_logs = this.table('feeding_logs');
    this.biology_logs = this.table('biology_logs');
    this.climate_logs = this.table('climate_logs');
    this.health_logs = this.table('health_logs');
    this.reproduction_logs = this.table('reproduction_logs');
    this.setup_logs = this.table('setup_logs');
    this.media_items = this.table('media_items');
  }
}

export const db = new AntKeepDB();

// ─── Colonies CRUD ───────────────────────────────────────────

/**
 * @param {object} data
 * @param {string} data.name
 * @param {string} data.species
 * @param {string} [data.acquisition_date] ISO date YYYY-MM-DD
 * @param {ColonyStatus} [data.status]
 */
export async function createColony(data) {
  validateColonyInput(data);
  const now = new Date().toISOString();
  const id = await db.colonies.add({
    name: data.name.trim(),
    species: data.species.trim(),
    acquisition_date: data.acquisition_date || now.slice(0, 10),
    status: data.status || 'queen_only',
    created_at: now,
    updated_at: now,
  });
  return getColony(id);
}

/** @param {number} id */
export async function getColony(id) {
  return db.colonies.get(id);
}

/** @returns {Promise<object[]>} */
export async function listColonies() {
  return db.colonies.orderBy('name').toArray();
}

/**
 * @param {number} id
 * @param {Partial<{name:string,species:string,acquisition_date:string,status:ColonyStatus,cover_photo:string|null}>} patch
 * @param {{ skipTimeline?: boolean }} [opts]
 */
export async function updateColony(id, patch, opts = {}) {
  const existing = await getColony(id);
  if (!existing) throw new Error(`Colonia #${id} non trovata`);

  const next = {
    name: patch.name !== undefined ? String(patch.name).trim() : existing.name,
    species: patch.species !== undefined ? String(patch.species).trim() : existing.species,
    acquisition_date: patch.acquisition_date ?? existing.acquisition_date,
    status: patch.status ?? existing.status,
    updated_at: new Date().toISOString(),
  };

  if (patch.cover_photo !== undefined) {
    next.cover_photo = patch.cover_photo;
  }

  validateColonyInput(next);

  const statusChanged = patch.status != null && patch.status !== existing.status;

  await db.transaction('rw', db.colonies, db.logs, async () => {
    await db.colonies.update(id, next);
    if (statusChanged && !opts.skipTimeline) {
      const fromLabel = statusLabel(existing.status);
      const toLabel = statusLabel(next.status);
      await db.logs.add({
        colony_id: id,
        log_type: 'observation',
        date: new Date().toISOString(),
        details: `Stato biologico: ${fromLabel} → ${toLabel}`,
        event_kind: 'status_change',
        from_status: existing.status,
        to_status: next.status,
        population: null,
        climate: null,
        feeding: null,
        created_at: new Date().toISOString(),
      });
    }
  });

  return getColony(id);
}

export async function setColonyCoverPhoto(colonyId, dataUrl) {
  return updateColony(colonyId, { cover_photo: dataUrl }, { skipTimeline: true });
}

export async function clearColonyCoverPhoto(colonyId) {
  return updateColony(colonyId, { cover_photo: null }, { skipTimeline: true });
}

export function statusLabel(statusId) {
  return COLONY_STATUSES.find((s) => s.id === statusId)?.label || statusId;
}

/** Giorni interi dalla registrazione (created_at) o data acquisizione. */
export function daysSinceRegistration(colony, now = new Date()) {
  const raw = colony?.created_at || colony?.acquisition_date;
  if (!raw) return 0;
  const start = new Date(raw);
  if (Number.isNaN(start.getTime())) return 0;
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((b - a) / 86400000));
}

/** @param {number} id */
export async function deleteColony(id) {
  await db.transaction(
    'rw',
    db.colonies,
    db.logs,
    db.feeding_logs,
    db.biology_logs,
    db.climate_logs,
    db.health_logs,
    db.reproduction_logs,
    db.setup_logs,
    db.media_items,
    async () => {
      await Promise.all([
        db.logs.where('colony_id').equals(id).delete(),
        db.feeding_logs.where('colony_id').equals(id).delete(),
        db.biology_logs.where('colony_id').equals(id).delete(),
        db.climate_logs.where('colony_id').equals(id).delete(),
        db.health_logs.where('colony_id').equals(id).delete(),
        db.reproduction_logs.where('colony_id').equals(id).delete(),
        db.setup_logs.where('colony_id').equals(id).delete(),
        db.media_items.where('colony_id').equals(id).delete(),
      ]);
      await db.colonies.delete(id);
    }
  );
}

// ─── Logs CRUD ───────────────────────────────────────────────

/**
 * @param {object} data
 * @param {number} data.colony_id
 * @param {LogType} data.log_type
 * @param {string} [data.date] ISO datetime or date
 * @param {string} [data.details]
 * @param {number|null} [data.population] operaie stimate (log crescita)
 * @param {object} [data.climate] microclima opzionale
 * @param {number|null} [data.climate.nest_temp_c]
 * @param {number|null} [data.climate.nest_humidity_pct]
 * @param {number|null} [data.climate.arena_temp_c]
 * @param {number|null} [data.climate.arena_humidity_pct]
 * @param {object} [data.feeding] structured feeding meta when log_type === 'feeding'
 */
export async function createLog(data) {
  validateLogInput(data);
  const colony = await getColony(data.colony_id);
  if (!colony) throw new Error(`Colonia #${data.colony_id} non trovata`);

  const now = new Date().toISOString();
  const id = await db.logs.add({
    colony_id: data.colony_id,
    log_type: data.log_type,
    date: data.date || now,
    details: (data.details || '').trim(),
    population: data.log_type === 'growth' ? normalizePopulation(data.population) : null,
    climate: normalizeClimate(data.climate),
    feeding: data.log_type === 'feeding' ? normalizeFeeding(data.feeding) : null,
    created_at: now,
  });
  return getLog(id);
}

/** @param {number} id */
export async function getLog(id) {
  return db.logs.get(id);
}

/**
 * @param {number} colonyId
 * @param {{ log_type?: LogType, limit?: number }} [opts]
 */
export async function listLogsByColony(colonyId, opts = {}) {
  let rows = await db.logs
    .where('[colony_id+date]')
    .between([colonyId, Dexie.minKey], [colonyId, Dexie.maxKey])
    .reverse()
    .toArray();

  if (opts.log_type) {
    rows = rows.filter((r) => r.log_type === opts.log_type);
  }
  if (opts.limit && opts.limit > 0) {
    rows = rows.slice(0, opts.limit);
  }
  return rows;
}

/**
 * @param {number} id
 * @param {Partial<{log_type:LogType,date:string,details:string,population:number,feeding:object}>} patch
 */
export async function updateLog(id, patch) {
  const existing = await getLog(id);
  if (!existing) throw new Error(`Log #${id} non trovato`);

  const log_type = patch.log_type ?? existing.log_type;
  const next = {
    log_type,
    date: patch.date ?? existing.date,
    details: patch.details !== undefined ? String(patch.details).trim() : existing.details,
    population:
      log_type === 'growth'
        ? normalizePopulation(patch.population !== undefined ? patch.population : existing.population)
        : null,
    climate: normalizeClimate(patch.climate !== undefined ? patch.climate : existing.climate),
    feeding:
      log_type === 'feeding'
        ? normalizeFeeding(patch.feeding !== undefined ? patch.feeding : existing.feeding)
        : null,
  };

  validateLogInput({ colony_id: existing.colony_id, ...next });
  await db.logs.update(id, next);
  return getLog(id);
}

/** @param {number} id */
export async function deleteLog(id) {
  await db.logs.delete(id);
}

/** Dashboard helper: counts by status */
export async function getColonyStats() {
  const all = await listColonies();
  const byStatus = {
    queen_only: 0,
    eggs: 0,
    first_workers: 0,
    founding: 0,
    established: 0,
  };
  for (const c of all) {
    if (byStatus[c.status] !== undefined) byStatus[c.status] += 1;
  }
  return {
    total: all.length,
    byStatus,
  };
}

// ─── Validation & helpers ────────────────────────────────────

function validateColonyInput(data) {
  if (!data?.name?.trim()) throw new Error('Il nome della colonia è obbligatorio');
  if (!data?.species?.trim()) throw new Error('La specie è obbligatoria');
  const valid = COLONY_STATUSES.map((s) => s.id);
  if (data.status && !valid.includes(data.status)) {
    throw new Error(`Status non valido: ${data.status}`);
  }
}

function validateLogInput(data) {
  if (data.colony_id == null) throw new Error('colony_id obbligatorio');
  const valid = LOG_TYPES.map((t) => t.id);
  if (!valid.includes(data.log_type)) {
    throw new Error(`log_type non valido: ${data.log_type}`);
  }
}

function normalizeFeeding(feeding) {
  if (!feeding) return null;
  const cat = FEEDING_MENU[feeding.category];
  return {
    category: feeding.category || null,
    category_label: cat?.label || feeding.category_label || null,
    category_priority: cat ? (feeding.category === 'protein_liquid' ? 1 : 2) : null,
    item_id: feeding.item_id || null,
    item_label: feeding.item_label || null,
  };
}

function normalizePopulation(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error('Popolazione non valida');
  return Math.round(n);
}

function normalizeClimate(climate) {
  if (!climate || typeof climate !== 'object') return null;
  const nest_temp_c = optionalNumber(climate.nest_temp_c, 'Temperatura nido', -5, 50);
  const arena_temp_c = optionalNumber(climate.arena_temp_c, 'Temperatura arena', -5, 55);
  const nest_humidity_pct = optionalNumber(climate.nest_humidity_pct, 'Umidità nido', 0, 100);
  const arena_humidity_pct = optionalNumber(climate.arena_humidity_pct, 'Umidità arena', 0, 100);

  if (
    nest_temp_c == null &&
    arena_temp_c == null &&
    nest_humidity_pct == null &&
    arena_humidity_pct == null
  ) {
    return null;
  }

  return { nest_temp_c, arena_temp_c, nest_humidity_pct, arena_humidity_pct };
}

function optionalNumber(value, label, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${label} non valida`);
  if (n < min || n > max) throw new Error(`${label} fuori range (${min}–${max})`);
  return Math.round(n * 10) / 10;
}

/** Ultima lettura microclima disponibile per una colonia */
export async function getLatestClimate(colonyId) {
  const fromLab = await db.climate_logs
    .where('[colony_id+date]')
    .between([colonyId, Dexie.minKey], [colonyId, Dexie.maxKey])
    .reverse()
    .limit(1)
    .first();
  if (fromLab && hasAnyClimate(fromLab)) {
    return {
      nest_temp_c: fromLab.nest_temp_c,
      nest_humidity_pct: fromLab.nest_humidity_pct,
      arena_temp_c: fromLab.arena_temp_c,
      arena_humidity_pct: fromLab.arena_humidity_pct,
    };
  }
  const rows = await listLogsByColony(colonyId, { limit: 100 });
  return rows.find((r) => r.climate && hasAnyClimate(r.climate))?.climate || null;
}

function hasAnyClimate(c) {
  return (
    c.nest_temp_c != null ||
    c.arena_temp_c != null ||
    c.nest_humidity_pct != null ||
    c.arena_humidity_pct != null
  );
}

/** Categorie default per select Tracker Nutrizionale */
export function getFeedingMenuCategories() {
  return [FEEDING_MENU.protein_liquid, FEEDING_MENU.carbohydrates];
}

/** @param {FeedingCategory} categoryId */
export function getFeedingMenuItems(categoryId) {
  return FEEDING_MENU[categoryId]?.items || [];
}

/** @deprecated */
export function getFeedingQuickPicks() {
  return getFeedingMenuCategories().map((cat, i) => ({
    ...cat,
    priority: i + 1,
    items: cat.items.map((item) => ({
      ...item,
      category: cat.id,
      category_label: cat.label,
      category_priority: i + 1,
    })),
  }));
}

// ─── Feeding logs CRUD ───────────────────────────────────────

/**
 * @param {object} data
 * @param {number} data.colony_id
 * @param {FeedingCategory} data.category
 * @param {string} data.item_id
 * @param {string} [data.item_label]
 * @param {string} [data.date]
 * @param {string} [data.notes]
 * @param {number|string|null} [data.acceptance_rating] 1–3 oppure 'low'|'medium'|'high'
 * @param {AcceptanceLevel} [data.acceptance_level]
 */
export async function createFeedingLog(data) {
  const colony = await getColony(data.colony_id);
  if (!colony) throw new Error(`Colonia #${data.colony_id} non trovata`);

  const category = data.category;
  if (!FEEDING_MENU[category]) throw new Error('Categoria alimentare non valida');

  const items = FEEDING_MENU[category].items;
  const item = items.find((i) => i.id === data.item_id);
  const item_label = data.item_label || item?.label || data.item_id;
  if (!data.item_id) throw new Error('Seleziona un alimento');

  const acceptance = resolveAcceptance(data.acceptance_level, data.acceptance_rating);
  if (acceptance == null) {
    throw new Error('Seleziona l’accettazione: Bassa, Media o Alta');
  }

  const now = new Date().toISOString();
  const date = data.date || now;

  let feedingId;
  await db.transaction('rw', db.feeding_logs, db.logs, async () => {
    feedingId = await db.feeding_logs.add({
      colony_id: data.colony_id,
      category,
      category_label: FEEDING_MENU[category].label,
      item_id: data.item_id,
      item_label,
      acceptance_level: acceptance.level,
      acceptance_rating: acceptance.rating,
      notes: (data.notes || '').trim(),
      date,
      created_at: now,
    });

    // Timeline automatica
    await db.logs.add({
      colony_id: data.colony_id,
      log_type: 'observation',
      date,
      details: `Pasto: ${item_label} (${FEEDING_MENU[category].label}) · accettazione ${acceptance.label}`,
      event_kind: 'feeding',
      feeding_log_id: feedingId,
      population: null,
      climate: null,
      feeding: null,
      created_at: now,
    });
  });

  return getFeedingLog(feedingId);
}

function resolveAcceptance(level, rating) {
  if (level) {
    const row = ACCEPTANCE_LEVELS.find((a) => a.id === level);
    if (row) return { level: row.id, rating: row.rating, label: row.label };
  }
  const n = normalizeRating(rating);
  if (n == null) return null;
  const row = ACCEPTANCE_LEVELS.find((a) => a.rating === n) || ACCEPTANCE_LEVELS[Math.min(2, Math.max(0, n - 1))];
  return { level: row.id, rating: row.rating, label: row.label };
}

/** @param {number} id */
export async function getFeedingLog(id) {
  return db.feeding_logs.get(id);
}

/**
 * @param {number} colonyId
 * @param {{ limit?: number, category?: FeedingCategory }} [opts]
 */
export async function listFeedingLogsByColony(colonyId, opts = {}) {
  let rows = await db.feeding_logs
    .where('[colony_id+date]')
    .between([colonyId, Dexie.minKey], [colonyId, Dexie.maxKey])
    .reverse()
    .toArray();

  if (opts.category) rows = rows.filter((r) => r.category === opts.category);
  if (opts.limit && opts.limit > 0) rows = rows.slice(0, opts.limit);
  return rows;
}

/** @param {number} id */
export async function deleteFeedingLog(id) {
  await db.feeding_logs.delete(id);
}

/**
 * Media stelle per formula proteica (colony opzionale).
 * @param {number} [colonyId]
 */
export async function getProteinAcceptanceStats(colonyId) {
  let rows = await db.feeding_logs.where('category').equals('protein_liquid').toArray();
  if (colonyId != null) rows = rows.filter((r) => r.colony_id === colonyId);
  rows = rows.filter((r) => r.acceptance_rating != null);

  const byItem = new Map();
  for (const r of rows) {
    const key = r.item_id;
    if (!byItem.has(key)) {
      byItem.set(key, { item_id: key, item_label: r.item_label, sum: 0, count: 0 });
    }
    const agg = byItem.get(key);
    agg.sum += Number(r.acceptance_rating);
    agg.count += 1;
  }

  return [...byItem.values()]
    .map((a) => ({
      item_id: a.item_id,
      item_label: a.item_label,
      avg_rating: Math.round((a.sum / a.count) * 10) / 10,
      samples: a.count,
    }))
    .sort((a, b) => b.avg_rating - a.avg_rating);
}

function normalizeRating(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error('Il voto di accettazione deve essere tra 1 e 3 (o legacy 1–5)');
  }
  // Scala UI attuale: 1 Bassa, 2 Media, 3 Alta. Legacy 4–5 → Alta.
  if (n >= 3) return 3;
  return n;
}

/**
 * Timeline unificata: log Dexie (status, pasti, osservazioni) ordinati per data.
 * @param {number} colonyId
 * @param {{ limit?: number }} [opts]
 */
export async function listTimelineEvents(colonyId, opts = {}) {
  const rows = await listLogsByColony(colonyId, { limit: opts.limit || 80 });
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    title: timelineTitle(r),
    subtitle: timelineSubtitle(r),
    event_kind: r.event_kind || r.log_type,
    accent:
      r.event_kind === 'status_change' ||
      r.event_kind === 'feeding' ||
      r.event_kind === 'biology' ||
      r.event_kind === 'health',
    raw: r,
  }));
}

const EVENT_KIND_TITLES = {
  status_change: null, // special
  feeding: 'Pasto registrato',
  biology: 'Censimento biologico',
  climate: 'Lettura clima',
  health: 'Salute',
  reproduction: 'Riproduzione',
  setup: 'Setup formicario',
  field: 'Dati di campo',
  media: 'Media',
};

function timelineTitle(log) {
  if (log.event_kind === 'status_change') {
    return `Stato: ${statusLabel(log.to_status) || 'aggiornato'}`;
  }
  if (log.event_kind && EVENT_KIND_TITLES[log.event_kind]) {
    return EVENT_KIND_TITLES[log.event_kind];
  }
  if (log.log_type === 'growth') return 'Crescita / popolazione';
  if (log.log_type === 'observation') return 'Osservazione';
  return LOG_TYPES.find((t) => t.id === log.log_type)?.label || 'Evento';
}

function timelineSubtitle(log) {
  return (log.details || '').trim() || '—';
}
