// IndexedDB hors-ligne pour le technicien — D-004 (Dexie.js)
// Source : programme p. 38 (mode déconnecté), Deck 3 slide 9 (file de sync)
// Conception auteur : stockage local des interventions + file de synchronisation

import Dexie, { type Table } from "dexie";

export interface OfflineIntervention {
  id?: number; // auto-incrémenté par Dexie
  localId: string; // uuid local pour déduplication
  ouvrageId: string;
  ouvrageCode: string;
  ouvrageNom: string;
  signalementId?: string;
  type: string;
  doneAt?: string; // ISO horodatage terrain
  checklistItems?: { itemTypeId: string; label: string; coche: boolean; bloqueCloture: boolean }[];
  piecesIntervention?: { action: string; composantType: string; numeroDeSerie?: string; datePose?: string }[];
  photoAvantUrl?: string;
  photoApresUrl?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  coutMO?: number;
  coutPieces?: number;
  synced: boolean;
  syncedAt?: string;
  serverId?: string; // id retourné par le serveur après sync
  createdAt: string; // ISO
}

export interface OfflineOuvrage {
  id: string;
  code: string;
  nom: string;
  typeOuvrageId: string;
  typeOuvrageNom: string;
  etat: string;
  communeNom: string;
  signalements: {
    id: string;
    numero: string;
    panneLibelle: string;
    priorite: string;
    statut: string;
  }[];
  checklistItems: {
    id: string;
    label: string;
    obligatoire: boolean;
    bloqueCloture: boolean;
    typeIntervention: string;
  }[];
  cachedAt: string;
}

class RegistreOfflineDB extends Dexie {
  interventions!: Table<OfflineIntervention>;
  ouvrages!: Table<OfflineOuvrage>;

  constructor() {
    super("RegistreOfflineDB");
    this.version(1).stores({
      interventions: "++id, localId, ouvrageId, synced, createdAt",
      ouvrages: "id, code, cachedAt",
    });
  }
}

let _db: RegistreOfflineDB | null = null;

export function getOfflineDb(): RegistreOfflineDB {
  if (!_db) _db = new RegistreOfflineDB();
  return _db;
}

export async function queueIntervention(data: Omit<OfflineIntervention, "id" | "synced" | "createdAt">): Promise<void> {
  const db = getOfflineDb();
  await db.interventions.add({
    ...data,
    synced: false,
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingSyncCount(): Promise<number> {
  const db = getOfflineDb();
  return db.interventions.where("synced").equals(0).count();
}

export async function syncPendingInterventions(): Promise<{ synced: number; errors: number }> {
  const db = getOfflineDb();
  const pending = await db.interventions.where("synced").equals(0).toArray();

  let synced = 0;
  let errors = 0;

  for (const item of pending) {
    try {
      const res = await fetch("/api/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ouvrageId: item.ouvrageId,
          signalementId: item.signalementId,
          type: item.type,
          doneAt: item.doneAt,
          checklistItems: item.checklistItems,
          piecesIntervention: item.piecesIntervention,
          photoAvantUrl: item.photoAvantUrl,
          photoApresUrl: item.photoApresUrl,
          lat: item.lat,
          lng: item.lng,
          notes: item.notes,
          coutMO: item.coutMO,
          coutPieces: item.coutPieces,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        await db.interventions.update(item.id!, {
          synced: true,
          syncedAt: new Date().toISOString(),
          serverId: data.intervention?.id,
        });
        synced++;
      } else {
        errors++;
      }
    } catch {
      errors++;
    }
  }

  return { synced, errors };
}

export async function cacheOuvrage(ouvrage: Omit<OfflineOuvrage, "cachedAt">): Promise<void> {
  const db = getOfflineDb();
  await db.ouvrages.put({ ...ouvrage, cachedAt: new Date().toISOString() });
}

export async function getCachedOuvrage(id: string): Promise<OfflineOuvrage | undefined> {
  const db = getOfflineDb();
  return db.ouvrages.get(id);
}
