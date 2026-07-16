/**
 * ⚙️ Impostazioni — Backup JSON + export CSV scientifici
 */

import {
  BACKUP_FILENAME,
  exportBackupToFile,
  importBackupOverwrite,
  readBackupWithFileReader,
} from './backup.js';
import { exportScientificCsvBundle } from './export-csv.js';
import { navigate } from './router.js';
import { confirmDialog, el, toast } from './ui.js';

export async function renderSettings(root) {
  root.appendChild(
    el(`
    <section class="page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Sistema</p>
          <h2>Impostazioni</h2>
          <p class="muted">Dati 100% locali sul tuo dispositivo · nessun server</p>
        </div>
      </header>

      <div class="panel" id="backup-card">
        <h3>Backup dati</h3>
        <p class="muted settings-copy">
          Esporta colonie, log, pasti e tabelle laboratorio in
          <code>${BACKUP_FILENAME}</code>.
          L’importazione <strong>cancella</strong> i dati attuali e li sostituisce
          (transazione Dexie: <code>clear</code> + <code>bulkAdd</code>).
        </p>

        <div class="settings-actions">
          <button type="button" class="btn btn-primary" id="btn-export-backup">
            Esporta Backup
          </button>
          <button type="button" class="btn btn-ghost" id="btn-import-backup">
            Importa Backup
          </button>
          <input
            type="file"
            id="import-backup-file"
            accept=".json,application/json"
            hidden
          />
        </div>

        <p id="backup-status" class="meta-line" aria-live="polite"></p>
      </div>

      <div class="panel">
        <h3>Export CSV scientifici</h3>
        <p class="muted settings-copy">
          Scarica CSV separati per colonie, timeline, pasti, biologia, clima,
          salute, riproduzione, setup e media (utile per fogli di calcolo / R).
        </p>
        <button type="button" class="btn btn-primary" id="btn-export-csv">
          Esporta CSV
        </button>
        <p id="csv-status" class="meta-line" aria-live="polite"></p>
      </div>

      <div class="panel">
        <h3>Informazioni</h3>
        <ul class="kv-list">
          <li><span>App</span><strong>AntKeep Pro</strong></li>
          <li><span>Archivio</span><strong>IndexedDB (Dexie) · offline-first</strong></li>
          <li><span>Privacy</span><strong>Nessun server esterno per i tuoi dati</strong></li>
        </ul>
        <button type="button" class="btn btn-ghost btn-sm" data-go-colonies>
          Vai alle colonie
        </button>
      </div>
    </section>
  `)
  );

  const status = root.querySelector('#backup-status');
  const csvStatus = root.querySelector('#csv-status');
  const fileInput = root.querySelector('#import-backup-file');

  root.querySelector('[data-go-colonies]')?.addEventListener('click', () => {
    navigate('#/colonies');
  });

  root.querySelector('#btn-export-backup').addEventListener('click', async () => {
    try {
      const result = await exportBackupToFile();
      const m = result.meta;
      const msg = `Backup: ${result.filename} · ${m.colonies} colonie · ${m.logs} log · ${m.feeding_logs} pasti · lab ${(m.biology_logs || 0) + (m.climate_logs || 0) + (m.health_logs || 0)} record`;
      status.textContent = msg;
      toast('Backup scaricato');
    } catch (err) {
      console.error(err);
      const message = err.message || 'Esportazione fallita';
      status.textContent = message;
      toast(message, 'error');
    }
  });

  root.querySelector('#btn-export-csv').addEventListener('click', async () => {
    try {
      csvStatus.textContent = 'Preparazione CSV…';
      const counts = await exportScientificCsvBundle();
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      csvStatus.textContent = `Esportati ${total} record su ${Object.keys(counts).length} tabelle`;
      toast('CSV scaricati');
    } catch (err) {
      console.error(err);
      const message = err.message || 'Export CSV fallito';
      csvStatus.textContent = message;
      toast(message, 'error');
    }
  });

  root.querySelector('#btn-import-backup').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const payload = await readBackupWithFileReader(file);
      const colonyCount = payload.data.colonies.length;
      const logCount = payload.data.logs.length;
      const feedCount = (payload.data.feeding_logs || []).length;
      const labCount = [
        'biology_logs',
        'climate_logs',
        'health_logs',
        'reproduction_logs',
        'setup_logs',
        'media_items',
      ].reduce((n, k) => n + (payload.data[k]?.length || 0), 0);

      const ok = await confirmDialog({
        title: 'Importare e sovrascrivere?',
        bodyHtml: `<p>Stai per <strong>sostituire tutti i dati locali</strong> con il contenuto di
          <strong>${escapeHtml(file.name)}</strong>.</p>
          <p class="muted">${colonyCount} colonie · ${logCount} log · ${feedCount} pasti · ${labCount} lab.</p>
          <p>Operazione irreversibile (salvo un export precedente).</p>`,
        confirmLabel: 'Sovrascrivi dati',
        danger: true,
      });
      if (!ok) return;

      const imported = await importBackupOverwrite(payload);
      const msg = `Import: ${imported.colonies} colonie · ${imported.logs} log · ${imported.feeding_logs} pasti`;
      status.textContent = msg;
      toast('Dati ripristinati');
      navigate('#/colonies');
    } catch (err) {
      console.error(err);
      const message = err.message || 'Importazione fallita';
      status.textContent = message;
      toast(message, 'error');
    }
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
