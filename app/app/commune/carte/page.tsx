// Carte des ouvrages — vue commune avec état coloré
// Source : programme p. 39 (cartographie), D-007 (Leaflet + SVG fallback)
// Conception auteur : carte interactive, couleurs par état

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import CarteLeaflet from "./CarteLeaflet";
import Link from "next/link";

export default async function CartePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/commune/carte");

  const communeId = session.communeId ?? (
    await prisma.commune.findFirst({ where: { code: "COM-A" } })
  )?.id;
  if (!communeId) redirect("/commune");

  const ouvrages = await prisma.ouvrage.findMany({
    where: { communeId },
    include: { typeOuvrage: true, arrondissement: true },
  });

  const markers = ouvrages
    .filter((o) => o.lat && o.lng)
    .map((o) => ({
      id: o.id,
      code: o.code,
      nom: o.nom,
      etat: o.etat,
      lat: o.lat!,
      lng: o.lng!,
      famille: o.typeOuvrage.famille,
    }));

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/commune" className="text-blue-600 text-sm">← Tableau de bord</Link>
        <h1 className="text-xl font-bold text-gray-900">Carte des ouvrages</h1>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap gap-3 text-xs">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />En service</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />Attention</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" />Hors service</span>
      </div>

      <CarteLeaflet markers={markers} />

      {markers.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Aucun ouvrage géolocalisé pour cette commune. Les coordonnées GPS sont nécessaires.
        </div>
      )}

      <p className="text-xs text-gray-400">
        Fond de carte : OpenStreetMap — Conception auteur — Coordonnées fictives
      </p>
    </main>
  );
}
