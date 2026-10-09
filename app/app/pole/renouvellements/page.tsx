// Calendrier de renouvellements jusqu'en 2033 — vue pôle
// Source : programme p. 41 (planification), Deck 2 slide 8 (durée de vie composants)
// Conception auteur : timeline par année, données fictives

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function RenouvellementsPole() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/pole/renouvellements");
  if (session.role !== "AGENCE_POLE" && session.role !== "ADMIN") redirect("/commune");

  const poleCode = session.poleCode ?? "ATL";

  const pole = await prisma.pole.findUnique({
    where: { code: poleCode },
    include: {
      communes: {
        include: {
          ouvrages: {
            include: {
              composants: { include: { composantType: true } },
            },
          },
        },
      },
    },
  });

  if (!pole) redirect("/pole");

  const currentYear = new Date().getFullYear();
  const endYear = 2033;

  // Construire calendrier par année
  const calendrier: Record<number, { communeNom: string; communeCode: string; ouvrageCode: string; composant: string; designation: string }[]> = {};

  for (let y = currentYear; y <= endYear; y++) {
    calendrier[y] = [];
  }

  for (const commune of pole.communes) {
    for (const ouvrage of commune.ouvrages) {
      for (const composant of ouvrage.composants) {
        if (!composant.datePose) continue;
        const anneeRenouv = composant.datePose.getFullYear() + composant.composantType.dureeVieAns;
        if (anneeRenouv >= currentYear && anneeRenouv <= endYear) {
          calendrier[anneeRenouv].push({
            communeNom: commune.nom,
            communeCode: commune.code,
            ouvrageCode: ouvrage.code,
            composant: composant.composantType.code,
            designation: composant.composantType.nom,
          });
        }
      }
    }
  }

  const years = Object.keys(calendrier).map(Number).sort();
  const totalItems = Object.values(calendrier).reduce((acc, items) => acc + items.length, 0);

  // Grouper par composant pour suggestions d'achats groupés
  const parComposant: Record<string, number> = {};
  for (const items of Object.values(calendrier)) {
    for (const item of items) {
      parComposant[item.composant] = (parComposant[item.composant] ?? 0) + 1;
    }
  }
  const groupables = Object.entries(parComposant)
    .filter(([, n]) => n >= 2)
    .sort(([, a], [, b]) => b - a);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pole" className="text-blue-600 text-sm">← Tableau de bord pôle</Link>
        <h1 className="text-xl font-bold text-gray-900">Calendrier renouvellements</h1>
        <span className="text-xs text-gray-400">{currentYear} → {endYear}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          <p className="text-xs text-gray-500">renouvellements prévus</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-indigo-700">{groupables.length}</p>
          <p className="text-xs text-gray-500">types groupables</p>
        </div>
      </div>

      {/* Achats groupés possibles */}
      {groupables.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">🛒 Achats groupés possibles (même type, ≥ 2 communes)</p>
          <div className="flex flex-wrap gap-2">
            {groupables.map(([code, count]) => (
              <span key={code} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-mono">
                {code} × {count}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">Données fictives à des fins de démonstration</p>
        </div>
      )}

      {/* Timeline par année */}
      <div className="space-y-4">
        {years.map((year) => {
          const items = calendrier[year];
          const isPast = year < currentYear;
          const isCurrent = year === currentYear;
          return (
            <div key={year} className={`bg-white rounded-2xl border p-5 ${isCurrent ? "border-indigo-300 ring-1 ring-indigo-200" : "border-gray-200"}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-lg font-bold ${isCurrent ? "text-indigo-700" : isPast ? "text-gray-400" : "text-gray-800"}`}>
                  {year}
                </span>
                {isCurrent && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Année en cours</span>}
                <span className="text-xs text-gray-400 ml-auto">{items.length} renouvellement{items.length > 1 ? "s" : ""}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 italic">Aucun renouvellement prévu</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-3 py-2">
                      <div>
                        <span className="font-medium text-gray-800">{item.designation}</span>
                        <span className="text-xs text-gray-400 ml-2 font-mono">{item.ouvrageCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">{item.composant}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{item.communeCode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">Données fictives — durées de vie issues du programme p. 41 — Conception auteur</p>
    </main>
  );
}
