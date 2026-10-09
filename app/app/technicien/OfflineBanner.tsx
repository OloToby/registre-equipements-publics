"use client";

// Bannière hors-ligne avec compteur de sync
// Source : Deck 3 slide 9 (indicateur déconnexion), programme p. 38
// Conception auteur : détecte navigator.onLine + écoute les événements réseau

import { useState, useEffect, useCallback } from "react";
import { getPendingSyncCount, syncPendingInterventions } from "@/lib/offlineDb";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingCount(count);
    } catch {
      // IndexedDB pas disponible (SSR) — silencieux
    }
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshCount();

    const onOnline = () => { setIsOnline(true); refreshCount(); };
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshCount]);

  // Enregistrement du service worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      const result = await syncPendingInterventions();
      setLastSync(`${result.synced} synchronisée(s), ${result.errors} erreur(s)`);
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
      isOnline ? "bg-blue-50 border border-blue-200" : "bg-amber-50 border border-amber-300"
    }`}>
      <div>
        <p className={`text-sm font-semibold ${isOnline ? "text-blue-800" : "text-amber-800"}`}>
          {isOnline ? "🌐 En ligne" : "📴 Hors connexion"}
        </p>
        {pendingCount > 0 && (
          <p className={`text-xs mt-0.5 ${isOnline ? "text-blue-600" : "text-amber-700"}`}>
            {pendingCount} intervention{pendingCount > 1 ? "s" : ""} en attente de synchronisation
          </p>
        )}
        {lastSync && <p className="text-xs text-gray-500 mt-0.5">{lastSync}</p>}
      </div>
      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          {syncing ? "Sync…" : "Synchroniser"}
        </button>
      )}
    </div>
  );
}
