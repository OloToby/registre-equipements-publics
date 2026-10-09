// Vue technicien — liste des interventions assignées
// Source : Deck 3 slide 9 (technicien terrain), programme p. 38 (mode déconnecté)
// Conception auteur : liste des signalements affectés, indicateur hors-ligne, sync

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

  const fDs = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const fDT = (d: Date) => fDs(d) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>

      {/* Barre app */}
      <div className="appbar">
        <div className="top">
          <span className="t">Mes interventions</span>
          <OfflineBanner inline />
        </div>
        <span className="s">{session.nom ?? "Équipe technique"}</span>
      </div>

      <div className="mbody">

        {/* Dépannages */}
        <span className="lbl">Dépannages ({signalements.length})</span>

        {signalements.length === 0 ? (
          <div className="card muted">Aucun dépannage en cours.</div>
        ) : (
          signalements.map((s) => {
            if (!s) return null;
            const slaH = s.priorite === "P1" ? 48 : s.priorite === "P2" ? 120 : 360;
            const leftH = slaH - (Date.now() - s.createdAt.getTime()) / 3600000;
            return (
              <Link key={s.id} href={`/technicien/intervention/${s.id}`} className="task">
                <div className="row">
                  <span className={`prio ${s.priorite ?? "P3"}`}>{s.priorite ?? "—"}</span>
                  <span className="muted" style={{ fontSize: "12px" }}>{s.numero}</span>
                  <span className="grow" />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: leftH < 12 ? "var(--bad)" : "var(--muted)" }}>
                    reste {Math.max(0, Math.round(leftH))} h
                  </span>
                </div>
                <strong style={{ fontSize: "15px" }}>{s.ouvrage.nom}</strong>
                <span className="muted">{s.panneLibelle} · {s.statut === "EN_COURS" ? "intervention en cours" : "fonctionne mal"} · signalé {fDT(s.createdAt)}</span>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
