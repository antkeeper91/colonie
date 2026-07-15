/**
 * ⚙️ Impostazioni — Modulo 4 Backup (export / import JSON)
 */

import {
  BACKUP_FILENAME,
  exportBackupToFile,
  importBackupOverwrite,
  readBackupWithFileReader,
} from './backup.js';
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
          Esporta colonie, log e pasti nutrizionali in un file
          <code>${BACKUP_FILENAME}</code>.
          L’importazione <strong>cancella</strong> i dati attuali e li sostituisce
          con quelli del file (transazione Dexie: <code>clear</code> + <code>bulkAdd</code>).
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
  const fileInput = root.querySelector('#import-backup-file');

  root.querySelector('[data-go-colonies]')?.addEventListener('click', () => {
    navigate('#/colonies');
  });

  // ── Esporta ────────────────────────────────────────────────
  root.querySelector('#btn-export-backup').addEventListener('click', async () => {
    try {
      const result = await exportBackupToFile();
      const msg = `Backup esportato: ${result.filename}\n${result.meta.colonies} colonie · ${result.meta.logs} log · ${result.meta.feeding_logs} pasti.`;
      status.textContent = msg.replace(/\n/g, ' · ');
      toast('Backup scaricato');
      alert(msg);
    } catch (err) {
      console.error(err);
      const message = err.message || 'Esportazione fallita';
      status.textContent = message;
      toast(message, 'error');
      alert(`Errore esportazione:\n${message}`);
    }
  });

  // ── Importa: bottone → input file nascosto ─────────────────
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

      const ok = await confirmDialog({
        title: 'Importare e sovrascrivere?',
        bodyHtml: `<p>Stai per <strong>sostituire tutti i dati locali</strong> con il contenuto di
          <strong>${escapeHtml(file.name)}</strong>.</p>
          <p class="muted">${colonyCount} colonie · ${logCount} log · ${feedCount} pasti.</p>
          <p>Operazione irreversibile (salvo un export precedente).</p>`,
        confirmLabel: 'Sovrascrivi dati',
        danger: true,
      });
      if (!ok) return;

      const imported = await importBackupOverwrite(payload);
      const msg = `Importazione completata.\n${imported.colonies} colonie · ${imported.logs} log · ${imported.feeding_logs} pasti.`;
      status.textContent = msg.replace(/\n/g, ' · ');
      toast('Dati ripristinati');
      alert(msg);

      // Ricarica la lista colonie per mostrare i dati appena importati
      navigate('#/colonies');
    } catch (err) {
      console.error(err);
      const message = err.message || 'Importazione fallita';
      status.textContent = message;
      toast(message, 'error');
      alert(`Errore importazione:\n${message}`);
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
