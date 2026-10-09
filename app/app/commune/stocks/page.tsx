// Gestion des stocks de pièces — vue commune
// Source : Deck 3 slide 13 (pompe COM-A : 1 → 0 après intervention)
// Conception auteur

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export default async function StocksPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/commune/stocks");

  const communeId = session.communeId ?? (
    await prisma.commune.findFirst({ where: { code: "COM-A" } })
  )?.id;
  if (!communeId) redirect("/commune");

  const commune = await prisma.commune.findUnique({
    where: { id: communeId },
    include: { stocks: { orderBy: { designation: "asc" } } },
  });
  if (!commune) redirect("/commune");

  const stocksSousSeuil = commune.stocks.filter((s) => s.quantite <= s.seuilAlerte);

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/commune" className="text-sm hover:underline" style={{ color: "var(--navy)" }}>← Tableau de bord</Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Stocks de pièces</h1>
      </div>

      {stocksSousSeuil.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "var(--bad-bg)", border: "1px solid #EBADA8" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--bad)" }}>
            🚨 {stocksSousSeuil.length} référence{stocksSousSeuil.length > 1 ? "s" : ""} sous seuil d'alerte
          </p>
          <p className="text-xs" style={{ color: "var(--bad)" }}>
            Deck 3 slide 13 : pompe immergée COM-A passée de 1 à 0 suite à l'intervention sur EAU-004
          </p>
        </div>
      )}

      <div className="space-y-2">
        {commune.stocks.map((s) => {
          const underAlert = s.quantite <= s.seuilAlerte;
          const critical = s.quantite === 0;
          const borderColor = critical ? "#EBADA8" : underAlert ? "#E0C570" : "var(--line)";
          return (
            <div
              key={s.id}
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: "var(--surface)", border: `1px solid ${borderColor}` }}
            >
              <div>
                <p className="font-medium" style={{ color: "var(--ink)" }}>{s.designation}</p>
                <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>{s.composantTypeCode}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Seuil d'alerte : {s.seuilAlerte}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: critical ? "var(--bad)" : underAlert ? "var(--warn)" : "var(--ok)" }}>
                  {s.quantite}
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>en stock</p>
                {underAlert && (
                  <span className="text-xs font-medium" style={{ color: critical ? "var(--bad)" : "var(--warn)" }}>
                    {critical ? "🚨 Rupture" : "⚠️ Alerte"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center pb-4" style={{ color: "var(--muted)" }}>
        Données fictives — conception auteur
      </p>
    </main>
  );
}
