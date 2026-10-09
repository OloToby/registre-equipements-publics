// Fiche ouvrage détaillée — vue commune (avec modèle 3D et génération QR)
// Source : programme p. 36 (identité numérique), Deck 2 slide 8 (jumeau numérique)
// D-005 (@google/model-viewer), D-006 (qrcode npm)

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ModelViewer3D from "./ModelViewer3D";
import QrPlatePrint from "./QrPlatePrint";

type Props = { params: { id: string } };

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

  const ETAT_LABELS: Record<string, { label: string; color: string }> = {
    BON:          { label: "En service", color: "bg-green-100 text-green-800" },
    ATTENTION:    { label: "Attention", color: "bg-amber-100 text-amber-800" },
    HORS_SERVICE: { label: "Hors service", color: "bg-red-100 text-red-800" },
  };
  const etatInfo = ETAT_LABELS[ouvrage.etat] ?? { label: ouvrage.etat, color: "bg-gray-100 text-gray-600" };

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/commune" className="text-blue-600 text-sm">← Tableau de bord</Link>
        <h1 className="text-xl font-bold text-gray-900 truncate">{ouvrage.nom}</h1>
      </div>

      {/* En-tête */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-mono text-xs text-gray-400">{ouvrage.code}</p>
            <p className="text-sm text-gray-600 mt-0.5">{ouvrage.commune.nom}</p>
            {ouvrage.arrondissement && (
              <p className="text-xs text-gray-400">{ouvrage.arrondissement.nom}</p>
            )}
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${etatInfo.color}`}>
            {etatInfo.label}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 text-sm">
          {ouvrage.populationDesservie && (
            <div><p className="text-xs text-gray-400">Population</p><p className="font-semibold">{ouvrage.populationDesservie.toLocaleString("fr-FR")}</p></div>
          )}
          {ouvrage.dateMiseEnService && (
            <div><p className="text-xs text-gray-400">Mise en service</p><p className="font-semibold">{new Date(ouvrage.dateMiseEnService).getFullYear()}</p></div>
          )}
          <div><p className="text-xs text-gray-400">Phase</p><p className="font-semibold">{ouvrage.phase}</p></div>
        </div>
      </div>

      {/* Modèle 3D — D-005, lazy loaded */}
      {glbFile && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Jumeau numérique — Deck 2 slide 8</h2>
          <ModelViewer3D glbPath={`/models/${glbFile}`} alt={ouvrage.nom} />
          <p className="text-xs text-gray-400 mt-2">Modèle 3D fictif à des fins de démonstration — conception auteur</p>
        </div>
      )}

      {/* Composants */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Composants</h2>
        <div className="space-y-2">
          {ouvrage.composants.map((c) => (
            <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border ${c.enAlerte ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50"}`}>
              <div>
                <p className="text-sm font-medium text-gray-800">{c.composantType.nom}</p>
                {c.numeroDeSerie && <p className="text-xs text-gray-400 font-mono">{c.numeroDeSerie}</p>}
                {c.datePose && (
                  <p className="text-xs text-gray-400">
                    Posé : {new Date(c.datePose).toLocaleDateString("fr-FR")} —
                    Renouvellement ~{new Date(c.datePose).getFullYear() + c.composantType.dureeVieAns}
                  </p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                c.enAlerte ? "bg-amber-100 text-amber-700" :
                c.etat === "BON" ? "bg-green-100 text-green-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {c.enAlerte ? "⚠️ Alerte" : c.etat}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Contrat d'entretien */}
      {ouvrage.contrats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Contrat d'entretien</h2>
          {ouvrage.contrats.map((c) => (
            <div key={c.id} className="text-sm">
              <p className="font-medium text-gray-800">{c.operateur}</p>
              <p className="text-xs text-gray-500">
                {new Date(c.debut).toLocaleDateString("fr-FR")} → {new Date(c.fin).toLocaleDateString("fr-FR")}
              </p>
              {c.montantAnnuel && (
                <p className="text-xs text-gray-400">{c.montantAnnuel.toLocaleString("fr-FR")} FCFA / an</p>
              )}
              <p className="text-xs text-amber-700 mt-1">Données fictives</p>
            </div>
          ))}
        </div>
      )}

      {/* QR plate — D-006 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Plaque QR — programme p. 36</h2>
        <QrPlatePrint ouvrageCode={ouvrage.code} ouvrageNom={ouvrage.nom} ficheUrl={ficheUrl} />
      </div>

      {/* Historique interventions */}
      {ouvrage.interventions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Historique interventions ({ouvrage.interventions.length})</h2>
          <div className="space-y-2">
            {ouvrage.interventions.map((i) => (
              <div key={i.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                <div>
                  <span className="font-mono text-xs text-gray-400">{i.type}</span>
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${i.statut === "CLOS" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                    {i.statut}
                  </span>
                  {i.doneAt && (
                    <p className="text-xs text-gray-400 mt-0.5">Terrain : {new Date(i.doneAt).toLocaleDateString("fr-FR")}</p>
                  )}
                </div>
                {(i.coutMO || i.coutPieces) && (
                  <span className="text-xs text-gray-500">
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
