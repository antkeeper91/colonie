/**
 * Module B — Enciclopedia Mirmecologica
 * Static JSON locale, ricercabile e collegabile allo Smart Advisor.
 */

let cache = null;

/**
 * @returns {Promise<{ meta: object, species: object[], foundation_types: object, difficulty_scale: object }>}
 */
export async function loadEncyclopedia() {
  if (cache) return cache;
  const res = await fetch('./data/encyclopedia.json');
  if (!res.ok) throw new Error("Impossibile caricare l'enciclopedia");
  cache = await res.json();
  return cache;
}

/** Clear in-memory cache (tests / hot reload) */
export function clearEncyclopediaCache() {
  cache = null;
}

/**
 * Match colony.species against encyclopedia (scientific name or id).
 * @param {string} query
 * @returns {Promise<object|null>}
 */
export async function findSpecies(query) {
  if (!query?.trim()) return null;
  const { species } = await loadEncyclopedia();
  const q = normalize(query);
  const qFlex = q.replace(/_/g, '-');

  const exact = species.find(
    (s) =>
      normalize(s.scientific_name) === q ||
      normalize(s.id) === q ||
      normalize(s.id) === qFlex ||
      normalize(s.id.replace(/-/g, '_')) === q.replace(/-/g, '_') ||
      (s.common_names || []).some((n) => normalize(n) === q)
  );
  if (exact) return exact;

  // Fuzzy contains (e.g. "Lasius emarginatus" vs "emarginatus")
  const partial = species.find(
    (s) =>
      normalize(s.scientific_name).includes(q) ||
      q.includes(normalize(s.scientific_name)) ||
      (s.common_names || []).some((n) => normalize(n).includes(q))
  );
  return partial || null;
}

/**
 * @param {{ q?: string, subfamily?: string, genus?: string, tag?: string, difficulty?: number, maxDifficulty?: number }} [filters]
 */
export async function searchSpecies(filters = {}) {
  const { species } = await loadEncyclopedia();
  const q = filters.q ? normalize(filters.q) : '';

  return species.filter((s) => {
    if (filters.subfamily && s.subfamily !== filters.subfamily) return false;
    if (filters.genus && genusOf(s) !== filters.genus) return false;
    if (filters.tag && !(s.tags || []).includes(filters.tag)) return false;
    if (filters.difficulty != null && s.difficulty !== Number(filters.difficulty)) return false;
    if (filters.maxDifficulty != null && s.difficulty > filters.maxDifficulty) return false;
    if (!q) return true;
    const hay = normalize(
      [s.scientific_name, s.id, ...(s.common_names || []), s.native_range, ...(s.tags || [])].join(' ')
    );
    return hay.includes(q);
  });
}

export async function listSubfamilies() {
  const { species } = await loadEncyclopedia();
  return [...new Set(species.map((s) => s.subfamily).filter(Boolean))].sort();
}

export async function listGenera() {
  const { species } = await loadEncyclopedia();
  return [...new Set(species.map(genusOf).filter(Boolean))].sort();
}

export async function listTags() {
  const { species } = await loadEncyclopedia();
  const tags = new Set();
  for (const s of species) {
    for (const t of s.tags || []) tags.add(t);
  }
  return [...tags].sort();
}

function genusOf(s) {
  const name = String(s.scientific_name || '').trim();
  return name.split(/\s+/)[0] || '';
}

export async function getEncyclopediaStats() {
  const data = await loadEncyclopedia();
  return {
    count: data.species.length,
    version: data.meta?.version,
    scope: data.meta?.scope,
  };
}

function normalize(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}
