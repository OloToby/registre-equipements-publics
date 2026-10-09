// Formulaire d'intervention terrain — technicien
// Source : Deck 3 slides 9-10 (t-int), programme p. 38
// Conception auteur : appbar + mbody, checklist, photos, double horodatage, sync hors-ligne

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import InterventionForm from "./InterventionForm";

type Props = { params: { id: string } };

export default async function InterventionPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(`/login?redirect=/technicien/intervention/${params.id}`);

  const signalement = await prisma.signalement.findUnique({
    where: { id: params.id },
    include: {
      ouvrage: {
        include: {
          commune: true,
          typeOuvrage: {
            include: {
              checklistItems: {
                where: {
                  OR: [{ typeIntervention: "CORRECTIF" }, { typeIntervention: "TOUS" }],
                },
                orderBy: { ordre: "asc" },
              },
              pannesTypiques: true,
            },
          },
          composants: { include: { composantType: true } },
        },
      },
    },
  });

  if (!signalement) notFound();

  const checklistItems = signalement.ouvrage.typeOuvrage.checklistItems.map((item) => ({
    id: item.id,
    label: item.label,
    obligatoire: item.obligatoire,
    bloqueCloture: item.bloqueCloture,
    typeIntervention: item.typeIntervention,
  }));

  const slaH = signalement.priorite === "P1" ? 48 : signalement.priorite === "P2" ? 120 : 360;
  const leftH = Math.max(0, Math.round(slaH - (Date.now() - signalement.createdAt.getTime()) / 3600000));

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>

      {/* Barre app */}
      <div className="appbar">
        <div className="top">
          <Link href="/technicien" className="t" style={{ fontSize: "14px", fontWeight: 600, color: "var(--blue)" }}>
            ← Interventions
          </Link>
          {signalement.priorite && (
            <span className={`prio ${signalement.priorite}`}>{signalement.priorite}</span>
          )}
        </div>
        <span className="s">{signalement.ouvrage.nom} · {signalement.numero}</span>
      </div>

      <div className="mbody">
        {/* Infos signalement */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--ink)" }}>{signalement.panneLibelle}</div>
          <div className="muted" style={{ marginTop: "4px" }}>
            {signalement.ouvrage.commune.nom}
            {signalement.priorite && leftH < 24 && (
              <span style={{ color: "var(--bad)", fontWeight: 700, marginLeft: "8px" }}>reste {leftH} h</span>
            )}
          </div>
          {signalement.description && (
            <div style={{ marginTop: "8px", fontSize: "13px", color: "var(--ink)" }}>{signalement.description}</div>
          )}
        </div>

        <InterventionForm
          signalementId={signalement.id}
          ouvrageId={signalement.ouvrageId}
          checklistItems={checklistItems}
          technicienId={session.id}
        />
      </div>
    </main>
  );
}
