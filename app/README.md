# Registre du cycle de vie des équipements publics

Prototype de démonstration — Bénin 2026  
**Toutes les données sont fictives (`isFictif=true`).**

---

## Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le fichier d'environnement
cp .env.example .env
# Éditez .env si vous souhaitez changer DATABASE_URL ou NEXT_PUBLIC_BASE_URL

# 3. Initialiser la base de données SQLite et insérer les données de démonstration
npm run seed

# 4. Lancer le serveur de développement
npm run dev
```

Ouvrez http://localhost:3000 dans votre navigateur.

---

## Comptes de démonstration (mot de passe : `demo1234`)

| Rôle | Email |
|------|-------|
| Responsable communal | `demo@commune-a.bj` |
| Technicien terrain | `tech@commune-a.bj` |
| Agence pôle ATL | `pole@atl.bj` |
| Administrateur | `admin@registre.bj` |

---

## Scénario fil rouge (Deck 3 slide 12)

1. **Habitant** : scanner `/ouvrage/EAU-004` → signaler un problème → recevoir un numéro de suivi
2. **Commune** : traiter le signalement S-2026-0142, affecter au technicien
3. **Technicien** : remplir la checklist d'intervention, saisir l'heure terrain (`doneAt`), clore
4. **Habitant** : suivre sur `/suivi/S-2026-0142`, confirmer la résolution
5. **Commune** : vérifier les KPIs (disponibilité 83 % → 88 %, délai 29 h)
6. **Pôle** : consulter le tableau comparatif, réinitialiser le scénario

---

## Structure du projet

```
app/
  app/             # Next.js App Router (pages et API routes)
    ouvrage/       # Fiche publique habitant (sans compte)
    signaler/      # Formulaire signalement 3 gestes
    suivi/         # Suivi de signalement
    sms-demo/      # Simulateur SMS
    commune/       # Vue responsable communal
    technicien/    # Vue technicien PWA (hors-ligne)
    pole/          # Vue agence de pôle
    api/           # API REST (signalements, interventions, SMS, pôle, démo reset)
  lib/             # Fonctions pures (indicateurs.ts), auth, db
  prisma/          # Schéma Prisma + seed
  public/          # Assets statiques, manifest PWA, service worker
  e2e/             # Tests Playwright (scénario 12 étapes)
  lib/__tests__/   # Tests Vitest (7 KPIs, 24 cas)
```

---

## Commandes utiles

```bash
# Tests unitaires (7 KPIs, 24 cas — Deck 2 slide 15)
npm test

# Tests E2E Playwright (scénario 12 étapes — Deck 3 slide 12)
npm run test:e2e

# TypeScript sans émission
npx tsc --noEmit

# Réinitialiser la base de données de démonstration
npm run seed

# Réinitialiser uniquement le scénario (API)
curl -X POST http://localhost:3000/api/demo/reset \
  -H "Cookie: session_token=<token_admin>"
```

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 14 (App Router) + TypeScript |
| Style | Tailwind CSS |
| Base de données | Prisma 5 + SQLite |
| Authentification | Sessions httpOnly (bcrypt, 8h) |
| PWA hors-ligne | Service Worker + Dexie.js (IndexedDB) |
| Carte | Leaflet + OpenStreetMap |
| Modèle 3D | @google/model-viewer (GLB) |
| QR code | qrcode npm (canvas) |
| Tests unitaires | Vitest 5 |
| Tests E2E | Playwright 1.64 |

---

## Limites du MVP

Ce prototype illustre les fonctionnalités décrites dans le programme (p. 36–42).  
Voir `/pole/limites` pour le tableau complet des écarts MVP vs production.

Les données sont fictives et signalées par le bandeau **DONNÉES FICTIVES** en haut de chaque page.

---

*Conception auteur — prototype de démonstration à des fins pédagogiques*
