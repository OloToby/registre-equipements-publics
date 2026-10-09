import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, audit } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireSession(["TECHNICIEN", "RESPONSABLE_COMMUNAL", "ADMIN"]).catch(() => null);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const intervention = await prisma.intervention.findUnique({
    where: { id: params.id },
    include: {
      checklistItems: true,
      preuve: true,
      signalement: true,
      ouvrage: { include: { typeOuvrage: { include: { checklistItems: true } } } },
    },
  });

  if (!intervention) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // ── Vérification preuve complète ────────────────────────────────────────────
  const checklistTypes = intervention.ouvrage.typeOuvrage.checklistItems
    .filter((c) => c.typeIntervention === intervention.type || c.typeIntervention === "TOUS");

  // 1. Consignation électrique cochée ?
  const consignationItem = checklistTypes.find((c) => c.bloqueCloture);
  if (consignationItem) {
    const consigResponse = intervention.checklistItems.find(
      (r) => r.itemTypeId === consignationItem.id
    );
    if (!consigResponse?.coche) {
      return NextResponse.json({
        error: "CONSIGNATION_MANQUANTE",
        message: `La consignation électrique doit être cochée avant la clôture (sécurité obligatoire).`,
      }, { status: 422 });
    }
  }

  // 2. Checklist complète ?
  const obligatoires = checklistTypes.filter((c) => c.obligatoire);
  for (const item of obligatoires) {
    const resp = intervention.checklistItems.find((r) => r.itemTypeId === item.id);
    if (!resp?.coche) {
      return NextResponse.json({
        error: "CHECKLIST_INCOMPLETE",
        message: `L'item "${item.label}" est obligatoire avant la clôture.`,
      }, { status: 422 });
    }
  }

  // 3. Preuve (photos + position) ?
  const preuve = intervention.preuve;
  if (!preuve?.photoAvantUrl || !preuve?.photoApresUrl) {
    return NextResponse.json({
      error: "PREUVE_INCOMPLETE",
      message: "Photos avant et après l'intervention requises pour la clôture.",
    }, { status: 422 });
  }

  // ── Clôture ─────────────────────────────────────────────────────────────────
  const body = await req.json().catch(() => ({}));
  const { doneAt } = body;

  await prisma.preuve.update({ where: { interventionId: params.id }, data: { complete: true } });

  const closed = await prisma.intervention.update({
    where: { id: params.id },
    data: {
      statut: "CLOS",
      doneAt: doneAt ? new Date(doneAt) : intervention.doneAt ?? new Date(),
      syncedAt: new Date(),
    },
  });

  // Mise à jour du signalement
  if (intervention.signalementId) {
    await prisma.signalement.update({
      where: { id: intervention.signalementId },
      data: { statut: "CLOS" },
    });

    // SMS simulé vers l'habitant
    const sign = intervention.signalement;
    if (sign?.telephoneContact) {
      const delaiH = doneAt
        ? Math.round((new Date(doneAt).getTime() - sign.createdAt.getTime()) / 3600000)
        : null;
      console.log(`[SMS SIMULÉ] → Habitant (${sign.telephoneContact}) : Votre signalement ${sign.numero} a été résolu${delaiH ? ` en ${delaiH}h` : ""}. Le problème est-il réglé ? /suivi/${sign.numero}`);
    }
  }

  // Mise à jour état ouvrage
  await prisma.ouvrage.update({
    where: { id: intervention.ouvrageId },
    data: { etat: "BON" },
  });

  await audit("CLORE_INTERVENTION", "Intervention", params.id, session.id, { doneAt, syncedAt: new Date().toISOString() });

  return NextResponse.json({ intervention: closed });
}
