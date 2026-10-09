// Fonctions pures pour les 7 indicateurs — définitions exactes du Deck 2 slide 15
// Source : conception de l'auteur. Indicateurs déjà fixés par le programme : p. 21, 25 et 56.

export interface InterventionData {
  signalementCreatedAt: Date;
  closedAt: Date | null;
  delaiViséHeures: number;
}

export interface TachePreventiveData {
  echeanceAt: Date;
  faiteAt: Date | null;
  toleranceJours?: number; // 7 jours par défaut (Deck 2 slide 15)
}

export interface OuvrageData {
  code: string;
  dateMiseEnService: Date | null;
}

export interface ComposantData {
  dureeVieAns: number;
  datePose: Date | null;
}

export interface CoutInterventionData {
  coutMO?: number;
  coutPieces?: number;
}

// ── INDICATEUR 1 ─────────────────────────────────────────────────────────────
// Disponibilité = temps où l'ouvrage rend le service ÷ temps prévu
// Approximé sur N ouvrages : (ouvrages en service) / (total ouvrages)
export function calcDisponibilite(
  ouvragesTotal: number,
  ouvragesHorsService: number
): number {
  if (ouvragesTotal === 0) return 0;
  return ((ouvragesTotal - ouvragesHorsService) / ouvragesTotal) * 100;
}

// ── INDICATEUR 2 ─────────────────────────────────────────────────────────────
// Délai de remise en service = du signalement à la clôture de l'intervention (heures)
export function calcDelaiRemiseEnService(
  signalementCreatedAt: Date,
  closedAt: Date
): number {
  const diff = closedAt.getTime() - signalementCreatedAt.getTime();
  return diff / (1000 * 60 * 60); // en heures
}

// Délai médian sur un ensemble d'interventions
export function calcDelaiMedian(interventions: InterventionData[]): number {
  const closes = interventions.filter((i) => i.closedAt !== null);
  if (closes.length === 0) return 0;
  const delais = closes
    .map((i) => calcDelaiRemiseEnService(i.signalementCreatedAt, i.closedAt!))
    .sort((a, b) => a - b);
  const mid = Math.floor(delais.length / 2);
  return delais.length % 2 === 0
    ? (delais[mid - 1] + delais[mid]) / 2
    : delais[mid];
}

// ── INDICATEUR 3 ─────────────────────────────────────────────────────────────
// Préventif fait à temps = tâches faites dans les 7 jours suivant l'échéance ÷ tâches prévues
export function calcPreventifFaitATempsPct(
  taches: TachePreventiveData[],
  toleranceJours: number = 7
): number {
  if (taches.length === 0) return 0;
  const echues = taches.filter((t) => t.echeanceAt <= new Date());
  if (echues.length === 0) return 100;
  const faites = echues.filter((t) => {
    if (!t.faiteAt) return false;
    const retard =
      (t.faiteAt.getTime() - t.echeanceAt.getTime()) / (1000 * 60 * 60 * 24);
    return retard <= toleranceJours;
  });
  return (faites.length / echues.length) * 100;
}

// ── INDICATEUR 4 ─────────────────────────────────────────────────────────────
// Signalements traités dans le délai = tickets clos avant l'échéance ÷ tickets reçus
export function calcSignalementsDansDelaiPct(
  interventions: InterventionData[]
): number {
  if (interventions.length === 0) return 0;
  const dansDelai = interventions.filter((i) => {
    if (!i.closedAt) return false;
    const realHeures = calcDelaiRemiseEnService(i.signalementCreatedAt, i.closedAt);
    return realHeures <= i.delaiViséHeures;
  });
  return (dansDelai.length / interventions.length) * 100;
}

// ── INDICATEUR 5 ─────────────────────────────────────────────────────────────
// Coût d'entretien par ouvrage et par an (en FCFA)
export function calcCoutEntretienAnnuel(
  couts: CoutInterventionData[]
): number {
  return couts.reduce((sum, c) => sum + (c.coutMO ?? 0) + (c.coutPieces ?? 0), 0);
}

// ── INDICATEUR 6 ─────────────────────────────────────────────────────────────
// Âge moyen face à la durée de vie = âge des pièces ÷ durée de vie attendue (%)
export function calcAgeFaceDureeViePct(composant: ComposantData): number {
  if (!composant.datePose || composant.dureeVieAns === 0) return 0;
  const ageMs = Date.now() - composant.datePose.getTime();
  const ageAns = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  return (ageAns / composant.dureeVieAns) * 100;
}

// Moyenne sur plusieurs composants
export function calcAgeMoyenFaceDureeVie(composants: ComposantData[]): number {
  if (composants.length === 0) return 0;
  const pcts = composants.map(calcAgeFaceDureeViePct);
  return pcts.reduce((a, b) => a + b, 0) / pcts.length;
}

// ── INDICATEUR 7 ─────────────────────────────────────────────────────────────
// Couverture du registre = ouvrages inscrits ÷ ouvrages connus de la commune
export function calcCouvertureRegistrePct(
  ouvragesInscrits: number,
  ouvragesConnus: number
): number {
  if (ouvragesConnus === 0) return 0;
  return (ouvragesInscrits / ouvragesConnus) * 100;
}

// ── UTILITAIRES ───────────────────────────────────────────────────────────────

// Taux d'interventions avec preuve complète
export function calcProeuveCompletePct(
  totalInterventions: number,
  interventionsAvecPreuveComplete: number
): number {
  if (totalInterventions === 0) return 0;
  return (interventionsAvecPreuveComplete / totalInterventions) * 100;
}

// Priorité suggérée à partir des règles configurées
export interface PriorityRule {
  panneCodes: string[];
  priorite: string;
  delaiHeures: number;
}

export function calcPriorite(
  panneCode: string,
  rules: PriorityRule[]
): { priorite: string; delaiHeures: number } {
  const match = rules.find((r) => r.panneCodes.includes(panneCode));
  return match
    ? { priorite: match.priorite, delaiHeures: match.delaiHeures }
    : { priorite: "P3", delaiHeures: 168 };
}

// Alertes de stock
export function isStockSousSeuil(quantite: number, seuil: number): boolean {
  return quantite <= seuil;
}

// Prévision de renouvellement (année cible)
export function anneeRenouvellement(
  datePose: Date,
  dureeVieAns: number
): number {
  return datePose.getFullYear() + dureeVieAns;
}
