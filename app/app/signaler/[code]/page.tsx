"use client";

// Formulaire de signalement en 3 gestes — parcours habitant
// Source : Deck 3 slide 7 (flux signalement mobile), slide 5 (scénario EAU-004)
// Conception auteur : 3 étapes UX : choix panne → description → contact optionnel

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const PANNES: { code: string; libelle: string; pictogramme: string; gravite: string }[] = [
  { code: "PAS_EAU",      libelle: "Pas d'eau du tout",       pictogramme: "🚫💧", gravite: "CRITIQUE" },
  { code: "DEBIT_FAIBLE", libelle: "Débit insuffisant",       pictogramme: "💧⬇️", gravite: "MAJEURE" },
  { code: "FUITE",        libelle: "Fuite visible",           pictogramme: "💦",   gravite: "MAJEURE" },
  { code: "COUPURE_ELEC", libelle: "Coupure électrique",      pictogramme: "⚡🚫", gravite: "CRITIQUE" },
  { code: "AUTRE",        libelle: "Autre problème",          pictogramme: "❓",   gravite: "MINEURE" },
];

type Step = "panne" | "description" | "contact" | "submitted";

export default function SignalerPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedPanne = searchParams.get("panne");

  const [step, setStep] = useState<Step>(preselectedPanne ? "description" : "panne");
  const [panneCode, setPanneCode] = useState(preselectedPanne ?? "");
  const [description, setDescription] = useState("");
  const [telephone, setTelephone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ numero: string; priorite: string } | null>(null);
  const [error, setError] = useState("");

  const ouvrageCode = decodeURIComponent(params.code).toUpperCase();
  const panneSel = PANNES.find((p) => p.code === panneCode);

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/signalements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ouvrageCode,
          panneCode,
          description: description || panneSel?.libelle || "Signalement habitant",
          canal: "QR",
          telephoneContact: telephone || null,
          anonyme: !telephone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'envoi");
        setSubmitting(false);
        return;
      }
      setResult({ numero: data.numero, priorite: data.signalement?.priorite ?? "" });
      setStep("submitted");
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Étape 1 : choix de la panne ─────────────────────────────────────────────
  if (step === "panne") {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Link href={`/ouvrage/${ouvrageCode}`} className="text-blue-600 text-sm">← Retour</Link>
          <h1 className="text-lg font-bold text-gray-900">Que se passe-t-il ?</h1>
        </div>
        <p className="text-sm text-gray-500">Équipement : <span className="font-mono font-semibold">{ouvrageCode}</span></p>

        <div className="space-y-2">
          {PANNES.map((p) => (
            <button
              key={p.code}
              onClick={() => { setPanneCode(p.code); setStep("description"); }}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-colors
                ${p.gravite === "CRITIQUE" ? "border-red-200 hover:border-red-400 hover:bg-red-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
            >
              <span className="text-2xl">{p.pictogramme}</span>
              <div>
                <p className="font-semibold text-gray-800">{p.libelle}</p>
                {p.gravite === "CRITIQUE" && (
                  <p className="text-xs text-red-600 mt-0.5">Priorité urgente</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ─── Étape 2 : description ────────────────────────────────────────────────────
  if (step === "description") {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep("panne")} className="text-blue-600 text-sm">← Retour</button>
          <h1 className="text-lg font-bold text-gray-900">Décrivez le problème</h1>
        </div>

        {panneSel && (
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
            <span className="text-xl">{panneSel.pictogramme}</span>
            <span className="font-medium text-gray-800">{panneSel.libelle}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Précisions (optionnel)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex : pas d'eau depuis ce matin, le robinet ne répond plus…"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          onClick={() => setStep("contact")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          Continuer →
        </button>
      </main>
    );
  }

  // ─── Étape 3 : contact ────────────────────────────────────────────────────────
  if (step === "contact") {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setStep("description")} className="text-blue-600 text-sm">← Retour</button>
          <h1 className="text-lg font-bold text-gray-900">Recevoir une réponse ?</h1>
        </div>

        <p className="text-sm text-gray-500">
          Facultatif. Laissez votre numéro pour être informé·e de la résolution.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Téléphone (optionnel)
          </label>
          <input
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+229 97 00 00 00"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Numéro fictif pour la démo</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          {submitting ? "Envoi…" : "📢 Envoyer le signalement"}
        </button>

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full text-gray-500 text-sm py-2"
        >
          Envoyer anonymement (sans numéro)
        </button>
      </main>
    );
  }

  // ─── Confirmation ─────────────────────────────────────────────────────────────
  return (
    <main className="max-w-lg mx-auto px-4 py-12 text-center space-y-5">
      <div className="text-6xl">✅</div>
      <h1 className="text-2xl font-bold text-gray-900">Signalement reçu !</h1>
      <p className="text-gray-600">
        Votre signalement a été transmis à l'équipe de maintenance.
      </p>
      {result && (
        <div className="bg-blue-50 rounded-2xl p-5 text-left border border-blue-200">
          <p className="text-sm text-blue-700 font-medium">Numéro de suivi</p>
          <p className="text-2xl font-mono font-bold text-blue-900 mt-1">{result.numero}</p>
          {result.priorite === "P1" && (
            <p className="text-sm text-red-600 mt-2 font-medium">⚡ Signalement prioritaire — intervention sous 48h</p>
          )}
        </div>
      )}
      {result && (
        <Link
          href={`/suivi/${result.numero}`}
          className="block w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          Suivre mon signalement
        </Link>
      )}
      <Link href={`/ouvrage/${ouvrageCode}`} className="block text-gray-500 text-sm">
        Retour à la fiche équipement
      </Link>
    </main>
  );
}
