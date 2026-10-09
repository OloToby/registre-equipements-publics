// Fiche publique de l'ouvrage — accessible via QR code, sans compte
// Source : programme p. 36 (identité QR), Deck 3 slide 7 (parcours habitant)

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";

type Props = { params: { code: string } };

const ETAT_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  BON:          { label: "En service",     bg: "var(--ok-bg)",   color: "var(--ok)" },
  ATTENTION:    { label: "Att. requise",   bg: "var(--warn-bg)", color: "var(--warn)" },
  HORS_SERVICE: { label: "Hors service",   bg: "var(--bad-bg)",  color: "var(--bad)" },
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

  const etatInfo = ETAT_LABELS[ouvrage.etat] ?? { label: ouvrage.etat, bg: "var(--soft)", color: "var(--muted)" };
  const imageUrl = FAMILLE_IMAGES[ouvrage.typeOuvrage.famille] ?? null;
  const signaleInProgress = ouvrage.signalements.length > 0;

  return (
    <main className="max-w-lg mx-auto px-4 pb-10 space-y-5">

      {/* Photo en-tête avec titre en overlay */}
      <div className="relative -mx-4 sm:mx-0 sm:rounded-2xl overflow-hidden" style={{ marginTop: -1 }}>
        {imageUrl ? (
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <Image
              src={imageUrl}
              alt={ouvrage.typeOuvrage.nom}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 520px) 100vw, 520px"
            />
          </div>
        ) : (
          <div className="w-full flex items-center justify-center text-6xl" style={{ aspectRatio: "16/9", background: "var(--sky)" }}>
            🏗️
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(27,35,65,.82) 0%, rgba(27,35,65,.18) 55%, transparent 100%)" }} />
        {/* Titre */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <p className="font-mono text-xs opacity-70 mb-0.5">{ouvrage.code}</p>
          <h1 className="text-xl font-black leading-tight text-balance">{ouvrage.nom}</h1>
          <p className="text-sm opacity-75 mt-1">
            {ouvrage.arrondissement?.nom ?? ouvrage.commune.nom} · {ouvrage.commune.nom}
          </p>
        </div>
        {/* Badge état */}
        <div className="absolute top-4 right-4">
          <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: etatInfo.bg, color: etatInfo.color }}>
            {etatInfo.label}
          </span>
        </div>
      </div>

      {/* Informations */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {ouvrage.populationDesservie && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Dessert</dt>
              <dd className="font-semibold mt-0.5">{ouvrage.populationDesservie.toLocaleString("fr-FR")} pers.</dd>
            </div>
          )}
          {ouvrage.dateMiseEnService && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>En service depuis</dt>
              <dd className="font-semibold mt-0.5">
                {new Date(ouvrage.dateMiseEnService).toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
              </dd>
            </div>
          )}
          <div style={{ gridColumn: "1 / -1" }}>
            <dt className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Entretenu par</dt>
            <dd className="font-semibold mt-0.5">{ouvrage.typeOuvrage.nom}</dd>
          </div>
          {signaleInProgress && (
            <div style={{ gridColumn: "1 / -1" }}>
              <dt className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Signalement en cours</dt>
              <dd className="mt-0.5 space-y-1">
                {ouvrage.signalements.map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--warn)" }}>{s.panneLibelle}</span>
                    <Link href={`/suivi/${s.numero}`} className="text-xs font-bold underline" style={{ color: "var(--blue)" }}>Suivre</Link>
                  </div>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Alerte composant */}
      {ouvrage.composants.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--warn-bg)", border: "1px solid #E0C570" }}>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--warn)" }}>⚠️ Composant en alerte</p>
          {ouvrage.composants.map((c) => (
            <p key={c.id} className="text-sm" style={{ color: "var(--warn)" }}>
              {c.composantType.nom}{c.numeroDeSerie ? ` — N° ${c.numeroDeSerie}` : ""}
            </p>
          ))}
        </div>
      )}

      {/* Bouton principal */}
      <Link
        href={`/signaler/${ouvrage.code}`}
        className="flex items-center justify-center gap-2 w-full font-bold py-4 rounded-2xl transition-opacity hover:opacity-90 text-white text-base"
        style={{ background: "var(--navy)" }}
      >
        📢 Signaler un problème
      </Link>

      {/* Pannes typiques */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
          Problèmes fréquents
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ouvrage.typeOuvrage.pannesTypiques.map((p) => (
            <Link
              key={p.id}
              href={`/signaler/${ouvrage.code}?panne=${p.code}`}
              className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all hover:opacity-90"
              style={{ border: "1px solid var(--line)", background: "var(--soft)", color: "var(--ink)" }}
            >
              <span>{p.pictogramme ?? "⚠️"}</span>
              <span>{p.libelle}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Suivre un signalement */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
          Suivre un signalement existant
        </p>
        <SuiviForm />
      </div>

      {/* SMS info */}
      <div className="flex items-start gap-3 rounded-xl p-4 text-sm" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
        <span className="text-lg shrink-0">💬</span>
        <p style={{ color: "var(--muted)" }}>
          Pas de smartphone ? Envoyez <strong style={{ color: "var(--ink)" }}>{ouvrage.code}</strong> par SMS au numéro gravé sous le QR code, ou appelez la mairie.
        </p>
      </div>

      <p className="text-center text-xs pb-4" style={{ color: "var(--muted)" }}>
        Données fictives à des fins de démonstration
      </p>
    </main>
  );
}

function SuiviForm() {
  return (
    <form action="/suivi" method="get" className="flex gap-2">
      <input
        name="numero"
        type="text"
        placeholder="S-2026-0142"
        className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
        style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
      />
      <button
        type="submit"
        className="text-sm px-4 py-2 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--navy)" }}
      >
        Voir
      </button>
    </form>
  );
}
