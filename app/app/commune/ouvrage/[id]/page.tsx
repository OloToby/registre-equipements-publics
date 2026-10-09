// Fiche ouvrage détaillée — vue commune
// Source : Deck 3 slide 12 (c-fiche), programme p. 36
// Conception auteur : photo, composants avec barre d'âge, historique interventions

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import QrPlatePrint from "./QrPlatePrint";

type Props = { params: { id: string } };

const ETAT_LABELS: Record<string, { label: string; cls: string }> = {
  BON:          { label: "En service",   cls: "service" },
  ATTENTION:    { label: "Dégradé",      cls: "degrade" },
  HORS_SERVICE: { label: "En panne",     cls: "panne" },
};

const FAMILLE_IMAGES: Record<string, string> = {
  EAU_POTABLE: "/images/eau.jpg",
  ECLAIRAGE:   "/images/lum.jpg",
  SPORT:       "/images/spo.jpg",
  ARTISANAT:   "/images/art.jpg",
  EDUCATION:   "/images/eco.jpg",
};

const HIST_KIND: Record<string, string> = {
  CORRECTIF:  "c",
  PREVENTIF:  "p",
  REMPLACEMENT: "r",
  MISE_EN_SERVICE: "m",
};

const fD  = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const fDT = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default async function FicheOuvrageDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(`/login?redirect=/commune/ouvrage/${params.id}`);
  if (!["RESPONSABLE_COMMUNAL", "ADMIN", "AGENCE_POLE"].includes(session.role)) redirect("/");

  const ouvrage = await prisma.ouvrage.findUnique({
    where: { id: params.id },
    include: {
      commune: true,
      arrondissement: true,
      typeOuvrage: { include: { composantsType: true, pannesTypiques: true } },
      composants: { include: { composantType: true } },
      contrats: true,
      tachesPreventives: { orderBy: { echeanceAt: "asc" }, take: 10 },
      interventions: {
        include: { preuve: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      signalements: {
        where: { statut: { notIn: ["CLOS"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!ouvrage) notFound();

  const ficheUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/ouvrage/${ouvrage.code}`;
  const etatInfo = ETAT_LABELS[ouvrage.etat] ?? { label: ouvrage.etat, cls: "neutral" };
  const imageUrl = FAMILLE_IMAGES[ouvrage.typeOuvrage.famille] ?? null;

  const nf = (n: number, d = 0) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="desk">

      {/* En-tête */}
      <div className="dhead">
        <div>
          <span className="lbl">
            <Link href="/commune/ouvrages" style={{ color: "var(--blue)" }}>← Registre</Link>
            {" · "}{ouvrage.typeOuvrage.nom}
          </span>
          <h1>{ouvrage.nom}</h1>
          <div className="muted">{ouvrage.code} · {ouvrage.commune.nom}{ouvrage.arrondissement ? " · " + ouvrage.arrondissement.nom : ""}</div>
        </div>
        <span className={`pill ${etatInfo.cls}`}><i />{etatInfo.label}</span>
      </div>

      <div className="cols c3">

        {/* Colonne gauche : photo + fiche */}
        <div className="sec">
          {imageUrl ? (
            <Image src={imageUrl} alt={ouvrage.typeOuvrage.nom} width={600} height={375}
                   className="ph" style={{ aspectRatio: "16/10" }} />
          ) : (
            <div className="ph" style={{ background: "var(--sky)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>🏗️</div>
          )}

          <dl className="facts card">
            {ouvrage.populationDesservie && (
              <div>
                <dt>Population desservie</dt>
                <dd>{ouvrage.populationDesservie.toLocaleString("fr-FR")} hab.</dd>
              </div>
            )}
            {ouvrage.dateMiseEnService && (
              <div>
                <dt>Mise en service</dt>
                <dd>{new Date(ouvrage.dateMiseEnService).getFullYear()}</dd>
              </div>
            )}
            <div>
              <dt>Phase</dt>
              <dd>{ouvrage.phase}</dd>
            </div>
            {ouvrage.contrats[0] && (
              <div style={{ gridColumn: "1 / -1" }}>
                <dt>Contrat d&apos;entretien</dt>
                <dd>{ouvrage.contrats[0].operateur} · jusqu&apos;au {fD(new Date(ouvrage.contrats[0].fin))}</dd>
              </div>
            )}
            <div style={{ gridColumn: "1 / -1" }}>
              <dt>Signalements actifs</dt>
              <dd>{ouvrage.signalements.length > 0
                ? ouvrage.signalements.map((s) => `${s.panneLibelle} · ${s.statut}`).join(", ")
                : "Aucun"}</dd>
            </div>
          </dl>

          {/* QR plate */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span className="lbl">Plaque QR — programme p. 36</span>
            <QrPlatePrint ouvrageCode={ouvrage.code} ouvrageNom={ouvrage.nom} ficheUrl={ficheUrl} />
          </div>

          <p className="muted" style={{ fontSize: "11px" }}>Image : photo type de l&apos;ouvrage · Données fictives</p>
        </div>

        {/* Colonne droite : composants + historique */}
        <div className="sec">

          {/* Composants avec barre d'âge */}
          <h2>Pièces suivies</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Composant</th>
                  <th>Âge / durée de vie</th>
                  <th>Fin prévue</th>
                </tr>
              </thead>
              <tbody>
                {ouvrage.composants.length === 0 ? (
                  <tr><td colSpan={3} style={{ color: "var(--muted)", textAlign: "center" }}>Aucune pièce enregistrée</td></tr>
                ) : ouvrage.composants.map((c) => {
                  const ageAns = c.datePose
                    ? (Date.now() - new Date(c.datePose).getTime()) / (365.25 * 86400000)
                    : 0;
                  const ratio = Math.min(ageAns / c.composantType.dureeVieAns, 1);
                  const finAn = c.datePose
                    ? new Date(c.datePose).getFullYear() + c.composantType.dureeVieAns
                    : null;
                  const cls = ratio >= 1 ? "b" : ratio >= 0.9 ? "w" : "";
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>{c.composantType.nom}</div>
                        {c.numeroDeSerie && <div style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "monospace" }}>{c.numeroDeSerie}</div>}
                      </td>
                      <td>
                        <div className="agebar">
                          <span style={{ fontSize: "12px", color: "var(--muted)", minWidth: "28px" }}>{nf(ageAns, 1)} a</span>
                          <div className="tr"><div className={`fi ${cls}`} style={{ width: `${ratio * 100}%` }} /></div>
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>{c.composantType.dureeVieAns} a</span>
                        </div>
                      </td>
                      <td style={{ color: cls === "b" ? "var(--bad)" : cls === "w" ? "var(--warn)" : "var(--muted)" }}>
                        {finAn ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Historique interventions */}
          <h2>Historique</h2>
          <div className="card">
            {ouvrage.interventions.length === 0 ? (
              <p className="muted" style={{ padding: "12px 0", fontSize: "13px" }}>Aucune intervention enregistrée</p>
            ) : (
              <ul className="hist">
                {ouvrage.interventions.map((i) => {
                  const kind = HIST_KIND[i.type] ?? "c";
                  const label = i.type === "CORRECTIF" ? "Correctif" : i.type === "PREVENTIF" ? "Préventif" : i.type === "REMPLACEMENT" ? "Remplacement" : i.type;
                  const cout = (i.coutMO ?? 0) + (i.coutPieces ?? 0);
                  return (
                    <li key={i.id}>
                      <time>{fDT(new Date(i.createdAt))}</time>
                      <span className={`kind ${kind}`}>{label[0].toUpperCase()}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>{label}</div>
                        {cout > 0 && (
                          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                            {cout.toLocaleString("fr-FR")} FCFA
                          </div>
                        )}
                        {i.preuve && (
                          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                            photos
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

        </div>
      </div>

      <p className="foot" style={{ textAlign: "center" }}>Prototype. Données, noms de lieux et montants fictifs — conception auteur</p>
    </div>
  );
}
