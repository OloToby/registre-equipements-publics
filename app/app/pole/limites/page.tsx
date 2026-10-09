// Limites du MVP — Deck 3 slide 14 (honnêteté technique)
// Conception auteur : tableau ce qui est démo vs production

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

const ETAT_COLORS: Record<string, string> = {
  "Démo":     "bg-amber-100 text-amber-800",
  "Simulé":   "bg-orange-100 text-orange-800",
  "Partiel":  "bg-blue-100 text-blue-800",
  "Partielle":"bg-blue-100 text-blue-800",
  "Calculés": "bg-green-100 text-green-800",
};

export default function LimitesMvpPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pole" className="text-blue-600 text-sm">← Tableau de bord pôle</Link>
        <h1 className="text-xl font-bold text-gray-900">Limites du MVP</h1>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-amber-800">Ce démonstrateur est un MVP de validation</p>
        <p className="text-xs text-amber-700 mt-1">
          Il illustre les fonctionnalités clés décrites dans le programme (p. 36–42) et le Deck 3 slide 14.
          Les données sont fictives. Le déploiement en production nécessite les évolutions ci-dessous.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Tableau de conformité — Deck 3 slide 14</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Fonctionnalité</th>
                <th className="text-center px-3 py-3 font-medium w-24">État MVP</th>
                <th className="text-left px-3 py-3 font-medium">Dans ce démonstrateur</th>
                <th className="text-left px-3 py-3 font-medium">En production</th>
              </tr>
            </thead>
            <tbody>
              {LIMITES.map((row) => (
                <tr key={row.fonctionnalite} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.fonctionnalite}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ETAT_COLORS[row.etatMvp] ?? "bg-gray-100 text-gray-600"}`}>
                      {row.etatMvp}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">{row.descriptionMvp}</td>
                  <td className="px-3 py-3 text-xs text-gray-500 italic">{row.production}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700">Stack technique de ce démonstrateur</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {["Next.js 14 App Router", "TypeScript", "Tailwind CSS", "Prisma + SQLite", "Dexie.js (IndexedDB)",
            "Leaflet + OpenStreetMap", "@google/model-viewer", "qrcode npm", "PWA (Service Worker)", "Vitest"].map((tech) => (
            <span key={tech} className="bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-lg font-mono">{tech}</span>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">Conception auteur — Deck 3 slide 14 — Ce tableau est de bonne foi</p>
    </main>
  );
}
