/** Theme toggle — dark default, persisted locally */

const STORAGE_KEY = 'antkeep-theme';

export function initThemeToggle() {
  const root = document.documentElement;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    root.setAttribute('data-theme', saved);
  } else {
    root.setAttribute('data-theme', 'dark');
  }

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
  });
}
