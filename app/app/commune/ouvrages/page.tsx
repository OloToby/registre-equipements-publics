// Liste des ouvrages de la commune
// Source : programme p. 39 (registre des ouvrages)
// Conception auteur

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const ETAT_INFO: Record<string, { label: string; bg: string; color: string }> = {
  BON:          { label: "En service",   bg: "var(--ok-bg)",   color: "var(--ok)" },
  ATTENTION:    { label: "Attention",    bg: "var(--warn-bg)", color: "var(--warn)" },
  HORS_SERVICE: { label: "Hors service", bg: "var(--bad-bg)",  color: "var(--bad)" },
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
    <main className="max-w-2xl mx-auto px-4 pb-10 space-y-4">

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 pt-4 text-sm">
        <Link href="/commune" className="font-semibold hover:underline" style={{ color: "var(--blue)" }}>
          ← Tableau de bord
        </Link>
        <span style={{ color: "var(--line)" }}>·</span>
        <h1 className="font-bold" style={{ color: "var(--ink)" }}>Ouvrages ({ouvrages.length})</h1>
      </div>

      <div className="space-y-2">
        {ouvrages.map((o) => {
          const etatInfo = ETAT_INFO[o.etat] ?? { label: o.etat, bg: "var(--soft)", color: "var(--muted)" };
          const emoji = FAMILLE_EMOJI[o.typeOuvrage.famille] ?? "🏗️";
          return (
            <Link
              key={o.id}
              href={`/commune/ouvrage/${o.id}`}
              className="flex items-center gap-3 rounded-2xl p-4 transition-opacity hover:opacity-80"
              style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            >
              <span className="text-2xl shrink-0">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate" style={{ color: "var(--ink)" }}>{o.nom}</p>
                <p className="text-xs font-mono mt-0.5" style={{ color: "var(--muted)" }}>{o.code}</p>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{ background: etatInfo.bg, color: etatInfo.color }}>
                  {etatInfo.label}
                </span>
                {o.signalements.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--sky)", color: "var(--navy)" }}>
                    {o.signalements.length} sig.
                  </span>
                )}
                {o.composants.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>
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
