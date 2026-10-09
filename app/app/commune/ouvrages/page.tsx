// Liste des ouvrages de la commune — registre
// Source : Deck 3 slide 12 (c-list), programme p. 39
// Conception auteur : tableau filtrable par type, état, arrondissement

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import OuvragesTable from "./OuvragesTable";

export default async function OuvragesPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/commune/ouvrages");
  if (!["RESPONSABLE_COMMUNAL", "ADMIN", "AGENCE_POLE"].includes(session.role)) redirect("/");

  const communeId = session.communeId ?? (
    await prisma.commune.findFirst({ where: { code: "COM-A" } })
  )?.id;
  if (!communeId) redirect("/commune");

  const commune = await prisma.commune.findUnique({
    where: { id: communeId },
    select: { nom: true },
  });

  const KNOWN = 38;

  const ouvrages = await prisma.ouvrage.findMany({
    where: { communeId },
    include: {
      typeOuvrage: { select: { nom: true, famille: true } },
      arrondissement: { select: { nom: true } },
      tachesPreventives: { select: { echeanceAt: true, faiteAt: true } },
      composants: {
        include: { composantType: { select: { dureeVieAns: true } } },
      },
    },
    orderBy: { code: "asc" },
  });

  return (
    <div className="desk">

      {/* En-tête */}
      <div className="dhead">
        <div>
          <span className="lbl">{commune?.nom ?? "Commune"} · services techniques</span>
          <h1>Registre des ouvrages</h1>
          <div className="muted">{ouvrages.length} ouvrages inscrits sur {KNOWN} connus</div>
        </div>
        <div className="row">
          <span className="muted" style={{ fontSize: "12px" }}>
            Mis à jour {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <nav className="tabs" role="tablist">
        <Link href="/commune" role="tab" aria-selected="false">Tableau de bord</Link>
        <Link href="/commune/ouvrages" role="tab" aria-selected="true">Registre des ouvrages</Link>
        <Link href="/commune/carte" role="tab" aria-selected="false">Carte</Link>
      </nav>

      {/* Tableau filtrable (client component) */}
      <OuvragesTable ouvrages={ouvrages} />

      <p className="foot" style={{ textAlign: "center" }}>Prototype. Données, noms de lieux et montants fictifs — conception auteur</p>
    </div>
  );
}
