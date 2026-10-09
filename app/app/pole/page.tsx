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
    <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">Pôle {pole.nom}</h1>
          <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{pole.code}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pole/renouvellements" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            Calendrier renouvellements →
          </Link>
          <Link href="/pole/limites" className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors">
            Limites du MVP
          </Link>
        </div>
      </div>

      {/* Achats groupés — programme p. 41 */}
      {achatsGroupes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-blue-500 text-lg">🛒</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Suggestion achat groupé</p>
            <p className="text-xs text-blue-600 mt-0.5">{achatsGroupes} — Données fictives</p>
          </div>
        </div>
      )}

      {/* Communes à appuyer en priorité */}
      {prioriteAppui.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">Communes à appuyer en priorité (&lt; 60 % préventif)</p>
          <div className="flex flex-wrap gap-2">
            {prioriteAppui.map((c) => (
              <span key={c.communeCode} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-lg font-mono">
                {c.communeCode} — {c.indicateurs.preventifFaitATempsPct} %
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tableau comparatif */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Tableau comparatif — {tableau.length} communes — Données fictives</h2>
          <p className="text-xs text-gray-400 mt-0.5">Valeurs optimales en vert — Source : Deck 2 slide 15</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Commune</th>
                <th className="text-center px-3 py-3 font-medium">Ouvrages</th>
                <th className="text-center px-3 py-3 font-medium">Disponibilité %</th>
                <th className="text-center px-3 py-3 font-medium">Préventif %</th>
                <th className="text-center px-3 py-3 font-medium">Délai médian h</th>
                <th className="text-center px-3 py-3 font-medium">Dans délai %</th>
                <th className="text-center px-3 py-3 font-medium">Stocks ⚠️</th>
              </tr>
            </thead>
            <tbody>
              {tableau.map((c) => {
                const isBestDispo = c.indicateurs.disponibilite === maxDispo;
                const isBestPrev = c.indicateurs.preventifFaitATempsPct === maxPrev;
                const isBestDelai = c.indicateurs.delaiMedianH > 0 && c.indicateurs.delaiMedianH === minDelai;
                return (
                  <tr key={c.communeId} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{c.communeNom}</p>
                      <p className="font-mono text-xs text-gray-400">{c.communeCode}</p>
                    </td>
                    <td className="text-center px-3 py-3 text-gray-600">{c.ouvragesTotal}</td>
                    <td className={`text-center px-3 py-3 font-semibold ${isBestDispo ? "text-green-700 bg-green-50" : c.indicateurs.disponibilite < 80 ? "text-red-600" : "text-gray-700"}`}>
                      {c.indicateurs.disponibilite} %
                    </td>
                    <td className={`text-center px-3 py-3 font-semibold ${isBestPrev ? "text-green-700 bg-green-50" : c.indicateurs.preventifFaitATempsPct < 60 ? "text-red-600" : "text-amber-700"}`}>
                      {c.indicateurs.preventifFaitATempsPct} %
                    </td>
                    <td className={`text-center px-3 py-3 font-semibold ${isBestDelai ? "text-green-700 bg-green-50" : "text-gray-700"}`}>
                      {c.indicateurs.delaiMedianH > 0 ? `${c.indicateurs.delaiMedianH} h` : "—"}
                    </td>
                    <td className="text-center px-3 py-3 text-gray-600">
                      {c.indicateurs.signalementsDansDelaiPct > 0 ? `${c.indicateurs.signalementsDansDelaiPct} %` : "—"}
                    </td>
                    <td className="text-center px-3 py-3">
                      {c.stocksSousSeuil > 0 ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                          {c.stocksSousSeuil} réf.
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions : export + rejouer scénario */}
      <PoleActions tableau={tableau} poleNom={pole.nom} poleCode={pole.code} />

      <p className="text-xs text-gray-400 text-center">Données fictives à des fins de démonstration — Conception auteur</p>
    </main>
  );
}
