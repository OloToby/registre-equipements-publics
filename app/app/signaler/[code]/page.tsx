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
      <main className="max-w-lg mx-auto px-4 pb-10 space-y-4">
        <div className="flex items-center gap-3 pt-4 pb-1">
          <Link href={`/ouvrage/${ouvrageCode}`} className="text-sm font-semibold hover:underline"
                style={{ color: "var(--blue)" }}>← Retour</Link>
          <span style={{ color: "var(--line)" }}>·</span>
          <h1 className="font-bold" style={{ color: "var(--ink)" }}>Que se passe-t-il ?</h1>
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Équipement : <span className="font-mono font-semibold" style={{ color: "var(--ink)" }}>{ouvrageCode}</span>
        </p>

        <div className="space-y-2">
          {PANNES.map((p) => (
            <button
              key={p.code}
              onClick={() => { setPanneCode(p.code); setStep("description"); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-opacity hover:opacity-80"
              style={{
                background: p.gravite === "CRITIQUE" ? "var(--bad-bg)" : "var(--surface)",
                border: `1.5px solid ${p.gravite === "CRITIQUE" ? "#EBADA8" : "var(--line)"}`,
              }}
            >
              <span className="text-2xl shrink-0">{p.pictogramme}</span>
              <div>
                <p className="font-semibold" style={{ color: "var(--ink)" }}>{p.libelle}</p>
                {p.gravite === "CRITIQUE" && (
                  <p className="text-xs mt-0.5 font-bold" style={{ color: "var(--bad)" }}>Priorité urgente</p>
                )}
              </div>
              <span className="ml-auto text-sm" style={{ color: "var(--muted)" }}>→</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ─── Étape 2 : description ────────────────────────────────────────────────────
  if (step === "description") {
    return (
      <main className="max-w-lg mx-auto px-4 pb-10 space-y-4">
        <div className="flex items-center gap-3 pt-4 pb-1">
          <button onClick={() => setStep("panne")} className="text-sm font-semibold hover:underline"
                  style={{ color: "var(--blue)" }}>← Retour</button>
          <span style={{ color: "var(--line)" }}>·</span>
          <h1 className="font-bold" style={{ color: "var(--ink)" }}>Décrivez le problème</h1>
        </div>

        {panneSel && (
          <div className="flex items-center gap-3 rounded-2xl p-4"
               style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
            <span className="text-2xl shrink-0">{panneSel.pictogramme}</span>
            <span className="font-semibold" style={{ color: "var(--ink)" }}>{panneSel.libelle}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1.5"
                 style={{ color: "var(--muted)" }}>
            Précisions (optionnel)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex : pas d'eau depuis ce matin, le robinet ne répond plus…"
            rows={3}
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
          />
        </div>

        <button
          onClick={() => setStep("contact")}
          className="w-full font-bold py-4 rounded-2xl transition-opacity hover:opacity-90 text-white"
          style={{ background: "var(--navy)" }}
        >
          Continuer →
        </button>
      </main>
    );
  }

  // ─── Étape 3 : contact ────────────────────────────────────────────────────────
  if (step === "contact") {
    return (
      <main className="max-w-lg mx-auto px-4 pb-10 space-y-4">
        <div className="flex items-center gap-3 pt-4 pb-1">
          <button onClick={() => setStep("description")} className="text-sm font-semibold hover:underline"
                  style={{ color: "var(--blue)" }}>← Retour</button>
          <span style={{ color: "var(--line)" }}>·</span>
          <h1 className="font-bold" style={{ color: "var(--ink)" }}>Recevoir une réponse ?</h1>
        </div>

        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Facultatif. Laissez votre numéro pour être informé·e de la résolution.
        </p>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1.5"
                 style={{ color: "var(--muted)" }}>
            Téléphone (optionnel)
          </label>
          <input
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="+229 97 00 00 00"
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none"
            style={{ border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
          />
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Numéro fictif pour la démo</p>
        </div>

        {error && (
          <div className="rounded-xl p-3 text-sm" style={{ background: "var(--bad-bg)", border: "1px solid #EBADA8", color: "var(--bad)" }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full font-bold py-4 rounded-2xl transition-opacity hover:opacity-90 disabled:opacity-50 text-white"
          style={{ background: "var(--navy)" }}
        >
          {submitting ? "Envoi…" : "📢 Envoyer le signalement"}
        </button>

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full text-sm py-2"
          style={{ color: "var(--muted)" }}
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
      <h1 className="text-2xl font-black" style={{ color: "var(--ink)" }}>Signalement reçu !</h1>
      <p style={{ color: "var(--muted)" }}>
        Votre signalement a été transmis à l&apos;équipe de maintenance.
      </p>
      {result && (
        <div className="rounded-2xl p-5 text-left" style={{ background: "var(--ok-bg)", border: "1px solid #A3D9BC" }}>
          <p className="text-sm font-bold" style={{ color: "var(--ok)" }}>Numéro de suivi</p>
          <p className="text-2xl font-mono font-black mt-1" style={{ color: "var(--ink)" }}>{result.numero}</p>
          {result.priorite === "P1" && (
            <p className="text-sm mt-2 font-bold" style={{ color: "var(--bad)" }}>⚡ Signalement prioritaire — intervention sous 48h</p>
          )}
        </div>
      )}
      {result && (
        <Link
          href={`/suivi/${result.numero}`}
          className="block w-full font-bold py-4 rounded-2xl transition-opacity hover:opacity-90 text-white"
          style={{ background: "var(--navy)" }}
        >
          Suivre mon signalement
        </Link>
      )}
      <Link href={`/ouvrage/${ouvrageCode}`} className="block text-sm"
            style={{ color: "var(--muted)" }}>
        Retour à la fiche équipement
      </Link>
    </main>
  );
}
