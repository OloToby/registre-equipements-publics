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
    <main className="max-w-lg mx-auto px-4 pb-10 space-y-5">

      {/* En-tête */}
      <div className="rounded-2xl p-5 mt-4" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <p className="font-mono text-xs mb-1" style={{ color: "var(--muted)" }}>Signalement</p>
        <h1 className="text-2xl font-black font-mono" style={{ color: "var(--ink)" }}>{signalement.numero}</h1>
        <p className="text-sm mt-1 font-semibold" style={{ color: "var(--ink)" }}>{signalement.panneLibelle}</p>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
          {signalement.ouvrage.nom} — {signalement.ouvrage.commune.nom}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: "var(--soft)", color: "var(--muted)" }}>
            Canal : {signalement.canal}
          </span>
          {signalement.priorite && (
            <span className="text-xs px-2 py-1 rounded-full font-bold"
                  style={{
                    background: signalement.priorite === "P1" ? "var(--bad-bg)" :
                                signalement.priorite === "P2" ? "var(--warn-bg)" : "var(--soft)",
                    color: signalement.priorite === "P1" ? "var(--bad)" :
                           signalement.priorite === "P2" ? "var(--warn)" : "var(--muted)",
                  }}>
              {PRIORITE_LABELS[signalement.priorite] ?? signalement.priorite}
            </span>
          )}
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
          Reçu le {new Date(signalement.createdAt).toLocaleDateString("fr-FR", {
            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
          })}
        </p>
      </div>

      {/* Barre de progression */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--muted)" }}>Avancement</p>
        <div className="space-y-3">
          {STATUT_STEPS.map((step, i) => {
            const done = i <= currentStepIndex || (isRouvert && i < STATUT_STEPS.length - 1);
            const active = i === currentStepIndex && !isResolu;
            return (
              <div key={step.code} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 font-bold"
                     style={{
                       background: done ? "var(--navy)" : active ? "var(--sky)" : "var(--soft)",
                       color: done ? "#fff" : active ? "var(--navy)" : "var(--muted)",
                     }}>
                  {done ? step.icon : <span className="text-xs">{i + 1}</span>}
                </div>
                <span className="text-sm font-semibold"
                      style={{ color: done ? "var(--ink)" : "var(--muted)" }}>
                  {step.label}
                </span>
                {active && (
                  <span className="text-xs font-bold animate-pulse" style={{ color: "var(--blue)" }}>
                    En cours…
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Résultat si clos */}
      {isResolu && (
        <div className="rounded-2xl p-5" style={{ background: "var(--ok-bg)", border: "1px solid #A3D9BC" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">✅</span>
            <h2 className="font-bold text-base" style={{ color: "var(--ok)" }}>Problème résolu</h2>
          </div>
          {delaiH !== null && (
            <p className="text-sm" style={{ color: "var(--ok)" }}>
              Résolu en <strong>{delaiH}h</strong> après le signalement.
            </p>
          )}
          {intervention?.preuve?.photoApresUrl && (
            <p className="text-sm mt-1" style={{ color: "var(--ok)" }}>📷 Photo de résolution disponible</p>
          )}
          {!signalement.confirmationHabitant && (
            <ConfirmationHabitant signalementId={signalement.id} numero={signalement.numero} />
          )}
          {signalement.confirmationHabitant === false && (
            <p className="text-sm mt-3 font-bold" style={{ color: "var(--warn)" }}>
              ⚠️ Vous avez signalé que le problème persiste — un technicien va revenir.
            </p>
          )}
          {signalement.confirmationHabitant === true && (
            <p className="text-sm mt-3" style={{ color: "var(--ok)" }}>
              👍 Vous avez confirmé que le problème est réglé. Merci !
            </p>
          )}
        </div>
      )}

      {/* Rouvert */}
      {isRouvert && (
        <div className="rounded-2xl p-4" style={{ background: "var(--warn-bg)", border: "1px solid #E0C570" }}>
          <p className="text-sm font-bold" style={{ color: "var(--warn)" }}>🔄 Signalement rouvert</p>
          <p className="text-sm mt-1" style={{ color: "var(--warn)" }}>
            Une nouvelle intervention a été programmée.
          </p>
        </div>
      )}

      {/* Technicien affecté */}
      {signalement.affectation?.technicien && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
            Technicien affecté
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
            {signalement.affectation.technicien.nom}
          </p>
        </div>
      )}

      {/* Action */}
      <Link
        href={`/ouvrage/${signalement.ouvrage.code}`}
        className="block w-full text-center font-semibold py-3 rounded-2xl transition-opacity hover:opacity-80 text-sm"
        style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)" }}
      >
        Retour à la fiche équipement
      </Link>

      <p className="text-center text-xs pb-4" style={{ color: "var(--muted)" }}>
        Données fictives — numéro de suivi fictif à des fins de démonstration
      </p>
    </main>
  );
}
