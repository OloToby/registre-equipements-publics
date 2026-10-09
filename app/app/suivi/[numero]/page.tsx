// Page de suivi d'un signalement par numéro — accessible sans compte
// Source : Deck 3 slide 7 (confirmation habitant), slide 5 (S-2026-0142)
// Conception auteur : affichage statut + historique + bouton confirmation habitant

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import ConfirmationHabitant from "./ConfirmationHabitant";

type Props = { params: { numero: string } };

const STATUT_STEPS = [
  { code: "RECU",      label: "Reçu",         icon: "📥" },
  { code: "TRIAGE",    label: "En triage",     icon: "🔍" },
  { code: "AFFECTE",   label: "Affecté",       icon: "👷" },
  { code: "EN_COURS",  label: "En cours",      icon: "🔧" },
  { code: "CLOS",      label: "Résolu",        icon: "✅" },
];

const PRIORITE_LABELS: Record<string, string> = {
  P1: "Urgente (< 48h)",
  P2: "Normale (< 72h)",
  P3: "Basse (< 7 jours)",
};

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

  const currentStepIndex = STATUT_STEPS.findIndex((s) => s.code === signalement.statut);
  const isResolu = signalement.statut === "CLOS";
  const isRouvert = signalement.statut === "ROUVERT";

  const intervention = signalement.intervention;

  const delaiH = isResolu && intervention?.syncedAt
    ? Math.round((new Date(intervention.syncedAt).getTime() - signalement.createdAt.getTime()) / 3600000)
    : null;

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* En-tête */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="text-xs text-gray-400 font-mono mb-1">Signalement</p>
        <h1 className="text-2xl font-bold font-mono text-gray-900">{signalement.numero}</h1>
        <p className="text-sm text-gray-600 mt-1">{signalement.panneLibelle}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {signalement.ouvrage.nom} — {signalement.ouvrage.commune.nom}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            Canal : {signalement.canal}
          </span>
          {signalement.priorite && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              signalement.priorite === "P1" ? "bg-red-100 text-red-700" :
              signalement.priorite === "P2" ? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-600"
            }`}>
              {PRIORITE_LABELS[signalement.priorite] ?? signalement.priorite}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Reçu le {new Date(signalement.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>

      {/* Barre de progression */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Avancement</h2>
        <div className="space-y-3">
          {STATUT_STEPS.map((step, i) => {
            const done = i <= currentStepIndex || (isRouvert && i < STATUT_STEPS.length - 1);
            const active = i === currentStepIndex && !isResolu;
            return (
              <div key={step.code} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                  done ? "bg-blue-600 text-white" :
                  active ? "bg-blue-100 text-blue-600" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {done ? step.icon : <span className="text-xs">{i + 1}</span>}
                </div>
                <span className={`text-sm ${done ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                  {step.label}
                </span>
                {active && <span className="text-xs text-blue-600 animate-pulse">En cours…</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Résultat si clos */}
      {isResolu && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">✅</span>
            <h2 className="font-semibold text-green-800">Problème résolu</h2>
          </div>
          {delaiH !== null && (
            <p className="text-sm text-green-700">
              Résolu en <strong>{delaiH}h</strong> après le signalement.
            </p>
          )}
          {intervention?.preuve?.photoApresUrl && (
            <p className="text-sm text-green-700 mt-1">📷 Photo de résolution disponible</p>
          )}
          {/* Confirmation habitant — Deck 3 slide 7 */}
          {!signalement.confirmationHabitant && (
            <ConfirmationHabitant signalementId={signalement.id} numero={signalement.numero} />
          )}
          {signalement.confirmationHabitant === false && (
            <p className="text-sm text-amber-700 mt-3 font-medium">
              ⚠️ Vous avez signalé que le problème persiste — un technicien va revenir.
            </p>
          )}
          {signalement.confirmationHabitant === true && (
            <p className="text-sm text-green-700 mt-3">
              👍 Vous avez confirmé que le problème est réglé. Merci !
            </p>
          )}
        </div>
      )}

      {/* Rouvert */}
      {isRouvert && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800">🔄 Signalement rouvert</p>
          <p className="text-sm text-amber-700 mt-1">
            Une nouvelle intervention a été programmée.
          </p>
        </div>
      )}

      {/* Technicien affecté */}
      {signalement.affectation?.technicien && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Technicien affecté</h2>
          <p className="text-sm text-gray-800">{signalement.affectation.technicien.nom}</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Link
          href={`/ouvrage/${signalement.ouvrage.code}`}
          className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 rounded-2xl transition-colors text-sm"
        >
          Retour à la fiche équipement
        </Link>
      </div>

      <p className="text-center text-xs text-gray-400 pb-4">
        Données fictives — numéro de suivi fictif à des fins de démonstration
      </p>
    </main>
  );
}
