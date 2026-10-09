"use client";

// Tableau filtrable des ouvrages — composant client
// Source : Deck 3 slide 12 (c-list), programme p. 39

import Link from "next/link";
import { useState } from "react";

const ETAT_LABELS: Record<string, { label: string; cls: string }> = {
  BON:          { label: "En service",   cls: "service" },
  ATTENTION:    { label: "Dégradé",      cls: "degrade" },
  HORS_SERVICE: { label: "En panne",     cls: "panne" },
};

const FAMILLE_LABELS: Record<string, string> = {
  EAU_POTABLE: "Eau potable",
  ECLAIRAGE:   "Éclairage",
  SPORT:       "Sport",
  ARTISANAT:   "Artisanat",
  EDUCATION:   "Éducation",
};

type Ouvrage = {
  id: string;
  code: string;
  nom: string;
  etat: string;
  typeOuvrage: { nom: string; famille: string };
  arrondissement: { nom: string } | null;
  tachesPreventives: { echeanceAt: Date; faiteAt: Date | null }[];
  composants: { datePose: Date | null; composantType: { dureeVieAns: number } }[];
};

function prochainPreventif(taches: Ouvrage["tachesPreventives"]) {
  const enAttente = taches
    .filter((t) => !t.faiteAt && t.echeanceAt >= new Date())
    .sort((a, b) => a.echeanceAt.getTime() - b.echeanceAt.getTime());
  if (!enAttente.length) return null;
  return enAttente[0].echeanceAt;
}

function piecesFinVie(composants: Ouvrage["composants"]) {
  return composants.filter((c) => {
    if (!c.datePose) return false;
    const ageAns = (Date.now() - c.datePose.getTime()) / (365.25 * 86400000);
    return ageAns / c.composantType.dureeVieAns >= 0.9;
  }).length;
}

const fD = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function OuvragesTable({ ouvrages }: { ouvrages: Ouvrage[] }) {
  const [ft, setFt] = useState("");
  const [fe, setFe] = useState("");
  const [fa, setFa] = useState("");

  const familles = Array.from(new Set(ouvrages.map((o) => o.typeOuvrage.famille))).sort();
  const arrondissements = Array.from(new Set(ouvrages.map((o) => o.arrondissement?.nom).filter(Boolean) as string[])).sort();

  const filtered = ouvrages.filter((o) => {
    if (ft && o.typeOuvrage.famille !== ft) return false;
    if (fe && o.etat !== fe) return false;
    if (fa && (o.arrondissement?.nom ?? "") !== fa) return false;
    return true;
  });

  return (
    <>
      <div className="row">
        <label className="f grow" style={{ flex: "1 1 180px" }}>
          Type
          <select value={ft} onChange={(e) => setFt(e.target.value)}>
            <option value="">Tous</option>
            {familles.map((f) => (
              <option key={f} value={f}>{FAMILLE_LABELS[f] ?? f}</option>
            ))}
          </select>
        </label>
        <label className="f grow" style={{ flex: "1 1 180px" }}>
          État
          <select value={fe} onChange={(e) => setFe(e.target.value)}>
            <option value="">Tous</option>
            <option value="BON">En service</option>
            <option value="ATTENTION">Dégradé</option>
            <option value="HORS_SERVICE">En panne</option>
          </select>
        </label>
        <label className="f grow" style={{ flex: "1 1 180px" }}>
          Arrondissement
          <select value={fa} onChange={(e) => setFa(e.target.value)}>
            <option value="">Tous</option>
            {arrondissements.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Ouvrage</th>
              <th>Arrondissement</th>
              <th>État</th>
              <th>Prochain préventif</th>
              <th className="n">Pièces en fin de vie</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const etat = ETAT_LABELS[o.etat] ?? { label: o.etat, cls: "neutral" };
              const nextPrev = prochainPreventif(o.tachesPreventives);
              const finVie = piecesFinVie(o.composants);
              return (
                <tr key={o.id}>
                  <td>
                    <Link href={`/commune/ouvrage/${o.id}`}
                          style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--navy)" }}>
                      {o.code}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/commune/ouvrage/${o.id}`}
                          style={{ fontWeight: 600, color: "var(--ink)" }}>
                      {o.nom}
                    </Link>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>{o.typeOuvrage.nom}</div>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{o.arrondissement?.nom ?? "—"}</td>
                  <td>
                    <span className={`pill ${etat.cls}`}><i />{etat.label}</span>
                  </td>
                  <td style={{ color: nextPrev ? "var(--ink)" : "var(--muted)" }}>
                    {nextPrev ? fD(nextPrev) : "—"}
                  </td>
                  <td className="n" style={{ fontWeight: finVie > 0 ? 700 : 400, color: finVie > 0 ? "var(--warn)" : "var(--muted)" }}>
                    {finVie > 0 ? finVie : "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--muted)", padding: "24px" }}>
                  Aucun ouvrage ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
