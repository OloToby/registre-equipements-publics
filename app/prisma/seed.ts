// Seed — Registre des équipements publics
// Données fictives du scénario fil rouge (Deck 3, slides 5-13)
// Toutes les valeurs de démonstration sont étiquetées isFictif: true

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Initialisation du jeu de données de démonstration...");

  // ── PÔLES ────────────────────────────────────────────────────────────────────
  const poleAtl = await prisma.pole.upsert({
    where: { code: "ATL" },
    update: {},
    create: { nom: "Atlantique – Littoral", code: "ATL" },
  });

  // ── COMMUNES A-E (fictives) ──────────────────────────────────────────────────
  const communes: Record<string, Awaited<ReturnType<typeof prisma.commune.upsert>>> = {};
  const communeData = [
    { nom: "Commune A (Abomey-Calavi)", code: "COM-A" },
    { nom: "Commune B (Cotonou Nord)", code: "COM-B" },
    { nom: "Commune C (Ouidah)", code: "COM-C" },
    { nom: "Commune D (Sèmè-Kpodji)", code: "COM-D" },
    { nom: "Commune E (Porto-Novo Est)", code: "COM-E" },
  ];
  for (const cd of communeData) {
    communes[cd.code] = await prisma.commune.upsert({
      where: { code: cd.code },
      update: {},
      create: { nom: cd.nom, code: cd.code, poleId: poleAtl.id, isFictif: true },
    });
  }

  // ── ARRONDISSEMENTS ──────────────────────────────────────────────────────────
  const arrSejdro = await prisma.arrondissement.upsert({
    where: { code: "ARR-SEJDRO" },
    update: {},
    create: {
      nom: "Sèdjro-village",
      code: "ARR-SEJDRO",
      communeId: communes["COM-A"].id,
      lat: 6.4200,
      lng: 2.3100,
    },
  });

  // ── TYPES D'OUVRAGES ─────────────────────────────────────────────────────────

  // — EAU POTABLE : Forage équipé
  const typeForage = await prisma.typeOuvrage.upsert({
    where: { code: "FORAGE" },
    update: {},
    create: {
      famille: "EAU_POTABLE",
      nom: "Forage équipé",
      code: "FORAGE",
      modele3dFichier: "Chateau_eau_forage_solaire.glb",
    },
  });

  // Composants du forage
  const composantsForage = [
    { nom: "Pompe immergée", code: "POMPE", dureeVieAns: 7, ordre: 1, description: "Pompe immergée 0.75kW" },
    { nom: "Groupe motopompe", code: "MOTOPOMPE", dureeVieAns: 10, ordre: 2 },
    { nom: "Colonne de captage", code: "COLONNE", dureeVieAns: 20, ordre: 3 },
    { nom: "Tableau électrique", code: "TABLEAU_ELEC", dureeVieAns: 12, ordre: 4 },
    { nom: "Cuve de stockage", code: "CUVE", dureeVieAns: 20, ordre: 5 },
    { nom: "Capteur de niveau", code: "CAPTEUR_NIV", dureeVieAns: 5, ordre: 6, description: "Étalonnage annuel" },
  ];
  for (const c of composantsForage) {
    await prisma.composantType.upsert({
      where: { typeOuvrageId_code: { typeOuvrageId: typeForage.id, code: c.code } },
      update: {},
      create: { ...c, typeOuvrageId: typeForage.id },
    });
  }

  // Checklist forage (correctif)
  const checklistForage = [
    { label: "Consignation électrique effectuée", ordre: 1, bloqueCloture: true, description: "Couper l'alimentation avant toute intervention — sécurité obligatoire" },
    { label: "Présence des EPI (gants, protection oculaire)", ordre: 2, bloqueCloture: false },
    { label: "Relevé du débit avant intervention", ordre: 3, bloqueCloture: false },
    { label: "Dépose de la pièce défectueuse documentée", ordre: 4, bloqueCloture: false },
    { label: "Pose de la nouvelle pièce avec numéro de série", ordre: 5, bloqueCloture: false },
    { label: "Mesure du débit après intervention", ordre: 6, bloqueCloture: false },
  ];
  await prisma.checklistItemType.deleteMany({ where: { typeOuvrageId: typeForage.id } });
  for (const item of checklistForage) {
    await prisma.checklistItemType.create({
      data: { ...item, typeOuvrageId: typeForage.id, obligatoire: true, typeIntervention: "CORRECTIF" },
    });
  }

  // Pannes typiques forage
  const pannesForage = [
    { code: "PAS_EAU", libelle: "Pas d'eau", pictogramme: "Droplets", gravite: "CRITIQUE" },
    { code: "DEBIT_FAIBLE", libelle: "Débit insuffisant", pictogramme: "ArrowDown", gravite: "NORMALE" },
    { code: "FUITE", libelle: "Fuite visible", pictogramme: "AlertTriangle", gravite: "NORMALE" },
    { code: "COUPURE_ELEC", libelle: "Coupure électrique", pictogramme: "Zap", gravite: "CRITIQUE" },
    { code: "AUTRE", libelle: "Autre problème", pictogramme: "HelpCircle", gravite: "NORMALE" },
  ];
  await prisma.panneTypique.deleteMany({ where: { typeOuvrageId: typeForage.id } });
  for (const p of pannesForage) {
    await prisma.panneTypique.create({ data: { ...p, typeOuvrageId: typeForage.id } });
  }

  // Règle de priorité forage
  await prisma.priorityRule.deleteMany({ where: { typeOuvrageId: typeForage.id } });
  await prisma.priorityRule.create({
    data: {
      typeOuvrageId: typeForage.id,
      panneCodes: JSON.stringify(["PAS_EAU", "COUPURE_ELEC"]),
      priorite: "P1",
      delaiHeures: 48,
      justification: "Arrêt d'eau potable — délai visé 48 h (conception auteur)",
    },
  });
  await prisma.priorityRule.create({
    data: {
      typeOuvrageId: typeForage.id,
      panneCodes: JSON.stringify(["DEBIT_FAIBLE", "FUITE", "AUTRE"]),
      priorite: "P2",
      delaiHeures: 72,
      justification: "Dégradation non critique (conception auteur)",
    },
  });

  // Plan d'entretien forage
  await prisma.planEntretienType.deleteMany({ where: { typeOuvrageId: typeForage.id } });
  const planForage = await prisma.planEntretienType.create({
    data: {
      typeOuvrageId: typeForage.id,
      nom: "Inspection trimestrielle",
      periodiciteJours: 90,
      description: "Nettoyage, contrôle électrique, relevé capteurs (conception auteur)",
    },
  });

  // — ÉCLAIRAGE PUBLIC : Lampadaire solaire
  const typeLamp = await prisma.typeOuvrage.upsert({
    where: { code: "LAMP" },
    update: {},
    create: {
      famille: "ECLAIRAGE",
      nom: "Lampadaire solaire",
      code: "LAMP",
      modele3dFichier: "Eclairage_public_solaire.glb",
    },
  });
  const composantsLamp = [
    { nom: "Panneau solaire", code: "PANNEAU", dureeVieAns: 15, ordre: 1 },
    { nom: "Batterie lithium", code: "BATTERIE", dureeVieAns: 5, ordre: 2 },
    { nom: "LED luminaire", code: "LED", dureeVieAns: 8, ordre: 3 },
    { nom: "Régulateur MPPT", code: "REGULATEUR", dureeVieAns: 10, ordre: 4 },
    { nom: "Mât et fixations", code: "MAT", dureeVieAns: 20, ordre: 5 },
    { nom: "Câblage et connectiques", code: "CABLAGE", dureeVieAns: 12, ordre: 6 },
  ];
  for (const c of composantsLamp) {
    await prisma.composantType.upsert({
      where: { typeOuvrageId_code: { typeOuvrageId: typeLamp.id, code: c.code } },
      update: {},
      create: { ...c, typeOuvrageId: typeLamp.id },
    });
  }
  await prisma.checklistItemType.deleteMany({ where: { typeOuvrageId: typeLamp.id } });
  const checklistLamp = [
    { label: "Consignation électrique effectuée", ordre: 1, bloqueCloture: true },
    { label: "Vérification de la batterie (tension, usure)", ordre: 2, bloqueCloture: false },
    { label: "Nettoyage du panneau solaire", ordre: 3, bloqueCloture: false },
    { label: "Test d'allumage après intervention", ordre: 4, bloqueCloture: false },
  ];
  for (const item of checklistLamp) {
    await prisma.checklistItemType.create({ data: { ...item, typeOuvrageId: typeLamp.id, obligatoire: true, typeIntervention: "CORRECTIF" } });
  }
  await prisma.panneTypique.deleteMany({ where: { typeOuvrageId: typeLamp.id } });
  for (const p of [
    { code: "LAMPE_ETEINTE", libelle: "Lampe éteinte", pictogramme: "LampOff", gravite: "NORMALE" },
    { code: "PANNE_GROUPE", libelle: "Groupe de lampes éteintes", pictogramme: "AlertOctagon", gravite: "CRITIQUE" },
    { code: "BATTERIE_HS", libelle: "Batterie hors service", pictogramme: "BatteryWarning", gravite: "NORMALE" },
    { code: "VANDALISME", libelle: "Vandalisme / vol", pictogramme: "ShieldAlert", gravite: "NORMALE" },
    { code: "AUTRE", libelle: "Autre problème", pictogramme: "HelpCircle", gravite: "NORMALE" },
  ]) {
    await prisma.panneTypique.create({ data: { ...p, typeOuvrageId: typeLamp.id } });
  }
  await prisma.priorityRule.deleteMany({ where: { typeOuvrageId: typeLamp.id } });
  await prisma.priorityRule.create({
    data: { typeOuvrageId: typeLamp.id, panneCodes: JSON.stringify(["PANNE_GROUPE"]), priorite: "P2", delaiHeures: 72, justification: "Éclairage public groupé (conception auteur)" },
  });
  await prisma.priorityRule.create({
    data: { typeOuvrageId: typeLamp.id, panneCodes: JSON.stringify(["LAMPE_ETEINTE", "BATTERIE_HS", "VANDALISME", "AUTRE"]), priorite: "P3", delaiHeures: 120, justification: "Lampadaire unitaire (conception auteur)" },
  });

  // — SPORT, ARTISANAT, ÉDUCATION (types configurables)
  const typesSup = [
    { famille: "SPORT", nom: "Terrain multisport", code: "TERRAIN", modele3dFichier: "Terrain_multisport.glb" },
    { famille: "ARTISANAT", nom: "Base d'appui artisanat", code: "BASE_ART", modele3dFichier: "Base_appui_artisanat.glb" },
    { famille: "EDUCATION", nom: "Bloc de 3 classes", code: "BLOC3CL", modele3dFichier: "Bloc_3_classes.glb" },
  ];
  const typesCreated: Record<string, Awaited<ReturnType<typeof prisma.typeOuvrage.upsert>>> = {};
  for (const ts of typesSup) {
    typesCreated[ts.code] = await prisma.typeOuvrage.upsert({
      where: { code: ts.code },
      update: {},
      create: ts,
    });
    await prisma.panneTypique.deleteMany({ where: { typeOuvrageId: typesCreated[ts.code].id } });
    await prisma.panneTypique.create({ data: { typeOuvrageId: typesCreated[ts.code].id, code: "DEGRADATION", libelle: "Dégradation / détérioration", pictogramme: "AlertTriangle", gravite: "NORMALE" } });
    await prisma.panneTypique.create({ data: { typeOuvrageId: typesCreated[ts.code].id, code: "AUTRE", libelle: "Autre problème", pictogramme: "HelpCircle", gravite: "NORMALE" } });
    await prisma.priorityRule.deleteMany({ where: { typeOuvrageId: typesCreated[ts.code].id } });
    await prisma.priorityRule.create({ data: { typeOuvrageId: typesCreated[ts.code].id, panneCodes: JSON.stringify(["DEGRADATION", "AUTRE"]), priorite: "P3", delaiHeures: 168, justification: "École / terrain / base (conception auteur)" } });
  }

  // ── UTILISATEURS ─────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("demo1234", 10);
  const users = [
    { email: "admin@registre.bj", nom: "Admin Système", role: "ADMIN", communeId: null, poleCode: null },
    { email: "responsable@commune-a.bj", nom: "Responsable Commune A", role: "RESPONSABLE_COMMUNAL", communeId: communes["COM-A"].id, poleCode: null },
    { email: "technicien@commune-a.bj", nom: "Technicien Eau A", role: "TECHNICIEN", communeId: communes["COM-A"].id, poleCode: null },
    { email: "pole@atlantique.bj", nom: "Agent Pôle Atlantique", role: "AGENCE_POLE", communeId: null, poleCode: "ATL" },
  ];
  for (const u of users) {
    await prisma.utilisateur.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: hash },
    });
  }

  // ── OUVRAGES ─────────────────────────────────────────────────────────────────

  // EAU-004 — scénario fil rouge (Deck 3, slide 5)
  const eau004 = await prisma.ouvrage.upsert({
    where: { code: "EAU-004" },
    update: {},
    create: {
      code: "EAU-004",
      nom: "Système d'eau de Sèdjro-village",
      typeOuvrageId: typeForage.id,
      communeId: communes["COM-A"].id,
      arrondissementId: arrSejdro.id,
      isFictif: true,
      phase: "EXPLOITER",
      etat: "ATTENTION",
      lat: 6.4195,
      lng: 2.3105,
      populationDesservie: 1200,
      dateMiseEnService: new Date("2019-03-15"),
      maitreDOuvrage: "Mairie d'Abomey-Calavi (fictif)",
      entreprise: "SARL AquaBénin (fictif)",
      finGarantie: new Date("2022-03-15"),
      notes: "Données fictives — scénario de démonstration (Deck 3, slide 5)",
    },
  });

  // Composants de EAU-004
  const compTypesPompe = await prisma.composantType.findMany({ where: { typeOuvrageId: typeForage.id } });
  await prisma.composant.deleteMany({ where: { ouvrageId: eau004.id } });
  for (const ct of compTypesPompe) {
    const datePose = ct.code === "POMPE"
      ? new Date("2019-03-15")
      : new Date("2019-03-15");
    const ageAns = (new Date().getFullYear() - datePose.getFullYear()) +
      (new Date().getMonth() - datePose.getMonth()) / 12;
    const enAlerte = ct.code === "POMPE" && ageAns >= ct.dureeVieAns * 0.85;
    await prisma.composant.create({
      data: {
        ouvrageId: eau004.id,
        composantTypeId: ct.id,
        datePose,
        etat: ct.code === "POMPE" ? "USURE" : "BON",
        enAlerte,
        numeroDeSerie: ct.code === "POMPE" ? "PMP-2019-0041" : undefined,
        coutAchat: ct.code === "POMPE" ? 850000 : undefined,
      },
    });
  }

  // Contrat d'entretien EAU-004
  await prisma.contratEntretien.deleteMany({ where: { ouvrageId: eau004.id } });
  await prisma.contratEntretien.create({
    data: {
      ouvrageId: eau004.id,
      operateur: "SARL MainteauBénin (fictif)",
      telephone: "229-00-00-00-00",
      debut: new Date("2024-01-01"),
      fin: new Date("2026-12-31"),
      montantAnnuel: 350000,
    },
  });

  // Stock — pompes immergées dans COM-A (stock à 1 avant le scénario)
  await prisma.stockPiece.deleteMany({ where: { communeId: communes["COM-A"].id, composantTypeCode: "POMPE" } });
  await prisma.stockPiece.create({
    data: {
      communeId: communes["COM-A"].id,
      composantTypeCode: "POMPE",
      designation: "Pompe immergée 0.75kW (fictif)",
      quantite: 1,
      seuilAlerte: 1,
      coutUnitaire: 850000,
      fournisseur: "SARL AquaBénin (fictif)",
    },
  });

  // Tâches préventives en retard (pour la situation de départ)
  if (planForage) {
    await prisma.tachePreventive.deleteMany({ where: { ouvrageId: eau004.id } });
    await prisma.tachePreventive.create({
      data: {
        ouvrageId: eau004.id,
        planTypeId: planForage.id,
        label: "Inspection trimestrielle — nettoyage et relevés",
        echeanceAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // il y a 15 jours
        statut: "EN_RETARD",
      },
    });
  }

  // Autres ouvrages d'eau (pour les indicateurs des communes B-E)
  const autresOuvrages = [
    { code: "EAU-001", nom: "Forage de Cocotomey", communeId: communes["COM-A"].id },
    { code: "EAU-002", nom: "Forage de Hêvié", communeId: communes["COM-A"].id },
    { code: "EAU-003", nom: "Système d'eau de Togoudo", communeId: communes["COM-A"].id },
    { code: "EAU-005", nom: "Forage de Zinvié Nord", communeId: communes["COM-B"].id },
    { code: "EAU-006", nom: "Système d'eau de Ouidah-Centre", communeId: communes["COM-C"].id },
    { code: "EAU-007", nom: "Forage de Adjarra", communeId: communes["COM-D"].id },
    { code: "EAU-008", nom: "Forage de Dangbo", communeId: communes["COM-E"].id },
  ];
  for (const o of autresOuvrages) {
    await prisma.ouvrage.upsert({
      where: { code: o.code },
      update: {},
      create: {
        ...o,
        typeOuvrageId: typeForage.id,
        isFictif: true,
        phase: "EXPLOITER",
        etat: "BON",
        dateMiseEnService: new Date("2021-06-01"),
        populationDesservie: Math.floor(800 + Math.random() * 1000),
      },
    });
  }

  // Lampadaires
  const lampadaires = [
    { code: "ELC-001", nom: "Lampadaires Sèdjro-route", communeId: communes["COM-A"].id },
    { code: "ELC-002", nom: "Lampadaires Marché Hêvié", communeId: communes["COM-A"].id },
    { code: "ELC-003", nom: "Éclairage Togoudo-centre", communeId: communes["COM-B"].id },
  ];
  for (const l of lampadaires) {
    await prisma.ouvrage.upsert({
      where: { code: l.code },
      update: {},
      create: { ...l, typeOuvrageId: typeLamp.id, isFictif: true, phase: "EXPLOITER", etat: "BON", dateMiseEnService: new Date("2022-08-01") },
    });
  }

  // Ouvrage sport / artisanat / éducation (un chacun)
  await prisma.ouvrage.upsert({
    where: { code: "SPT-001" },
    update: {},
    create: { code: "SPT-001", nom: "Terrain multisport Sèdjro", typeOuvrageId: typesCreated["TERRAIN"].id, communeId: communes["COM-A"].id, isFictif: true, phase: "EXPLOITER", etat: "BON", dateMiseEnService: new Date("2023-01-10") },
  });
  await prisma.ouvrage.upsert({
    where: { code: "ART-001" },
    update: {},
    create: { code: "ART-001", nom: "Base artisanat Hêvié", typeOuvrageId: typesCreated["BASE_ART"].id, communeId: communes["COM-A"].id, isFictif: true, phase: "EXPLOITER", etat: "BON", dateMiseEnService: new Date("2023-06-01") },
  });
  await prisma.ouvrage.upsert({
    where: { code: "EDU-001" },
    update: {},
    create: { code: "EDU-001", nom: "École Sèdjro — 3 classes", typeOuvrageId: typesCreated["BLOC3CL"].id, communeId: communes["COM-A"].id, isFictif: true, phase: "EXPLOITER", etat: "BON", dateMiseEnService: new Date("2021-09-01") },
  });

  // ── STOCKS POUR TOUTES LES COMMUNES (pompes sous seuil dans 3 sur 5) ────────
  const stocksSetup = [
    { code: "COM-B", quantite: 0 }, // sous seuil
    { code: "COM-C", quantite: 2 },
    { code: "COM-D", quantite: 0 }, // sous seuil
    { code: "COM-E", quantite: 0 }, // sous seuil
  ];
  for (const s of stocksSetup) {
    await prisma.stockPiece.deleteMany({ where: { communeId: communes[s.code].id, composantTypeCode: "POMPE" } });
    await prisma.stockPiece.create({
      data: {
        communeId: communes[s.code].id,
        composantTypeCode: "POMPE",
        designation: "Pompe immergée 0.75kW (fictif)",
        quantite: s.quantite,
        seuilAlerte: 1,
        coutUnitaire: 850000,
      },
    });
  }

  // ── TÂCHES PRÉVENTIVES pour les autres communes ──────────────────────────────
  if (planForage) {
    // Commune D à 44 % de préventif fait à temps (Deck 3, slide 13)
    const eau007 = await prisma.ouvrage.findUnique({ where: { code: "EAU-007" } });
    if (eau007) {
      await prisma.tachePreventive.deleteMany({ where: { ouvrageId: eau007.id } });
      for (let i = 0; i < 9; i++) {
        await prisma.tachePreventive.create({
          data: {
            ouvrageId: eau007.id,
            planTypeId: planForage.id,
            label: `Inspection trimestrielle #${i + 1}`,
            echeanceAt: new Date(Date.now() - (i * 90 + 5) * 24 * 60 * 60 * 1000),
            faiteAt: i < 4 ? new Date(Date.now() - (i * 90) * 24 * 60 * 60 * 1000) : null,
            statut: i < 4 ? "FAITE" : "EN_RETARD",
          },
        });
      }
    }
  }

  // ── SIGNALEMENTS EXISTANTS (file de triage initiale : 5 signalements) ────────
  const eau001 = await prisma.ouvrage.findUnique({ where: { code: "EAU-001" } });
  const eau002 = await prisma.ouvrage.findUnique({ where: { code: "EAU-002" } });

  if (eau001 && eau002) {
    const signExist = await prisma.signalement.count({ where: { numero: { startsWith: "S-2026-0" } } });
    if (signExist === 0) {
      const initSignalements = [
        { ouvrage: eau001, panne: { code: "DEBIT_FAIBLE", libelle: "Débit insuffisant" } },
        { ouvrage: eau002, panne: { code: "FUITE", libelle: "Fuite visible" } },
        { ouvrage: eau001, panne: { code: "AUTRE", libelle: "Autre problème" } },
        { ouvrage: eau002, panne: { code: "DEBIT_FAIBLE", libelle: "Débit insuffisant" } },
      ];
      for (let idx = 0; idx < initSignalements.length; idx++) {
        const { ouvrage, panne } = initSignalements[idx];
        await prisma.signalement.create({
          data: {
            numero: `S-2026-${String(idx + 138).padStart(4, "0")}`,
            ouvrageId: ouvrage.id,
            panneCode: panne.code,
            panneLibelle: panne.libelle,
            fonctionne: true,
            canal: "QR",
            statut: "RECU",
            anonyme: true,
            createdAt: new Date(Date.now() - (idx + 1) * 2 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  // ── SNAPSHOT DE DÉMONSTRATION ────────────────────────────────────────────────
  // Sauvegardé après la création initiale pour le bouton "Rejouer le scénario"
  console.log("✅ Données de démonstration chargées.");
  console.log("   EAU-004 — Système d'eau de Sèdjro-village (scénario fil rouge)");
  console.log("   5 communes fictives — Pôle Atlantique/Littoral");
  console.log("   Comptes : admin@registre.bj / responsable@commune-a.bj / technicien@commune-a.bj / pole@atlantique.bj");
  console.log("   Mot de passe commun : demo1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
