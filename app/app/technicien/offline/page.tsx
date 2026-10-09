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
        <Link href="/technicien" className="text-blue-600 text-sm">← Retour</Link>
        <h1 className="text-xl font-bold text-gray-900">File hors-ligne</h1>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Chargement…</p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-amber-800">
                  {pending.length} en attente de synchronisation
                </p>
                <button
                  onClick={handleSync}
                  disabled={syncing || !navigator.onLine}
                  className="text-xs bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg"
                >
                  {syncing ? "Sync…" : "Synchroniser"}
                </button>
              </div>
              {syncResult && (
                <p className="text-xs text-amber-700 mb-2">{syncResult}</p>
              )}
              <div className="space-y-2">
                {pending.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-3 border border-amber-100">
                    <p className="text-xs font-mono text-gray-400">{item.ouvrageCode || item.ouvrageId}</p>
                    <p className="text-sm font-medium text-gray-800">{item.type}</p>
                    <p className="text-xs text-gray-500">
                      Terrain : {item.doneAt ? new Date(item.doneAt).toLocaleString("fr-FR") : "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      En file depuis : {new Date(item.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm font-semibold text-green-800">File vide</p>
              <p className="text-xs text-green-600 mt-1">Toutes les interventions sont synchronisées.</p>
            </div>
          )}

          {done.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Synchronisées ({done.length})
              </h2>
              <div className="space-y-2">
                {done.slice(0, 5).map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-700">{item.type} — {item.ouvrageCode || item.ouvrageId}</p>
                      <span className="text-xs text-green-600">✓ Sync</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
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
