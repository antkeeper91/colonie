/**
 * AntKeep Lab — dati avanzati per mirmecologi
 */

import Dexie from 'dexie';
import { db } from '../db.js';
import { fileToCoverDataUrl } from './photos.js';

export const HEALTH_ISSUES = Object.freeze([
  { id: 'mites', label: 'Acari' },
  { id: 'fungus', label: 'Funghi / muffe' },
  { id: 'trauma', label: 'Trauma / ferite' },
  { id: 'starvation', label: 'Malnutrizione' },
  { id: 'parasites', label: 'Parassiti' },
  { id: 'quarantine', label: 'Quarantena' },
  { id: 'other', label: 'Altro' },
]);

export const REPRO_EVENTS = Object.freeze([
  { id: 'alates_seen', label: 'Alati osservati' },
  { id: 'swarming', label: 'Sciamatura' },
  { id: 'nuptial_flight', label: 'Volo nuziale' },
  { id: 'mating', label: 'Accoppiamento' },
  { id: 'new_queen', label: 'Nuova regina / gemmazione' },
  { id: 'brood_boost', label: 'Boost covata' },
]);

export const SETUP_ACTIONS = Object.freeze([
  { id: 'setup', label: 'Allestimento iniziale' },
  { id: 'rehouse', label: 'Trasloco / riallestimento' },
  { id: 'expand', label: 'Espansione' },
  { id: 'clean', label: 'Pulizia' },
  { id: 'repair', label: 'Riparazione' },
]);

export const FORMICARIUM_TYPES = Object.freeze([
  'Prova / tubo',
  'Acrilico',
  'Ytong / calcesuzzo',
  'Sughero',
  '3D print',
  'Terrario / arena',
  'Ibrido',
  'Altro',
]);

function nowIso() {
  return new Date().toISOString();
}

async function ensureColony(id) {
  const c = await db.colonies.get(id);
  if (!c) throw new Error(`Colonia #${id} non trovata`);
  return c;
}

async function listByDate(table, colonyId, limit) {
  return table
    .where('[colony_id+date]')
    .between([colonyId, Dexie.minKey], [colonyId, Dexie.maxKey])
    .reverse()
    .limit(limit)
    .toArray();
}

async function pushTimeline(colonyId, details, event_kind, extra = {}) {
  await db.logs.add({
    colony_id: colonyId,
    log_type: 'observation',
    date: extra.date || nowIso(),
    details,
    event_kind,
    population: null,
    climate: null,
    feeding: null,
    created_at: nowIso(),
    ...extra,
  });
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function optNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// ── Biologia ─────────────────────────────────────────────────

export async function createBiologyLog(data) {
  await ensureColony(data.colony_id);
  const date = data.date || nowIso();
  const row = {
    colony_id: data.colony_id,
    date,
    queens: num(data.queens, 0),
    workers: num(data.workers, 0),
    majors: num(data.majors, 0),
    minors: num(data.minors, 0),
    alates_male: num(data.alates_male, 0),
    alates_female: num(data.alates_female, 0),
    eggs: num(data.eggs, 0),
    larvae: num(data.larvae, 0),
    pupae: num(data.pupae, 0),
    biomass_g: data.biomass_g === '' || data.biomass_g == null ? null : num(data.biomass_g),
    notes: String(data.notes || '').trim(),
    created_at: nowIso(),
  };
  const id = await db.biology_logs.add(row);
  const adults =
    row.queens + row.workers + row.majors + row.minors + row.alates_male + row.alates_female;
  await pushTimeline(
    data.colony_id,
    `Censimento: ${adults} adulti · uova ${row.eggs} · larve ${row.larvae} · pupe ${row.pupae}${
      row.biomass_g != null ? ` · ${row.biomass_g} g` : ''
    }`,
    'biology',
    { date, biology_log_id: id }
  );
  return db.biology_logs.get(id);
}

export function listBiologyLogs(colonyId, limit = 30) {
  return listByDate(db.biology_logs, colonyId, limit);
}

export async function getLatestBiology(colonyId) {
  const rows = await listBiologyLogs(colonyId, 1);
  return rows[0] || null;
}

// ── Clima ────────────────────────────────────────────────────

export async function createClimateLog(data) {
  await ensureColony(data.colony_id);
  const date = data.date || nowIso();
  const row = {
    colony_id: data.colony_id,
    date,
    nest_temp_c: optNum(data.nest_temp_c),
    nest_humidity_pct: optNum(data.nest_humidity_pct),
    arena_temp_c: optNum(data.arena_temp_c),
    arena_humidity_pct: optNum(data.arena_humidity_pct),
    notes: String(data.notes || '').trim(),
    created_at: nowIso(),
  };
  if (
    row.nest_temp_c == null &&
    row.nest_humidity_pct == null &&
    row.arena_temp_c == null &&
    row.arena_humidity_pct == null
  ) {
    throw new Error('Inserisci almeno un valore di temperatura o umidità');
  }
  const id = await db.climate_logs.add(row);
  const bits = [];
  if (row.nest_temp_c != null) bits.push(`Tn ${row.nest_temp_c}°C`);
  if (row.nest_humidity_pct != null) bits.push(`RHn ${row.nest_humidity_pct}%`);
  if (row.arena_temp_c != null) bits.push(`Ta ${row.arena_temp_c}°C`);
  if (row.arena_humidity_pct != null) bits.push(`RHa ${row.arena_humidity_pct}%`);
  await pushTimeline(data.colony_id, `Clima: ${bits.join(' · ')}`, 'climate', {
    date,
    climate_log_id: id,
  });
  return db.climate_logs.get(id);
}

export function listClimateLogs(colonyId, limit = 90) {
  return listByDate(db.climate_logs, colonyId, limit);
}

export async function getClimateSeries(colonyId, limit = 60) {
  const rows = await listClimateLogs(colonyId, limit);
  return rows.slice().reverse();
}

export async function updateColonySetpoints(colonyId, setpoints) {
  await ensureColony(colonyId);
  await db.colonies.update(colonyId, {
    setpoints: {
      nest_temp_min: optNum(setpoints.nest_temp_min),
      nest_temp_max: optNum(setpoints.nest_temp_max),
      nest_rh_min: optNum(setpoints.nest_rh_min),
      nest_rh_max: optNum(setpoints.nest_rh_max),
      arena_temp_min: optNum(setpoints.arena_temp_min),
      arena_temp_max: optNum(setpoints.arena_temp_max),
    },
    updated_at: nowIso(),
  });
  return db.colonies.get(colonyId);
}

export function evaluateSetpoints(colony, reading) {
  const sp = colony?.setpoints || {};
  const alerts = [];
  const check = (label, value, min, max) => {
    if (value == null) return;
    if (min != null && value < min) alerts.push(`${label} sotto setpoint (${value} < ${min})`);
    if (max != null && value > max) alerts.push(`${label} sopra setpoint (${value} > ${max})`);
  };
  check('T nido', reading?.nest_temp_c, sp.nest_temp_min, sp.nest_temp_max);
  check('RH nido', reading?.nest_humidity_pct, sp.nest_rh_min, sp.nest_rh_max);
  check('T arena', reading?.arena_temp_c, sp.arena_temp_min, sp.arena_temp_max);
  return alerts;
}

// ── Salute ───────────────────────────────────────────────────

export async function createHealthLog(data) {
  await ensureColony(data.colony_id);
  const date = data.date || nowIso();
  const issue = HEALTH_ISSUES.find((i) => i.id === data.issue_type);
  if (!issue) throw new Error('Tipo problema non valido');
  const row = {
    colony_id: data.colony_id,
    date,
    issue_type: data.issue_type,
    issue_label: issue.label,
    severity: data.severity || 'medium',
    treatment: String(data.treatment || '').trim(),
    outcome: String(data.outcome || '').trim(),
    notes: String(data.notes || '').trim(),
    created_at: nowIso(),
  };
  const id = await db.health_logs.add(row);
  if (data.issue_type === 'quarantine') {
    await db.colonies.update(data.colony_id, { quarantine: true, updated_at: nowIso() });
  }
  await pushTimeline(
    data.colony_id,
    `Salute: ${issue.label}${row.treatment ? ` · trattamento: ${row.treatment}` : ''}`,
    'health',
    { date, health_log_id: id, severity: row.severity }
  );
  return db.health_logs.get(id);
}

export function listHealthLogs(colonyId, limit = 40) {
  return listByDate(db.health_logs, colonyId, limit);
}

export async function setQuarantine(colonyId, on) {
  await db.colonies.update(colonyId, { quarantine: !!on, updated_at: nowIso() });
  await pushTimeline(colonyId, on ? 'Quarantena attivata' : 'Quarantena terminata', 'health');
  return db.colonies.get(colonyId);
}

// ── Riproduzione ─────────────────────────────────────────────

export async function createReproductionLog(data) {
  await ensureColony(data.colony_id);
  const ev = REPRO_EVENTS.find((e) => e.id === data.event_type);
  if (!ev) throw new Error('Evento riproduttivo non valido');
  const date = data.date || nowIso();
  const row = {
    colony_id: data.colony_id,
    date,
    event_type: data.event_type,
    event_label: ev.label,
    count: data.count === '' || data.count == null ? null : num(data.count),
    notes: String(data.notes || '').trim(),
    created_at: nowIso(),
  };
  const id = await db.reproduction_logs.add(row);
  await pushTimeline(
    data.colony_id,
    `Riproduzione: ${ev.label}${row.count != null ? ` ×${row.count}` : ''}`,
    'reproduction',
    { date, reproduction_log_id: id }
  );
  return db.reproduction_logs.get(id);
}

export function listReproductionLogs(colonyId, limit = 40) {
  return listByDate(db.reproduction_logs, colonyId, limit);
}

export async function updateGenealogy(colonyId, { mother_colony_id, notes }) {
  await ensureColony(colonyId);
  const mother =
    mother_colony_id === '' || mother_colony_id == null ? null : Number(mother_colony_id);
  if (mother != null) await ensureColony(mother);
  await db.colonies.update(colonyId, {
    genealogy: {
      mother_colony_id: mother,
      notes: String(notes || '').trim(),
    },
    updated_at: nowIso(),
  });
  return db.colonies.get(colonyId);
}

// ── Setup ────────────────────────────────────────────────────

export async function createSetupLog(data) {
  await ensureColony(data.colony_id);
  const action = SETUP_ACTIONS.find((a) => a.id === data.action);
  if (!action) throw new Error('Azione setup non valida');
  const date = data.date || nowIso();
  const row = {
    colony_id: data.colony_id,
    date,
    action: data.action,
    action_label: action.label,
    formicarium_type: String(data.formicarium_type || '').trim(),
    volume_ml: optNum(data.volume_ml),
    chambers: optNum(data.chambers),
    substrate: String(data.substrate || '').trim(),
    notes: String(data.notes || '').trim(),
    created_at: nowIso(),
  };
  const id = await db.setup_logs.add(row);
  await db.colonies.update(data.colony_id, {
    formicarium: {
      type: row.formicarium_type || undefined,
      volume_ml: row.volume_ml,
      chambers: row.chambers,
      substrate: row.substrate,
      notes: row.notes,
      updated_at: nowIso(),
    },
    updated_at: nowIso(),
  });
  await pushTimeline(
    data.colony_id,
    `Setup: ${action.label}${row.formicarium_type ? ` · ${row.formicarium_type}` : ''}`,
    'setup',
    { date, setup_log_id: id }
  );
  return db.setup_logs.get(id);
}

export function listSetupLogs(colonyId, limit = 30) {
  return listByDate(db.setup_logs, colonyId, limit);
}

// ── Campo ────────────────────────────────────────────────────

export async function updateFieldData(colonyId, field) {
  await ensureColony(colonyId);
  await db.colonies.update(colonyId, {
    field: {
      collection_date: field.collection_date || null,
      location: String(field.location || '').trim(),
      lat: optNum(field.lat),
      lng: optNum(field.lng),
      habitat: String(field.habitat || '').trim(),
      collector: String(field.collector || '').trim(),
      permit_ref: String(field.permit_ref || '').trim(),
      cites_notes: String(field.cites_notes || '').trim(),
    },
    updated_at: nowIso(),
  });
  await pushTimeline(colonyId, 'Dati di campo aggiornati', 'field');
  return db.colonies.get(colonyId);
}

export async function captureGps() {
  if (!navigator.geolocation) throw new Error('Geolocalizzazione non disponibile');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: Math.round(pos.coords.latitude * 1e5) / 1e5,
          lng: Math.round(pos.coords.longitude * 1e5) / 1e5,
        }),
      () => reject(new Error('Permesso GPS negato o errore posizione')),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });
}

// ── Media ────────────────────────────────────────────────────

export async function addMediaItem(colonyId, file, caption = '') {
  await ensureColony(colonyId);
  const data_url = await fileToCoverDataUrl(file, { maxSize: 1280, quality: 0.75 });
  const date = nowIso();
  const id = await db.media_items.add({
    colony_id: colonyId,
    date,
    kind: 'photo',
    data_url,
    caption: String(caption || '').trim(),
    created_at: date,
  });
  await pushTimeline(colonyId, `Foto aggiunta${caption ? `: ${caption}` : ''}`, 'media', {
    date,
    media_id: id,
  });
  return db.media_items.get(id);
}

export function listMediaItems(colonyId, limit = 40) {
  return listByDate(db.media_items, colonyId, limit);
}

export async function deleteMediaItem(id) {
  await db.media_items.delete(id);
}

/** Elenco tabelle lab per backup/export */
export const LAB_TABLES = [
  'biology_logs',
  'climate_logs',
  'health_logs',
  'reproduction_logs',
  'setup_logs',
  'media_items',
];
