/**
 * AntKeep Pro — hobby-comprehensive encyclopedia builder
 * Run: node scripts/build-encyclopedia.mjs
 *
 * Scope: commonly kept + European/Palaearctic hobby species with
 * detailed husbandry fields. Not every described ant on Earth.
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '..', 'data', 'encyclopedia.json');

const T = (nMin, nMax, nIdeal, aMin, aMax, aIdeal) => ({
  nest: { min_c: nMin, max_c: nMax, ideal_c: nIdeal },
  arena: { min_c: aMin, max_c: aMax, ideal_c: aIdeal },
});
const H = (nMin, nMax, aMin, aMax) => ({
  nest: { min_pct: nMin, max_pct: nMax },
  arena: { min_pct: aMin, max_pct: aMax },
});
const D = (required, months, tMin, tMax, notes = '') => ({
  required,
  months,
  temperature_c: required ? { min: tMin, max: tMax } : null,
  notes,
});
const Diet = (protein, carbohydrates, frequency, notes = '') => ({
  protein,
  carbohydrates,
  frequency,
  notes,
});

const G = {
  lasius: {
    subfamily: 'Formicinae',
    tribe: 'Lasiini',
    temperature: T(20, 27, 24, 18, 28, 23),
    humidity: H(50, 70, 30, 50),
    diapause: D(true, [11, 12, 1, 2, 3], 5, 10, 'Diapausa paleartica tipica.'),
    diet: Diet(
      'Insetti piccoli; liquidi proteici commerciali diluiti (priorità dopo insetti vivi).',
      'Miele diluito / acqua zuccherata.',
      '2–4×/settimana; sospeso/ridotto in diapausa.',
      'Fondazione claustrale: niente cibo fino alle nanitiche.'
    ),
    tags: ['formicinae', 'europe'],
  },
  formica: {
    subfamily: 'Formicinae',
    tribe: 'Formicini',
    temperature: T(18, 26, 22, 15, 28, 22),
    humidity: H(45, 65, 30, 50),
    diapause: D(true, [11, 12, 1, 2, 3], 0, 8, 'Diapausa obbligatoria e fresca.'),
    diet: Diet('Insetti medi/grandi.', 'Miele / nettare / melata.', 'Frequente in stagione attiva.', ''),
    tags: ['formicinae', 'europe', 'diapause'],
  },
  camponotus: {
    subfamily: 'Formicinae',
    tribe: 'Camponotini',
    temperature: T(22, 28, 25, 20, 30, 25),
    humidity: H(40, 60, 25, 45),
    diapause: D(true, [11, 12, 1, 2], 8, 15, 'Paleartiche: sì. Tropicali: override no-diapause.'),
    diet: Diet(
      'Insetti; liquidi proteici commerciali ben accettati.',
      'Soluzioni zuccherine.',
      '2–3×/settimana.',
      'Sviluppo lento in fondazione claustrale.'
    ),
    tags: ['formicinae', 'camponotus'],
  },
  messor: {
    subfamily: 'Myrmicinae',
    tribe: 'Stenammini',
    temperature: T(22, 30, 26, 20, 32, 26),
    humidity: H(40, 60, 20, 40),
    diapause: D(true, [11, 12, 1, 2], 10, 15, 'Rallentamento invernale mediterraneo.'),
    diet: Diet(
      'Proteine occasionali (insetti), più utili in fondazione.',
      'Semi (granivori) — fonte primaria.',
      'Semi sempre; proteine 1–2×/settimana.',
      'Arena asciutta; camera umida per covata.'
    ),
    tags: ['myrmicinae', 'granivore', 'europe'],
  },
  pheidole: {
    subfamily: 'Myrmicinae',
    tribe: 'Attini',
    temperature: T(24, 30, 27, 22, 32, 26),
    humidity: H(50, 70, 30, 50),
    diapause: D(false, [], null, null, 'No diapausa obbligatoria; possibile lieve rallentamento invernale a 12–15°C.'),
    diet: Diet(
      'Insetti frequenti (moscerini, pezzi); liquidi proteici ok. Distinguere da carboidrati.',
      'Acqua zuccherata / miele diluito.',
      'Quasi giornaliera in colonie grandi.',
      'Dimorfismo operaie/soldati. Alta umidità nido.'
    ),
    tags: ['myrmicinae', 'dimorphic'],
  },
  myrmica: {
    subfamily: 'Myrmicinae',
    tribe: 'Myrmicini',
    temperature: T(18, 24, 21, 15, 25, 20),
    humidity: H(60, 80, 40, 60),
    diapause: D(true, [10, 11, 12, 1, 2, 3], 0, 8, 'Diapausa lunga.'),
    diet: Diet('Insetti piccoli/medi.', 'Miele diluito.', '2–3×/settimana.', 'Umidità alta essenziale.'),
    tags: ['myrmicinae', 'europe', 'humidity-high'],
  },
  tetramorium: {
    subfamily: 'Myrmicinae',
    tribe: 'Crematogastrini',
    temperature: T(21, 27, 24, 18, 28, 23),
    humidity: H(45, 65, 30, 50),
    diapause: D(true, [11, 12, 1, 2], 5, 12),
    diet: Diet('Insetti; opportuniste.', 'Zuccheri.', '2–4×/settimana.', 'Ottime per principianti.'),
    tags: ['myrmicinae', 'beginner-friendly'],
  },
  crematogaster: {
    subfamily: 'Myrmicinae',
    tribe: 'Crematogastrini',
    temperature: T(22, 28, 25, 20, 30, 25),
    humidity: H(40, 60, 30, 50),
    diapause: D(true, [11, 12, 1, 2], 8, 14),
    diet: Diet('Insetti; melata.', 'Nettare/zuccheri.', 'Frequente.', 'Gastra a cuore; spesso arboricole.'),
    tags: ['myrmicinae', 'arboreal'],
  },
  temnothorax: {
    subfamily: 'Myrmicinae',
    tribe: 'Crematogastrini',
    temperature: T(18, 25, 22, 16, 26, 21),
    humidity: H(50, 70, 35, 55),
    diapause: D(true, [11, 12, 1, 2, 3], 2, 10),
    diet: Diet('Micro-insetti.', 'Gocce di miele diluito.', 'Piccole quantità frequenti.', 'Nano-setup.'),
    tags: ['myrmicinae', 'nano', 'europe'],
  },
  aphaenogaster: {
    subfamily: 'Myrmicinae',
    tribe: 'Stenammini',
    temperature: T(22, 28, 25, 20, 30, 25),
    humidity: H(45, 65, 25, 45),
    diapause: D(true, [11, 12, 1, 2], 8, 14),
    diet: Diet('Insetti; a volte semi.', 'Zuccheri moderati.', '2–3×/settimana.', 'Scavo intenso; arena ampia.'),
    tags: ['myrmicinae', 'europe'],
  },
  cataglyphis: {
    subfamily: 'Formicinae',
    tribe: 'Formicini',
    temperature: T(25, 35, 30, 25, 40, 32),
    humidity: H(30, 50, 10, 30),
    diapause: D(true, [11, 12, 1, 2], 10, 15),
    diet: Diet('Insetti (predazione/scavenging).', 'Pochi zuccheri.', '2–3×/settimana.', 'Xerofile/termofile: arena calda asciutta.'),
    tags: ['formicinae', 'thermophile', 'mediterranean'],
  },
  tapinoma: {
    subfamily: 'Dolichoderinae',
    tribe: 'Tapinomini',
    temperature: T(20, 28, 24, 18, 30, 24),
    humidity: H(40, 60, 30, 50),
    diapause: D(false, [12, 1], null, null, 'Solo rallentamento invernale lieve.'),
    diet: Diet('Insetti.', 'Zuccheri molto richiesti.', 'Frequente.', 'Poliginiche; attenzione fughe.'),
    tags: ['dolichoderinae', 'polygynous'],
  },
  plagiolepis: {
    subfamily: 'Formicinae',
    tribe: 'Plagiolepidini',
    temperature: T(20, 28, 24, 18, 30, 24),
    humidity: H(45, 65, 30, 50),
    diapause: D(true, [11, 12, 1, 2], 8, 14),
    diet: Diet('Micro-prede.', 'Zuccheri.', 'Frequente piccole dosi.', 'Coloniette; spesso poliginiche.'),
    tags: ['formicinae', 'nano', 'europe'],
  },
  solenopsis: {
    subfamily: 'Myrmicinae',
    tribe: 'Solenopsidini',
    temperature: T(24, 32, 28, 22, 34, 28),
    humidity: H(50, 70, 30, 50),
    diapause: D(false, [], null, null),
    diet: Diet('Insetti; liquidi proteici.', 'Zuccheri.', 'Frequente.', 'Alcune invasive: contenimento assoluto.'),
    tags: ['myrmicinae'],
  },
  attine: {
    subfamily: 'Myrmicinae',
    tribe: 'Attini',
    temperature: T(24, 28, 26, 22, 28, 25),
    humidity: H(70, 90, 50, 70),
    diapause: D(false, [], null, null, 'Stabilità per il giardino di fungo.'),
    diet: Diet(
      'Substrato vegetale per il fungo (NON dieta a insetti come primaria).',
      'Nutrizione via fungo simbionte.',
      'Rifornire substrato spesso; gestire rifiuti.',
      'Setup avanzato: umidità altissima in camera fungo.'
    ),
    tags: ['fungus-growing', 'advanced', 'tropical'],
  },
  ponerine: {
    subfamily: 'Ponerinae',
    tribe: null,
    temperature: T(22, 28, 25, 20, 28, 24),
    humidity: H(60, 85, 50, 70),
    diapause: D(false, [], null, null),
    diet: Diet('Insetti vivi preferiti.', 'Generalmente pochi zuccheri.', 'Frequente, porzioni piccole.', 'Fondazione spesso semi-claustrale; punture.'),
    tags: ['ponerinae', 'predator', 'advanced'],
  },
  polyrhachis: {
    subfamily: 'Formicinae',
    tribe: 'Camponotini',
    temperature: T(24, 30, 27, 22, 32, 26),
    humidity: H(55, 75, 40, 60),
    diapause: D(false, [], null, null),
    diet: Diet('Insetti.', 'Nettare abbondante.', 'Frequente.', 'Molte arboricole.'),
    tags: ['tropical', 'arboreal', 'formicinae'],
  },
  oecophylla: {
    subfamily: 'Formicinae',
    tribe: 'Oecophyllini',
    temperature: T(25, 32, 28, 24, 34, 28),
    humidity: H(60, 80, 50, 70),
    diapause: D(false, [], null, null),
    diet: Diet('Insetti.', 'Nettare/honeydew.', 'Molto frequente.', 'Weaver ants: nidi di foglie. Aggressive.'),
    tags: ['tropical', 'weaver', 'advanced'],
  },
  myrmecia: {
    subfamily: 'Myrmeciinae',
    tribe: null,
    temperature: T(20, 28, 24, 18, 30, 24),
    humidity: H(50, 70, 30, 50),
    diapause: D(false, [], null, null, 'Possibile rallentamento invernale in climi temperati AU.'),
    diet: Diet('Insetti vivi.', 'Nettare/miele.', 'Frequente.', 'Bull ants: puntura potente — solo esperti.'),
    tags: ['australia', 'advanced', 'stinger'],
  },
  pseudomyrmex: {
    subfamily: 'Pseudomyrmecinae',
    tribe: null,
    temperature: T(24, 30, 27, 22, 32, 26),
    humidity: H(50, 70, 40, 60),
    diapause: D(false, [], null, null),
    diet: Diet('Insetti piccoli.', 'Nettare.', 'Frequente.', 'Arboricole; nidi verticali.'),
    tags: ['tropical', 'arboreal'],
  },
  odontomachus: {
    subfamily: 'Ponerinae',
    tribe: 'Odontomachini',
    temperature: T(24, 30, 27, 22, 32, 26),
    humidity: H(60, 80, 50, 70),
    diapause: D(false, [], null, null),
    diet: Diet('Insetti vivi (mandibole a trappola).', 'Scarsi zuccheri.', 'Frequente.', 'Trap-jaw; salti; puntura.'),
    tags: ['ponerinae', 'trap-jaw', 'advanced'],
  },
  pogonomyrmex: {
    subfamily: 'Myrmicinae',
    tribe: 'Pogonomyrmecini',
    temperature: T(24, 35, 30, 22, 38, 30),
    humidity: H(30, 50, 10, 30),
    diapause: D(true, [11, 12, 1, 2], 8, 15, 'Inverno più fresco in natura arid temperate.'),
    diet: Diet('Semi + insetti.', 'Semi come carboidrati.', 'Semi sempre; proteine regolari.', 'Harvester ants; puntura intensa.'),
    tags: ['nearctic', 'granivore', 'stinger'],
  },
  linepithema: {
    subfamily: 'Dolichoderinae',
    tribe: 'Leptomyrmecini',
    temperature: T(20, 28, 24, 18, 30, 24),
    humidity: H(40, 60, 30, 50),
    diapause: D(false, [], null, null),
    diet: Diet('Insetti; opportuniste.', 'Zuccheri molto richiesti.', 'Continua.', 'Invasive: contenimento.'),
    tags: ['invasive', 'dolichoderinae', 'containment'],
  },
};

function sp(genusKey, o) {
  const base = G[genusKey];
  if (!base) throw new Error(`Unknown genus blueprint: ${genusKey}`);
  return {
    id: o.id,
    scientific_name: o.scientific_name,
    common_names: o.common_names || [],
    subfamily: o.subfamily || base.subfamily,
    tribe: o.tribe ?? base.tribe,
    native_range: o.native_range || '',
    difficulty: o.difficulty,
    colony_type: o.colony_type || 'monogyne',
    foundation: o.foundation,
    temperature: o.temperature || base.temperature,
    humidity: o.humidity || base.humidity,
    diapause: o.diapause ? { ...base.diapause, ...o.diapause } : base.diapause,
    diet: o.diet ? { ...base.diet, ...o.diet } : base.diet,
    behavior: {
      swarming: '',
      aggression: '',
      founding: '',
      notes: '',
      ...(o.behavior || {}),
    },
    size: o.size || {},
    colony_size_est: o.colony_size_est || '',
    husbandry_notes: o.husbandry_notes || '',
    tags: [...new Set([...(base.tags || []), ...(o.tags || [])])],
  };
}

const NO_DIA = D(false, [], null, null, 'Nessuna diapausa obbligatoria.');

/** Compact tuples helper: [idSuffix, scientific, difficulty, foundation, extras?] — filled by addMany */
function addMany(arr, genusKey, rows) {
  for (const r of rows) {
    if (typeof r === 'string') {
      // "Genus species|diff|foundation|range|note"
      const [name, diff, foundation, range, note] = r.split('|');
      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '');
      arr.push(
        sp(genusKey, {
          id,
          scientific_name: name,
          difficulty: Number(diff),
          foundation,
          native_range: range || '',
          husbandry_notes: note || '',
          behavior: { notes: note || '', founding: foundation },
        })
      );
    } else {
      arr.push(sp(genusKey, r));
    }
  }
}

const species = [];

// ── Featured detailed: Lasius emarginatus & Pheidole pallidula ──
species.push(
  sp('lasius', {
    id: 'lasius-emarginatus',
    scientific_name: 'Lasius emarginatus',
    common_names: ['Formica dalle suture rossastre'],
    native_range: 'Europa centro-meridionale e Mediterraneo',
    difficulty: 2,
    foundation: 'claustral',
    colony_type: 'monogyne',
    humidity: H(55, 75, 35, 55),
    size: { queen_mm: '7–9', worker_mm: '2.5–4.5' },
    colony_size_est: 'Diverse migliaia di operaie',
    behavior: {
      swarming: 'Giugno–agosto, spesso pomeridiane/serali con afidi e umidità.',
      aggression: 'Moderata; territoriali ma gestibili in cattività.',
      founding: 'Fondazione claustrale: regina al buio, digiuno fino alle prime operaie.',
      notes: 'Colorazione con toni rossastri su suture/zampe. Molto attiva in foraggiamento.',
    },
    husbandry_notes:
      'Specie eccellente intermedia. Richiede umidità nido medio-alta: verifica il serbatoio del formicaio. In fondazione: buio e 21–24°C stabili. Ibernazione Nov–Mar a ca. 5–10°C.',
    tags: ['featured', 'claustral', 'humidity-attention'],
  }),
  sp('pheidole', {
    id: 'pheidole-pallidula',
    scientific_name: 'Pheidole pallidula',
    common_names: ['Pheidole mediterranea', 'Big-headed ant (Med)'],
    native_range: 'Bacino del Mediterraneo, Europa meridionale',
    difficulty: 2,
    foundation: 'claustral',
    colony_type: 'monogyne',
    humidity: H(55, 75, 30, 50),
    size: { queen_mm: '6–8', worker_mm: '1.5–2.5 (minori) / 3.5–5 (soldati)' },
    colony_size_est: 'Migliaia; crescita rapida al caldo',
    behavior: {
      swarming: 'Estate, giornate calde; alati frequenti in colonie mature.',
      aggression: 'Media–alta in difesa del nido; soldati imponenti.',
      founding: 'Claustrale; prime operaie minori, poi comparsa soldati con risorse proteiche.',
      notes: 'Forte dimorfismo. Scavo e fughe: setup a prova di evasione. Ama calore.',
    },
    husbandry_notes:
      'Alimenta spesso con insetti vivi piccoli; usa liquidi proteici commerciali come integratore, non sostituto unico. Carboidrati a parte. Umidità nido generosa. Possibile rallentamento invernale (12–15°C) ma non diapausa da Formica.',
    tags: ['featured', 'mediterranean', 'dimorphic', 'humidity-attention'],
  })
);

// ── Lasius ──
addMany(species, 'lasius', [
  {
    id: 'lasius-niger',
    scientific_name: 'Lasius niger',
    common_names: ['Formica nera dei giardini'],
    native_range: 'Europa e Asia temperata',
    difficulty: 1,
    foundation: 'claustral',
    size: { queen_mm: '7–9', worker_mm: '3–5' },
    colony_size_est: '5.000–15.000+',
    behavior: {
      swarming: 'Picchi estivi post-pioggia.',
      aggression: 'Bassa–media.',
      founding: 'Claustrale classica da manuale.',
      notes: 'La specie entry-level europea per eccellenza.',
    },
    husbandry_notes: 'Tollerante su temperatura/umidità. Diapausa consigliata per salute a lungo termine.',
    tags: ['beginner-friendly'],
  },
  'Lasius flavus|2|claustral|Europa|Ipogea; umidità alta; poca attività in arena.',
  'Lasius brunneus|2|claustral|Europa|Spesso in legno/corteccia; timida.',
  'Lasius alienus|2|claustral|Europa|Simile a niger; suoli più calcarei.',
  'Lasius platythorax|2|claustral|Europa (umida)|Più igrofila di niger.',
  'Lasius mixtus|3|claustral|Europa|Meno comune in hobby.',
  'Lasius paralienus|2|claustral|Europa|Lasius “scuro” di ambienti aperti.',
  'Lasius psammophilus|2|claustral|Europa|Suoli sabbiosi.',
  'Lasius meridionalis|3|claustral|Europa S|Termofila.',
  {
    id: 'lasius-fuliginosus',
    scientific_name: 'Lasius fuliginosus',
    common_names: ['Formica fuligginosa'],
    native_range: 'Europa',
    difficulty: 4,
    foundation: 'temporary_social_parasitism',
    behavior: {
      founding: 'Parassitismo sociale temporaneo su Lasius umbratus group.',
      notes: 'Nidi cartacei; operaie nerissime lucide.',
      aggression: 'Media–alta.',
      swarming: 'Estate.',
    },
    husbandry_notes: 'Solo avanzati: serve ospite o colonia già avviata.',
    tags: ['parasitic', 'advanced'],
  },
  {
    id: 'lasius-umbratus',
    scientific_name: 'Lasius umbratus',
    native_range: 'Europa, Asia',
    difficulty: 4,
    foundation: 'temporary_social_parasitism',
    behavior: { founding: 'Parassita temporaneo di L. niger & affini.', notes: 'Operaie gialle.', aggression: 'Bassa.', swarming: 'Estate.' },
    tags: ['parasitic', 'advanced'],
  },
  {
    id: 'lasius-neglectus',
    scientific_name: 'Lasius neglectus',
    native_range: 'Invasiva in Europa',
    difficulty: 2,
    foundation: 'claustral',
    colony_type: 'polygyne',
    husbandry_notes: 'Facile ma contenimento assoluto; non rilasciare.',
    tags: ['invasive', 'containment'],
  },
  'Lasius sabularum|4|temporary_social_parasitism|Europa|Parassita; rara in allevamento.|',
  'Lasius distinguendus|4|temporary_social_parasitism|Europa|Parassita sociale temporaneo.',
  'Lasius bicornis|4|temporary_social_parasitism|Europa|Rara; dipendente da ospite.',
  'Lasius citrinus|4|temporary_social_parasitism|Europa|Parassita; operaie chiare.',
]);

// ── Formica ──
addMany(species, 'formica', [
  {
    id: 'formica-fusca',
    scientific_name: 'Formica fusca',
    common_names: ['Formica fusca'],
    native_range: 'Europa, Asia',
    difficulty: 2,
    foundation: 'claustral',
    size: { queen_mm: '7–10', worker_mm: '4.5–7.5' },
    behavior: {
      founding: 'Claustrale.',
      notes: 'Ospite classico di rufa group e F. sanguinea. Timida e veloce.',
      aggression: 'Bassa (fuga).',
      swarming: 'Estate.',
    },
    husbandry_notes: 'Ottima Formica “serviformica” per hobby.',
  },
  'Formica cunicularia|2|claustral|Europa|Serviformica suoli aperti.',
  'Formica rufibarbis|3|claustral|Europa|Più aggressiva di fusca.',
  'Formica cinerea|3|claustral|Europa sabbie|Molto veloce; poliginia possibile.',
  'Formica clara|3|claustral|Europa SE|Termofila.',
  'Formica gagates|2|claustral|Europa|Serviformica scura.',
  'Formica lemani|2|claustral|Europa (fredda)|Specie di altitudine/nord.',
  {
    id: 'formica-sanguinea',
    scientific_name: 'Formica sanguinea',
    common_names: ['Formica schiavista'],
    native_range: 'Europa, Asia',
    difficulty: 4,
    foundation: 'temporary_social_parasitism',
    behavior: {
      founding: 'Parassitismo temporaneo + dulosi su Serviformica.',
      notes: 'Capo rossastro; raid.',
      aggression: 'Alta.',
      swarming: 'Estate.',
    },
    tags: ['dulosis', 'advanced'],
  },
  {
    id: 'formica-rufa',
    scientific_name: 'Formica rufa',
    common_names: ['Formica rossa dei boschi'],
    native_range: 'Europa',
    difficulty: 4,
    foundation: 'temporary_social_parasitism',
    colony_type: 'polygyne',
    husbandry_notes: 'Spesso protetta; verificare leggi. Setup grande + diapausa seria.',
    tags: ['protected', 'advanced', 'acid'],
  },
  'Formica polyctena|4|temporary_social_parasitism|Europa|Gruppo rufa; polidomica.',
  'Formica pratensis|4|temporary_social_parasitism|Europa|Prati e margini.',
  'Formica truncorum|4|temporary_social_parasitism|Europa N|Gruppo rufa boreale.',
  'Formica lugubris|4|temporary_social_parasitism|Europa montana|Cumuli alpini/boreali.',
  'Formica aquilonia|4|temporary_social_parasitism|Europa N|Gruppo rufa.',
  'Formica exsecta|3|temporary_social_parasitism|Europa|Capo escavato tipico.',
  'Formica pressilabris|3|temporary_social_parasitism|Europa|Exsecta group.',
  'Formica uralensis|4|temporary_social_parasitism|Europa E / Asia|Rara in hobby.',
]);

// ── Camponotus EU + tropical ──
addMany(species, 'camponotus', [
  {
    id: 'camponotus-ligniperda',
    scientific_name: 'Camponotus ligniperda',
    common_names: ['Formica carpentiere europea'],
    native_range: 'Europa',
    difficulty: 2,
    foundation: 'claustral',
    size: { queen_mm: '14–18', worker_mm: '6–14' },
    diapause: D(true, [11, 12, 1, 2, 3], 5, 12),
    behavior: {
      founding: 'Claustrale molto lenta (spesso 6–12+ mesi).',
      notes: 'Nera; nidi in legno morto.',
      aggression: 'Media.',
      swarming: 'Fine primavera–estate.',
    },
    husbandry_notes: 'Pazienza in fondazione. Diapausa importante.',
  },
  'Camponotus herculeanus|2|claustral|Europa boreale/alpina|Diapausa lunga e fresca.',
  'Camponotus vagus|2|claustral|Europa|Nera setosa.',
  {
    id: 'camponotus-lateralis',
    scientific_name: 'Camponotus lateralis',
    common_names: ['Camponotus lateralis'],
    native_range: 'Mediterraneo',
    difficulty: 2,
    foundation: 'claustral',
    size: { queen_mm: '8–10', worker_mm: '3.5–7' },
    behavior: {
      notes: 'Capo/torace rossi, gastra nera. Relazione discussa con Crematogaster.',
      founding: 'Claustrale.',
      aggression: 'Bassa–media.',
      swarming: 'Estate.',
    },
  },
  'Camponotus cruentatus|3|claustral|Mediterraneo W|Grande e termofila.',
  'Camponotus aethiops|2|claustral|Mediterraneo|Nera elegante.',
  'Camponotus piceus|2|claustral|Europa|Piccola Camponotus.',
  'Camponotus fallax|2|claustral|Europa|Spesso arboricola.',
  'Camponotus gestroi|2|claustral|Mediterraneo|Affini a lateralis.',
  'Camponotus universitatis|3|claustral|Mediterraneo|Meno comune.',
  'Camponotus dalmaticus|3|claustral|Balcani|Mediterranea orientale.',
  {
    id: 'colobopsis-truncata',
    scientific_name: 'Colobopsis truncata',
    common_names: ['Colobopsis truncata'],
    native_range: 'Europa/Mediterraneo',
    difficulty: 3,
    foundation: 'claustral',
    subfamily: 'Formicinae',
    tribe: 'Camponotini',
    behavior: {
      notes: 'Soldati phragmotici (capo tronco).',
      founding: 'Claustrale.',
      aggression: 'Bassa.',
      swarming: 'Estate.',
    },
    tags: ['phragmosis'],
  },
  {
    id: 'camponotus-nicobarensis',
    scientific_name: 'Camponotus nicobarensis',
    native_range: 'SE Asia',
    difficulty: 1,
    foundation: 'claustral',
    diapause: NO_DIA,
    temperature: T(24, 30, 27, 22, 32, 26),
    humidity: H(50, 70, 40, 60),
    husbandry_notes: 'Facile e veloce per essere Camponotus. Niente ibernazione.',
    tags: ['tropical', 'beginner-friendly', 'no-diapause'],
  },
  {
    id: 'camponotus-maculatus',
    scientific_name: 'Camponotus maculatus',
    native_range: 'Africa / Medio Oriente (complex)',
    difficulty: 2,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['tropical', 'no-diapause'],
  },
  {
    id: 'camponotus-compressus',
    scientific_name: 'Camponotus compressus',
    native_range: 'India / Asia S',
    difficulty: 2,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['tropical', 'no-diapause'],
  },
  {
    id: 'camponotus-floridanus',
    scientific_name: 'Camponotus floridanus',
    native_range: 'SE USA',
    difficulty: 2,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['nearctic', 'no-diapause'],
  },
  {
    id: 'camponotus-pennsylvanicus',
    scientific_name: 'Camponotus pennsylvanicus',
    native_range: 'East North America',
    difficulty: 2,
    foundation: 'claustral',
    tags: ['nearctic'],
  },
  {
    id: 'camponotus-chromaiodes',
    scientific_name: 'Camponotus chromaiodes',
    native_range: 'East North America',
    difficulty: 2,
    foundation: 'claustral',
    tags: ['nearctic'],
  },
  {
    id: 'camponotus-castaneus',
    scientific_name: 'Camponotus castaneus',
    native_range: 'East North America',
    difficulty: 2,
    foundation: 'claustral',
    tags: ['nearctic'],
  },
  {
    id: 'camponotus-nearcticus',
    scientific_name: 'Camponotus nearcticus',
    native_range: 'North America',
    difficulty: 2,
    foundation: 'claustral',
    tags: ['nearctic'],
  },
  {
    id: 'camponotus-gigas',
    scientific_name: 'Camponotus gigas',
    native_range: 'SE Asia',
    difficulty: 4,
    foundation: 'claustral',
    diapause: NO_DIA,
    humidity: H(70, 90, 60, 80),
    size: { queen_mm: '25+', worker_mm: '10–20+' },
    husbandry_notes: 'Gigante; setup enorme e umidità tropicale. Solo esperti.',
    tags: ['tropical', 'advanced', 'giant'],
  },
  {
    id: 'camponotus-singularis',
    scientific_name: 'Camponotus singularis',
    native_range: 'SE Asia',
    difficulty: 3,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['tropical'],
  },
  {
    id: 'camponotus-sericeus',
    scientific_name: 'Camponotus sericeus',
    native_range: 'Africa / India',
    difficulty: 2,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['tropical'],
  },
  {
    id: 'camponotus-variegatus',
    scientific_name: 'Camponotus variegatus',
    native_range: 'Pacific / Asia',
    difficulty: 2,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['tropical'],
  },
  {
    id: 'camponotus-substitutus',
    scientific_name: 'Camponotus substitutus',
    native_range: 'Sud America',
    difficulty: 2,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['neotropical'],
  },
  {
    id: 'camponotus-renggeri',
    scientific_name: 'Camponotus renggeri',
    native_range: 'Sud America',
    difficulty: 2,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['neotropical'],
  },
  {
    id: 'camponotus-atriceps',
    scientific_name: 'Camponotus atriceps',
    native_range: 'Neotropics',
    difficulty: 2,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['neotropical'],
  },
]);

// ── Messor ──
addMany(species, 'messor', [
  {
    id: 'messor-barbarus',
    scientific_name: 'Messor barbarus',
    common_names: ['Messor', 'Formica mietitrice'],
    native_range: 'Mediterraneo occidentale',
    difficulty: 2,
    foundation: 'claustral',
    size: { queen_mm: '12–16', worker_mm: '3–12' },
    colony_size_est: 'Decine di migliaia',
    behavior: {
      founding: 'Claustrale; majors appaiono con la crescita.',
      notes: 'Granivora iconica. Polymorfismo estremo.',
      aggression: 'Media.',
      swarming: 'Autunno tipicamente.',
    },
    husbandry_notes: 'Mix semi + acqua. Arena asciutta. Proteine per covata.',
  },
  'Messor structor|2|claustral|Europa/Mediterraneo|Granivora; sciami spesso autunnali.',
  'Messor capitatus|2|claustral|Mediterraneo|Simile a barbarus.',
  'Messor wasmanni|2|claustral|Mediterraneo E|Granivora.',
  'Messor minor|2|claustral|Mediterraneo|Più piccola.',
  'Messor ibericus|2|claustral|Iberia|Endemica/area iberica.',
  'Messor bouvieri|3|claustral|Mediterraneo|Meno comune in shop.',
  'Messor arenarius|3|claustral|N Africa / Medio Oriente|Xerofila.',
  'Messor ebeninus|2|claustral|Medio Oriente|Popolare in allevamento.',
  'Messor cephalotes|3|claustral|Africa E|Majors enormi.',
]);

// ── Pheidole ──
addMany(species, 'pheidole', [
  'Pheidole megacephala|2|claustral|Pantropicale invasiva|Contenimento; crescita esplosiva.',
  'Pheidole indica|2|claustral|Asia / introdotta|Hobby comune.',
  'Pheidole fervens|2|claustral|Asia/Pacifico|Tropicale attiva.',
  'Pheidole dentata|2|claustral|USA SE|Nearctica.',
  'Pheidole hyatti|2|claustral|USA SW|Locale desertiche/secche.',
  'Pheidole navigans|2|claustral|Neotropics/Florida complex|Spesso misID in hobby.',
  'Pheidole sp. "yellow"|2|claustral|SE Asia (hobby morph)|Lotto hobby; verifica ID.',
  {
    id: 'pheidole-nodus',
    scientific_name: 'Pheidole noda',
    native_range: 'Asia orientale',
    difficulty: 2,
    foundation: 'claustral',
    diapause: D(false, [], null, null, 'Climi temperati E-Asia: possibile rallentamento invernale.'),
    tags: ['asia'],
  },
]);

// ── Myrmica / Tetramorium / Crematogaster / Temnothorax ──
addMany(species, 'myrmica', [
  {
    id: 'myrmica-rubra',
    scientific_name: 'Myrmica rubra',
    common_names: ['Myrmica rossa'],
    native_range: 'Europa; invasiva in NA',
    difficulty: 2,
    foundation: 'claustral',
    colony_type: 'polygyne',
    behavior: {
      notes: 'Puntura dolorosa. Poliginica; umidità alta.',
      aggression: 'Alta.',
      founding: 'Claustrale / adozione.',
      swarming: 'Estate.',
    },
    tags: ['stinger'],
  },
  'Myrmica ruginodis|2|claustral|Europa|Comune nei boschi umidi.',
  'Myrmica sabuleti|2|claustral|Europa|Prati; ospite Maculinea.',
  'Myrmica scabrinodis|2|claustral|Europa|Umidità alta.',
  'Myrmica schencki|2|claustral|Europa|Meno comune.',
  'Myrmica rugulosa|2|claustral|Europa|Suoli aperti.',
  'Myrmica gallienii|2|claustral|Europa|Zone umide.',
  'Myrmica lobicornis|2|claustral|Europa|Ambienti freschi.',
  'Myrmica speciosa|3|claustral|Europa SE|Termofila per Myrmica.',
]);

addMany(species, 'tetramorium', [
  {
    id: 'tetramorium-caespitum',
    scientific_name: 'Tetramorium caespitum',
    common_names: ['Pavement ant (senso lato EU)'],
    native_range: 'Europa',
    difficulty: 1,
    foundation: 'claustral',
    tags: ['beginner-friendly'],
  },
  {
    id: 'tetramorium-immigrans',
    scientific_name: 'Tetramorium immigrans',
    native_range: 'Invasiva globale (pavement ant)',
    difficulty: 1,
    foundation: 'claustral',
    colony_type: 'polygyne',
    husbandry_notes: 'Facilissima; contenere spore/alati.',
    tags: ['beginner-friendly', 'invasive'],
  },
  'Tetramorium semilaeve|2|claustral|Mediterraneo|Termofila.',
  'Tetramorium chefketi|2|claustral|Europa SE / Asia|Complex.',
  'Tetramorium moravicum|2|claustral|Europa|Meno comune.',
  'Tetramorium atratulum|4|temporary_social_parasitism|Europa|Parassita di Tetramorium (Anergates).',
  'Tetramorium bicarinatum|2|claustral|Pantropicale|Tramp species.',
]);

addMany(species, 'crematogaster', [
  {
    id: 'crematogaster-scutellaris',
    scientific_name: 'Crematogaster scutellaris',
    common_names: ['Formica acrobatica mediterranea'],
    native_range: 'Mediterraneo',
    difficulty: 2,
    foundation: 'claustral',
    size: { queen_mm: '8–10', worker_mm: '3–5' },
    behavior: {
      notes: 'Capo rosso iconico; gastra a cuore. Arboricola/legno.',
      founding: 'Claustrale.',
      aggression: 'Media–alta in difesa.',
      swarming: 'Estate–autunno.',
    },
  },
  'Crematogaster auberti|2|claustral|Mediterraneo|Simile; colori variabili.',
  'Crematogaster sordidula|2|claustral|Mediterraneo|Più piccola.',
  'Crematogaster algira|2|claustral|N Africa / Med|Termofila.',
  {
    id: 'crematogaster-sp-rozei',
    scientific_name: 'Crematogaster sp. "rozei"',
    native_range: 'SE Asia (trade name)',
    difficulty: 2,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['tropical', 'hobby-morph'],
  },
]);

addMany(species, 'temnothorax', [
  'Temnothorax nylanderi|2|claustral|Europa|Nano classico in ghiande/rametti.',
  'Temnothorax unifasciatus|2|claustral|Europa|Banda gastrale tipica.',
  'Temnothorax interruptus|2|claustral|Europa|Nano.',
  'Temnothorax affinis|2|claustral|Europa|Arboricolo.',
  'Temnothorax congestus|2|claustral|Mediterraneo|Termofilo.',
  'Temnothorax recedens|2|claustral|Mediterraneo|Nano mediterraneo.',
  'Temnothorax tuberum|2|claustral|Europa|Montano/temperato.',
  'Temnothorax corticalis|2|claustral|Europa|Sotto corteccia.',
  'Temnothorax curvispinosus|2|claustral|North America|Acorn ant.',
  'Temnothorax longispinosus|2|claustral|North America|Spine lunghe.',
  'Leptothorax acervorum|2|claustral|Europa boreale|Poliginica; fredda.',
]);

// Fix Leptothorax — wrong genus key applied. Patch after:
{
  const idx = species.findIndex((s) => s.scientific_name === 'Leptothorax acervorum');
  if (idx >= 0) {
    species[idx] = {
      ...species[idx],
      id: 'leptothorax-acervorum',
      subfamily: 'Myrmicinae',
      tribe: 'Crematogastrini',
      tags: [...new Set([...(species[idx].tags || []), 'europe', 'nano', 'cold'])],
    };
  }
}

addMany(species, 'aphaenogaster', [
  'Aphaenogaster senilis|2|claustral|Iberia/Med W|Popolare in Spagna/IT shop.',
  'Aphaenogaster subterranea|2|claustral|Europa|Boschi.',
  'Aphaenogaster iberica|2|claustral|Iberia|Locale.',
  'Aphaenogaster spinosa|2|claustral|Mediterraneo|Spine propodeali.',
  'Aphaenogaster gibbosa|2|claustral|Mediterraneo|Comune Med.',
  'Aphaenogaster subterraneoides|2|claustral|Europa E|Affini subterranea.',
  'Aphaenogaster rudis|2|claustral|North America|Nearctica comune.',
  'Aphaenogaster treatae|2|claustral|North America|Nearctica.',
  'Aphaenogaster cockerelli|2|claustral|USA SW|Grande; termofila.',
]);

addMany(species, 'cataglyphis', [
  {
    id: 'cataglyphis-cursor',
    scientific_name: 'Cataglyphis cursor',
    native_range: 'Mediterraneo W',
    difficulty: 3,
    foundation: 'claustral',
    behavior: {
      notes: 'Corritrice termofila; navigazione memorabile.',
      founding: 'Claustrale.',
      aggression: 'Media.',
      swarming: 'Estate.',
    },
    husbandry_notes: 'Spot lamp/cappa calda in arena. Nido con gradienti secco/umido.',
  },
  'Cataglyphis velox|3|claustral|Iberia|Molto veloce; xerofila.',
  'Cataglyphis viatica|3|claustral|N Africa / Med|Deserto/steppa.',
  'Cataglyphis italica|3|claustral|Italia|Locale italiana.',
  'Cataglyphis hispanica|3|claustral|Iberia|Interessante genetica coloniale.',
  'Cataglyphis nodus|3|claustral|Med E / Balcani|Grande nest.',
]);

addMany(species, 'tapinoma', [
  {
    id: 'tapinoma-erraticum',
    scientific_name: 'Tapinoma erraticum',
    native_range: 'Europa',
    difficulty: 2,
    foundation: 'claustral',
    colony_type: 'polygyne',
  },
  {
    id: 'tapinoma-magnum',
    scientific_name: 'Tapinoma magnum',
    native_range: 'Mediterraneo; invasiva urbana',
    difficulty: 2,
    foundation: 'claustral',
    colony_type: 'polygyne',
    husbandry_notes: 'Crescita esplosiva; fughe. Contenimento.',
    tags: ['invasive', 'containment'],
  },
  'Tapinoma nigerrimum|2|claustral|Mediterraneo|Complex nigerrimum/magnum.',
  'Tapinoma madeirense|2|claustral|Macaronesia / introdotta|Piccola dolichoderina.',
]);

addMany(species, 'plagiolepis', [
  'Plagiolepis pygmaea|2|claustral|Europa/Med|Nano; spesso poliginica.',
  'Plagiolepis schmitzii|2|claustral|Mediterraneo|Nano.',
  'Plagiolepis xene|4|temporary_social_parasitism|Europa|Parassita di Plagiolepis.',
]);

// Other EU small
species.push(
  sp('solenopsis', {
    id: 'solenopsis-fugax',
    scientific_name: 'Solenopsis fugax',
    common_names: ['Ladra'],
    native_range: 'Europa',
    difficulty: 3,
    foundation: 'claustral',
    temperature: T(20, 26, 23, 18, 28, 22),
    diapause: D(true, [11, 12, 1, 2], 5, 12),
    behavior: {
      notes: 'Ipogea; cleptobiosi verso altre formiche.',
      founding: 'Claustrale.',
      aggression: 'Bassa verso keeper; furtiva.',
      swarming: 'Estate.',
    },
    tags: ['europe', 'hypogeic'],
  }),
  sp('solenopsis', {
    id: 'solenopsis-invicta',
    scientific_name: 'Solenopsis invicta',
    common_names: ['RIFA', 'Fire ant'],
    native_range: 'Sud America; invasiva USA/altrove',
    difficulty: 3,
    foundation: 'claustral',
    colony_type: 'polygyne',
    husbandry_notes: 'Illegale/ristretta in molti Paesi. Puntura intensa. Solo dove consentito e con contenimento.',
    tags: ['invasive', 'containment', 'stinger', 'restricted'],
  }),
  sp('solenopsis', {
    id: 'solenopsis-geminata',
    scientific_name: 'Solenopsis geminata',
    native_range: 'Americhe / tramp',
    difficulty: 3,
    foundation: 'claustral',
    tags: ['stinger', 'containment'],
  })
);

species.push(
  sp('lasius', {
    id: 'bothriomyrmex-meridionalis',
    scientific_name: 'Bothriomyrmex meridionalis',
    subfamily: 'Dolichoderinae',
    tribe: 'Bothriomyrmecini',
    native_range: 'Mediterraneo',
    difficulty: 4,
    foundation: 'temporary_social_parasitism',
    temperature: T(22, 28, 25, 20, 30, 25),
    humidity: H(40, 60, 30, 50),
    diapause: D(true, [11, 12, 1, 2], 8, 14),
    diet: Diet('Insetti.', 'Zuccheri.', 'Moderata.', 'Parassita di Tapinoma.'),
    behavior: { founding: 'Parassita di Tapinoma.', notes: 'Avanzata.', aggression: 'Bassa.', swarming: 'Estate.' },
    tags: ['parasitic', 'dolichoderinae', 'advanced'],
  }),
  sp('formica', {
    id: 'polyergus-rufescens',
    scientific_name: 'Polyergus rufescens',
    common_names: ['Formica amazzone'],
    native_range: 'Europa',
    difficulty: 5,
    foundation: 'temporary_social_parasitism',
    husbandry_notes: 'Obbligata a schiavi Formica; solo esperti etici/legali.',
    behavior: {
      founding: 'Parassitismo + dulosi obbligatoria.',
      notes: 'Mandibole a falce; non nutre la covata da sola.',
      aggression: 'Raid.',
      swarming: 'Estate.',
    },
    tags: ['dulosis', 'advanced', 'parasitic'],
  }),
  sp('tapinoma', {
    id: 'dolichoderus-quadripunctatus',
    scientific_name: 'Dolichoderus quadripunctatus',
    subfamily: 'Dolichoderinae',
    tribe: 'Dolichoderini',
    native_range: 'Europa',
    difficulty: 3,
    foundation: 'claustral',
    behavior: {
      notes: 'Arboricola; 4 puntini tipici sulla gastra.',
      founding: 'Claustrale.',
      aggression: 'Bassa–media.',
      swarming: 'Estate.',
    },
    tags: ['arboreal', 'europe'],
  }),
  sp('temnothorax', {
    id: 'ponera-coarctata',
    scientific_name: 'Ponera coarctata',
    subfamily: 'Ponerinae',
    tribe: 'Ponerini',
    native_range: 'Europa',
    difficulty: 3,
    foundation: 'semi-claustral',
    temperature: T(18, 24, 21, 16, 25, 20),
    humidity: H(70, 90, 50, 70),
    diapause: D(true, [11, 12, 1, 2, 3], 2, 10),
    diet: Diet('Micro-prede vive.', 'No zuccheri tipici.', 'Frequente micro.', 'Ipogea umida.'),
    tags: ['ponerinae', 'europe', 'hypogeic'],
  }),
  sp('temnothorax', {
    id: 'hypoponera-punctatissima',
    scientific_name: 'Hypoponera punctatissima',
    subfamily: 'Ponerinae',
    tribe: 'Ponerini',
    native_range: 'Tramp / serre / Europa',
    difficulty: 3,
    foundation: 'semi-claustral',
    diapause: NO_DIA,
    humidity: H(70, 90, 50, 70),
    diet: Diet('Micro-prede.', 'Rari zuccheri.', 'Frequente.', 'Spesso in ambienti riscaldati.'),
    tags: ['ponerinae', 'tramp'],
  })
);

// ── Attine ──
addMany(species, 'attine', [
  {
    id: 'atta-cephalotes',
    scientific_name: 'Atta cephalotes',
    common_names: ['Leafcutter'],
    native_range: 'Neotropics',
    difficulty: 5,
    foundation: 'claustral',
    size: { queen_mm: '20–25', worker_mm: '1.5–16' },
    husbandry_notes: 'Foglio fresco giornaliero; camera fungo; rifiuti. Solo esperti.',
  },
  'Atta sexdens|5|claustral|Neotropics|Leafcutter avanzata.',
  'Atta mexicana|5|claustral|Messico/CA|Leafcutter.',
  'Acromyrmex octospinosus|4|claustral|Neotropics|Leafcutter “entry” relativa.',
  'Acromyrmex echinatior|4|claustral|Neotropics|Comune in lab/hobby avanzato.',
  'Acromyrmex lundii|4|claustral|Sud America|Leafcutter.',
  'Trachymyrmex septentrionalis|3|claustral|North America|Lower attine; substrato più semplice.',
  'Sericomyrmex amabilis|3|claustral|Neotropics|Lower fungus grower.',
  'Cyphomyrmex rimosus|3|claustral|Americhe|Piccola fungus grower.',
]);

// ── Ponerines / trap-jaw / etc ──
addMany(species, 'odontomachus', [
  'Odontomachus bauri|3|semi-claustral|Neotropics|Trap-jaw classica.',
  'Odontomachus haematodus|3|semi-claustral|Neotropics / introdotta|Puntura + scatto.',
  'Odontomachus clarus|3|semi-claustral|USA SW|Nearctica.',
  'Odontomachus troglodytes|3|semi-claustral|Africa|Tropicale.',
]);

addMany(species, 'ponerine', [
  {
    id: 'neoponera-villosa',
    scientific_name: 'Neoponera villosa',
    native_range: 'Neotropics',
    difficulty: 3,
    foundation: 'semi-claustral',
  },
  'Neoponera verenae|3|semi-claustral|Neotropics|Ponerina arboricola/terrestre.',
  'Pachycondyla crassa|3|semi-claustral|Africa/Asia (senso lato trade)|Verificare ID aggiornato.',
  'Dinoponera grandis|5|semi-claustral|Sud America|Enormi; puntura severa.',
  'Dinoponera gigantea|5|semi-claustral|Sud America|Gigante.',
  'Paraponera clavata|5|semi-claustral|Neotropics|Bullet ant; estrema.',
  'Harpegnathos saltator|4|semi-claustral|India/Asia|Jumping ant; biologia unica.',
  'Diacamma rugosum|3|semi-claustral|Asia|Gamergates possibili.',
  'Ectatomma ruidum|3|semi-claustral|Neotropics|Comune neotropicale.',
  'Ectatomma tuberculatum|3|semi-claustral|Neotropics|Grande ectatommina.',
  'Rhytidoponera metallica|3|semi-claustral|Australia|Greenhead ant.',
  'Gnamptogenys striatula|3|semi-claustral|Neotropics|Piccola predatrice.',
]);

addMany(species, 'pseudomyrmex', [
  'Pseudomyrmex gracilis|3|claustral|Americhe|Elongata; arboricola.',
  'Pseudomyrmex spinicola|3|claustral|Neotropics|Acacia-ant (mutualismo).',
  'Tetraponera rufonigra|3|claustral|Asia|Arborea aggressiva.',
]);

addMany(species, 'polyrhachis', [
  'Polyrhachis dives|2|claustral|Asia|Popolare; weave/silk nest behavior.',
  'Polyrhachis ammon|3|claustral|Australia|Golden spiny.',
  'Polyrhachis illaudata|2|claustral|Asia|Hobby comune.',
  'Polyrhachis armata|3|claustral|SE Asia|Spine evidenti.',
  'Polyrhachis bihamata|3|claustral|SE Asia|Hooked spines.',
]);

addMany(species, 'oecophylla', [
  {
    id: 'oecophylla-smaragdina',
    scientific_name: 'Oecophylla smaragdina',
    common_names: ['Weaver ant', 'Kerengga'],
    native_range: 'Asia / Australia settentrionale',
    difficulty: 4,
    foundation: 'claustral',
    colony_size_est: 'Centinaia di migliaia (poliginia/polidomia)',
    husbandry_notes: 'Serve vegetazione/foglie per nidi. Molto aggressive.',
  },
  'Oecophylla longinoda|4|claustral|Africa|Weaver africana.',
]);

addMany(species, 'myrmecia', [
  'Myrmecia brevinoda|5|semi-claustral|Australia|Bull ant grande.',
  'Myrmecia pilosula|5|semi-claustral|Australia|Jack jumper; allergie gravi.',
  'Myrmecia forficata|5|semi-claustral|Australia|Inchman.',
  'Myrmecia gulosa|5|semi-claustral|Australia|Red bull ant.',
]);

addMany(species, 'pogonomyrmex', [
  'Pogonomyrmex barbatus|3|claustral|USA SW / Messico|Red harvester; puntura forte.',
  'Pogonomyrmex occidentalis|3|claustral|USA W|Harvester.',
  'Pogonomyrmex californicus|3|claustral|USA SW|Harvester californiana.',
  'Pogonomyrmex rugosus|3|claustral|USA SW|Harvester.',
]);

addMany(species, 'linepithema', [
  {
    id: 'linepithema-humile',
    scientific_name: 'Linepithema humile',
    common_names: ['Argentine ant'],
    native_range: 'Sud America; invasiva globale',
    difficulty: 2,
    foundation: 'claustral',
    colony_type: 'polygyne',
    husbandry_notes: 'Unicoloniale invasiva. Contenimento assoluto; illegale da rilasciare.',
    tags: ['invasive', 'containment'],
  },
]);

// Extra popular / tramp / NA
species.push(
  sp('tapinoma', {
    id: 'iridomyrmex-purpureus',
    scientific_name: 'Iridomyrmex purpureus',
    subfamily: 'Dolichoderinae',
    native_range: 'Australia',
    difficulty: 3,
    foundation: 'claustral',
    colony_type: 'polygyne',
    diapause: NO_DIA,
    temperature: T(22, 32, 26, 20, 35, 26),
    behavior: { notes: 'Meat ant; mounds australiani.', founding: 'Claustrale.', aggression: 'Alta.', swarming: '—' },
    tags: ['australia', 'dolichoderinae'],
  }),
  sp('tetramorium', {
    id: 'monomorium-pharaonis',
    scientific_name: 'Monomorium pharaonis',
    subfamily: 'Myrmicinae',
    tribe: 'Solenopsidini',
    native_range: 'Tramp globale (edifici)',
    difficulty: 1,
    foundation: 'claustral',
    colony_type: 'polygyne',
    diapause: NO_DIA,
    temperature: T(24, 30, 27, 22, 32, 26),
    husbandry_notes: 'Facile ma pest potential: contenimento.',
    tags: ['tramp', 'containment', 'beginner-friendly'],
  }),
  sp('tetramorium', {
    id: 'monomorium-minimum',
    scientific_name: 'Monomorium minimum',
    subfamily: 'Myrmicinae',
    tribe: 'Solenopsidini',
    native_range: 'North America',
    difficulty: 2,
    foundation: 'claustral',
    tags: ['nearctic'],
  }),
  sp('pheidole', {
    id: 'carebara-diversa',
    scientific_name: 'Carebara diversa',
    native_range: 'Asia',
    difficulty: 3,
    foundation: 'claustral',
    diapause: NO_DIA,
    size: { queen_mm: '20+', worker_mm: '1–15+' },
    behavior: {
      notes: 'Majors enormi vs minori microscopici.',
      founding: 'Claustrale.',
      aggression: 'Media.',
      swarming: 'Stagionale tropicale.',
    },
    tags: ['tropical', 'dimorphic'],
  }),
  sp('crematogaster', {
    id: 'cephalotes-atratus',
    scientific_name: 'Cephalotes atratus',
    subfamily: 'Myrmicinae',
    tribe: 'Attini',
    native_range: 'Neotropics',
    difficulty: 3,
    foundation: 'claustral',
    diapause: NO_DIA,
    diet: Diet('Polline, escrementi di uccelli, sostanze zuccherine; insetti limitati.', 'Zuccheri/polline.', 'Frequente.', 'Turtle ants; gliders.'),
    tags: ['arboreal', 'neotropical'],
  }),
  sp('crematogaster', {
    id: 'cephalotes-varians',
    scientific_name: 'Cephalotes varians',
    subfamily: 'Myrmicinae',
    tribe: 'Attini',
    native_range: 'Florida / Caraibi',
    difficulty: 3,
    foundation: 'claustral',
    diapause: NO_DIA,
    tags: ['arboreal', 'nearctic'],
  }),
  sp('camponotus', {
    id: 'prenolepis-imparis',
    scientific_name: 'Prenolepis imparis',
    subfamily: 'Formicinae',
    tribe: 'Lasiini',
    native_range: 'North America',
    difficulty: 2,
    foundation: 'claustral',
    temperature: T(15, 22, 18, 10, 24, 16),
    behavior: {
      notes: 'Winter ant: attiva col fresco; estiva più quieta.',
      founding: 'Claustrale.',
      aggression: 'Bassa.',
      swarming: 'Primi tepori.',
    },
    tags: ['nearctic', 'cold-active'],
  }),
  sp('formica', {
    id: 'formica-pallidefulva',
    scientific_name: 'Formica pallidefulva',
    native_range: 'North America',
    difficulty: 2,
    foundation: 'claustral',
    tags: ['nearctic'],
  }),
  sp('messor', {
    id: 'veromessor-andrei',
    scientific_name: 'Veromessor andrei',
    subfamily: 'Myrmicinae',
    native_range: 'California',
    difficulty: 3,
    foundation: 'claustral',
    tags: ['nearctic', 'granivore'],
  }),
  sp('messor', {
    id: 'novomessor-cockerelli',
    scientific_name: 'Novomessor cockerelli',
    subfamily: 'Myrmicinae',
    native_range: 'USA SW',
    difficulty: 3,
    foundation: 'claustral',
    tags: ['nearctic'],
  }),
  sp('linepithema', {
    id: 'nylanderia-fulva',
    scientific_name: 'Nylanderia fulva',
    subfamily: 'Formicinae',
    tribe: 'Lasiini',
    native_range: 'Sud America; invasiva',
    difficulty: 2,
    foundation: 'claustral',
    colony_type: 'polygyne',
    diapause: NO_DIA,
    tags: ['invasive', 'containment'],
  }),
  sp('tetramorium', {
    id: 'wasmannia-auropunctata',
    scientific_name: 'Wasmannia auropunctata',
    subfamily: 'Myrmicinae',
    native_range: 'Neotropics; invasiva',
    difficulty: 3,
    foundation: 'claustral',
    colony_type: 'polygyne',
    diapause: NO_DIA,
    husbandry_notes: 'Little fire ant: puntura; altamente invasiva — contenimento.',
    tags: ['invasive', 'containment', 'stinger'],
  }),
  sp('polyrhachis', {
    id: 'leptomyrmex-erythrocephalus',
    scientific_name: 'Leptomyrmex erythrocephalus',
    subfamily: 'Dolichoderinae',
    native_range: 'Australia',
    difficulty: 3,
    foundation: 'claustral',
    diapause: NO_DIA,
    behavior: { notes: 'Spider ant; zampe lunghissime.', founding: 'Claustrale.', aggression: 'Media.', swarming: '—' },
    tags: ['australia'],
  }),
  sp('cataglyphis', {
    id: 'melophorus-bagoti',
    scientific_name: 'Melophorus bagoti',
    subfamily: 'Formicinae',
    native_range: 'Australia centrale',
    difficulty: 4,
    foundation: 'claustral',
    diapause: NO_DIA,
    temperature: T(28, 40, 35, 25, 45, 35),
    humidity: H(20, 40, 5, 20),
    husbandry_notes: 'Estremamente termofila desertica.',
    tags: ['australia', 'thermophile'],
  })
);

// Deduplicate by id
const byId = new Map();
for (const s of species) {
  if (byId.has(s.id)) {
    console.warn('Duplicate id skipped:', s.id);
    continue;
  }
  byId.set(s.id, s);
}
const unique = [...byId.values()].sort((a, b) =>
  a.scientific_name.localeCompare(b.scientific_name)
);

const encyclopedia = {
  meta: {
    title: 'AntKeep Pro — Enciclopedia Mirmecologica',
    version: '1.0.0',
    locale: 'it',
    scope:
      'Catalogo hobby-comprensivo: specie tipicamente allevate, europee/paleartiche comuni e tropicali popolari. Non elenca tutte le ~15.000 specie descritte.',
    species_count: unique.length,
    updated: new Date().toISOString().slice(0, 10),
    feeding_priority_note:
      'Nei consigli dieta: priorità insetti vivi e liquidi proteici commerciali distinti dalle fonti di carboidrati.',
  },
  foundation_types: {
    claustral: 'La regina fonde senza alimentarsi fino alle prime operaie.',
    'semi-claustral': 'La fondatrice esce a cibarsi/cacciare durante la fondazione.',
    temporary_social_parasitism: 'Serve una colonia ospite; la regina ne usurpa le operaie.',
    dependent: 'Dipende da ospiti/schiavi in modo permanente o prolungato.',
  },
  difficulty_scale: {
    1: 'Principiante',
    2: 'Intermedio agevole',
    3: 'Intermedio',
    4: 'Avanzato',
    5: 'Esperto / specialistico',
  },
  species: unique,
};

writeFileSync(outPath, JSON.stringify(encyclopedia, null, 2), 'utf8');
console.log(`Wrote ${unique.length} species → ${outPath}`);
