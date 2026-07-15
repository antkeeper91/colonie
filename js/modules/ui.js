/** DOM helpers & lightweight UI primitives */

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString('it-IT', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function toast(message, type = 'info') {
  let host = document.getElementById('toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast-host';
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const node = el(`<div class="toast toast-${type}" role="status">${escapeHtml(message)}</div>`);
  host.appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 280);
  }, 2800);
}

/**
 * @param {{ title: string, bodyHtml: string, confirmLabel?: string, danger?: boolean }} opts
 * @returns {Promise<boolean>}
 */
export function confirmDialog(opts) {
  return new Promise((resolve) => {
    const overlay = el(`
      <div class="modal-overlay" role="dialog" aria-modal="true">
        <div class="modal-card">
          <h3>${escapeHtml(opts.title)}</h3>
          <div class="modal-body">${opts.bodyHtml}</div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-act="cancel">Annulla</button>
            <button type="button" class="btn ${opts.danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">
              ${escapeHtml(opts.confirmLabel || 'Conferma')}
            </button>
          </div>
        </div>
      </div>
    `);
    const close = (val) => {
      overlay.remove();
      resolve(val);
    };
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    overlay.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
    overlay.querySelector('[data-act="ok"]').addEventListener('click', () => close(true));
    document.body.appendChild(overlay);
  });
}

export const STATUS_LABELS = {
  queen_only: 'Solo regina',
  founding: 'Fondazione',
  established: 'Stabilita',
};

/** Pastel iOS badge class for colony status */
export function statusBadgeClass(status) {
  return `badge badge-${status || 'established'}`;
}

export const LOG_LABELS = {
  feeding: 'Alimentazione',
  growth: 'Crescita',
  observation: 'Osservazione',
};
