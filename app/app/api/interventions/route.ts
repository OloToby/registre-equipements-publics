import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, audit } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Créer une intervention (ou recevoir la sync d'une intervention hors ligne)
  const session = await requireSession(["TECHNICIEN", "RESPONSABLE_COMMUNAL", "ADMIN"]).catch(() => null);

  const body = await req.json();
  const {
    ouvrageId, signalementId, type, technicienId,
    doneAt, // horodatage terrain
    checklistItems, piecesIntervention,
    photoAvantUrl, photoApresUrl, photoAvantAt, photoApresAt,
    lat, lng, mesures, coutMO, coutPieces, notes,
  } = body;

  if (!ouvrageId) return NextResponse.json({ error: "ouvrageId requis" }, { status: 400 });

  const ouvrage = await prisma.ouvrage.findUnique({ where: { id: ouvrageId } });
  if (!ouvrage) return NextResponse.json({ error: "Ouvrage introuvable" }, { status: 404 });

  const intervention = await prisma.intervention.create({
    data: {
      ouvrageId,
      signalementId: signalementId ?? null,
      type: type ?? "CORRECTIF",
      statut: "EN_COURS",
      technicienId: technicienId ?? session?.id ?? null,
      doneAt: doneAt ? new Date(doneAt) : null,
      syncedAt: new Date(), // horodatage serveur
      mesures: mesures ? JSON.stringify(mesures) : null,
      coutMO, coutPieces, notes,
    },
  });

  // Checklist
  if (checklistItems && Array.isArray(checklistItems)) {
    for (const item of checklistItems) {
      await prisma.checklistItemResponse.create({
        data: {
          interventionId: intervention.id,
          itemTypeId: item.itemTypeId,
          label: item.label,
          coche: item.coche,
          bloqueCloture: item.bloqueCloture ?? false,
        },
      });
    }
  }

  // Pièces
  if (piecesIntervention && Array.isArray(piecesIntervention)) {
    for (const piece of piecesIntervention) {
      await prisma.pieceIntervention.create({
        data: {
          interventionId: intervention.id,
          action: piece.action,
          composantType: piece.composantType,
          numeroDeSerie: piece.numeroDeSerie,
          datePose: piece.datePose ? new Date(piece.datePose) : null,
          coutUnitaire: piece.coutUnitaire,
          stockPieceId: piece.stockPieceId,
        },
      });

      // Si une nouvelle pièce est posée, mise à jour du composant
      if (piece.action === "POSE" && piece.numeroDeSerie) {
        const composantType = await prisma.composantType.findFirst({
          where: { code: piece.composantType, typeOuvrage: { ouvrages: { some: { id: ouvrageId } } } },
        });
        if (composantType) {
          await prisma.composant.updateMany({
            where: { ouvrageId, composantTypeId: composantType.id },
            data: { numeroDeSerie: piece.numeroDeSerie, datePose: piece.datePose ? new Date(piece.datePose) : new Date(), etat: "BON", enAlerte: false },
          });
        }
      }
    }
  }

  // Preuve
  if (photoAvantUrl || photoApresUrl || lat || lng) {
    const complete = !!(photoAvantUrl && photoApresUrl && (lat || true));
    await prisma.preuve.create({
      data: {
        interventionId: intervention.id,
        photoAvantUrl, photoApresUrl,
        photoAvantAt: photoAvantAt ? new Date(photoAvantAt) : null,
        photoApresAt: photoApresAt ? new Date(photoApresAt) : null,
        lat, lng, complete,
      },
    });
  }

  if (signalementId) {
    await prisma.signalement.update({ where: { id: signalementId }, data: { statut: "EN_COURS" } });
  }

  await audit("CREATE_INTERVENTION", "Intervention", intervention.id, session?.id ?? null);
  return NextResponse.json({ intervention }, { status: 201 });
}
