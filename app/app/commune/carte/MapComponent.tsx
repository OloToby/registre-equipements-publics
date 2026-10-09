"use client";

// Composant carte Leaflet — rendu côté client uniquement
// Source : D-007 (Leaflet + SVG fallback), programme p. 39 (carte des ouvrages)

import { useEffect, useRef } from "react";

interface Marker {
  id: string;
  code: string;
  nom: string;
  etat: string;
  lat: number;
  lng: number;
  famille: string;
}

const ETAT_COLORS: Record<string, string> = {
  BON:          "#22c55e",
  ATTENTION:    "#f59e0b",
  HORS_SERVICE: "#ef4444",
};

const FAMILLE_EMOJI: Record<string, string> = {
  EAU_POTABLE: "💧",
  ECLAIRAGE:   "💡",
  SPORT:       "⚽",
  ARTISANAT:   "🏺",
  EDUCATION:   "🏫",
};

export default function MapComponent({ markers }: { markers: Marker[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;

      // Centre par défaut : Cotonou / Bénin
      const defaultCenter: [number, number] = markers.length > 0
        ? [markers.reduce((s, m) => s + m.lat, 0) / markers.length, markers.reduce((s, m) => s + m.lng, 0) / markers.length]
        : [6.36, 2.42];

      const map = L.map(mapRef.current!).setView(defaultCenter, 12);
      leafletRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      for (const marker of markers) {
        const color = ETAT_COLORS[marker.etat] ?? "#94a3b8";
        const emoji = FAMILLE_EMOJI[marker.famille] ?? "🏗️";

        // SVG marker coloré par état — fallback hors-ligne (D-007)
        const svgIcon = L.divIcon({
          className: "",
          html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;">${emoji}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const m = L.marker([marker.lat, marker.lng], { icon: svgIcon }).addTo(map);
        m.bindPopup(`
          <div style="min-width:160px">
            <p style="font-family:monospace;font-size:11px;color:#94a3b8;margin:0">${marker.code}</p>
            <p style="font-weight:600;margin:4px 0 2px">${marker.nom}</p>
            <a href="/ouvrage/${marker.code}" style="color:#2563eb;font-size:12px">Voir la fiche →</a>
          </div>
        `);
      }
    })();

    return () => {
      if (leafletRef.current) {
        (leafletRef.current as { remove: () => void }).remove();
        leafletRef.current = null;
      }
    };
  }, [markers]);

  return <div ref={mapRef} className="h-96 rounded-2xl border border-gray-200 z-0" />;
}
