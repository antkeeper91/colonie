/**
 * Modulo 4 — Sistema di Backup (Esportazione / Importazione JSON)
 * Vanilla JS + Dexie.js · 100% locale sul dispositivo
 */

import { db } from '../db.js';
import { LAB_TABLES } from './lab-data.js';

export const BACKUP_FORMAT_VERSION = 2;
export const BACKUP_FILENAME = 'antkeep_backup.json';

const CORE_TABLES = ['colonies', 'logs', 'feeding_logs'];
const ALL_TABLES = [...CORE_TABLES, ...LAB_TABLES];

/**
 * Legge asincronamente tutte le tabelle Dexie e costruisce il payload JSON.
 * @returns {Promise<object>}
 */
export async function buildBackupPayload() {
  const entries = await Promise.all(
    ALL_TABLES.map(async (name) => [name, await db.table(name).toArray()])
  );
  const data = Object.fromEntries(entries);
  const meta = Object.fromEntries(entries.map(([k, v]) => [k, v.length]));

  return {
    app: 'AntKeep Pro',
    format_version: BACKUP_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    meta,
    data,
  };
}

/**
 * Esporta: Blob + download forzato di `antkeep_backup.json`.
 * @returns {Promise<{ filename: string, meta: object }>}
 */
export async function exportBackupToFile() {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = BACKUP_FILENAME;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { filename: BACKUP_FILENAME, meta: payload.meta };
}

/**
 * Legge un file JSON con FileReader (come da specifica).
 * @param {File} file
 * @returns {Promise<object>}
 */
export function readBackupWithFileReader(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('Nessun file selezionato'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lettura file fallita'));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ''));
        validateBackupPayload(parsed);
        resolve(parsed);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('File JSON non valido'));
      }
    };
    reader.readAsText(file, 'UTF-8');
  });
}

/** @deprecated alias — preferisci readBackupWithFileReader */
export async function readBackupFile(source) {
  if (typeof source === 'string') {
    const parsed = JSON.parse(source);
    validateBackupPayload(parsed);
    return parsed;
  }
  return readBackupWithFileReader(source);
}

export function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Backup vuoto o corroto');
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('Struttura backup non riconosciuta (manca data)');
  }
  const { colonies, logs, feeding_logs } = payload.data;
  if (!Array.isArray(colonies) || !Array.isArray(logs)) {
    throw new Error('Il backup deve contenere colonies[] e logs[]');
  }
  if (feeding_logs != null && !Array.isArray(feeding_logs)) {
    throw new Error('feeding_logs deve essere un array');
  }
  for (const name of LAB_TABLES) {
    const t = payload.data[name];
    if (t != null && !Array.isArray(t)) {
      throw new Error(`${name} deve essere un array`);
    }
  }
  return true;
}

/**
 * Importa: transazione Dexie → clear() su tutte le tabelle → bulkAdd() dei nuovi dati.
 * @param {object} payload
 */
export async function importBackupOverwrite(payload) {
  validateBackupPayload(payload);

  const bags = {};
  for (const name of ALL_TABLES) {
    bags[name] = sanitizeRows(
      Array.isArray(payload.data[name]) ? payload.data[name] : []
    );
  }

  await db.transaction('rw', ...ALL_TABLES.map((n) => db.table(n)), async () => {
    for (const name of ALL_TABLES) {
      await db.table(name).clear();
    }
    for (const name of ALL_TABLES) {
      if (bags[name].length) await db.table(name).bulkAdd(bags[name]);
    }
  });

  return Object.fromEntries(ALL_TABLES.map((n) => [n, bags[n].length]));
}

function sanitizeRows(rows) {
  return rows.map((row) => ({ ...row }));
}
