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
      <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <p className="text-3xl mb-2">✅</p>
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Aucun signalement en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {signalements.map((s) => {
        const statut = localStatuts[s.id] ?? s.statut;
        const leftBorderColor =
          s.priorite === "P1" ? "var(--bad)" :
          s.priorite === "P2" ? "var(--warn)" :
          "var(--line)";

        return (
          <div key={s.id} className="rounded-2xl p-4"
               style={{ background: "var(--surface)", border: "1px solid var(--line)", borderLeft: `4px solid ${leftBorderColor}` }}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>{s.numero}</p>
                <p className="font-bold text-sm mt-0.5" style={{ color: "var(--ink)" }}>{s.panneLibelle}</p>
                <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted)" }}>{s.ouvrageNom}</p>
              </div>
              <div className="text-right shrink-0 space-y-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: s.priorite === "P1" ? "var(--bad-bg)" :
                                    s.priorite === "P2" ? "var(--warn-bg)" : "var(--soft)",
                        color: s.priorite === "P1" ? "var(--bad)" :
                               s.priorite === "P2" ? "var(--warn)" : "var(--muted)",
                      }}>
                  {s.priorite}
                </span>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{STATUT_LABELS[statut] ?? statut}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Link
                href={`/commune/signalement/${s.id}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)" }}
              >
                Voir
              </Link>
              {statut === "RECU" && (
                <button
                  onClick={() => passToTriage(s.id)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-opacity hover:opacity-80"
                  style={{ background: "var(--navy)" }}
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
