// Réinitialisation de la démo — remet la BDD à l'état initial du scénario fil rouge
// Source : programme p. 45 (critère de succès : rejouer le scénario en < 10 s)
// Conception auteur : endpoint réservé ADMIN, purge puis re-seed les données isFictif

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function POST() {
  let session;
  try {
    session = await requireSession(["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const t0 = Date.now();

  // 1. Supprimer les données de démonstration créées pendant la session
  await prisma.auditLog.deleteMany({});
  await prisma.preuve.deleteMany({});
  await prisma.checklistItemResponse.deleteMany({});
  await prisma.pieceIntervention.deleteMany({});
  await prisma.intervention.deleteMany({});
  await prisma.affectation.deleteMany({});
  await prisma.stockReservation.deleteMany({});
  await prisma.signalement.deleteMany({});

  // 2. Remettre les ouvrages à leur état initial
  await prisma.ouvrage.updateMany({
    where: { isFictif: true },
    data: { etat: "BON" },
  });
  await prisma.ouvrage.update({
    where: { code: "EAU-004" },
    data: { etat: "ATTENTION" },
  });

  // 3. Remettre les composants de EAU-004 à l'état initial
  const eau004 = await prisma.ouvrage.findUnique({ where: { code: "EAU-004" } });
  if (eau004) {
    const pompeType = await prisma.composantType.findFirst({
      where: { code: "POMPE", typeOuvrageId: eau004.typeOuvrageId },
    });
    if (pompeType) {
      await prisma.composant.updateMany({
        where: { ouvrageId: eau004.id, composantTypeId: pompeType.id },
        data: { etat: "USURE", enAlerte: true },
      });
    }
  }

  // 4. Remettre le stock de pompes de COM-A à 1 (état initial du scénario)
  const comA = await prisma.commune.findUnique({ where: { code: "COM-A" } });
  if (comA) {
    await prisma.stockPiece.updateMany({
      where: { communeId: comA.id, composantTypeCode: "POMPE" },
      data: { quantite: 1 },
    });
  }

  // 5. Recréer les signalements initiaux du scénario (file d'attente de triage)
  const ouvrageEau004 = await prisma.ouvrage.findUnique({
    where: { code: "EAU-004" },
    include: { typeOuvrage: { include: { priorityRules: true } } },
  });

  if (ouvrageEau004) {
    const signalementsInitiaux = [
      { numero: "S-2026-0138", panneCode: "DEBIT_FAIBLE", panneLibelle: "Débit insuffisant — moins de 2 L/s", priorite: "P2", canal: "QR" as const, statut: "RECU" as const },
      { numero: "S-2026-0139", panneCode: "FUITE",       panneLibelle: "Fuite visible au niveau du tuyau principal", priorite: "P2", canal: "SMS" as const, statut: "TRIAGE" as const },
      { numero: "S-2026-0140", panneCode: "PAS_EAU",     panneLibelle: "Aucune eau depuis 6h", priorite: "P1", canal: "QR" as const, statut: "TRIAGE" as const },
      { numero: "S-2026-0141", panneCode: "COUPURE_ELEC","panneLibelle": "Coupure électrique au tableau", priorite: "P1", canal: "APPEL" as const, statut: "RECU" as const },
    ];

    for (const s of signalementsInitiaux) {
      await prisma.signalement.create({
        data: {
          ...s,
          ouvrageId: ouvrageEau004.id,
          fonctionne: false,
          anonyme: true,
          numeroSuivi: s.numero,
        },
      });
    }
  }

  // 6. Remettre les tâches préventives de la commune D
  const comD = await prisma.commune.findUnique({ where: { code: "COM-D" } });
  if (comD) {
    const ouvragesD = await prisma.ouvrage.findMany({ where: { communeId: comD.id } });
    for (const o of ouvragesD) {
      // Remettre les tâches EN_RETARD à PREVUE pour refléter l'état initial 44%
      await prisma.tachePreventive.updateMany({
        where: { ouvrageId: o.id, statut: "EN_RETARD" },
        data: { statut: "PREVUE" },
      });
    }
  }

  const elapsed = Date.now() - t0;

  console.log(`[DEMO RESET] Base de données réinitialisée en ${elapsed}ms par ${session.email}`);

  return NextResponse.json({
    ok: true,
    message: "Scénario réinitialisé",
    elapsed_ms: elapsed,
    isFictif: true,
  });
}
