/**
 * Modulo 4 — Sistema di Backup (Esportazione / Importazione JSON)
 * Vanilla JS + Dexie.js · 100% locale sul dispositivo
 */

import { db } from '../db.js';

export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_FILENAME = 'antkeep_backup.json';

/**
 * Legge asincronamente tutte le tabelle Dexie e costruisce il payload JSON.
 * @returns {Promise<object>}
 */
export async function buildBackupPayload() {
  const [colonies, logs, feeding_logs] = await Promise.all([
    db.colonies.toArray(),
    db.logs.toArray(),
    db.feeding_logs.toArray(),
  ]);

  return {
    app: 'AntKeep Pro',
    format_version: BACKUP_FORMAT_VERSION,
    exported_at: new Date().toISOString(),
    meta: {
      colonies: colonies.length,
      logs: logs.length,
      feeding_logs: feeding_logs.length,
    },
    data: { colonies, logs, feeding_logs },
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
  return true;
}

/**
 * Importa: transazione Dexie → clear() su tutte le tabelle → bulkAdd() dei nuovi dati.
 * @param {object} payload
 */
export async function importBackupOverwrite(payload) {
  validateBackupPayload(payload);

  const colonies = sanitizeRows(payload.data.colonies);
  const logs = sanitizeRows(payload.data.logs);
  const feeding_logs = sanitizeRows(
    Array.isArray(payload.data.feeding_logs) ? payload.data.feeding_logs : []
  );

  await db.transaction('rw', db.colonies, db.logs, db.feeding_logs, async () => {
    await db.feeding_logs.clear();
    await db.logs.clear();
    await db.colonies.clear();

    if (colonies.length) await db.colonies.bulkAdd(colonies);
    if (logs.length) await db.logs.bulkAdd(logs);
    if (feeding_logs.length) await db.feeding_logs.bulkAdd(feeding_logs);
  });

  return {
    colonies: colonies.length,
    logs: logs.length,
    feeding_logs: feeding_logs.length,
  };
}

function sanitizeRows(rows) {
  // Conserva gli id così colony_id nei log resta coerente dopo il restore
  return rows.map((row) => {
    const copy = { ...row };
    return copy;
  });
}
