"use client";

// Liste des interventions en file d'attente hors-ligne
// Source : Deck 3 slide 9 (file de synchronisation), programme p. 38
// Conception auteur : affichage Dexie IndexedDB, bouton sync manuelle

import { useState, useEffect } from "react";
import { getOfflineDb, syncPendingInterventions, type OfflineIntervention } from "@/lib/offlineDb";
import Link from "next/link";

export default function OfflineQueuePage() {
  const [items, setItems] = useState<OfflineIntervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function load() {
    try {
      const db = getOfflineDb();
      const all = await db.interventions.orderBy("createdAt").reverse().toArray();
      setItems(all);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    const result = await syncPendingInterventions();
    setSyncResult(`${result.synced} synchronisée(s), ${result.errors} erreur(s)`);
    setSyncing(false);
    await load();
  }

  const pending = items.filter((i) => !i.synced);
  const done = items.filter((i) => i.synced);

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/technicien" className="text-sm hover:underline" style={{ color: "var(--navy)" }}>← Retour</Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>File hors-ligne</h1>
      </div>

      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Chargement…</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="rounded-2xl p-4" style={{ background: "var(--warn-bg)", border: "1px solid #E0C570" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: "var(--warn)" }}>
                  {pending.length} en attente de synchronisation
                </p>
                <button
                  onClick={handleSync}
                  disabled={syncing || !navigator.onLine}
                  className="text-xs disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                  style={{ background: "var(--navy)" }}
                >
                  {syncing ? "Sync…" : "Synchroniser"}
                </button>
              </div>
              {syncResult && (
                <p className="text-xs mb-2" style={{ color: "var(--warn)" }}>{syncResult}</p>
              )}
              <div className="space-y-2">
                {pending.map((item) => (
                  <div key={item.id} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid #E0C570" }}>
                    <p className="text-xs font-mono" style={{ color: "var(--muted)" }}>{item.ouvrageCode || item.ouvrageId}</p>
                    <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{item.type}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      Terrain : {item.doneAt ? new Date(item.doneAt).toLocaleString("fr-FR") : "—"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      En file depuis : {new Date(item.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && (
            <div className="rounded-2xl p-5 text-center" style={{ background: "var(--ok-bg)", border: "1px solid #A3D9BC" }}>
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm font-semibold" style={{ color: "var(--ok)" }}>File vide</p>
              <p className="text-xs mt-1" style={{ color: "var(--ok)" }}>Toutes les interventions sont synchronisées.</p>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
                Synchronisées ({done.length})
              </h2>
              <div className="space-y-2">
                {done.slice(0, 5).map((item) => (
                  <div key={item.id} className="rounded-xl p-3" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm" style={{ color: "var(--ink)" }}>{item.type} — {item.ouvrageCode || item.ouvrageId}</p>
                      <span className="text-xs" style={{ color: "var(--ok)" }}>✓ Sync</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {item.syncedAt ? new Date(item.syncedAt).toLocaleString("fr-FR") : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
