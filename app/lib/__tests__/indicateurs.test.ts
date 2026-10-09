// Tests unitaires des 7 indicateurs — Deck 2 slide 15
// Chaque indicateur a au moins 2 cas : base + cas limite

import { describe, it, expect } from "vitest";
import {
  calcDisponibilite,
  calcDelaiRemiseEnService,
  calcDelaiMedian,
  calcPreventifFaitATempsPct,
  calcSignalementsDansDelaiPct,
  calcCoutEntretienAnnuel,
  calcAgeFaceDureeViePct,
  calcAgeMoyenFaceDureeVie,
  calcCouvertureRegistrePct,
  calcProeuveCompletePct,
  calcPriorite,
  isStockSousSeuil,
  anneeRenouvellement,
} from "../indicateurs";

// ── INDICATEUR 1 : Disponibilité ─────────────────────────────────────────────
describe("Indicateur 1 — Disponibilité", () => {
  it("calcule 83 % pour 6 ouvrages dont 1 hors service", () => {
    expect(calcDisponibilite(6, 1)).toBeCloseTo(83.33, 0);
  });

  it("calcule 88 % après résolution (5 ouvrages dont 0 hors service sur 5 en service)", () => {
    // Deck 3 slide 12 : 83 % → 88 % après résolution EAU-004
    // 6 ouvrages, 0 hors service = 100 %, mais scénario = 5 ouvrages sur 5 fonctionnels puis 1 de plus
    // Simulation simplifiée : 8/9 = 88.89 ≈ 88
    expect(calcDisponibilite(9, 1)).toBeCloseTo(88.89, 0);
  });

  it("retourne 0 si aucun ouvrage", () => {
    expect(calcDisponibilite(0, 0)).toBe(0);
  });

  it("retourne 100 si tous en service", () => {
    expect(calcDisponibilite(5, 0)).toBe(100);
  });
});

// ── INDICATEUR 2 : Délai de remise en service ─────────────────────────────────
describe("Indicateur 2 — Délai de remise en service", () => {
  it("calcule 29 h pour le scénario EAU-004 (Deck 3 slide 10)", () => {
    const t0 = new Date("2026-10-01T08:40:00");
    const t1 = new Date("2026-10-02T13:40:00"); // +29h
    expect(calcDelaiRemiseEnService(t0, t1)).toBeCloseTo(29, 1);
  });

  it("calcule le délai médian correctement", () => {
    const interventions = [
      { signalementCreatedAt: new Date("2026-10-01T08:00:00"), closedAt: new Date("2026-10-01T16:00:00"), delaiViséHeures: 48 },
      { signalementCreatedAt: new Date("2026-10-02T08:00:00"), closedAt: new Date("2026-10-03T12:00:00"), delaiViséHeures: 48 },
      { signalementCreatedAt: new Date("2026-10-03T08:00:00"), closedAt: new Date("2026-10-03T20:00:00"), delaiViséHeures: 48 },
    ];
    const median = calcDelaiMedian(interventions);
    expect(median).toBe(12); // médiane de [8, 28, 12] triés = 12
  });

  it("retourne 0 si aucune intervention clôturée", () => {
    expect(calcDelaiMedian([{ signalementCreatedAt: new Date(), closedAt: null, delaiViséHeures: 48 }])).toBe(0);
  });
});

// ── INDICATEUR 3 : Préventif fait à temps ─────────────────────────────────────
describe("Indicateur 3 — Préventif fait à temps", () => {
  const maintenant = new Date();
  const hier = new Date(maintenant.getTime() - 24 * 60 * 60 * 1000);
  const ilYA5Jours = new Date(maintenant.getTime() - 5 * 24 * 60 * 60 * 1000);
  const ilYA10Jours = new Date(maintenant.getTime() - 10 * 24 * 60 * 60 * 1000);
  const ilYA20Jours = new Date(maintenant.getTime() - 20 * 24 * 60 * 60 * 1000);

  it("calcule 44 % pour la commune D (Deck 3 slide 13)", () => {
    // 4 faites à temps sur 9 échues = 44 %
    const taches = [
      ...Array(4).fill({ echeanceAt: ilYA20Jours, faiteAt: ilYA20Jours }), // faites à temps
      ...Array(5).fill({ echeanceAt: ilYA10Jours, faiteAt: null }), // en retard
    ];
    expect(calcPreventifFaitATempsPct(taches)).toBeCloseTo(44.44, 0);
  });

  it("retourne 100 si toutes les tâches sont faites dans les 7 jours", () => {
    const taches = [
      { echeanceAt: ilYA5Jours, faiteAt: hier },
      { echeanceAt: ilYA10Jours, faiteAt: ilYA5Jours },
    ];
    expect(calcPreventifFaitATempsPct(taches)).toBe(100);
  });

  it("retourne 0 si aucune tâche faite", () => {
    const taches = [{ echeanceAt: ilYA10Jours, faiteAt: null }];
    expect(calcPreventifFaitATempsPct(taches)).toBe(0);
  });

  it("retourne 100 s'il n'y a pas encore de tâches échues", () => {
    const demain = new Date(maintenant.getTime() + 24 * 60 * 60 * 1000);
    const taches = [{ echeanceAt: demain, faiteAt: null }];
    expect(calcPreventifFaitATempsPct(taches)).toBe(100);
  });
});

// ── INDICATEUR 4 : Signalements traités dans le délai ─────────────────────────
describe("Indicateur 4 — Signalements traités dans le délai", () => {
  it("compte uniquement les interventions clôturées avant l'échéance", () => {
    const interventions = [
      { signalementCreatedAt: new Date("2026-10-01T08:00:00"), closedAt: new Date("2026-10-02T08:00:00"), delaiViséHeures: 48 }, // 24h < 48h ✓
      { signalementCreatedAt: new Date("2026-10-01T08:00:00"), closedAt: new Date("2026-10-04T08:00:00"), delaiViséHeures: 48 }, // 72h > 48h ✗
      { signalementCreatedAt: new Date("2026-10-01T08:00:00"), closedAt: null, delaiViséHeures: 48 }, // non clôturé ✗
    ];
    expect(calcSignalementsDansDelaiPct(interventions)).toBeCloseTo(33.33, 0);
  });

  it("EAU-004 : 29 h pour délai visé 48 h → compte comme traité à temps", () => {
    const interventions = [
      {
        signalementCreatedAt: new Date("2026-10-01T08:40:00"),
        closedAt: new Date("2026-10-02T13:40:00"),
        delaiViséHeures: 48,
      },
    ];
    expect(calcSignalementsDansDelaiPct(interventions)).toBe(100);
  });
});

// ── INDICATEUR 5 : Coût d'entretien par ouvrage et par an ─────────────────────
describe("Indicateur 5 — Coût d'entretien annuel", () => {
  it("cumule coût MO + pièces sur toutes les interventions", () => {
    const couts = [
      { coutMO: 100000, coutPieces: 850000 },
      { coutMO: 50000, coutPieces: 0 },
      { coutMO: undefined, coutPieces: 673000 },
    ];
    expect(calcCoutEntretienAnnuel(couts)).toBe(1673000); // Deck 3 slide 11
  });

  it("retourne 0 si aucun coût", () => {
    expect(calcCoutEntretienAnnuel([])).toBe(0);
  });
});

// ── INDICATEUR 6 : Âge moyen face à la durée de vie ──────────────────────────
describe("Indicateur 6 — Âge face à la durée de vie", () => {
  it("pompe posée en 2019, durée de vie 7 ans → > 85 % en 2026", () => {
    const composant = { datePose: new Date("2019-03-15"), dureeVieAns: 7 };
    const pct = calcAgeFaceDureeViePct(composant);
    expect(pct).toBeGreaterThan(85);
    expect(pct).toBeLessThan(120);
  });

  it("retourne 0 si pas de date de pose", () => {
    expect(calcAgeFaceDureeViePct({ datePose: null, dureeVieAns: 7 })).toBe(0);
  });

  it("calcule la moyenne sur plusieurs composants", () => {
    const composants = [
      { datePose: new Date("2020-01-01"), dureeVieAns: 10 }, // ~67 %
      { datePose: null, dureeVieAns: 5 }, // 0 %
    ];
    const moy = calcAgeMoyenFaceDureeVie(composants);
    expect(moy).toBeGreaterThan(0);
    expect(moy).toBeLessThan(100);
  });
});

// ── INDICATEUR 7 : Couverture du registre ─────────────────────────────────────
describe("Indicateur 7 — Couverture du registre", () => {
  it("calcule 95 % si 19 ouvrages sur 20 inscrits", () => {
    expect(calcCouvertureRegistrePct(19, 20)).toBe(95);
  });

  it("retourne 0 si aucun ouvrage connu", () => {
    expect(calcCouvertureRegistrePct(0, 0)).toBe(0);
  });
});

// ── UTILITAIRES ───────────────────────────────────────────────────────────────
describe("Utilitaires", () => {
  it("prouve complète : 90 % si 9 sur 10", () => {
    expect(calcProeuveCompletePct(10, 9)).toBe(90);
  });

  it("priorité P1 pour PAS_EAU selon les règles", () => {
    const rules = [
      { panneCodes: ["PAS_EAU", "COUPURE_ELEC"], priorite: "P1", delaiHeures: 48 },
      { panneCodes: ["DEBIT_FAIBLE"], priorite: "P2", delaiHeures: 72 },
    ];
    expect(calcPriorite("PAS_EAU", rules)).toEqual({ priorite: "P1", delaiHeures: 48 });
    expect(calcPriorite("DEBIT_FAIBLE", rules)).toEqual({ priorite: "P2", delaiHeures: 72 });
    expect(calcPriorite("VANDALISME", rules)).toEqual({ priorite: "P3", delaiHeures: 168 });
  });

  it("alerte stock : vrai si quantité ≤ seuil", () => {
    expect(isStockSousSeuil(1, 1)).toBe(true);
    expect(isStockSousSeuil(0, 1)).toBe(true);
    expect(isStockSousSeuil(2, 1)).toBe(false);
  });

  it("prévoit le renouvellement en 2026 pour pompe posée en 2019 (7 ans)", () => {
    expect(anneeRenouvellement(new Date("2019-03-15"), 7)).toBe(2026);
  });
});
