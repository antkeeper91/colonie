/**
 * Export CSV scientifici (colonie + log lab) — offline
 */

import { db } from '../db.js';
import { LAB_TABLES } from './lab-data.js';

function csvEscape(value) {
  if (value == null) return '';
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows) {
  if (!rows.length) return '';
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [keys.join(',')];
  for (const row of rows) {
    lines.push(keys.map((k) => csvEscape(row[k])).join(','));
  }
  return lines.join('\n');
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Scarica un ZIP-like bundle: più file CSV via download multiplo
 * (senza dipendenza zip — un CSV per tabella + riepilogo).
 */
export async function exportScientificCsvBundle() {
  const stamp = new Date().toISOString().slice(0, 10);
  const tables = ['colonies', 'logs', 'feeding_logs', ...LAB_TABLES];
  const counts = {};

  for (const name of tables) {
    const rows = await db.table(name).toArray();
    counts[name] = rows.length;
    if (!rows.length) continue;
    const csv = rowsToCsv(rows);
    downloadText(`antkeep_${name}_${stamp}.csv`, csv, 'text/csv;charset=utf-8');
    // Piccola pausa per evitare che il browser blocchi download multipli
    await new Promise((r) => setTimeout(r, 180));
  }

  const summary = [
    'table,rows',
    ...Object.entries(counts).map(([k, v]) => `${k},${v}`),
  ].join('\n');
  downloadText(`antkeep_export_summary_${stamp}.csv`, summary, 'text/csv;charset=utf-8');

  return counts;
}
