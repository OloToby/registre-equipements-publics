"use client";

// Formulaire de signalement en 3 gestes — parcours habitant
// Source : Deck 3 slide 7 (h-report), programme p. 38
// Conception auteur : appbar + mbody, tiles panne, seg gravité, confirmation

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const PANNES: { code: string; libelle: string; pictogramme: string; gravite: string }[] = [
  { code: "PAS_EAU",      libelle: "Pas d'eau du tout",       pictogramme: "💧",  gravite: "CRITIQUE" },
  { code: "DEBIT_FAIBLE", libelle: "Débit insuffisant",       pictogramme: "↓",   gravite: "MAJEURE" },
  { code: "FUITE",        libelle: "Fuite visible",           pictogramme: "~",   gravite: "MAJEURE" },
  { code: "COUPURE_ELEC", libelle: "Coupure électrique",      pictogramme: "⚡",  gravite: "CRITIQUE" },
  { code: "PANNEAUX",     libelle: "Panneau endommagé",       pictogramme: "⬛",  gravite: "MINEURE" },
  { code: "AUTRE",        libelle: "Autre problème",          pictogramme: "?",   gravite: "MINEURE" },
];

type Step = "panne" | "description" | "contact" | "submitted";

export default function SignalerPage({ params }: { params: { code: string } }) {
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
      <main style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div className="appbar">
          <div className="top">
            <Link href={`/ouvrage/${ouvrageCode}`} className="t" style={{ fontSize: "14px", fontWeight: 600, color: "var(--blue)" }}>
              ← Retour
            </Link>
          </div>
          <span className="s">Signaler un problème · {ouvrageCode}</span>
        </div>

        <div className="mbody">
          <div>
            <span className="lbl">Que se passe-t-il ?</span>
            <p className="muted" style={{ marginTop: "4px" }}>
              Choisissez le type de panne
            </p>
          </div>

          <div className="tiles">
            {PANNES.map((p) => (
              <button
                key={p.code}
                aria-pressed={panneCode === p.code}
                className="tile"
                style={p.gravite === "CRITIQUE" ? { borderColor: "var(--bad)", background: "var(--bad-bg)" } : undefined}
                onClick={() => { setPanneCode(p.code); setStep("description"); }}
              >
                <div style={{ fontSize: "22px", marginBottom: "6px" }}>{p.pictogramme}</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: p.gravite === "CRITIQUE" ? "var(--bad)" : "var(--ink)" }}>
                  {p.libelle}
                </div>
                {p.gravite === "CRITIQUE" && (
                  <div style={{ fontSize: "11px", color: "var(--bad)", marginTop: "2px" }}>Priorité urgente</div>
                )}
              </button>
            ))}
          </div>

          <div className="note">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                 style={{ verticalAlign: "middle", marginRight: "6px" }}>
              <path d="M4 5h16v11H9l-5 4z"/>
            </svg>
            Pas de smartphone ? Envoyez <b>{ouvrageCode}</b> par SMS au numéro gravé sous le QR code.
          </div>
        </div>
      </main>
    );
  }

  // ─── Étape 2 : description ────────────────────────────────────────────────────
  if (step === "description") {
    return (
      <main style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div className="appbar">
          <div className="top">
            <button onClick={() => setStep("panne")} className="t" style={{ fontSize: "14px", fontWeight: 600, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}>
              ← Retour
            </button>
          </div>
          <span className="s">Décrivez le problème</span>
        </div>

        <div className="mbody">
          {panneSel && (
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "22px" }}>{panneSel.pictogramme}</span>
              <span style={{ fontWeight: 700, color: "var(--ink)" }}>{panneSel.libelle}</span>
            </div>
          )}

          <div>
            <label className="f">
              Précisions (optionnel)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex : pas d'eau depuis ce matin…"
                rows={4}
              />
            </label>
          </div>

          <div>
            <div className="lbl" style={{ marginBottom: "8px" }}>Fonctionne encore partiellement ?</div>
            <div className="seg">
              <button
                className="tile"
                aria-pressed={false}
                onClick={() => setStep("contact")}
                style={{ textAlign: "center" }}
              >
                Non, complètement en panne
              </button>
              <button
                className="tile"
                aria-pressed={false}
                onClick={() => setStep("contact")}
                style={{ textAlign: "center" }}
              >
                Oui, partiellement
              </button>
            </div>
          </div>

          <button onClick={() => setStep("contact")} className="btn gold block">
            Continuer →
          </button>
        </div>
      </main>
    );
  }

  // ─── Étape 3 : contact ────────────────────────────────────────────────────────
  if (step === "contact") {
    return (
      <main style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div className="appbar">
          <div className="top">
            <button onClick={() => setStep("description")} className="t" style={{ fontSize: "14px", fontWeight: 600, color: "var(--blue)", background: "none", border: "none", cursor: "pointer" }}>
              ← Retour
            </button>
          </div>
          <span className="s">Recevoir une réponse ?</span>
        </div>

        <div className="mbody">
          <p className="muted">
            Facultatif. Laissez votre numéro pour être informé·e de la résolution.
          </p>

          <label className="f">
            Téléphone (optionnel)
            <input
              type="tel"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              placeholder="+229 97 00 00 00"
            />
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>Numéro fictif pour la démo</span>
          </label>

          {error && (
            <div className="note" style={{ background: "var(--bad-bg)", color: "var(--bad)", border: "1px solid #EBADA8" }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={submitting} className="btn gold block">
            {submitting ? "Envoi…" : "Envoyer le signalement"}
          </button>

          <button onClick={submit} disabled={submitting} className="btn ghost block">
            Envoyer anonymement
          </button>
        </div>
      </main>
    );
  }

  // ─── Confirmation ─────────────────────────────────────────────────────────────
  return (
    <main style={{ maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div className="appbar">
        <div className="top">
          <span className="t">Signalement envoyé</span>
        </div>
        <span className="s">{ouvrageCode}</span>
      </div>

      <div className="mbody" style={{ alignItems: "center", textAlign: "center" }}>
        <div className="big-ok" style={{ margin: "0 auto" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--ink)" }}>Signalement reçu !</h2>
        <p className="muted">Votre signalement a été transmis à l&apos;équipe de maintenance.</p>

        {result && (
          <div className="card" style={{ width: "100%", textAlign: "left" }}>
            <span className="lbl">Numéro de suivi</span>
            <div style={{ fontSize: "24px", fontFamily: "monospace", fontWeight: 800, color: "var(--ink)", marginTop: "4px" }}>
              {result.numero}
            </div>
            {result.priorite === "P1" && (
              <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--bad)", marginTop: "8px" }}>
                Intervention prioritaire sous 48h
              </div>
            )}
          </div>
        )}

        {result && (
          <Link href={`/suivi/${result.numero}`} className="btn gold block">
            Suivre mon signalement
          </Link>
        )}

        <Link href={`/ouvrage/${ouvrageCode}`} className="btn ghost block">
          Retour à la fiche équipement
        </Link>
      </div>
    </main>
  );
}
