# Mode d'emploi — Registre des équipements publics

Prototype de démonstration — Bénin 2026  
**Toutes les données sont fictives.**

---

## 1. Démarrage

### Prérequis
- Node.js 18+ (`node -v`)
- npm 9+ (`npm -v`)

### Installation

```bash
cd app
npm install
cp .env.example .env      # ou créer .env avec DATABASE_URL="file:./prisma/dev.db"
npm run seed              # initialise SQLite + insère les données de démo
npm run dev               # démarre sur http://localhost:3000
```

Ouvrir **http://localhost:3000** — le bandeau **DONNÉES FICTIVES** confirme que le prototype est actif.

---

## 2. Comptes de démonstration

| Rôle | Email | Mot de passe | Accès |
|------|-------|-------------|-------|
| Responsable communal | `responsable@commune-a.bj` | `demo1234` | `/commune` |
| Technicien terrain | `technicien@commune-a.bj` | `demo1234` | `/technicien` |
| Agence pôle ATL | `pole@atlantique.bj` | `demo1234` | `/pole` |
| Administrateur | `admin@registre.bj` | `demo1234` | toutes les vues |

> Les boutons de remplissage automatique sont disponibles sur la page `/login`.

---

## 3. Tester le comportement global — scénario fil rouge (12 étapes)

Ce scénario simule une panne sur la pompe **EAU-004** à Sèdjro-village, de la détection à la résolution.

### Étape 1 — L'habitant scanne le QR code
1. Aller sur **http://localhost:3000/ouvrage/EAU-004** (sans compte)
2. Vérifier : fiche publique avec état, population desservie, pannes typiques
3. Cliquer **Signaler un problème**

### Étape 2 — Signalement en 3 gestes
1. URL : **http://localhost:3000/signaler/EAU-004**
2. Geste 1 : choisir le type de panne (ex. « Pas d'eau »)
3. Geste 2 : saisir une description courte
4. Geste 3 : entrer un numéro de téléphone (optionnel) → **Envoyer**
5. Vérifier : numéro de suivi **S-2026-XXXX** affiché

### Étape 3 — Suivi habitant
1. URL : **http://localhost:3000/suivi/S-2026-XXXX** (numéro reçu)
2. Vérifier : barre de progression 5 étapes, statut EN_COURS
3. En fin de scénario : cliquer **Oui, le problème est résolu** → feedback habitant enregistré

### Étape 4 — Simulateur SMS
1. URL : **http://localhost:3000/sms-demo**
2. Cliquer le raccourci **« EAU-004 pas d'eau »** → Envoyer
3. Vérifier : inbox virtuelle reçoit le message, un signalement est créé en BDD

### Étape 5 — Commune : triage
1. Login : `responsable@commune-a.bj` / `demo1234`
2. URL : **http://localhost:3000/commune**
3. Vérifier : file de signalements avec priorités P1/P2, bouton **Affecter**
4. Affecter le signalement EAU-004 au technicien

### Étape 6 — Commune : KPIs
Sur la même page `/commune` :
- **Disponibilité** : doit afficher ~83 % (1 ouvrage HS sur 6)
- **Préventif** : commune D à < 60 % (zone rouge)
- **Délai médian** : ~29 h pour le scénario

### Étape 7 — Commune : carte
1. Menu → **Carte des ouvrages** ou URL **http://localhost:3000/commune/carte**
2. Vérifier : points colorés (vert = en service, rouge = HS), popup avec lien vers fiche

### Étape 8 — Technicien : intervention terrain
1. Login : `technicien@commune-a.bj` / `demo1234`
2. URL : **http://localhost:3000/technicien**
3. Cliquer sur le signalement EAU-004 → formulaire d'intervention
4. Cocher **Consignation électrique** (obligatoire — bloque la clôture sinon)
5. Saisir l'heure terrain (`doneAt`), une URL photo simulée, les coûts
6. **Soumettre et clore** → statut CLOS

### Étape 9 — Mode hors-ligne (PWA)
1. Ouvrir **http://localhost:3000/technicien/offline**
2. Désactiver le réseau dans les DevTools (F12 → Network → Offline)
3. Créer une intervention → elle est stockée dans IndexedDB
4. Réactiver le réseau → cliquer **Synchroniser** → l'intervention est envoyée au serveur

### Étape 10 — Commune : vérification post-intervention
1. Retour sur **http://localhost:3000/commune**
2. Disponibilité remonte vers 88 % (EAU-004 de retour en service)
3. Stock pièce **pompe immergée** : 1 → 0 (alerte rouge)

### Étape 11 — Pôle : tableau comparatif
1. Login : `pole@atlantique.bj` / `demo1234`
2. URL : **http://localhost:3000/pole**
3. Vérifier : tableau des communes, valeurs optimales en vert, suggestion achat groupé

### Étape 12 — Rejouer le scénario
1. Sur **http://localhost:3000/pole**
2. Cliquer **🔄 Rejouer le scénario** → réinitialise la BDD en < 10 s
3. Ou via API : `curl -X POST http://localhost:3000/api/demo/reset` (cookie admin requis)

---

## 4. Tester vue par vue

### Vue Habitant (sans compte)

| Page | URL | Ce qu'on vérifie |
|------|-----|-----------------|
| Fiche ouvrage | `/ouvrage/EAU-004` | Code, état, population, alertes composants |
| Signalement | `/signaler/EAU-004` | 3 étapes, pas de compte requis |
| Suivi | `/suivi/S-2026-0142` | Barre de progression, heure résolution |
| Simulateur SMS | `/sms-demo` | Envoi → création signalement |

### Vue Commune (responsable@commune-a.bj)

| Page | URL | Ce qu'on vérifie |
|------|-----|-----------------|
| Tableau de bord | `/commune` | 7 KPIs, file signalements, alertes stock |
| Carte | `/commune/carte` | Leaflet, markers colorés, popups |
| Liste ouvrages | `/commune/ouvrages` | Filtres, badges état, signalements actifs |
| Fiche ouvrage | `/commune/ouvrage/[id]` | Jumeau 3D, QR plate, historique |
| Stocks | `/commune/stocks` | Seuils, alertes rouges/ambre |

**Point spécifique — fiche ouvrage** :
- Cliquer sur un ouvrage avec modèle 3D → le viewer `<model-viewer>` apparaît
- Section **Plaque QR** → cliquer **🖨️ Imprimer la plaque** → dialogue d'impression

### Vue Technicien (technicien@commune-a.bj)

| Page | URL | Ce qu'on vérifie |
|------|-----|-----------------|
| Mes affectations | `/technicien` | Signalements triés P1 → P3 |
| Intervention | `/technicien/intervention/[id]` | Checklist, bloquage consignation, coûts |
| Hors-ligne | `/technicien/offline` | File IndexedDB, bouton sync |

**Tester le blocage checklist** :
1. Ouvrir une intervention correctif
2. Ne pas cocher **Consignation électrique**
3. Tenter de clore → message d'erreur (item bloquant)

**Tester le mode hors-ligne** :
1. F12 → Network → Offline
2. Remplir et soumettre une intervention → stockée localement
3. Enlever Offline → synchroniser

### Vue Pôle (pole@atlantique.bj)

| Page | URL | Ce qu'on vérifie |
|------|-----|-----------------|
| Tableau comparatif | `/pole` | Vert = meilleur, rouge < 80 % / < 60 % |
| Renouvellements | `/pole/renouvellements` | Timeline 2026–2033, groupements possibles |
| Limites MVP | `/pole/limites` | Tableau honnêteté technique |

**Tester l'export** :
1. Sur `/pole` → **⬇ Export CSV** → télécharge `pole-ATL-[date].csv`
2. **⬇ Export JSON** → télécharge le JSON complet

---

## 5. Tests automatisés

### Tests unitaires (7 KPIs, 24 cas)

```bash
cd app
npm test
# → 24 passed
```

Ces tests vérifient les 7 fonctions pures de `lib/indicateurs.ts` : disponibilité, délai médian, préventif à temps, signalements dans délai, coût annuel, âge face à durée de vie, couverture registre.

### Tests E2E Playwright (14 tests, scénario 12 étapes)

```bash
cd app
npm run test:e2e
# → 14 passed (~15s)
```

Couvre : fiche habitant, signalement, suivi, SMS, login commune/technicien/pôle, tableau de bord, carte, liste ouvrages, tableau comparatif pôle, viewports mobile (375px).

> Le serveur dev doit être lancé (`npm run dev`) avant les tests E2E, ou le `webServer` de `playwright.config.ts` le démarre automatiquement.

---

## 6. Réinitialiser les données

```bash
# Reseed complet (repart de zéro)
cd app && npm run seed

# Rejouer uniquement le scénario (API — garde les comptes)
curl -X POST http://localhost:3000/api/demo/reset \
  -H "Content-Type: application/json" \
  --cookie "session_token=<votre_token>"
```

Ou via l'interface : **http://localhost:3000/pole** → bouton **🔄 Rejouer le scénario**.

---

## 7. Structure des fichiers clés

```
app/
  app/
    ouvrage/[code]/     → Fiche publique habitant
    signaler/[code]/    → Formulaire signalement
    suivi/[numero]/     → Suivi signalement
    sms-demo/           → Simulateur SMS
    commune/            → Vue responsable communal
    technicien/         → Vue technicien PWA
    pole/               → Vue agence de pôle
    api/                → Routes API (signalements, interventions, SMS, pôle, reset)
  lib/
    indicateurs.ts      → 7 KPIs (fonctions pures testées)
    auth.ts             → Sessions httpOnly
    db.ts               → Client Prisma
    offlineDb.ts        → Dexie IndexedDB (PWA hors-ligne)
  prisma/
    schema.prisma       → Modèle de données
    seed.ts             → Données de démonstration
  public/
    sw.js               → Service Worker PWA
    manifest.json       → Manifest PWA
  e2e/
    scenario.spec.ts    → Tests Playwright
  lib/__tests__/
    indicateurs.test.ts → Tests Vitest
```

---

*Prototype de démonstration — conception auteur — données fictives (isFictif=true)*
