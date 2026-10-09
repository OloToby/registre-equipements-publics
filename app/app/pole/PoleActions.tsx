"use client";

// Actions pôle : export CSV/JSON et rejouer le scénario
// Source : programme p. 41 (export), Deck 3 slide 14 (reset démo)

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CommuneRow {
  communeId: string;
  communeNom: string;
  communeCode: string;
  ouvragesTotal: number;
  indicateurs: {
    disponibilite: number;
    preventifFaitATempsPct: number;
    delaiMedianH: number;
    signalementsDansDelaiPct: number;
  };
  stocksSousSeuil: number;
}

interface Props {
  tableau: CommuneRow[];
  poleNom: string;
  poleCode: string;
}

export default function PoleActions({ tableau, poleNom, poleCode }: Props) {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  function exportCsv() {
    const header = "commune_code,commune_nom,ouvrages_total,disponibilite_pct,preventif_fait_pct,delai_median_h,dans_delai_pct,stocks_sous_seuil\n";
    const rows = tableau.map((c) =>
      [
        c.communeCode, `"${c.communeNom}"`, c.ouvragesTotal,
        c.indicateurs.disponibilite, c.indicateurs.preventifFaitATempsPct,
        c.indicateurs.delaiMedianH, c.indicateurs.signalementsDansDelaiPct,
        c.stocksSousSeuil,
      ].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pole-${poleCode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    const data = {
      pole: { code: poleCode, nom: poleNom },
      exportedAt: new Date().toISOString(),
      isFictif: true,
      tableau,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pole-${poleCode}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function rejouerScenario() {
    if (!confirm("Rejouer le scénario de démonstration ? Toutes les interventions et signalements seront réinitialisés.")) return;
    setResetting(true);
    setResetDone(false);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (res.ok) {
        setResetDone(true);
        setTimeout(() => {
          router.refresh();
          setResetDone(false);
        }, 2000);
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 items-center justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={exportCsv}
          className="text-xs bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
        >
          ⬇ Export CSV
        </button>
        <button
          onClick={exportJson}
          className="text-xs bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
        >
          ⬇ Export JSON
        </button>
      </div>
      <button
        onClick={rejouerScenario}
        disabled={resetting}
        className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {resetting ? "Réinitialisation…" : resetDone ? "✅ Scénario réinitialisé" : "🔄 Rejouer le scénario"}
      </button>
    </div>
  );
}
