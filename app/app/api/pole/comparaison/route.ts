import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import {
  calcDisponibilite, calcPreventifFaitATempsPct,
  calcSignalementsDansDelaiPct, calcDelaiMedian,
} from "@/lib/indicateurs";

export async function GET(req: NextRequest) {
  let session;
  try {
    session = await requireSession(["AGENCE_POLE", "ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const poleCode = req.nextUrl.searchParams.get("poleCode") ?? session.poleCode ?? "ATL";

  const pole = await prisma.pole.findUnique({
    where: { code: poleCode },
    include: {
      communes: {
        include: {
          ouvrages: {
            include: {
              composants: { include: { composantType: true } },
              tachesPreventives: true,
              interventions: { orderBy: { createdAt: "desc" } },
              signalements: { orderBy: { createdAt: "desc" } },
              typeOuvrage: { include: { priorityRules: true } },
            },
          },
          stocks: true,
        },
      },
    },
  });

  if (!pole) return NextResponse.json({ error: "Pôle introuvable" }, { status: 404 });

  const tableau = pole.communes.map((commune) => {
    const ouvragesTotal = commune.ouvrages.length;
    const ouvragesHS = commune.ouvrages.filter((o) => o.etat === "HORS_SERVICE").length;
    const dispo = calcDisponibilite(ouvragesTotal, ouvragesHS);

    const taches = commune.ouvrages.flatMap((o) => o.tachesPreventives);
    const preventif = calcPreventifFaitATempsPct(taches);

    const allInterventions = commune.ouvrages.flatMap((o) =>
      o.interventions.filter((i) => i.statut === "CLOS").map((i) => ({
        signalementCreatedAt: i.createdAt,
        closedAt: i.syncedAt ?? i.updatedAt,
        delaiViséHeures: 48,
      }))
    );
    const delai = calcDelaiMedian(allInterventions);
    const dansDelai = calcSignalementsDansDelaiPct(allInterventions);

    // Pièces sous seuil
    const stocksSousSeuil = commune.stocks.filter((s) => s.quantite <= s.seuilAlerte);

    return {
      communeId: commune.id,
      communeNom: commune.nom,
      communeCode: commune.code,
      ouvragesTotal,
      indicateurs: {
        disponibilite: Math.round(dispo * 10) / 10,
        preventifFaitATempsPct: Math.round(preventif),
        delaiMedianH: Math.round(delai * 10) / 10,
        signalementsDansDelaiPct: Math.round(dansDelai),
      },
      stocksSousSeuil: stocksSousSeuil.length,
      stockDetails: stocksSousSeuil.map((s) => ({
        designation: s.designation,
        quantite: s.quantite,
        seuil: s.seuilAlerte,
      })),
    };
  });

  // Déterminer les meilleures valeurs (vert)
  const maxDispo = Math.max(...tableau.map((c) => c.indicateurs.disponibilite));
  const maxPrev = Math.max(...tableau.map((c) => c.indicateurs.preventifFaitATempsPct));
  const minDelai = Math.min(...tableau.filter((c) => c.indicateurs.delaiMedianH > 0).map((c) => c.indicateurs.delaiMedianH));

  // Renouvellements jusqu'en 2033
  const renouvellements: Record<number, { communeCode: string; designation: string; composant: string }[]> = {};
  for (const commune of pole.communes) {
    for (const ouvrage of commune.ouvrages) {
      for (const composant of ouvrage.composants) {
        if (!composant.datePose) continue;
        const annee = composant.datePose.getFullYear() + composant.composantType.dureeVieAns;
        if (annee >= new Date().getFullYear() && annee <= 2033) {
          if (!renouvellements[annee]) renouvellements[annee] = [];
          renouvellements[annee].push({
            communeCode: commune.code,
            designation: `${composant.composantType.nom} — ${ouvrage.code}`,
            composant: composant.composantType.code,
          });
        }
      }
    }
  }

  return NextResponse.json({
    pole: { code: pole.code, nom: pole.nom },
    isFictif: true,
    tableau,
    meilleures: { disponibilite: maxDispo, preventif: maxPrev, delai: minDelai },
    renouvellements,
    // Communes à appuyer en priorité (préventif < 60 %)
    prioriteAppui: tableau
      .filter((c) => c.indicateurs.preventifFaitATempsPct < 60)
      .sort((a, b) => a.indicateurs.preventifFaitATempsPct - b.indicateurs.preventifFaitATempsPct)
      .map((c) => c.communeCode),
    // Achats groupés suggérés
    achatsGroupes: (() => {
      const communesSousSeuil = tableau.filter((c) => c.stocksSousSeuil > 0);
      if (communesSousSeuil.length >= 2) {
        return `Pompes immergées sous seuil dans ${communesSousSeuil.length} communes sur ${tableau.length} — achat groupé suggéré`;
      }
      return null;
    })(),
  });
}
