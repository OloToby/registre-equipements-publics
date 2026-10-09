// Tableau de bord pôle — vue comparatif communes
// Source : programme p. 41 (agence de pôle), Deck 2 slide 15 (KPIs)
// D-009 : tableau comparatif, achats groupés, priorité appui

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  calcDisponibilite, calcPreventifFaitATempsPct,
  calcSignalementsDansDelaiPct, calcDelaiMedian,
} from "@/lib/indicateurs";
import PoleActions from "./PoleActions";

export default async function PoleDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/pole");
  if (session.role !== "AGENCE_POLE" && session.role !== "ADMIN") {
    redirect("/commune");
  }

  const poleCode = session.poleCode ?? "ATL";

  const pole = await prisma.pole.findUnique({
    where: { code: poleCode },
    include: {
      communes: {
        include: {
          ouvrages: {
            include: {
              composants: { include: { composantType: true } },
              tachesPreventives: true,
              interventions: { orderBy: { createdAt: "desc" } },
              signalements: { orderBy: { createdAt: "desc" } },
            },
          },
          stocks: true,
        },
      },
    },
  });

  if (!pole) redirect("/commune");

  const tableau = pole.communes.map((commune) => {
    const ouvragesTotal = commune.ouvrages.length;
    const ouvragesHS = commune.ouvrages.filter((o) => o.etat === "HORS_SERVICE").length;
    const dispo = calcDisponibilite(ouvragesTotal, ouvragesHS);

    const taches = commune.ouvrages.flatMap((o) => o.tachesPreventives);
    const preventif = calcPreventifFaitATempsPct(taches);

    const allInterventions = commune.ouvrages.flatMap((o) =>
      o.interventions.filter((i) => i.statut === "CLOS").map((i) => ({
        signalementCreatedAt: i.createdAt,
        closedAt: i.syncedAt ?? i.updatedAt,
        delaiViséHeures: 48,
      }))
    );
    const delai = calcDelaiMedian(allInterventions);
    const dansDelai = calcSignalementsDansDelaiPct(allInterventions);
    const stocksSousSeuil = commune.stocks.filter((s) => s.quantite <= s.seuilAlerte);

    return {
      communeId: commune.id,
      communeNom: commune.nom,
      communeCode: commune.code,
      ouvragesTotal,
      indicateurs: {
        disponibilite: Math.round(dispo * 10) / 10,
        preventifFaitATempsPct: Math.round(preventif),
        delaiMedianH: Math.round(delai * 10) / 10,
        signalementsDansDelaiPct: Math.round(dansDelai),
      },
      stocksSousSeuil: stocksSousSeuil.length,
      stockDetails: stocksSousSeuil.map((s) => ({
        designation: s.designation,
        quantite: s.quantite,
        seuil: s.seuilAlerte,
      })),
    };
  });

  const maxDispo = tableau.length ? Math.max(...tableau.map((c) => c.indicateurs.disponibilite)) : 0;
  const maxPrev = tableau.length ? Math.max(...tableau.map((c) => c.indicateurs.preventifFaitATempsPct)) : 0;
  const delaiValues = tableau.filter((c) => c.indicateurs.delaiMedianH > 0).map((c) => c.indicateurs.delaiMedianH);
  const minDelai = delaiValues.length ? Math.min(...delaiValues) : 0;

  const prioriteAppui = tableau
    .filter((c) => c.indicateurs.preventifFaitATempsPct < 60)
    .sort((a, b) => a.indicateurs.preventifFaitATempsPct - b.indicateurs.preventifFaitATempsPct);

  const communesSousSeuil = tableau.filter((c) => c.stocksSousSeuil > 0);
  const achatsGroupes = communesSousSeuil.length >= 2
    ? `Pompes immergées sous seuil dans ${communesSousSeuil.length} communes sur ${tableau.length} — achat groupé suggéré`
    : null;

  return (
    <main className="max-w-5xl mx-auto px-4 pb-10 space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black" style={{ color: "var(--ink)" }}>Pôle {pole.nom}</h1>
          <span className="font-mono text-xs px-2 py-0.5 rounded font-bold"
                style={{ background: "var(--soft)", color: "var(--muted)", border: "1px solid var(--line)" }}>
            {pole.code}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pole/renouvellements"
                className="text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80 text-white"
                style={{ background: "var(--navy)" }}>
            Calendrier renouvellements →
          </Link>
          <Link href="/pole/limites"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "var(--soft)", color: "var(--muted)", border: "1px solid var(--line)" }}>
            Limites du MVP
          </Link>
        </div>
      </div>

      {/* Achats groupés */}
      {achatsGroupes && (
        <div className="rounded-xl p-4 flex items-start gap-3"
             style={{ background: "var(--sky)", border: "1px solid #8BBDD9" }}>
          <span className="text-lg shrink-0">🛒</span>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>Suggestion achat groupé</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--navy)" }}>{achatsGroupes} — Données fictives</p>
          </div>
        </div>
      )}

      {/* Communes à appuyer */}
      {prioriteAppui.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--warn-bg)", border: "1px solid #E0C570" }}>
          <p className="text-sm font-bold mb-2" style={{ color: "var(--warn)" }}>
            Communes à appuyer en priorité (&lt; 60 % préventif)
          </p>
          <div className="flex flex-wrap gap-2">
            {prioriteAppui.map((c) => (
              <span key={c.communeCode} className="text-xs font-bold px-2 py-1 rounded-lg font-mono"
                    style={{ background: "rgba(135,87,0,.12)", color: "var(--warn)" }}>
                {c.communeCode} — {c.indicateurs.preventifFaitATempsPct} %
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tableau comparatif */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Tableau comparatif — {tableau.length} communes — Données fictives
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Valeurs optimales en vert · Source : Deck 2 slide 15</p>
        </div>
        <div className="overflow-x-auto">
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--soft)" }}>
                {["Commune", "Ouvrages", "Disponibilité %", "Préventif %", "Délai médian h", "Dans délai %", "Stocks ⚠️"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wide"
                      style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableau.map((c, i) => {
                const isBestDispo = c.indicateurs.disponibilite === maxDispo;
                const isBestPrev = c.indicateurs.preventifFaitATempsPct === maxPrev;
                const isBestDelai = c.indicateurs.delaiMedianH > 0 && c.indicateurs.delaiMedianH === minDelai;
                return (
                  <tr key={c.communeId} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                    <td className="px-4 py-3">
                      <p className="font-bold" style={{ color: "var(--ink)" }}>{c.communeNom}</p>
                      <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>{c.communeCode}</p>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>{c.ouvragesTotal}</td>
                    <td className="px-4 py-3 text-center font-bold"
                        style={{
                          background: isBestDispo ? "var(--ok-bg)" : undefined,
                          color: isBestDispo ? "var(--ok)" : c.indicateurs.disponibilite < 80 ? "var(--bad)" : "var(--ink)",
                        }}>
                      {c.indicateurs.disponibilite} %
                    </td>
                    <td className="px-4 py-3 text-center font-bold"
                        style={{
                          background: isBestPrev ? "var(--ok-bg)" : undefined,
                          color: isBestPrev ? "var(--ok)" : c.indicateurs.preventifFaitATempsPct < 60 ? "var(--bad)" : "var(--warn)",
                        }}>
                      {c.indicateurs.preventifFaitATempsPct} %
                    </td>
                    <td className="px-4 py-3 text-center font-bold"
                        style={{
                          background: isBestDelai ? "var(--ok-bg)" : undefined,
                          color: isBestDelai ? "var(--ok)" : "var(--ink)",
                        }}>
                      {c.indicateurs.delaiMedianH > 0 ? `${c.indicateurs.delaiMedianH} h` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: "var(--muted)" }}>
                      {c.indicateurs.signalementsDansDelaiPct > 0 ? `${c.indicateurs.signalementsDansDelaiPct} %` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.stocksSousSeuil > 0 ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: "var(--bad-bg)", color: "var(--bad)" }}>
                          {c.stocksSousSeuil} réf.
                        </span>
                      ) : (
                        <span className="text-xs font-bold" style={{ color: "var(--ok)" }}>OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <PoleActions tableau={tableau} poleNom={pole.nom} poleCode={pole.code} />

      <p className="text-xs text-center pb-4" style={{ color: "var(--muted)" }}>
        Données fictives à des fins de démonstration — Conception auteur
      </p>
    </main>
  );
}
