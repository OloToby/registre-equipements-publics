// Liste des ouvrages de la commune
// Source : programme p. 39 (registre des ouvrages)
// Conception auteur

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ETAT_INFO: Record<string, { label: string; dot: string }> = {
  BON:          { label: "En service",   dot: "bg-green-500" },
  ATTENTION:    { label: "Attention",    dot: "bg-amber-400" },
  HORS_SERVICE: { label: "Hors service", dot: "bg-red-500" },
};

const FAMILLE_EMOJI: Record<string, string> = {
  EAU_POTABLE: "💧", ECLAIRAGE: "💡", SPORT: "⚽", ARTISANAT: "🏺", EDUCATION: "🏫",
};

export default async function OuvragesPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/commune/ouvrages");

  const communeId = session.communeId ?? (
    await prisma.commune.findFirst({ where: { code: "COM-A" } })
  )?.id;
  if (!communeId) redirect("/commune");

  const ouvrages = await prisma.ouvrage.findMany({
    where: { communeId },
    include: {
      typeOuvrage: true,
      signalements: { where: { statut: { notIn: ["CLOS"] } } },
      composants: { where: { enAlerte: true } },
    },
    orderBy: { code: "asc" },
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/commune" className="text-blue-600 text-sm">← Tableau de bord</Link>
        <h1 className="text-xl font-bold text-gray-900">Ouvrages ({ouvrages.length})</h1>
      </div>

      <div className="space-y-2">
        {ouvrages.map((o) => {
          const etatInfo = ETAT_INFO[o.etat] ?? { label: o.etat, dot: "bg-gray-400" };
          const emoji = FAMILLE_EMOJI[o.typeOuvrage.famille] ?? "🏗️";
          return (
            <Link
              key={o.id}
              href={`/commune/ouvrage/${o.id}`}
              className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow"
            >
              <span className="text-2xl shrink-0">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{o.nom}</p>
                <p className="text-xs font-mono text-gray-400">{o.code}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className={`w-2 h-2 rounded-full ${etatInfo.dot}`} />
                  <span className="text-xs text-gray-500">{etatInfo.label}</span>
                </div>
                {o.signalements.length > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    {o.signalements.length} sig.
                  </span>
                )}
                {o.composants.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                    ⚠️ alerte
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
