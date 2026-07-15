/**
 * Quantitative advisor dataset (Smart Advisor v2).
 * Merged into encyclopedia species + used for trigger rules.
 */
export const ADVISOR_SPECIES = [
  {
    id: 'lasius_emarginatus',
    encyclopedia_id: 'lasius-emarginatus',
    scientific_name: 'Lasius emarginatus',
    foundation_type: 'claustral',
    temperature: { min: 21, max: 26, optimal: 24 },
    humidity: { min: 40, max: 60, optimal: 50 },
    hibernation: {
      required: true,
      months: [11, 12, 1, 2],
      temp_min: 5,
      temp_max: 10,
    },
    diet: {
      carbs: 'High',
      protein: 'Medium',
      preferred_protein: 'commercial_liquids',
      notes:
        'Risponde in modo eccellente ai liquidi proteici commerciali. Evitare cibi vivi se non strettamente necessario.',
    },
    development_times: {
      egg_to_larva: 12,
      larva_to_pupa: 10,
      pupa_to_worker: 14,
    },
    advisor_rules: [
      {
        trigger: 'temp_low',
        message:
          'Temperatura sotto i 21°C. Lo sviluppo della covata subirà un forte rallentamento.',
      },
      {
        trigger: 'founding',
        message:
          'Fondazione claustrale: mantieni la regina al buio assoluto e non fornire cibo fino alla nascita delle prime operaie.',
      },
    ],
  },
  {
    id: 'pheidole_pallidula',
    encyclopedia_id: 'pheidole-pallidula',
    scientific_name: 'Pheidole pallidula',
    foundation_type: 'claustral',
    temperature: { min: 24, max: 28, optimal: 26 },
    humidity: { min: 50, max: 70, optimal: 60 },
    hibernation: {
      required: true,
      months: [11, 12, 1, 2],
      temp_min: 10,
      temp_max: 15,
    },
    diet: {
      carbs: 'Medium',
      protein: 'High',
      preferred_protein: 'commercial_liquids',
      notes:
        'Specie fortemente dimorfica. Richiede un apporto massiccio di liquidi proteici commerciali per stimolare la generazione della casta dei soldati.',
    },
    development_times: {
      egg_to_larva: 10,
      larva_to_pupa: 8,
      pupa_to_worker: 12,
    },
    advisor_rules: [
      {
        trigger: 'protein_focus',
        message:
          'Ricorda di somministrare dosi abbondanti di liquidi proteici per sostenere il dimorfismo della colonia.',
      },
      {
        trigger: 'temp_high',
        message:
          'Temperature vicine ai 26-28°C massimizzeranno il tasso di crescita della covata.',
      },
    ],
  },
];

export function findAdvisorSpecies(query) {
  if (!query) return null;
  const q = String(query).toLowerCase().replace(/[\s_]+/g, '-').trim();
  const qAlt = q.replace(/-/g, '_');
  return (
    ADVISOR_SPECIES.find(
      (s) =>
        s.id === qAlt ||
        s.encyclopedia_id === q ||
        s.scientific_name.toLowerCase() === String(query).toLowerCase().trim()
    ) || null
  );
}
