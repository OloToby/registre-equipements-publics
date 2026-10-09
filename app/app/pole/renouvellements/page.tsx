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
        <Link href="/pole" className="text-sm hover:underline" style={{ color: "var(--navy)" }}>← Tableau de bord pôle</Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Calendrier renouvellements</h1>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{currentYear} → {endYear}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <p className="text-2xl font-bold" style={{ color: "var(--navy)" }}>{totalItems}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>renouvellements prévus</p>
        </div>
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <p className="text-2xl font-bold" style={{ color: "var(--blue)" }}>{groupables.length}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>types groupables</p>
        </div>
      </div>

      {/* Achats groupés possibles */}
      {groupables.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--sky)", border: "1px solid #8BBDD9" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>🛒 Achats groupés possibles (même type, ≥ 2 communes)</p>
          <div className="flex flex-wrap gap-2">
            {groupables.map(([code, count]) => (
              <span key={code} className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: "rgba(37,57,112,.12)", color: "var(--navy)" }}>
                {code} × {count}
              </span>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Données fictives à des fins de démonstration</p>
        </div>
      )}

      {/* Timeline par année */}
      <div className="space-y-4">
        {years.map((year) => {
          const items = calendrier[year];
          const isPast = year < currentYear;
          const isCurrent = year === currentYear;
          return (
            <div key={year} className="rounded-2xl p-5"
              style={{ background: "var(--surface)", border: `1px solid ${isCurrent ? "var(--navy)" : "var(--line)"}` }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-lg font-bold" style={{ color: isCurrent ? "var(--navy)" : isPast ? "var(--muted)" : "var(--ink)" }}>
                  {year}
                </span>
                {isCurrent && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--sky)", color: "var(--navy)" }}>Année en cours</span>
                )}
                <span className="text-xs ml-auto" style={{ color: "var(--muted)" }}>{items.length} renouvellement{items.length > 1 ? "s" : ""}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs italic" style={{ color: "var(--muted)" }}>Aucun renouvellement prévu</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm rounded-xl px-3 py-2" style={{ background: "var(--soft)" }}>
                      <div>
                        <span className="font-medium" style={{ color: "var(--ink)" }}>{item.designation}</span>
                        <span className="text-xs ml-2 font-mono" style={{ color: "var(--muted)" }}>{item.ouvrageCode}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>{item.composant}</span>
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--lilac)", color: "var(--navy)" }}>{item.communeCode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center" style={{ color: "var(--muted)" }}>Données fictives — durées de vie issues du programme p. 41 — Conception auteur</p>
    </main>
  );
}
