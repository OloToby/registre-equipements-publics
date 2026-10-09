# Décisions d'architecture

## D-001 — Next.js App Router + TypeScript
**Choix :** Next.js 14 avec App Router, TypeScript strict.
**Raison :** SSR pour la fiche publique (habitant sans JS), RSC pour la commune et le pôle, Client Components uniquement pour les parties interactives et PWA.

## D-002 — SQLite en développement, schéma PostgreSQL-compatible
**Choix :** Prisma + SQLite (`dev.db`). Migration PostgreSQL uniquement en production.
**Raison :** `npm run seed` fonctionne hors ligne, sans service externe. Prisma gère la compatibilité.

## D-003 — NextAuth.js v5 (beta) pour l'authentification
**Choix :** Sessions JWT côté serveur, pas de service OAuth tiers obligatoire.
**Raison :** Autonomie totale, pas de dépendance à Google/GitHub, déployable au Bénin sans accès extérieur.

## D-004 — Dexie.js pour l'IndexedDB du technicien
**Choix :** Dexie (wrapper IndexedDB), file de sync maison via `background-sync` API + `useEffect`.
**Raison :** API la plus lisible pour le hors-ligne, compatibilité navigateur correcte.

## D-005 — @google/model-viewer pour les .glb
**Choix :** `<model-viewer>` web component via CDN, chargé en lazy sur la fiche d'ouvrage.
**Raison :** Zéro configuration three.js, fonctionne sur mobile Android (cible principale), rendu propre.

## D-006 — qrcode (npm) pour la génération des plaques
**Choix :** `qrcode` npm + html2canvas ou génération SVG native pour l'export PDF/PNG.
**Raison :** Pas de service tiers, tout se génère côté client dans le navigateur.

## D-007 — Leaflet + OpenStreetMap avec repli SVG
**Choix :** Leaflet dynamiquement importé (no-SSR). Repli : schéma SVG statique des arrondissements si tuiles inaccessibles.
**Raison :** Fonctionne hors ligne si les tuiles sont en cache, repli garantit l'affichage en démo sans réseau.

## D-008 — Priorités en base, pas codées en dur
**Choix :** Table `PriorityRule` liée au `TypeOuvrage`, chargée au runtime.
**Raison :** Deck 3 slide 8 — « table de règles configurable en base ». P1 = arrêt eau (48 h), P2 = éclairage groupé, P3 = école/terrain.

## D-009 — Double horodatage d'intervention
**Choix :** Champ `doneAt` (horodatage terrain, IndexedDB) distinct de `syncedAt` (serveur, à la réception).
**Raison :** Deck 3 slide 10 — « on sait quand le travail a été fait, pas seulement quand il a été transmis ».

## D-010 — Données fictives étiquetées `isFictif: true` en base
**Choix :** Champ booléen sur `Ouvrage` et `Commune`, bandeau « DONNÉES FICTIVES » rendu si présent.
**Raison :** Règle d'honnêteté : aucun élément fictif présenté comme réel.

## D-011 — Vitest pour les fonctions pures (indicateurs)
**Choix :** Vitest (compatible ESM, rapide). Playwright pour le test E2E du scénario complet.
**Raison :** Les 7 indicateurs ont chacun une fonction pure testée ; le scénario de démo a un test bout en bout.
