"use client";

// Bouton de confirmation habitant — Deck 3 slide 7 (boucle feedback)
// Conception auteur : deux boutons Oui/Non → PATCH /api/signalements/[id]

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmationHabitant({
  signalementId,
}: {
  signalementId: string;
  numero?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function confirm(ok: boolean) {
    setLoading(true);
    await fetch(`/api/signalements/${signalementId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmationHabitant: ok }),
    });
    setSent(true);
    setLoading(false);
    router.refresh();
  }

  if (sent) return null;

  return (
    <div className="mt-4 border-t border-green-200 pt-4">
      <p className="text-sm font-medium text-gray-700 mb-3">Le problème est-il réglé ?</p>
      <div className="flex gap-3">
        <button
          onClick={() => confirm(true)}
          disabled={loading}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          👍 Oui, c'est résolu
        </button>
        <button
          onClick={() => confirm(false)}
          disabled={loading}
          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
        >
          👎 Non, toujours présent
        </button>
      </div>
    </div>
  );
}
