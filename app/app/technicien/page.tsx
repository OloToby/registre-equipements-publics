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
    <main className="max-w-lg mx-auto px-4 pb-10 space-y-4">
      <OfflineBanner />

      <div className="flex items-center justify-between pt-4">
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--ink)" }}>Mes interventions</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{session.nom}</p>
        </div>
        <Link
          href="/technicien/sync"
          className="text-sm font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
          style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)" }}
        >
          🔄 Sync
        </Link>
      </div>

      {signalements.length === 0 ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold" style={{ color: "var(--ink)" }}>Aucune intervention en attente</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Toutes les interventions assignées ont été traitées.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {signalements.map((s) => {
            if (!s) return null;
            const leftBorderColor =
              s.priorite === "P1" ? "var(--bad)" :
              s.priorite === "P2" ? "var(--warn)" :
              "var(--line)";

            return (
              <Link
                key={s.id}
                href={`/technicien/intervention/${s.id}`}
                className="block rounded-2xl p-4 transition-opacity hover:opacity-80"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderLeft: `4px solid ${leftBorderColor}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>{s.numero}</p>
                    <p className="font-bold mt-0.5" style={{ color: "var(--ink)" }}>{s.panneLibelle}</p>
                    <p className="text-sm truncate mt-0.5" style={{ color: "var(--muted)" }}>{s.ouvrage.nom}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{s.ouvrage.commune.nom}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {s.priorite === "P1" && (
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                            style={{ background: "var(--bad-bg)", color: "var(--bad)" }}>URGENT</span>
                    )}
                    <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
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
          className="text-center text-sm font-semibold py-3 rounded-xl transition-opacity hover:opacity-80"
          style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)" }}
        >
          🏛️ Vue commune
        </Link>
        <Link
          href="/technicien/offline"
          className="text-center text-sm font-semibold py-3 rounded-xl transition-opacity hover:opacity-80"
          style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)" }}
        >
          📴 Hors-ligne
        </Link>
      </div>
    </main>
  );
}
