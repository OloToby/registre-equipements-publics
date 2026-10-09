// Fiche signalement commune — triage, affectation, suivi
// Source : Deck 3 slide 11 (c-ticket), programme p. 39
// Conception auteur : détail signalement + formulaire de triage

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import TriageForm from "./TriageForm";

type Props = { params: { id: string } };

const STATUT_LABELS: Record<string, { label: string; cls: string }> = {
  RECU:     { label: "Nouveau",      cls: "panne" },
  TRIAGE:   { label: "En triage",    cls: "neutral" },
  AFFECTE:  { label: "Affecté",      cls: "degrade" },
  EN_COURS: { label: "En cours",     cls: "degrade" },
  CLOS:     { label: "Résolu",       cls: "service" },
  ROUVERT:  { label: "Rouvert",      cls: "panne" },
};

const CANAL_LABELS: Record<string, string> = {
  QR: "QR code", SMS: "SMS", APPEL: "Appel", AGENT: "Agent",
};

const fDT = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function SignalementCommunePage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(`/login?redirect=/commune/signalement/${params.id}`);
  if (!["RESPONSABLE_COMMUNAL", "ADMIN", "AGENCE_POLE"].includes(session.role)) redirect("/");

  const signalement = await prisma.signalement.findUnique({
    where: { id: params.id },
    include: {
      ouvrage: { include: { commune: true, typeOuvrage: true, arrondissement: true } },
      affectation: { include: { technicien: true } },
      intervention: { include: { preuve: true, checklistItems: true } },
      auditLogs: { orderBy: { createdAt: "asc" }, take: 20 },
    },
  });

  if (!signalement) notFound();

  const communeId = session.communeId ?? (
    await prisma.commune.findFirst({ where: { code: "COM-A" } })
  )?.id;
  if (communeId && signalement.ouvrage.communeId !== communeId && session.role !== "ADMIN") redirect("/commune");

  const techniciens = await prisma.utilisateur.findMany({
    where: { role: { in: ["TECHNICIEN", "RESPONSABLE_COMMUNAL"] }, actif: true, communeId: signalement.ouvrage.communeId },
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });

  const statut = STATUT_LABELS[signalement.statut] ?? { label: signalement.statut, cls: "neutral" };
  const slaH = signalement.priorite === "P1" ? 48 : signalement.priorite === "P2" ? 120 : 360;
  const leftH = slaH - (Date.now() - signalement.createdAt.getTime()) / 3600000;

  return (
    <div className="desk">

      {/* En-tête */}
      <div className="dhead">
        <div>
          <span className="lbl">
            <Link href="/commune" style={{ color: "var(--blue)" }}>← Tableau de bord</Link>
            {" · "}{signalement.numero}
          </span>
          <h1>{signalement.panneLibelle}</h1>
          <div className="muted">{signalement.ouvrage.nom} · {signalement.ouvrage.code}</div>
        </div>
        <div className="row">
          <span className={`pill ${statut.cls}`}><i />{statut.label}</span>
          {signalement.priorite && (
            <span className={`prio ${signalement.priorite}`}>{signalement.priorite}</span>
          )}
        </div>
      </div>

      <div className="cols">

        {/* Colonne gauche : détails du signalement */}
        <div className="sec">

          <h2>Signalement</h2>
          <div className="card">
            <dl className="facts">
              <div>
                <dt>Ouvrage</dt>
                <dd>
                  <Link href={`/commune/ouvrage/${signalement.ouvrage.id}`}
                        style={{ color: "var(--navy)", fontWeight: 700 }}>
                    {signalement.ouvrage.nom}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Code</dt>
                <dd style={{ fontFamily: "monospace" }}>{signalement.ouvrage.code}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{signalement.ouvrage.typeOuvrage.nom}</dd>
              </div>
              {signalement.ouvrage.arrondissement && (
                <div>
                  <dt>Arrondissement</dt>
                  <dd>{signalement.ouvrage.arrondissement.nom}</dd>
                </div>
              )}
              <div>
                <dt>Canal</dt>
                <dd>{CANAL_LABELS[signalement.canal] ?? signalement.canal}</dd>
              </div>
              <div>
                <dt>Signalé le</dt>
                <dd>{fDT(signalement.createdAt)}</dd>
              </div>
              {signalement.priorite && (
                <div>
                  <dt>Délai restant</dt>
                  <dd style={{ color: leftH < 12 ? "var(--bad)" : leftH < 48 ? "var(--warn)" : "var(--ok)", fontWeight: 700 }}>
                    {Math.max(0, Math.round(leftH))} h
                  </dd>
                </div>
              )}
              {signalement.description && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <dt>Description</dt>
                  <dd>{signalement.description}</dd>
                </div>
              )}
              {signalement.telephoneContact && (
                <div>
                  <dt>Contact</dt>
                  <dd style={{ fontFamily: "monospace" }}>{signalement.telephoneContact}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Technicien affecté */}
          {signalement.affectation?.technicien && (
            <div className="note" style={{ background: "var(--sky)", color: "var(--navy)" }}>
              <b>Technicien affecté :</b> {signalement.affectation.technicien.nom}
            </div>
          )}

          {/* Intervention */}
          {signalement.intervention && (
            <>
              <h2>Intervention</h2>
              <div className="card">
                <dl className="facts">
                  <div>
                    <dt>Statut</dt>
                    <dd>{signalement.intervention.statut === "CLOS" ? "Terminée" : "En cours"}</dd>
                  </div>
                  {signalement.intervention.doneAt && (
                    <div>
                      <dt>Réalisée le</dt>
                      <dd>{fDT(new Date(signalement.intervention.doneAt))}</dd>
                    </div>
                  )}
                  {(signalement.intervention.coutMO || signalement.intervention.coutPieces) && (
                    <div>
                      <dt>Coût total</dt>
                      <dd>{((signalement.intervention.coutMO ?? 0) + (signalement.intervention.coutPieces ?? 0)).toLocaleString("fr-FR")} FCFA</dd>
                    </div>
                  )}
                  {signalement.intervention.notes && (
                    <div style={{ gridColumn: "1 / -1" }}>
                      <dt>Notes</dt>
                      <dd>{signalement.intervention.notes}</dd>
                    </div>
                  )}
                </dl>
                {signalement.intervention.preuve && (signalement.intervention.preuve.photoAvantUrl || signalement.intervention.preuve.photoApresUrl) && (
                  <div className="thumbs" style={{ marginTop: "12px" }}>
                    {signalement.intervention.preuve.photoAvantUrl && (
                      <figure>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={signalement.intervention.preuve.photoAvantUrl} alt="Avant" />
                        <figcaption>Avant</figcaption>
                      </figure>
                    )}
                    {signalement.intervention.preuve.photoApresUrl && (
                      <figure>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={signalement.intervention.preuve.photoApresUrl} alt="Après" />
                        <figcaption>Après</figcaption>
                      </figure>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Journal d'audit */}
          {signalement.auditLogs.length > 0 && (
            <>
              <h2>Journal</h2>
              <div className="card">
                <ul className="hist">
                  {signalement.auditLogs.map((log) => (
                    <li key={log.id}>
                      <time>{fDT(new Date(log.createdAt))}</time>
                      <span className="kind c">J</span>
                      <div style={{ color: "var(--ink)" }}>{log.action}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Colonne droite : triage */}
        <div className="sec">
          <h2>Triage</h2>
          <div className="card">
            <TriageForm
              signalementId={signalement.id}
              currentPriorite={signalement.priorite}
              currentStatut={signalement.statut}
              currentTechnicienId={signalement.affectation?.technicienId ?? null}
              techniciens={techniciens}
            />
          </div>

          {/* Lien suivi habitant */}
          <div className="note">
            <b>Lien de suivi habitant :</b>
            <br />
            <span style={{ fontFamily: "monospace", fontSize: "13px" }}>/suivi/{signalement.numero}</span>
          </div>
        </div>
      </div>

      <p className="foot" style={{ textAlign: "center" }}>Prototype. Données, noms de lieux et montants fictifs — conception auteur</p>
    </div>
  );
}
