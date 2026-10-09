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
  const [result, setResult] = useState<{ numero?: string; synced: boolean } | null>(null);

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

        // Si clore demandé, appel de la route de clôture
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
        // Hors-ligne ou erreur réseau → file d'attente Dexie
        throw new Error("offline");
      }
    } catch {
      // Mise en file hors-ligne
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
      <div className="text-center space-y-4 py-8">
        <p className="text-4xl">{result.synced ? "✅" : "📴"}</p>
        <p className="font-semibold" style={{ color: "var(--navy)" }}>
          {result.synced ? "Intervention enregistrée" : "Mise en file hors-ligne"}
        </p>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {result.synced
            ? "Synchronisée avec le serveur."
            : "Sera synchronisée dès le retour de la connexion."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Double horodatage — slide 10 Deck 3 */}
      <div className="rounded-xl p-4" style={{ background: "var(--sky)", border: "1px solid #8BBDD9" }}>
        <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--navy)" }}>⏱ Horodatage terrain</h2>
        <label className="block text-xs mb-1" style={{ color: "var(--navy)" }}>Date et heure de l'intervention (terrain)</label>
        <input
          type="datetime-local"
          value={doneAt}
          onChange={(e) => setDoneAt(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
          style={{ border: "1px solid #8BBDD9", background: "var(--surface)", color: "var(--ink)" }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--navy)" }}>
          La date de synchronisation serveur sera enregistrée séparément (conception auteur).
        </p>
      </div>

      {/* Checklist */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--ink)" }}>Checklist de sécurité</h2>
        <div className="space-y-2">
          {checklistItems.map((item) => {
            const checked = checklist[item.id] ?? false;
            const isBlocking = item.bloqueCloture;
            const labelStyle = isBlocking
              ? checked
                ? { background: "var(--ok-bg)", border: "1px solid #A3D9BC" }
                : { background: "var(--bad-bg)", border: "1px solid #EBADA8" }
              : { background: "var(--soft)", border: "1px solid var(--line)" };
            return (
              <label key={item.id} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer" style={labelStyle}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCheck(item.id)}
                  className="mt-0.5 w-4 h-4"
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: isBlocking ? (checked ? "var(--ok)" : "var(--bad)") : "var(--ink)" }}>
                    {item.label}
                  </p>
                  {isBlocking && !checked && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--bad)" }}>⚠️ Obligatoire avant toute intervention (sécurité)</p>
                  )}
                  {isBlocking && checked && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--ok)" }}>✓ Consignation confirmée</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Photos */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--ink)" }}>Photos (URL de démonstration)</h2>
        <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>Conception auteur — en production : upload réel via presigned URL</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Photo avant intervention *</label>
            <input
              type="url"
              value={photoAvantUrl}
              onChange={(e) => setPhotoAvantUrl(e.target.value)}
              placeholder="https://…/avant.jpg"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
            />
            <button
              type="button"
              onClick={() => setPhotoAvantUrl(`https://demo.registre.bj/photos/avant-${Date.now()}.jpg`)}
              className="text-xs mt-1 hover:underline"
              style={{ color: "var(--navy)" }}
            >
              📷 Simuler photo avant
            </button>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Photo après intervention *</label>
            <input
              type="url"
              value={photoApresUrl}
              onChange={(e) => setPhotoApresUrl(e.target.value)}
              placeholder="https://…/apres.jpg"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
            />
            <button
              type="button"
              onClick={() => setPhotoApresUrl(`https://demo.registre.bj/photos/apres-${Date.now()}.jpg`)}
              className="text-xs mt-1 hover:underline"
              style={{ color: "var(--navy)" }}
            >
              📷 Simuler photo après
            </button>
          </div>
        </div>
      </div>

      {/* Coûts */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--ink)" }}>Coûts (FCFA)</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Main d'œuvre</label>
            <input
              type="number"
              value={coutMO}
              onChange={(e) => setCoutMO(e.target.value)}
              placeholder="ex: 50000"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Pièces</label>
            <input
              type="number"
              value={coutPieces}
              onChange={(e) => setCoutPieces(e.target.value)}
              placeholder="ex: 1623000"
              className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none"
              style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs mb-1" style={{ color: "var(--muted)" }}>Notes libres</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observations terrain…"
          rows={2}
          className="w-full rounded-xl px-3 py-2 text-sm resize-none focus:outline-none"
          style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
        />
      </div>

      {error && (
        <div className="rounded-xl p-3 text-sm" style={{ background: "var(--bad-bg)", border: "1px solid #EBADA8", color: "var(--bad)" }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pb-6">
        <button
          onClick={() => submit(true)}
          disabled={submitting || !canClose}
          className="w-full font-semibold py-4 rounded-2xl transition-opacity text-white"
          style={{ background: canClose ? "var(--ok)" : "var(--line)", color: canClose ? "white" : "var(--muted)", opacity: submitting ? 0.5 : 1 }}
        >
          ✅ Enregistrer et clore l'intervention
        </button>
        {!canClose && (
          <p className="text-xs text-center" style={{ color: "var(--muted)" }}>
            {!consignationChecked ? "⚠️ Cochez la consignation électrique" :
             !obligatoiresChecked ? "⚠️ Checklist incomplète" :
             "📷 Photos avant/après requises"}
          </p>
        )}
        <button
          onClick={() => submit(false)}
          disabled={submitting}
          className="w-full font-semibold py-3 rounded-2xl transition-opacity hover:opacity-90 disabled:opacity-50 text-white text-sm"
          style={{ background: "var(--navy)" }}
        >
          💾 Enregistrer (en cours)
        </button>
      </div>
    </div>
  );
}
