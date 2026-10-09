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
        <p className="font-semibold text-gray-900">
          {result.synced ? "Intervention enregistrée" : "Mise en file hors-ligne"}
        </p>
        <p className="text-sm text-gray-500">
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
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h2 className="text-sm font-semibold text-blue-800 mb-2">⏱ Horodatage terrain</h2>
        <label className="block text-xs text-blue-700 mb-1">Date et heure de l'intervention (terrain)</label>
        <input
          type="datetime-local"
          value={doneAt}
          onChange={(e) => setDoneAt(e.target.value)}
          className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white"
        />
        <p className="text-xs text-blue-600 mt-1">
          La date de synchronisation serveur sera enregistrée séparément (conception auteur).
        </p>
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Checklist de sécurité</h2>
        <div className="space-y-2">
          {checklistItems.map((item) => {
            const checked = checklist[item.id] ?? false;
            const isBlocking = item.bloqueCloture;
            return (
              <label
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  isBlocking
                    ? checked ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                    : "bg-gray-50 border border-gray-100 hover:border-gray-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCheck(item.id)}
                  className="mt-0.5 w-4 h-4 accent-blue-600"
                />
                <div>
                  <p className={`text-sm font-medium ${isBlocking ? (checked ? "text-green-800" : "text-red-800") : "text-gray-800"}`}>
                    {item.label}
                  </p>
                  {isBlocking && !checked && (
                    <p className="text-xs text-red-600 mt-0.5">⚠️ Obligatoire avant toute intervention (sécurité)</p>
                  )}
                  {isBlocking && checked && (
                    <p className="text-xs text-green-600 mt-0.5">✓ Consignation confirmée</p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Photos (URL de démonstration)</h2>
        <p className="text-xs text-gray-400 mb-3">Conception auteur — en production : upload réel via presigned URL</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Photo avant intervention *</label>
            <input
              type="url"
              value={photoAvantUrl}
              onChange={(e) => setPhotoAvantUrl(e.target.value)}
              placeholder="https://…/avant.jpg"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setPhotoAvantUrl(`https://demo.registre.bj/photos/avant-${Date.now()}.jpg`)}
              className="text-xs text-blue-600 mt-1 hover:underline"
            >
              📷 Simuler photo avant
            </button>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Photo après intervention *</label>
            <input
              type="url"
              value={photoApresUrl}
              onChange={(e) => setPhotoApresUrl(e.target.value)}
              placeholder="https://…/apres.jpg"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setPhotoApresUrl(`https://demo.registre.bj/photos/apres-${Date.now()}.jpg`)}
              className="text-xs text-blue-600 mt-1 hover:underline"
            >
              📷 Simuler photo après
            </button>
          </div>
        </div>
      </div>

      {/* Coûts */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Coûts (FCFA)</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Main d'œuvre</label>
            <input
              type="number"
              value={coutMO}
              onChange={(e) => setCoutMO(e.target.value)}
              placeholder="ex: 50000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pièces</label>
            <input
              type="number"
              value={coutPieces}
              onChange={(e) => setCoutPieces(e.target.value)}
              placeholder="ex: 1623000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notes libres</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observations terrain…"
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pb-6">
        <button
          onClick={() => submit(true)}
          disabled={submitting || !canClose}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-4 rounded-2xl transition-colors"
        >
          ✅ Enregistrer et clore l'intervention
        </button>
        {!canClose && (
          <p className="text-xs text-gray-500 text-center">
            {!consignationChecked ? "⚠️ Cochez la consignation électrique" :
             !obligatoiresChecked ? "⚠️ Checklist incomplète" :
             "📷 Photos avant/après requises"}
          </p>
        )}
        <button
          onClick={() => submit(false)}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-colors text-sm"
        >
          💾 Enregistrer (en cours)
        </button>
      </div>
    </div>
  );
}
