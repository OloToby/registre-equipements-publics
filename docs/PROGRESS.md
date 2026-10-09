# Suivi d'avancement — Registre des équipements publics

> Mis à jour à chaque jalon. Survit à la compaction de contexte.

## État global

| Jalon | Description | Statut |
|-------|-------------|--------|
| 0 | Cadrage — sources, docs, plan | ✅ Terminé |
| 1 | Socle — schéma, seed, auth, indicateurs | 🔄 En cours |
| 2 | Parcours habitant | ⏳ À faire |
| 3 | Parcours technicien (PWA hors ligne) | ⏳ À faire |
| 4 | Vue commune | ⏳ À faire |
| 5 | Vue pôle + exports + scénario rejouable | ⏳ À faire |
| 6 | Finition — E2E, accessibilité, README | ⏳ À faire |

## Jalon 0 — Cadrage ✅

- [x] Extraction des 3 decks → `docs/reference/*.md`
- [x] ZIP des modèles 3D extrait → `/tmp/modeles3d_extract/`
- [x] `docs/DECISIONS.md` écrit (11 décisions)
- [x] Branche `jalon-1-socle` créée

## Jalon 1 — Socle 🔄

- [ ] Projet Next.js initialisé
- [ ] Schéma Prisma complet
- [ ] Seed du scénario fil rouge (EAU-004, 5 communes)
- [ ] Authentification (NextAuth) + rôles
- [ ] Journal d'audit
- [ ] 7 indicateurs en fonctions pures avec tests Vitest

## Critères d'acceptation (suivi final)

1. ⏳ Démo 12 étapes bout en bout (29 h, 83 %→88 %, stock 1→0, S-2026-0142)
2. ⏳ Clôture hors ligne réelle + sync + double horodatage
3. ⏳ Clôture refusée si consignation manquante ou preuve incomplète
4. ⏳ 7 indicateurs calculés depuis la base, évoluent après clôture
5. ⏳ Droits par rôle côté serveur + journal consultable
6. ⏳ 6 .glb affichés, plaque QR imprimable, export CSV/JSON
7. ⏳ « Rejouer le scénario » < 10 secondes
8. ⏳ `npm install && npm run seed && npm run dev` suffit
9. ⏳ Tout poussé sur GitHub (main à jour)
10. ⏳ Aucun fictif présenté comme réel, chiffres sourcés

## Poussées GitHub

| Date | Commit | Branche | Statut |
|------|--------|---------|--------|
| — | — | — | — |

## Décisions notables

Voir `docs/DECISIONS.md`.

## Idées post-MVP

Voir `docs/IDEES_POST_MVP.md`.
