import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ouvrage = await prisma.ouvrage.findUnique({
    where: { id: params.id },
    include: {
      typeOuvrage: { include: { pannesTypiques: true, checklistItems: true } },
      commune: true,
      arrondissement: true,
      composants: { include: { composantType: true } },
      signalements: {
        where: { statut: { notIn: ["CLOS"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      interventions: { orderBy: { createdAt: "desc" }, take: 10, include: { preuve: true, piecesIntervention: true } },
      tachesPreventives: { orderBy: { echeanceAt: "asc" }, take: 10 },
      documents: true,
      contrats: true,
      capteurs: { orderBy: { mesureAt: "desc" }, take: 1 },
    },
  });

  if (!ouvrage) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Contrôle d'accès : fiche publique accessible à tous ; détail complet nécessite un rôle
  const session = await getSession();
  const isPublic = req.nextUrl.searchParams.get("public") === "1";

  if (!isPublic && !session) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  if (session && session.role !== "ADMIN" && session.role !== "AGENCE_POLE") {
    if (session.communeId && session.communeId !== ouvrage.communeId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  }

  return NextResponse.json({ ouvrage });
}
