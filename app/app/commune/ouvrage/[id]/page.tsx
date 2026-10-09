// Fiche ouvrage détaillée — vue commune (avec modèle 3D, photo, composants)
// Source : programme p. 36 (identité numérique), Deck 2 slide 8 (jumeau numérique)

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ModelViewer3D from "./ModelViewer3D";
import QrPlatePrint from "./QrPlatePrint";

type Props = { params: { id: string } };

const ETAT: Record<string, { label: string; bg: string; color: string }> = {
  BON:          { label: "En service",  bg: "var(--ok-bg)",   color: "var(--ok)" },
  ATTENTION:    { label: "Attention",   bg: "var(--warn-bg)", color: "var(--warn)" },
  HORS_SERVICE: { label: "Hors service",bg: "var(--bad-bg)",  color: "var(--bad)" },
};

const FAMILLE_IMAGES: Record<string, string> = {
  EAU_POTABLE: "/images/eau.jpg",
  ECLAIRAGE:   "/images/lum.jpg",
  SPORT:       "/images/spo.jpg",
  ARTISANAT:   "/images/art.jpg",
  EDUCATION:   "/images/eco.jpg",
};

export default async function FicheOuvrageDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(`/login?redirect=/commune/ouvrage/${params.id}`);

  const ouvrage = await prisma.ouvrage.findUnique({
    where: { id: params.id },
    include: {
      commune: true,
      arrondissement: true,
      typeOuvrage: { include: { composantsType: true } },
      composants: { include: { composantType: true } },
      contrats: true,
      tachesPreventives: { orderBy: { echeanceAt: "asc" }, take: 10 },
      interventions: {
        include: { preuve: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      signalements: {
        where: { statut: { notIn: ["CLOS"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!ouvrage) notFound();

  const glbFile = ouvrage.typeOuvrage.modele3dFichier;
  const ficheUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/ouvrage/${ouvrage.code}`;
  const etatInfo = ETAT[ouvrage.etat] ?? { label: ouvrage.etat, bg: "var(--soft)", color: "var(--muted)" };
  const imageUrl = FAMILLE_IMAGES[ouvrage.typeOuvrage.famille] ?? null;

  return (
    <main className="max-w-2xl mx-auto px-4 pb-12 space-y-5">

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-2 pt-4 text-sm">
        <Link href="/commune" className="font-semibold hover:underline" style={{ color: "var(--blue)" }}>← Tableau de bord</Link>
        <span style={{ color: "var(--line)" }}>·</span>
        <h1 className="font-bold truncate" style={{ color: "var(--ink)" }}>{ouvrage.nom}</h1>
      </div>

      {/* Photo + info en 2 colonnes (comme cFiche du prototype) */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {/* Photo */}
          <div className="relative" style={{ aspectRatio: "16/11", minHeight: 180 }}>
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={ouvrage.typeOuvrage.nom}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 340px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: "var(--sky)" }}>🏗️</div>
            )}
          </div>
          {/* Infos */}
          <div className="p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>{ouvrage.code}</p>
                <p className="font-bold text-base leading-tight mt-0.5" style={{ color: "var(--ink)" }}>{ouvrage.nom}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {ouvrage.commune.nom}{ouvrage.arrondissement ? ` · ${ouvrage.arrondissement.nom}` : ""}
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: etatInfo.bg, color: etatInfo.color }}>
                {etatInfo.label}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              {ouvrage.populationDesservie && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Population</dt>
                  <dd className="font-semibold">{ouvrage.populationDesservie.toLocaleString("fr-FR")}</dd>
                </div>
              )}
              {ouvrage.dateMiseEnService && (
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Mise en service</dt>
                  <dd className="font-semibold">{new Date(ouvrage.dateMiseEnService).getFullYear()}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Phase</dt>
                <dd className="font-semibold">{ouvrage.phase}</dd>
              </div>
            </dl>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Image : photo type de l&apos;ouvrage · Données fictives
            </p>
          </div>
        </div>
      </div>

      {/* Jumeau numérique 3D */}
      {glbFile && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <div className="flex items-center gap-2 mb-3">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Jumeau numérique</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--lilac)", color: "var(--navy)" }}>3D</span>
          </div>
          <ModelViewer3D glbPath={`/models/${glbFile}`} alt={ouvrage.nom} />
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Modèle 3D fictif — conception auteur</p>
        </div>
      )}

      {/* Composants */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Pièces suivies</p>
        <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--line)" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--soft)" }}>
                <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Composant</th>
                <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Posé le</th>
                <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>État</th>
              </tr>
            </thead>
            <tbody>
              {ouvrage.composants.map((c, i) => (
                <tr key={c.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                  <td className="px-3 py-2.5">
                    <p className="font-semibold" style={{ color: "var(--ink)" }}>{c.composantType.nom}</p>
                    {c.numeroDeSerie && <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>{c.numeroDeSerie}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-sm" style={{ color: "var(--muted)", whiteSpace: "nowrap" }}>
                    {c.datePose ? new Date(c.datePose).toLocaleDateString("fr-FR") : "—"}
                    {c.datePose && <div className="text-xs">→ ~{new Date(c.datePose).getFullYear() + c.composantType.dureeVieAns}</div>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: c.enAlerte ? "var(--warn-bg)" : "var(--ok-bg)",
                            color: c.enAlerte ? "var(--warn)" : "var(--ok)",
                          }}>
                      {c.enAlerte ? "⚠️ Alerte" : c.etat}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contrat d'entretien */}
      {ouvrage.contrats.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Contrat d&apos;entretien</p>
          {ouvrage.contrats.map((c) => (
            <div key={c.id} className="text-sm space-y-0.5">
              <p className="font-bold" style={{ color: "var(--ink)" }}>{c.operateur}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {new Date(c.debut).toLocaleDateString("fr-FR")} → {new Date(c.fin).toLocaleDateString("fr-FR")}
              </p>
              {c.montantAnnuel && (
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {c.montantAnnuel.toLocaleString("fr-FR")} FCFA / an
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* QR plate */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>Plaque QR — programme p. 36</p>
        <QrPlatePrint ouvrageCode={ouvrage.code} ouvrageNom={ouvrage.nom} ficheUrl={ficheUrl} />
      </div>

      {/* Historique interventions */}
      {ouvrage.interventions.length > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
            Historique interventions ({ouvrage.interventions.length})
          </p>
          <div className="space-y-2">
            {ouvrage.interventions.map((i, idx) => (
              <div key={i.id} className="flex items-center justify-between text-sm py-2"
                   style={{ borderTop: idx > 0 ? "1px solid var(--line)" : "none" }}>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded text-xs font-black flex items-center justify-center text-white"
                        style={{ background: i.statut === "CLOS" ? "var(--ok)" : "var(--blue)" }}>
                    {i.statut === "CLOS" ? "R" : "!"}
                  </span>
                  <div>
                    <span className="font-mono text-xs" style={{ color: "var(--muted)" }}>{i.type}</span>
                    {i.doneAt && (
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {new Date(i.doneAt).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>
                {(i.coutMO || i.coutPieces) && (
                  <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    {((i.coutMO ?? 0) + (i.coutPieces ?? 0)).toLocaleString("fr-FR")} FCFA
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
