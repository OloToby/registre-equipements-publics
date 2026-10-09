"use client";

// File de signalements avec actions d'affectation — Deck 3 slide 11
// Conception auteur : triage, affectation technicien

import { useState } from "react";
import Link from "next/link";

interface SignalementRow {
  id: string;
  numero: string;
  panneLibelle: string;
  priorite: string;
  statut: string;
  createdAt: string;
  ouvrageNom: string;
  ouvrageCode: string;
}

interface Props {
  signalements: SignalementRow[];
  communeId: string;
}

const STATUT_LABELS: Record<string, string> = {
  RECU:     "Reçu",
  TRIAGE:   "Triage",
  AFFECTE:  "Affecté",
  EN_COURS: "En cours",
  CLOS:     "Clos",
  ROUVERT:  "Rouvert",
};

export default function SignalementQueue({ signalements }: Props) {
  const [localStatuts, setLocalStatuts] = useState<Record<string, string>>({});

  async function passToTriage(id: string) {
    await fetch(`/api/signalements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut: "TRIAGE" }),
    });
    setLocalStatuts((prev) => ({ ...prev, [id]: "TRIAGE" }));
  }

  if (signalements.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-3xl mb-2">✅</p>
        <p className="text-sm font-medium text-gray-700">Aucun signalement en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {signalements.map((s) => {
        const statut = localStatuts[s.id] ?? s.statut;
        const prioriteColor = s.priorite === "P1"
          ? "border-l-4 border-red-500"
          : s.priorite === "P2" ? "border-l-4 border-amber-400"
          : "border-l-4 border-gray-200";

        return (
          <div key={s.id} className={`bg-white rounded-2xl border border-gray-100 ${prioriteColor} p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-gray-400">{s.numero}</p>
                <p className="font-semibold text-gray-900 text-sm mt-0.5">{s.panneLibelle}</p>
                <p className="text-xs text-gray-500 truncate">{s.ouvrageNom}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.priorite === "P1" ? "bg-red-100 text-red-700 font-bold" :
                  s.priorite === "P2" ? "bg-amber-100 text-amber-700" :
                  "bg-gray-100 text-gray-500"
                }`}>{s.priorite}</span>
                <p className="text-xs text-gray-400">{STATUT_LABELS[statut] ?? statut}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Link
                href={`/commune/signalement/${s.id}`}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
              >
                Voir
              </Link>
              {statut === "RECU" && (
                <button
                  onClick={() => passToTriage(s.id)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Prendre en triage
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
