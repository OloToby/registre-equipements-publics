"use client";

// Formulaire d'intervention avec checklist, photos et double horodatage
// Source : Deck 3 slide 10 (doneAt terrain vs syncedAt serveur), programme p. 38
// Conception auteur : consignation électrique bloquante, mode hors-ligne via Dexie

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { queueIntervention } from "@/lib/offlineDb";

interface ChecklistItem {
  id: string;
  label: string;
  obligatoire: boolean;
  bloqueCloture: boolean;
  typeIntervention: string;
}

interface Props {
  signalementId: string;
  ouvrageId: string;
  checklistItems: ChecklistItem[];
  technicienId: string;
}

export default function InterventionForm({ signalementId, ouvrageId, checklistItems, technicienId }: Props) {
  const router = useRouter();
  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(checklistItems.map((i) => [i.id, false]))
  );
  const [photoAvantUrl, setPhotoAvantUrl] = useState("");
  const [photoApresUrl, setPhotoApresUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [coutMO, setCoutMO] = useState("");
  const [coutPieces, setCoutPieces] = useState("");
  const [doneAt, setDoneAt] = useState(new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ synced: boolean } | null>(null);

  const consignationItem = checklistItems.find((i) => i.bloqueCloture);
  const consignationChecked = consignationItem ? checklist[consignationItem.id] : true;
  const obligatoiresChecked = checklistItems
    .filter((i) => i.obligatoire)
    .every((i) => checklist[i.id]);

  const canClose = consignationChecked && obligatoiresChecked && !!photoAvantUrl && !!photoApresUrl;

  const toggleCheck = useCallback((id: string) => {
    setChecklist((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  async function submit(close: boolean) {
    if (close && !canClose) {
      setError("Impossible de clore : vérifiez la consignation, les items obligatoires et les photos.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload = {
      ouvrageId,
      signalementId,
      type: "CORRECTIF",
      technicienId,
      doneAt: new Date(doneAt).toISOString(),
      checklistItems: checklistItems.map((item) => ({
        itemTypeId: item.id,
        label: item.label,
        coche: checklist[item.id] ?? false,
        bloqueCloture: item.bloqueCloture,
      })),
      photoAvantUrl: photoAvantUrl || null,
      photoApresUrl: photoApresUrl || null,
      notes: notes || null,
      coutMO: coutMO ? parseFloat(coutMO) : null,
      coutPieces: coutPieces ? parseFloat(coutPieces) : null,
    };

    try {
      const res = await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const interventionId = data.intervention?.id;

        if (close && interventionId) {
          const closeRes = await fetch(`/api/interventions/${interventionId}/clore`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ doneAt: new Date(doneAt).toISOString() }),
          });
          if (!closeRes.ok) {
            const errData = await closeRes.json();
            setError(errData.message ?? "Erreur lors de la clôture");
            setSubmitting(false);
            return;
          }
        }

        setResult({ synced: true });
        router.push("/technicien");
      } else {
        throw new Error("offline");
      }
    } catch {
      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await queueIntervention({
        localId,
        ouvrageId,
        ouvrageCode: "",
        ouvrageNom: "",
        signalementId,
        type: "CORRECTIF",
        doneAt: new Date(doneAt).toISOString(),
        checklistItems: checklistItems.map((item) => ({
          itemTypeId: item.id,
          label: item.label,
          coche: checklist[item.id] ?? false,
          bloqueCloture: item.bloqueCloture,
        })),
        photoAvantUrl: photoAvantUrl || undefined,
        photoApresUrl: photoApresUrl || undefined,
        notes: notes || undefined,
        coutMO: coutMO ? parseFloat(coutMO) : undefined,
        coutPieces: coutPieces ? parseFloat(coutPieces) : undefined,
      });
      setResult({ synced: false });
      router.push("/technicien");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "32px 16px" }}>
        <div className="big-ok" style={{ margin: "0 auto 12px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "4px" }}>
          {result.synced ? "Intervention enregistrée" : "Mise en file hors-ligne"}
        </div>
        <div className="muted" style={{ fontSize: "13px" }}>
          {result.synced ? "Synchronisée avec le serveur." : "Sera synchronisée dès le retour de la connexion."}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Horodatage terrain */}
      <div className="note" style={{ background: "var(--sky)", color: "var(--navy)" }}>
        <div style={{ fontWeight: 700, marginBottom: "6px" }}>Horodatage terrain</div>
        <label className="f">
          Date et heure de l&apos;intervention (terrain)
          <input
            type="datetime-local"
            value={doneAt}
            onChange={(e) => setDoneAt(e.target.value)}
            style={{ color: "var(--ink)", background: "var(--surface)" }}
          />
        </label>
        <div style={{ fontSize: "12px", marginTop: "6px" }}>
          La date de synchronisation serveur sera enregistrée séparément.
        </div>
      </div>

      {/* Checklist */}
      {checklistItems.length > 0 && (
        <div className="card">
          <span className="lbl" style={{ display: "block", marginBottom: "8px" }}>Checklist de sécurité</span>
          {checklistItems.map((item) => {
            const checked = checklist[item.id] ?? false;
            const isBlocking = item.bloqueCloture;
            return (
              <label
                key={item.id}
                className="chk"
                style={isBlocking && !checked ? { background: "var(--bad-bg)", borderRadius: "8px", padding: "10px 8px" } : undefined}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCheck(item.id)}
                />
                <div>
                  <div style={{ fontWeight: isBlocking ? 700 : 400, color: isBlocking ? (checked ? "var(--ok)" : "var(--bad)") : "var(--ink)" }}>
                    {item.label}
                  </div>
                  {isBlocking && !checked && (
                    <div style={{ fontSize: "12px", color: "var(--bad)", marginTop: "2px" }}>
                      Obligatoire avant toute intervention (sécurité)
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {/* Photos */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span className="lbl">Photos avant / après</span>
        <p className="muted" style={{ fontSize: "12px" }}>En production : upload réel via presigned URL — Conception auteur</p>

        <label className="f">
          Photo avant intervention *
          <input
            type="url"
            value={photoAvantUrl}
            onChange={(e) => setPhotoAvantUrl(e.target.value)}
            placeholder="https://…/avant.jpg"
          />
        </label>
        <button
          type="button"
          onClick={() => setPhotoAvantUrl(`https://demo.registre.bj/photos/avant-${Date.now()}.jpg`)}
          className="btn ghost sm"
        >
          Simuler photo avant
        </button>

        <label className="f">
          Photo après intervention *
          <input
            type="url"
            value={photoApresUrl}
            onChange={(e) => setPhotoApresUrl(e.target.value)}
            placeholder="https://…/apres.jpg"
          />
        </label>
        <button
          type="button"
          onClick={() => setPhotoApresUrl(`https://demo.registre.bj/photos/apres-${Date.now()}.jpg`)}
          className="btn ghost sm"
        >
          Simuler photo après
        </button>

        {photoAvantUrl && photoApresUrl && (
          <div className="thumbs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <figure><img src={photoAvantUrl} alt="Avant" /><figcaption>Avant</figcaption></figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <figure><img src={photoApresUrl} alt="Après" /><figcaption>Après</figcaption></figure>
          </div>
        )}
      </div>

      {/* Coûts */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span className="lbl">Coûts (FCFA)</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <label className="f">
            Main d&apos;œuvre
            <input type="number" value={coutMO} onChange={(e) => setCoutMO(e.target.value)} placeholder="50 000" />
          </label>
          <label className="f">
            Pièces
            <input type="number" value={coutPieces} onChange={(e) => setCoutPieces(e.target.value)} placeholder="12 000" />
          </label>
        </div>
      </div>

      {/* Notes */}
      <label className="f">
        Notes libres
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observations terrain…"
          rows={3}
        />
      </label>

      {error && (
        <div className="note" style={{ background: "var(--bad-bg)", color: "var(--bad)", border: "1px solid #EBADA8" }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <button
        onClick={() => submit(true)}
        disabled={submitting || !canClose}
        className="btn gold block"
        style={!canClose ? { opacity: 0.45 } : undefined}
      >
        Enregistrer et clore l&apos;intervention
      </button>
      {!canClose && (
        <p className="muted" style={{ fontSize: "12px", textAlign: "center" }}>
          {!consignationChecked ? "Cochez la consignation électrique" :
           !obligatoiresChecked ? "Checklist incomplète" :
           "Photos avant/après requises"}
        </p>
      )}
      <button
        onClick={() => submit(false)}
        disabled={submitting}
        className="btn ghost block"
      >
        Enregistrer (intervention en cours)
      </button>
    </>
  );
}
