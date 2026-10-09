// Fiche publique de l'ouvrage — accessible via QR code, sans compte
// Source : programme p. 36 (identité QR), Deck 3 slide 7 (parcours habitant)
// Conception auteur : affichage état + bouton signaler + liste pannes typiques

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

type Props = { params: { code: string } };

const ETAT_LABELS: Record<string, { label: string; color: string }> = {
  BON:          { label: "En service", color: "bg-green-100 text-green-800" },
  ATTENTION:    { label: "Attention requise", color: "bg-amber-100 text-amber-800" },
  HORS_SERVICE: { label: "Hors service", color: "bg-red-100 text-red-800" },
};

const FAMILLE_ICONS: Record<string, string> = {
  EAU_POTABLE: "💧",
  ECLAIRAGE:   "💡",
  SPORT:       "⚽",
  ARTISANAT:   "🏺",
  EDUCATION:   "🏫",
};

export default async function FicheOuvragePage({ params }: Props) {
  const code = decodeURIComponent(params.code).toUpperCase();

  const ouvrage = await prisma.ouvrage.findUnique({
    where: { code },
    include: {
      commune: true,
      arrondissement: true,
      typeOuvrage: {
        include: {
          pannesTypiques: { orderBy: { gravite: "desc" } },
        },
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

  const etatInfo = ETAT_LABELS[ouvrage.etat] ?? { label: ouvrage.etat, color: "bg-gray-100 text-gray-700" };
  const icone = FAMILLE_ICONS[ouvrage.typeOuvrage.famille] ?? "🏗️";
  const signaleInProgress = ouvrage.signalements.length > 0;

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* En-tête */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start gap-3">
          <span className="text-4xl">{icone}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{ouvrage.nom}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {ouvrage.arrondissement?.nom ?? ouvrage.commune.nom} · {ouvrage.commune.nom}
            </p>
            <p className="text-xs text-gray-400 mt-1 font-mono">{ouvrage.code}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${etatInfo.color}`}>
            {etatInfo.label}
          </span>
        </div>

        {ouvrage.populationDesservie && (
          <p className="mt-3 text-sm text-gray-600">
            👥 Dessert environ <strong>{ouvrage.populationDesservie.toLocaleString("fr-FR")}</strong> personnes
          </p>
        )}

        {ouvrage.dateMiseEnService && (
          <p className="text-sm text-gray-500 mt-1">
            🗓️ En service depuis{" "}
            {new Date(ouvrage.dateMiseEnService).toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
          </p>
        )}
      </div>

      {/* Alerte composant dégradé */}
      {ouvrage.composants.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Composant en alerte</p>
          {ouvrage.composants.map((c) => (
            <p key={c.id} className="text-sm text-amber-700">
              {c.composantType.nom}
              {c.numeroDeSerie ? ` — N° ${c.numeroDeSerie}` : ""}
            </p>
          ))}
        </div>
      )}

      {/* Signalements en cours */}
      {signaleInProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">
            🔧 {ouvrage.signalements.length} signalement{ouvrage.signalements.length > 1 ? "s" : ""} en cours de traitement
          </p>
          {ouvrage.signalements.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-blue-700">{s.panneLibelle}</span>
              <Link
                href={`/suivi/${s.numero}`}
                className="text-blue-600 font-medium underline ml-2"
              >
                Suivre
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Bouton principal : signaler */}
      <Link
        href={`/signaler/${ouvrage.code}`}
        className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-center py-4 rounded-2xl shadow-sm transition-colors"
      >
        📢 Signaler un problème
      </Link>

      {/* Pannes typiques pour aider le signalement */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Problèmes fréquents sur ce type d'équipement</h2>
        <div className="grid grid-cols-2 gap-2">
          {ouvrage.typeOuvrage.pannesTypiques.map((p) => (
            <Link
              key={p.id}
              href={`/signaler/${ouvrage.code}?panne=${p.code}`}
              className="flex items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors text-sm"
            >
              <span>{p.pictogramme ?? "⚠️"}</span>
              <span className="text-gray-700">{p.libelle}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Suivre un signalement existant */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Suivre un signalement existant</h2>
        <SuiviForm />
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        Données fictives à des fins de démonstration — conception auteur
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
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="bg-gray-800 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
      >
        Voir
      </button>
    </form>
  );
}
