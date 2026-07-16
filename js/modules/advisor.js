/**
 * Module C — Smart Advisor
 * Confronta letture T/RH (args o ultimo log) con target quantitativi della specie.
 */

import { findSpecies } from './encyclopedia.js';
import { findAdvisorSpecies } from '../data/advisor-species.js';

const MONTH_NAMES_IT = [
  '', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/**
 * @typedef {{ id: string, severity: 'info'|'warning'|'critical'|'success', title: string, body: string, tags?: string[], trigger?: string }} Advice
 */

/**
 * Normalizza range T/RH da scheda enciclopedia (formato flat v2 o nested legacy).
 * @param {object} species
 */
export function getSpeciesTargets(species) {
  if (!species) return { temperature: null, humidity: null, hibernation: null };

  const pack = findAdvisorSpecies(species.id) || findAdvisorSpecies(species.scientific_name);

  const temperature = pack?.temperature || species.targets?.temperature || (
    species.temperature?.min != null
      ? { min: species.temperature.min, max: species.temperature.max, optimal: species.temperature.optimal }
      : species.temperature?.nest
        ? {
            min: species.temperature.nest.min_c,
            max: species.temperature.nest.max_c,
            optimal: species.temperature.nest.ideal_c,
          }
        : null
  );

  const humidity = pack?.humidity || species.targets?.humidity || (
    species.humidity?.min != null
      ? { min: species.humidity.min, max: species.humidity.max, optimal: species.humidity.optimal }
      : species.humidity?.nest
        ? {
            min: species.humidity.nest.min_pct,
            max: species.humidity.nest.max_pct,
            optimal: null,
          }
        : null
  );

  const hibernation = pack?.hibernation || species.hibernation || (
    species.diapause
      ? {
          required: species.diapause.required,
          months: species.diapause.months || [],
          temp_min: species.diapause.temperature_c?.min,
          temp_max: species.diapause.temperature_c?.max,
        }
      : null
  );

  return {
    temperature,
    humidity,
    hibernation,
    foundation_type: pack?.foundation_type || species.foundation_type || species.foundation,
    diet: pack?.diet || species.diet,
    advisor_rules: pack?.advisor_rules || species.advisor_rules || [],
    development_times: pack?.development_times || species.development_times || null,
  };
}

/**
 * API richiesta: confronta ultima registrazione / parametri passati con il JSON specie.
 *
 * @param {number} colonyId
 * @param {number|null|undefined} currentTemp — °C nido; se omesso usa ultimo log climate
 * @param {number|null|undefined} currentHumidity — % RH nido; se omesso usa ultimo log climate
 * @returns {Promise<{ colony: object, species: object|null, tips: Advice[], dietNotes: string|null, readings: object, checks: object[] }>}
 */
export async function generateAdvice(colonyId, currentTemp, currentHumidity) {
  const { getColony, getLatestClimate } = await import('../db.js');
  const colony = await getColony(colonyId);
  if (!colony) {
    throw new Error(`Colonia #${colonyId} non trovata`);
  }

  const species = await findSpecies(colony.species);
  const latest = await getLatestClimate(colonyId);

  const temp =
    currentTemp != null && currentTemp !== ''
      ? Number(currentTemp)
      : latest?.nest_temp_c != null
        ? Number(latest.nest_temp_c)
        : null;

  const humidity =
    currentHumidity != null && currentHumidity !== ''
      ? Number(currentHumidity)
      : latest?.nest_humidity_pct != null
        ? Number(latest.nest_humidity_pct)
        : null;

  const readings = {
    currentTemp: Number.isFinite(temp) ? temp : null,
    currentHumidity: Number.isFinite(humidity) ? humidity : null,
    source: {
      temp: currentTemp != null && currentTemp !== '' ? 'argument' : latest?.nest_temp_c != null ? 'log' : 'none',
      humidity:
        currentHumidity != null && currentHumidity !== ''
          ? 'argument'
          : latest?.nest_humidity_pct != null
            ? 'log'
            : 'none',
    },
    latestClimate: latest,
  };

  const targets = getSpeciesTargets(species);
  const { tips, checks } = buildAdviceFromTargets(colony, species, targets, readings);

  return {
    colony,
    species,
    tips,
    dietNotes: targets.diet?.notes || species?.diet?.notes || null,
    readings,
    checks,
    targets,
  };
}

/**
 * Compat: API sincrona usata internamente / test.
 */
export function generateAdviceSync(colony, speciesData, opts = {}) {
  const targets = getSpeciesTargets(speciesData);
  const readings = {
    currentTemp: opts.currentTemp ?? opts.climate?.nest_temp_c ?? null,
    currentHumidity: opts.currentHumidity ?? opts.climate?.nest_humidity_pct ?? null,
    source: { temp: 'sync', humidity: 'sync' },
    latestClimate: opts.climate || null,
  };
  return buildAdviceFromTargets(colony, speciesData, targets, readings, opts.now).tips;
}

function buildAdviceFromTargets(colony, speciesData, targets, readings, now = new Date()) {
  /** @type {Advice[]} */
  const tips = [];
  /** @type {object[]} */
  const checks = [];

  if (!speciesData && !targets.temperature) {
    tips.push({
      id: 'no-species-match',
      severity: 'warning',
      title: 'Scheda specie non trovata',
      body: `Nessuna corrispondenza in enciclopedia per “${colony.species}”.`,
      tags: ['data'],
    });
    return { tips, checks };
  }

  const rules = targets.advisor_rules || [];
  const ruleMsg = (trigger) => rules.find((r) => r.trigger === trigger)?.message;

  // ── Temperature comparison ──────────────────────────────────
  const t = targets.temperature;
  if (t && readings.currentTemp != null) {
    let status = 'ok';
    if (readings.currentTemp < t.min) status = 'low';
    else if (readings.currentTemp > t.max) status = 'high';

    checks.push({
      key: 'temp',
      label: 'Temperatura nido',
      unit: '°C',
      value: readings.currentTemp,
      min: t.min,
      max: t.max,
      optimal: t.optimal,
      status,
    });

    if (status === 'low') {
      tips.push({
        id: 'temp_low',
        trigger: 'temp_low',
        severity: 'critical',
        title: 'Temperatura sotto il minimo',
        body:
          ruleMsg('temp_low') ||
          `Temperatura registrata ${readings.currentTemp}°C < minimo ${t.min}°C (ottimale ${t.optimal}°C). Lo sviluppo della covata rallenta.`,
        tags: ['temperature', 'alert'],
      });
    } else if (status === 'high') {
      tips.push({
        id: 'temp_high_alert',
        trigger: 'temp_high',
        severity: 'warning',
        title: 'Temperatura sopra il massimo',
        body: `Temperatura registrata ${readings.currentTemp}°C > massimo ${t.max}°C. Rischio stress termico.`,
        tags: ['temperature', 'alert'],
      });
    } else {
      // Near optimal band → show temp_high "maximize growth" tip if rule exists and temp in upper half
      if (readings.currentTemp >= (t.optimal ?? t.min) && ruleMsg('temp_high')) {
        tips.push({
          id: 'temp_high',
          trigger: 'temp_high',
          severity: 'success',
          title: 'Range termico favorevole',
          body: ruleMsg('temp_high'),
          tags: ['temperature'],
        });
      } else {
        tips.push({
          id: 'temp_ok',
          severity: 'success',
          title: 'Temperatura in range',
          body: `${readings.currentTemp}°C entro ${t.min}–${t.max}°C (ottimale ${t.optimal}°C).`,
          tags: ['temperature'],
        });
      }
    }
  } else if (t) {
    tips.push({
      id: 'temp-missing',
      severity: 'info',
      title: 'Nessuna temperatura registrata',
      body: `Target specie: ${t.min}–${t.max}°C (ottimale ${t.optimal}°C). Registra T nido nei log o passala a generateAdvice().`,
      tags: ['temperature'],
    });
  }

  // ── Humidity comparison ─────────────────────────────────────
  const h = targets.humidity;
  if (h && readings.currentHumidity != null) {
    let status = 'ok';
    if (readings.currentHumidity < h.min) status = 'low';
    else if (readings.currentHumidity > h.max) status = 'high';

    checks.push({
      key: 'humidity',
      label: 'Umidità nido',
      unit: '%',
      value: readings.currentHumidity,
      min: h.min,
      max: h.max,
      optimal: h.optimal,
      status,
    });

    if (status === 'low' || status === 'high') {
      tips.push({
        id: `humidity_${status}`,
        severity: 'warning',
        title: status === 'low' ? 'Umidità sotto il minimo' : 'Umidità sopra il massimo',
        body: `RH registrata ${readings.currentHumidity}% rispetto al target ${h.min}–${h.max}% (ottimale ${h.optimal}%). Verifica il serbatoio del formicaio.`,
        tags: ['humidity', 'alert'],
      });
    }
  }

  // ── Diet notes (sempre) ─────────────────────────────────────
  if (targets.diet?.notes) {
    tips.push({
      id: 'diet-notes',
      severity: 'info',
      title: 'Note dieta',
      body: targets.diet.notes,
      tags: ['diet'],
    });
  }

  // ── Preferred protein / protein_focus rule ──────────────────
  if (targets.diet?.preferred_protein === 'commercial_liquids' || ruleMsg('protein_focus')) {
    const foundingBlock =
      (colony.status === 'queen_only' || colony.status === 'founding') &&
      targets.foundation_type === 'claustral';
    if (!foundingBlock) {
      tips.push({
        id: 'protein_focus',
        trigger: 'protein_focus',
        severity: 'info',
        title: 'Focus proteico',
        body:
          ruleMsg('protein_focus') ||
          'Privilegia i liquidi proteici commerciali rispetto agli insetti vivi, come da scheda specie.',
        tags: ['diet'],
      });
    }
  }

  // ── Foundation rule ─────────────────────────────────────────
  const colonyStatus = colony.status;
  const foundingLike =
    colonyStatus === 'queen_only' ||
    colonyStatus === 'eggs' ||
    colonyStatus === 'first_workers' ||
    colonyStatus === 'founding';
  if (foundingLike && targets.foundation_type === 'claustral') {
    tips.push({
      id: 'founding',
      trigger: 'founding',
      severity: 'critical',
      title: 'Fondazione claustrale',
      body:
        ruleMsg('founding') ||
        'Mantieni la regina al buio assoluto e non fornire cibo fino alla nascita delle prime operaie.',
      tags: ['foundation'],
    });
  }

  // ── Hibernation ─────────────────────────────────────────────
  tips.push(...adviceHibernation(speciesData, targets.hibernation, now));

  // ── Development times (info) ────────────────────────────────
  if (targets.development_times && foundingLike) {
    const d = targets.development_times;
    const total = (d.egg_to_larva || 0) + (d.larva_to_pupa || 0) + (d.pupa_to_worker || 0);
    tips.push({
      id: 'dev-times',
      severity: 'info',
      title: 'Tempi di sviluppo indicativi',
      body: `Uovo→larva ~${d.egg_to_larva}g, larva→pupa ~${d.larva_to_pupa}g, pupa→operaia ~${d.pupa_to_worker}g (totale ~${total} giorni a temperature ottimali).`,
      tags: ['development'],
    });
  }

  tips.sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return { tips, checks };
}

function adviceHibernation(species, hibernation, now) {
  if (!hibernation?.required) return [];
  const month = now.getMonth() + 1;
  const months = hibernation.months || [];
  const monthLabel = months.map((m) => MONTH_NAMES_IT[m]).filter(Boolean).join('–');
  const inHib = months.includes(month);
  const name = species?.scientific_name || 'questa specie';

  if (inHib) {
    return [{
      id: 'hibernation-active',
      severity: 'warning',
      title: 'Periodo di ibernazione',
      body: `Per ${name} (${monthLabel}): mantieni ${hibernation.temp_min}–${hibernation.temp_max}°C, riduci cibo e disturbi.`,
      tags: ['hibernation'],
    }];
  }

  const ahead = months.filter((m) => {
    const delta = (m - month + 12) % 12;
    return delta > 0 && delta <= 2;
  });
  if (ahead.length) {
    return [{
      id: 'hibernation-approaching',
      severity: 'warning',
      title: 'Ibernazione in avvicinamento',
      body: `Preparati ad abbassare la temperatura a ${hibernation.temp_min}–${hibernation.temp_max}°C (mesi tipici: ${monthLabel}).`,
      tags: ['hibernation'],
    }];
  }
  return [];
}

function severityRank(s) {
  return { critical: 0, warning: 1, info: 2, success: 3 }[s] ?? 9;
}

/** @deprecated use generateAdvice(colonyId, temp, humidity) — kept for microclima arena UI */
export function evaluateMicroclimate(speciesData, climate) {
  const targets = getSpeciesTargets(speciesData);
  const readings = {
    currentTemp: climate?.nest_temp_c ?? null,
    currentHumidity: climate?.nest_humidity_pct ?? null,
  };
  const fakeColony = { status: 'established', species: speciesData?.scientific_name };
  const { tips, checks } = buildAdviceFromTargets(fakeColony, speciesData, targets, readings);
  const alerts = tips.filter((t) => t.tags?.includes('alert') || t.tags?.includes('temperature') || t.tags?.includes('humidity'));
  const hasBad = checks.some((c) => c.status === 'low' || c.status === 'high');
  return { ok: !hasBad, alerts, checks };
}

/**
 * @param {HTMLElement} container
 * @param {Advice[]} tips
 * @param {{ climateChecks?: object[], climateOk?: boolean, dietNotes?: string|null }} [extra]
 */
export function renderAdvicePanel(container, tips, extra = {}) {
  const checks = (extra.climateChecks || []).filter(
    (c) => c.status === 'ok' || c.status === 'low' || c.status === 'high'
  );

  const dietBanner = extra.dietNotes
    ? `<div class="diet-notes-banner" role="note">
         <strong>Dieta · note specie</strong>
         <p>${escape(extra.dietNotes)}</p>
       </div>`
    : '';

  const climateBanner = checks.length
    ? `<div class="climate-strip ${extra.climateOk === false ? 'is-alert' : 'is-ok'}" role="status">
         <strong>${extra.climateOk === false ? '⚠ Parametri fuori range' : '✓ Parametri in linea'}</strong>
         <ul class="climate-checks">
           ${checks
             .map(
               (c) => `
             <li class="climate-chip status-${c.status}">
               <span>${escape(c.label)}</span>
               <strong>${c.value}${escape(c.unit)}</strong>
               <em>${c.min}–${c.max}${escape(c.unit)}${c.optimal != null ? ` · opt ${c.optimal}` : ''}</em>
             </li>`
             )
             .join('')}
         </ul>
       </div>`
    : '';

  // Avoid duplicating diet-notes card if banner already shows it
  const visibleTips = tips.filter((t) => !(extra.dietNotes && t.id === 'diet-notes'));

  if (!visibleTips.length && !climateBanner && !dietBanner) {
    container.innerHTML = `<h3>Smart Advisor</h3><p class="muted">Nessun consiglio disponibile.</p>`;
    return;
  }

  container.innerHTML = `
    <h3>Smart Advisor</h3>
    <p class="muted advisor-sub">Confronto letture vs target quantitativi della specie</p>
    ${dietBanner}
    ${climateBanner}
    <ul class="advice-list">
      ${visibleTips
        .map(
          (t) => `
        <li class="advice-card severity-${t.severity}">
          <div class="advice-head">
            <span class="advice-dot" aria-hidden="true"></span>
            <strong>${escape(t.title)}</strong>
          </div>
          <p>${escape(t.body)}</p>
        </li>`
        )
        .join('')}
    </ul>
  `;
}

function escape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
