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
        <Link href="/commune" className="text-blue-600 text-sm">← Tableau de bord</Link>
        <h1 className="text-xl font-bold text-gray-900">Stocks de pièces</h1>
      </div>

      {stocksSousSeuil.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-800 mb-2">
            🚨 {stocksSousSeuil.length} référence{stocksSousSeuil.length > 1 ? "s" : ""} sous seuil d'alerte
          </p>
          <p className="text-xs text-red-600">
            Deck 3 slide 13 : pompe immergée COM-A passée de 1 à 0 suite à l'intervention sur EAU-004
          </p>
        </div>
      )}

      <div className="space-y-2">
        {commune.stocks.map((s) => {
          const underAlert = s.quantite <= s.seuilAlerte;
          const critical = s.quantite === 0;
          return (
            <div
              key={s.id}
              className={`bg-white rounded-2xl border p-4 flex items-center justify-between ${
                critical ? "border-red-200" : underAlert ? "border-amber-200" : "border-gray-100"
              }`}
            >
              <div>
                <p className="font-medium text-gray-900">{s.designation}</p>
                <p className="text-xs font-mono text-gray-400">{s.composantTypeCode}</p>
                <p className="text-xs text-gray-500 mt-0.5">Seuil d'alerte : {s.seuilAlerte}</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${
                  critical ? "text-red-600" : underAlert ? "text-amber-600" : "text-green-600"
                }`}>
                  {s.quantite}
                </p>
                <p className="text-xs text-gray-400">en stock</p>
                {underAlert && (
                  <span className={`text-xs font-medium ${critical ? "text-red-600" : "text-amber-600"}`}>
                    {critical ? "🚨 Rupture" : "⚠️ Alerte"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        Données fictives — conception auteur
      </p>
    </main>
  );
}
