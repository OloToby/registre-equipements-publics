"use client";

// Carte Leaflet dynamique — chargement client uniquement (pas SSR)
// Source : D-007 (Leaflet + OpenStreetMap + SVG fallback hors-ligne)
// Conception auteur : markers colorés par état, popup avec lien vers fiche

import dynamic from "next/dynamic";

interface Marker {
  id: string;
  code: string;
  nom: string;
  etat: string;
  lat: number;
  lng: number;
  famille: string;
}

// Lazy-load la carte pour éviter le SSR avec Leaflet
const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-96 rounded-2xl flex items-center justify-center" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
      <p className="text-sm" style={{ color: "var(--muted)" }}>Chargement de la carte…</p>
    </div>
  ),
});

export default function CarteLeaflet({ markers }: { markers: Marker[] }) {
  return <MapComponent markers={markers} />;
}
