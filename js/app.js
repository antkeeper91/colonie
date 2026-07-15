/**
 * AntKeep Pro — entry point
 */

import { initThemeToggle } from './modules/theme.js';
import { db } from './db.js';
import { loadEncyclopedia } from './modules/encyclopedia.js';
import { navigate, setActiveNav, startRouter } from './modules/router.js';
import { clear, toast } from './modules/ui.js';
import { renderDashboard, destroyDashboardChart } from './modules/dashboard.js';
import {
  renderColoniesList,
  renderColonyDetail,
  renderColonyForm,
} from './modules/colonies.js';
import {
  renderEncyclopediaList,
  renderSpeciesDetail,
} from './modules/encyclopedia-view.js';
import { renderSettings } from './modules/settings.js';

const APP_VERSION = '1.0.0-ios-ui';

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[AntKeep] SW registration failed:', err);
    });
  });
}

function wireNav() {
  document.querySelectorAll('.nav-item[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.getAttribute('data-route')));
  });
}

async function renderRoute(route) {
  const root = document.getElementById('view-root');
  destroyDashboardChart();
  clear(root);
  setActiveNav(route.name);

  try {
    switch (route.name) {
      case 'dashboard':
        await renderDashboard(root);
        break;
      case 'colonies':
        await renderColoniesList(root);
        break;
      case 'colony-new':
        await renderColonyForm(root);
        break;
      case 'colony-edit':
        await renderColonyForm(root, { id: route.params.id });
        break;
      case 'colony-detail':
        await renderColonyDetail(root, route.params.id);
        break;
      case 'encyclopedia':
        await renderEncyclopediaList(root);
        break;
      case 'species-detail':
        await renderSpeciesDetail(root, route.params.id);
        break;
      case 'settings':
        await renderSettings(root);
        break;
      default:
        await renderDashboard(root);
    }
  } catch (err) {
    console.error(err);
    root.innerHTML = `<section class="page panel"><p>Errore di caricamento vista.</p></section>`;
    toast(err.message || 'Errore UI', 'error');
  }
}

async function boot() {
  console.info(`[AntKeep Pro] v${APP_VERSION}`);
  initThemeToggle();
  wireNav();
  registerServiceWorker();

  try {
    await db.open();
    await loadEncyclopedia();
  } catch (err) {
    console.error('[AntKeep] bootstrap error', err);
  }

  if (!window.location.hash) {
    window.location.hash = '#/dashboard';
  }

  startRouter(renderRoute);
}

boot();
