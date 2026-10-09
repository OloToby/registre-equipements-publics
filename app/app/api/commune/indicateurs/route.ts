import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  calcDisponibilite, calcDelaiMedian, calcPreventifFaitATempsPct,
  calcSignalementsDansDelaiPct, calcCoutEntretienAnnuel,
  calcAgeMoyenFaceDureeVie, calcCouvertureRegistrePct,
} from "@/lib/indicateurs";

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireSession(["RESPONSABLE_COMMUNAL", "ADMIN", "AGENCE_POLE"]);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const communeId = req.nextUrl.searchParams.get("communeId") ?? session.communeId;
  if (!communeId) return NextResponse.json({ error: "communeId requis" }, { status: 400 });

  // Contrôle d'accès : un responsable communal ne voit que sa commune
  if (session.role === "RESPONSABLE_COMMUNAL" && session.communeId !== communeId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const ouvrages = await prisma.ouvrage.findMany({
    where: { communeId },
    include: {
      composants: { include: { composantType: true } },
      tachesPreventives: true,
      interventions: { include: { preuve: true }, orderBy: { createdAt: "desc" } },
      signalements: { orderBy: { createdAt: "desc" } },
      typeOuvrage: { include: { priorityRules: true } },
    },
  });

  const ouvragesTotal = ouvrages.length;
  const ouvragesHorsSvc = ouvrages.filter((o) => o.etat === "HORS_SERVICE").length;

  // Indicateur 1 : Disponibilité
  const disponibilite = calcDisponibilite(ouvragesTotal, ouvragesHorsSvc);

  // Indicateur 2 : Délai médian
  const allInterventions = ouvrages.flatMap((o) =>
    o.interventions
      .filter((i) => i.statut === "CLOS" && i.signalementId)
      .map((i) => {
        const sign = o.signalements.find((s) => s.id === i.signalementId);
        const rules = o.typeOuvrage.priorityRules.map((r) => ({
          panneCodes: JSON.parse(r.panneCodes) as string[],
          priorite: r.priorite,
          delaiHeures: r.delaiHeures,
        }));
        const delaiVise = rules[0]?.delaiHeures ?? 48;
        return {
          signalementCreatedAt: sign?.createdAt ?? i.createdAt,
          closedAt: i.syncedAt ?? i.updatedAt,
          delaiViséHeures: delaiVise,
        };
      })
  );

  const delaiMedian = calcDelaiMedian(allInterventions);

  // Indicateur 3 : Préventif fait à temps
  const allTaches = ouvrages.flatMap((o) => o.tachesPreventives);
  const preventifPct = calcPreventifFaitATempsPct(allTaches);

  // Indicateur 4 : Signalements dans le délai
  const signalementsDansDelaiPct = calcSignalementsDansDelaiPct(allInterventions);

  // Indicateur 5 : Coût entretien
  const allCouts = ouvrages.flatMap((o) =>
    o.interventions.filter((i) => i.statut === "CLOS").map((i) => ({ coutMO: i.coutMO ?? undefined, coutPieces: i.coutPieces ?? undefined }))
  );
  const coutTotal = calcCoutEntretienAnnuel(allCouts);

  // Indicateur 6 : Âge moyen
  const allComposants = ouvrages.flatMap((o) =>
    o.composants.map((c) => ({ datePose: c.datePose, dureeVieAns: c.composantType.dureeVieAns }))
  );
  const ageMoyenPct = calcAgeMoyenFaceDureeVie(allComposants);

  // Indicateur 7 : Couverture
  const couverturePct = calcCouvertureRegistrePct(ouvragesTotal, ouvragesTotal); // 100% par définition (tous inscrits)

  // Extras
  const signalements = ouvrages.flatMap((o) => o.signalements);
  const aTraiter = signalements.filter((s) => ["RECU", "TRIAGE", "ROUVERT"].includes(s.statut)).length;

  return NextResponse.json({
    communeId,
    isFictif: true,
    indicateurs: {
      disponibilite: Math.round(disponibilite * 10) / 10,
      delaiMedianH: Math.round(delaiMedian * 10) / 10,
      preventifFaitATempsPct: Math.round(preventifPct),
      signalementsDansDelaiPct: Math.round(signalementsDansDelaiPct),
      coutEntretienAnnuel: coutTotal,
      ageMoyenFaceDureeViePct: Math.round(ageMoyenPct),
      couvertureRegistrePct: Math.round(couverturePct),
    },
    extras: {
      ouvragesTotal,
      ouvragesHorsSvc,
      aTraiter,
    },
  });
}
