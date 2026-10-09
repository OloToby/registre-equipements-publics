import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireSameCommune, audit } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  // Supporte l'ID ou le numéro de suivi
  const isNumero = params.id.startsWith("S-");
  const signalement = await prisma.signalement.findFirst({
    where: isNumero ? { numero: params.id } : { id: params.id },
    include: {
      ouvrage: { include: { typeOuvrage: true, commune: true, arrondissement: true } },
      affectation: { include: { technicien: true, contrat: true } },
      intervention: { include: { preuve: true, checklistItems: true, piecesIntervention: true, technicien: true } },
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!signalement) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ signalement });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession(["RESPONSABLE_COMMUNAL", "ADMIN", "TECHNICIEN"]).catch(() => null);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const signalement = await prisma.signalement.findUnique({
    where: { id: params.id },
    include: { ouvrage: true },
  });
  if (!signalement) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await requireSameCommune(session, signalement.ouvrage.communeId);

  const body = await req.json();
  const { statut, priorite, technicienId, contratId, stockPieceId, confirmationHabitant } = body;

  // Gestion de la confirmation habitant : un "non" rouvre le ticket
  if (confirmationHabitant === false && signalement.statut === "CLOS") {
    const updated = await prisma.signalement.update({
      where: { id: params.id },
      data: { statut: "ROUVERT", confirmationHabitant: false, confirmeAt: new Date() },
    });
    await audit("ROUVERT_PAR_HABITANT", "Signalement", params.id, null, { raison: "Habitant indique non résolu" }, params.id);
    console.log(`[SMS SIMULÉ] → Commune : Signalement ${signalement.numero} rouvert par l'habitant.`);
    return NextResponse.json({ signalement: updated });
  }

  if (confirmationHabitant === true) {
    const updated = await prisma.signalement.update({
      where: { id: params.id },
      data: { confirmationHabitant: true, confirmeAt: new Date() },
    });
    return NextResponse.json({ signalement: updated });
  }

  const updates: Record<string, unknown> = {};
  if (statut) updates.statut = statut;
  if (priorite) updates.priorite = priorite;

  const updated = await prisma.signalement.update({ where: { id: params.id }, data: updates });

  // Affectation
  if (technicienId || contratId) {
    const existingAff = await prisma.affectation.findUnique({ where: { signalementId: params.id } });
    if (existingAff) {
      await prisma.affectation.update({
        where: { signalementId: params.id },
        data: { technicienId: technicienId ?? existingAff.technicienId, contratId: contratId ?? existingAff.contratId, pieceReserveeId: stockPieceId ?? existingAff.pieceReserveeId },
      });
    } else {
      await prisma.affectation.create({
        data: { signalementId: params.id, technicienId, contratId, pieceReserveeId: stockPieceId },
      });
    }

    // Réservation de pièce
    if (stockPieceId) {
      await prisma.stockReservation.create({
        data: { stockId: stockPieceId, signalementId: params.id, reserveePour: technicienId, quantite: 1 },
      });
      await prisma.stockPiece.update({
        where: { id: stockPieceId },
        data: { quantite: { decrement: 1 } },
      });
    }

    await prisma.signalement.update({ where: { id: params.id }, data: { statut: "AFFECTE" } });
    await audit("AFFECTER", "Signalement", params.id, session.id, { technicienId, statut: "AFFECTE" }, params.id);
    console.log(`[SMS SIMULÉ] → Technicien ${technicienId} : Nouvelle tâche assignée — Signalement ${signalement.numero}`);
  }

  return NextResponse.json({ signalement: updated });
}
