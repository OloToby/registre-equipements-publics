// Fiche publique de l'ouvrage — accessible via QR code, sans compte
// Source : programme p. 36 (identité QR), Deck 3 slide 7 (parcours habitant)

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";

type Props = { params: { code: string } };

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

export default async function FicheOuvragePage({ params }: Props) {
  const code = decodeURIComponent(params.code).toUpperCase();

  const ouvrage = await prisma.ouvrage.findUnique({
    where: { code },
    include: {
      commune: true,
      arrondissement: true,
      typeOuvrage: {
        include: { pannesTypiques: { orderBy: { gravite: "desc" } } },
      },
      signalements: {
        where: { statut: { notIn: ["CLOS"] } },
        orderBy: { createdAt: "desc" },
        take: 3,
      },
      composants: {
        include: { composantType: true },
        where: { enAlerte: true },
      },
    },
  });

  if (!ouvrage) notFound();

  const etatInfo = ETAT_LABELS[ouvrage.etat] ?? { label: ouvrage.etat, cls: "neutral" };
  const imageUrl = FAMILLE_IMAGES[ouvrage.typeOuvrage.famille] ?? null;

  const derniereIntervention = ouvrage.signalements
    .filter((s) => s.statut === "CLOS")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  const fD = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>

      {/* Barre app */}
      <div className="appbar">
        <div className="top">
          <span className="t">Registre des ouvrages</span>
          <span className="net">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>
          </span>
        </div>
        <span className="s">Plaque {ouvrage.code} · {ouvrage.commune.nom}</span>
      </div>

      {/* Contenu */}
      <div className="mbody">
        {/* Photo */}
        {imageUrl ? (
          <div style={{ position: "relative" }}>
            <Image src={imageUrl} alt={ouvrage.typeOuvrage.nom} width={400} height={250} className="ph" style={{ aspectRatio: "16/10" }} />
          </div>
        ) : (
          <div className="ph" style={{ background: "var(--sky)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem" }}>🏗️</div>
        )}

        {/* Titre */}
        <div>
          <span className="lbl">{ouvrage.typeOuvrage.nom} · {ouvrage.code}</span>
          <h2 style={{ fontSize: "20px", fontWeight: 800, marginTop: "2px" }}>{ouvrage.nom}</h2>
        </div>

        {/* État + dessert */}
        <div className="row">
          <span className={`pill ${etatInfo.cls}`}><i />{etatInfo.label}</span>
          <span className="muted">Dessert {ouvrage.populationDesservie ? `≈ ${ouvrage.populationDesservie.toLocaleString("fr-FR")} habitants` : ouvrage.commune.nom}</span>
        </div>

        {/* Fiche info */}
        <dl className="facts card">
          {ouvrage.dateMiseEnService && (
            <div>
              <dt>En service depuis</dt>
              <dd>{new Date(ouvrage.dateMiseEnService).getFullYear()}</dd>
            </div>
          )}
          {derniereIntervention && (
            <div>
              <dt>Dernier entretien</dt>
              <dd>{fD(derniereIntervention.createdAt)}</dd>
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <dt>Entretenu par</dt>
            <dd>{ouvrage.typeOuvrage.nom}</dd>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <dt>Signalement en cours</dt>
            <dd>
              {ouvrage.signalements.length > 0
                ? ouvrage.signalements.map((s) => `${s.panneLibelle} · ${s.statut === "AFFECTE" ? "affecté" : s.statut === "EN_COURS" ? "intervention en cours" : "reçu"}`).join(", ")
                : "Aucun"}
            </dd>
          </div>
        </dl>

        {/* CTA */}
        <Link href={`/signaler/${ouvrage.code}`} className="btn gold block">
          Signaler un problème
        </Link>
        <Link href="/suivi" className="btn ghost block">
          Suivre mon signalement
        </Link>

        {/* SMS */}
        <div className="note">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: "middle", marginRight: "6px" }}><path d="M4 5h16v11H9l-5 4z"/></svg>
          Pas de smartphone ? Envoyez <b>{ouvrage.code}</b> par SMS au numéro gravé sous le QR code, ou appelez la mairie.
        </div>
      </div>
    </main>
  );
}
