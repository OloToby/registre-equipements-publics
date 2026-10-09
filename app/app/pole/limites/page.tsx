// Limites du MVP — Deck 3 slide 14 (honnêteté technique)
// Conception auteur : tableau ce qui est démo vs production

import React from "react";
import Link from "next/link";

const LIMITES = [
  {
    fonctionnalite: "Authentification",
    etatMvp: "Démo",
    descriptionMvp: "Cookies httpOnly, sessions SQLite, 4 comptes fictifs",
    production: "OAuth2 / SSO ministère, MFA, gestion des rôles LDAP",
  },
  {
    fonctionnalite: "Base de données",
    etatMvp: "Démo",
    descriptionMvp: "SQLite local, données fictives, seed déterministe",
    production: "PostgreSQL haute disponibilité, sauvegardes automatiques",
  },
  {
    fonctionnalite: "Synchronisation hors-ligne",
    etatMvp: "Partielle",
    descriptionMvp: "IndexedDB Dexie, Background Sync API, file d'attente locale",
    production: "CRDTs ou OT pour conflits, chiffrement at-rest, audit sync",
  },
  {
    fonctionnalite: "Photos / preuves",
    etatMvp: "Simulé",
    descriptionMvp: "URL saisie manuellement, pas de vrai upload",
    production: "Upload S3 / cloud stockage, compression, métadonnées EXIF",
  },
  {
    fonctionnalite: "Modèle 3D",
    etatMvp: "Démo",
    descriptionMvp: "GLB fictif, @google/model-viewer, pas de BIM réel",
    production: "IFC/BIM intégration, gestion des révisions, accès tiers",
  },
  {
    fonctionnalite: "SMS / notifications",
    etatMvp: "Simulé",
    descriptionMvp: "Inbox virtuelle en mémoire, parsing basique",
    production: "Gateway SMS agrée (Orange Bénin / MTN), webhooks entrants",
  },
  {
    fonctionnalite: "Plaque QR",
    etatMvp: "Démo",
    descriptionMvp: "Génération canvas, impression navigateur",
    production: "Impression en lot, NFC optionnel, résistance aux UV",
  },
  {
    fonctionnalite: "Export données",
    etatMvp: "Partiel",
    descriptionMvp: "CSV / JSON client-side, données en mémoire",
    production: "Export serveur paginé, formats XLSX, PDF réglementaires",
  },
  {
    fonctionnalite: "Carte géographique",
    etatMvp: "Démo",
    descriptionMvp: "Leaflet + OpenStreetMap, coordonnées fictives",
    production: "Données GPS terrain, fond cartographique officiel Bénin",
  },
  {
    fonctionnalite: "KPIs et indicateurs",
    etatMvp: "Calculés",
    descriptionMvp: "7 KPIs sur données fictives, fonctions pures testées",
    production: "Connexion SIEREM/SIEAU, validation données terrain, historique",
  },
  {
    fonctionnalite: "Multi-pôle / multi-commune",
    etatMvp: "Partiel",
    descriptionMvp: "1 pôle (ATL), 5 communes fictives",
    production: "Tous les pôles du Bénin, gestion des délégations",
  },
  {
    fonctionnalite: "Accessibilité",
    etatMvp: "Basique",
    descriptionMvp: "Tailwind responsive, labels ARIA principaux",
    production: "Conformité RGAA, tests avec lecteurs d'écran, formation agents",
  },
];

const ETAT_STYLES: Record<string, React.CSSProperties> = {
  "Démo":     { background: "var(--warn-bg)", color: "var(--warn)" },
  "Simulé":   { background: "var(--warn-bg)", color: "var(--warn)" },
  "Partiel":  { background: "var(--sky)", color: "var(--navy)" },
  "Partielle":{ background: "var(--sky)", color: "var(--navy)" },
  "Calculés": { background: "var(--ok-bg)", color: "var(--ok)" },
};

export default function LimitesMvpPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pole" className="text-sm hover:underline" style={{ color: "var(--navy)" }}>← Tableau de bord pôle</Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--navy)" }}>Limites du MVP</h1>
      </div>

      <div className="rounded-xl p-4" style={{ background: "var(--warn-bg)", border: "1px solid #E0C570" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--warn)" }}>Ce démonstrateur est un MVP de validation</p>
        <p className="text-xs mt-1" style={{ color: "var(--warn)" }}>
          Il illustre les fonctionnalités clés décrites dans le programme (p. 36–42) et le Deck 3 slide 14.
          Les données sont fictives. Le déploiement en production nécessite les évolutions ci-dessous.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Tableau de conformité — Deck 3 slide 14</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide" style={{ background: "var(--soft)", color: "var(--muted)" }}>
                <th className="text-left px-4 py-3 font-medium">Fonctionnalité</th>
                <th className="text-center px-3 py-3 font-medium w-24">État MVP</th>
                <th className="text-left px-3 py-3 font-medium">Dans ce démonstrateur</th>
                <th className="text-left px-3 py-3 font-medium">En production</th>
              </tr>
            </thead>
            <tbody>
              {LIMITES.map((row) => (
                <tr key={row.fonctionnalite} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{row.fonctionnalite}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={ETAT_STYLES[row.etatMvp] ?? { background: "var(--soft)", color: "var(--muted)" }}>
                      {row.etatMvp}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs" style={{ color: "var(--ink)" }}>{row.descriptionMvp}</td>
                  <td className="px-3 py-3 text-xs italic" style={{ color: "var(--muted)" }}>{row.production}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--soft)", border: "1px solid var(--line)" }}>
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Stack technique de ce démonstrateur</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {["Next.js 14 App Router", "TypeScript", "Tailwind CSS", "Prisma + SQLite", "Dexie.js (IndexedDB)",
            "Leaflet + OpenStreetMap", "@google/model-viewer", "qrcode npm", "PWA (Service Worker)", "Vitest"].map((tech) => (
            <span key={tech} className="font-mono px-2 py-1 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}>{tech}</span>
          ))}
        </div>
      </div>

      <p className="text-xs text-center" style={{ color: "var(--muted)" }}>Conception auteur — Deck 3 slide 14 — Ce tableau est de bonne foi</p>
    </main>
  );
}
