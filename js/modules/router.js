/**
 * Hash router minimale — #/dashboard | #/colonies | #/colonies/:id | #/encyclopedia | #/encyclopedia/:id
 */

const listeners = new Set();

export function parseRoute(hash = window.location.hash) {
  const raw = (hash || '#/dashboard').replace(/^#/, '') || '/dashboard';
  const parts = raw.split('/').filter(Boolean);
  const name = parts[0] || 'dashboard';

  if (name === 'colonies' && parts[1] === 'new') {
    return { name: 'colony-new', params: {} };
  }
  if (name === 'colonies' && parts[1] && parts[2] === 'edit') {
    return { name: 'colony-edit', params: { id: Number(parts[1]) } };
  }
  if (name === 'colonies' && parts[1]) {
    return { name: 'colony-detail', params: { id: Number(parts[1]) } };
  }
  if (name === 'colonies') return { name: 'colonies', params: {} };

  if (name === 'encyclopedia' && parts[1]) {
    return { name: 'species-detail', params: { id: decodeURIComponent(parts[1]) } };
  }
  if (name === 'encyclopedia') return { name: 'encyclopedia', params: {} };

  if (name === 'settings') return { name: 'settings', params: {} };

  return { name: 'dashboard', params: {} };
}

export function navigate(path) {
  const target = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
  if (window.location.hash === target) {
    listeners.forEach((fn) => fn(parseRoute(target)));
    return;
  }
  window.location.hash = target;
}

export function startRouter(onChange) {
  listeners.add(onChange);
  const handler = () => onChange(parseRoute());
  window.addEventListener('hashchange', handler);
  handler();
  return () => {
    window.removeEventListener('hashchange', handler);
    listeners.delete(onChange);
  };
}

export function setActiveNav(routeName) {
  const map = {
    dashboard: 'dashboard',
    colonies: 'colonies',
    'colony-new': 'colonies',
    'colony-edit': 'colonies',
    'colony-detail': 'colonies',
    encyclopedia: 'encyclopedia',
    'species-detail': 'encyclopedia',
    settings: 'settings',
  };
  const view = map[routeName] || 'dashboard';
  document.querySelectorAll('.nav-item').forEach((el) => {
    const active = el.dataset.view === view;
    el.classList.toggle('is-active', active);
    if (active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}
