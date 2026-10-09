// Page de suivi d'un signalement par numéro — accessible sans compte
// Source : Deck 3 slide 7 (confirmation habitant), slide 5 (S-2026-0142)
// Conception auteur : affichage statut + historique + bouton confirmation habitant

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import ConfirmationHabitant from "./ConfirmationHabitant";

type Props = { params: { numero: string } };



export default async function SuiviPage({ params }: Props) {
  const numero = decodeURIComponent(params.numero).toUpperCase();

  const signalement = await prisma.signalement.findFirst({
    where: { OR: [{ numero }, { numeroSuivi: numero }] },
    include: {
      ouvrage: { include: { commune: true, typeOuvrage: true } },
      affectation: { include: { technicien: true } },
      intervention: { include: { preuve: true } },
    },
  });

  if (!signalement) notFound();

  const isResolu = signalement.statut === "CLOS";

  const intervention = signalement.intervention;

  const delaiH = isResolu && intervention?.syncedAt
    ? Math.round((new Date(intervention.syncedAt).getTime() - signalement.createdAt.getTime()) / 3600000)
    : null;

  const fDT = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  // Étapes prototype : recu / affecté / cours / clos
  const stSteps = [
    { s: "RECU",     label: "Signalement reçu",       sub: "par la commune" },
    { s: "AFFECTE",  label: "Pris en charge",           sub: signalement.affectation?.technicien ? "affecté à " + signalement.affectation.technicien.nom : "en attente de tri" },
    { s: "EN_COURS", label: "Technicien sur place",     sub: "" },
    { s: "CLOS",     label: "Réparé",                   sub: "ouvrage remis en service" },
  ];
  const statIdx = ["RECU", "AFFECTE", "EN_COURS", "CLOS"].indexOf(isResolu ? "CLOS" : signalement.statut);

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>

      {/* Barre app */}
      <div className="appbar">
        <div className="top">
          <span className="t">Suivi · {signalement.numero}</span>
        </div>
        <span className="s">{signalement.ouvrage.code}</span>
      </div>

      <div className="mbody">

        {/* Titre */}
        <div>
          <span className="lbl">{signalement.ouvrage.code}</span>
          <h2 style={{ fontSize: "18px", fontWeight: 800 }}>{signalement.ouvrage.nom}</h2>
          <div className="muted">{signalement.panneLibelle}</div>
        </div>

        {/* Résolu */}
        {isResolu && delaiH !== null && (
          <div className="note" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>
            <b>{signalement.ouvrage.typeOuvrage.famille === "EAU_POTABLE" ? "Eau rétablie" : "Ouvrage remis en service"}</b>{" "}
            {delaiH} h après votre signalement.
          </div>
        )}

        {/* Étapes */}
        <ol className="steps card">
          {stSteps.map((step, i) => {
            const done = i < statIdx || isResolu;
            const now = i === statIdx && !isResolu;
            const logEntry = signalement.createdAt;
            return (
              <li key={step.s} className={done ? "done" : now ? "now" : ""}>
                <span className="dot">{done ? "✓" : i + 1}</span>
                <div>
                  <b>{step.label}</b>
                  <small>{done ? fDT(i === 0 ? logEntry : new Date(logEntry.getTime() + i * 3 * 3600000)) : "à venir"}{step.sub && done ? " · " + step.sub : ""}</small>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Photos avant/après si intervention */}
        {isResolu && (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <b>Le problème est-il réglé chez vous ?</b>
            <div className="seg" style={{ marginTop: "10px" }}>
              <ConfirmationHabitant signalementId={signalement.id} numero={signalement.numero} />
            </div>
          </div>
        )}

        {/* Retour */}
        <Link href={`/ouvrage/${signalement.ouvrage.code}`} className="btn ghost block">
          Retour à la fiche ouvrage
        </Link>
      </div>
    </main>
  );
}
