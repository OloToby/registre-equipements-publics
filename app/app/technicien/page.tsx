// Vue technicien — liste des interventions assignées
// Source : Deck 3 slide 9 (technicien terrain), programme p. 38 (mode déconnecté)
// Conception auteur : liste des signalements affectés, indicateur hors-ligne, sync

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import OfflineBanner from "./OfflineBanner";

export default async function TechnicienPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/technicien");
  if (!["TECHNICIEN", "RESPONSABLE_COMMUNAL", "ADMIN"].includes(session.role)) {
    redirect("/");
  }

  const affectations = await prisma.affectation.findMany({
    where: { technicienId: session.id },
    include: {
      signalement: {
        include: {
          ouvrage: {
            include: {
              commune: true,
              typeOuvrage: { include: { checklistItems: true } },
              composants: { include: { composantType: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const signalements = affectations
    .map((a) => a.signalement)
    .filter((s) => s && !["CLOS"].includes(s.statut));

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <OfflineBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mes interventions</h1>
          <p className="text-sm text-gray-500">{session.nom}</p>
        </div>
        <Link
          href="/technicien/sync"
          className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-xl transition-colors"
        >
          🔄 Sync
        </Link>
      </div>

      {signalements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-semibold text-gray-700">Aucune intervention en attente</p>
          <p className="text-sm text-gray-400 mt-1">Toutes les interventions assignées ont été traitées.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {signalements.map((s) => {
            if (!s) return null;
            const prioriteColor = s.priorite === "P1"
              ? "border-l-4 border-red-500"
              : s.priorite === "P2" ? "border-l-4 border-amber-400"
              : "border-l-4 border-gray-200";

            return (
              <Link
                key={s.id}
                href={`/technicien/intervention/${s.id}`}
                className={`block bg-white rounded-2xl shadow-sm border border-gray-100 ${prioriteColor} p-4 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-gray-400">{s.numero}</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{s.panneLibelle}</p>
                    <p className="text-sm text-gray-600 truncate">{s.ouvrage.nom}</p>
                    <p className="text-xs text-gray-400">{s.ouvrage.commune.nom}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {s.priorite === "P1" && (
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">URGENT</span>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <Link
          href="/commune"
          className="text-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl transition-colors"
        >
          🏛️ Vue commune
        </Link>
        <Link
          href="/technicien/offline"
          className="text-center text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl transition-colors"
        >
          📴 Interventions hors-ligne
        </Link>
      </div>
    </main>
  );
}
