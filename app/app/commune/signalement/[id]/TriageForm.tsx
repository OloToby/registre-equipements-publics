"use client";

// Formulaire de triage — affectation priorité + technicien
// Source : Deck 3 slide 11 (c-ticket), programme p. 39

import { useState } from "react";
import { useRouter } from "next/navigation";

type Technicien = { id: string; nom: string };

type Props = {
  signalementId: string;
  currentPriorite: string | null;
  currentStatut: string;
  currentTechnicienId: string | null;
  techniciens: Technicien[];
};

const PRIORITES = [
  { code: "P1", label: "P1 — Urgente", sub: "intervention sous 48h", cls: "prio P1" },
  { code: "P2", label: "P2 — Normale", sub: "intervention sous 5 jours", cls: "prio P2" },
  { code: "P3", label: "P3 — Basse", sub: "intervention sous 15 jours", cls: "prio P3" },
];


export default function TriageForm({ signalementId, currentPriorite, currentStatut, currentTechnicienId, techniciens }: Props) {
  const router = useRouter();
  const [priorite, setPriorite] = useState(currentPriorite ?? "");
  const [technicienId, setTechnicienId] = useState(currentTechnicienId ?? "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const body: Record<string, unknown> = {};
      if (priorite) body.priorite = priorite;
      if (priorite && currentStatut === "RECU") body.statut = "TRIAGE";
      if (technicienId) body.technicienId = technicienId;

      const res = await fetch(`/api/signalements/${signalementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erreur lors de la mise à jour");
      } else {
        setSuccess("Signalement mis à jour");
        router.refresh();
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  const canAffecter = ["RECU", "TRIAGE", "AFFECTE"].includes(currentStatut);

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Priorité */}
      <div>
        <div className="lbl" style={{ marginBottom: "10px" }}>Priorité</div>
        <div className="radios">
          {PRIORITES.map((p) => (
            <label key={p.code} className={`radio${priorite === p.code ? " sug" : ""}`}>
              <input
                type="radio"
                name="priorite"
                value={p.code}
                checked={priorite === p.code}
                onChange={() => setPriorite(p.code)}
              />
              <div>
                <span className={p.cls} style={{ display: "inline-block", marginBottom: "2px" }}>{p.code}</span>
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>{p.label}</div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>{p.sub}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Technicien */}
      {canAffecter && techniciens.length > 0 && (
        <div>
          <label className="f">
            Technicien
            <select value={technicienId} onChange={(e) => setTechnicienId(e.target.value)}>
              <option value="">— Choisir un technicien</option>
              {techniciens.map((t) => (
                <option key={t.id} value={t.id}>{t.nom}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {error && (
        <div className="note" style={{ background: "var(--bad-bg)", color: "var(--bad)", border: "1px solid #EBADA8" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="note" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>
          {success}
        </div>
      )}

      <button type="submit" disabled={saving || !priorite} className="btn gold block">
        {saving ? "Enregistrement…" : technicienId ? "Affecter le technicien" : "Enregistrer la priorité"}
      </button>

      {currentStatut !== "CLOS" && (
        <button
          type="button"
          disabled={saving}
          className="btn ghost block"
          onClick={async () => {
            setSaving(true);
            await fetch(`/api/signalements/${signalementId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ statut: "CLOS" }),
            });
            setSuccess("Signalement clos");
            setSaving(false);
            router.refresh();
          }}
        >
          Marquer comme résolu
        </button>
      )}
    </form>
  );
}
