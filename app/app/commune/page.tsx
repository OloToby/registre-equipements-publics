// Tableau de bord commune — responsable communal
// Source : Deck 3 slides 11-13 (vue commune), programme p. 41
// Conception auteur : 7 KPIs, file de signalements, carte, stocks

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  calcDisponibilite, calcPreventifFaitATempsPct, calcDelaiMedian,
  calcSignalementsDansDelaiPct, calcCoutEntretienAnnuel,
  calcAgeMoyenFaceDureeVie, calcCouvertureRegistrePct,
} from "@/lib/indicateurs";
import SignalementQueue from "./SignalementQueue";
import KpiCard from "./KpiCard";
import StockAlert from "./StockAlert";

export default async function CommunePage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/commune");
  if (!["RESPONSABLE_COMMUNAL", "ADMIN", "AGENCE_POLE"].includes(session.role)) redirect("/");

  const communeId = session.communeId ?? (
    await prisma.commune.findFirst({ where: { code: "COM-A" } })
  )?.id;

  if (!communeId) redirect("/");

  const commune = await prisma.commune.findUnique({
    where: { id: communeId },
    include: {
      ouvrages: {
        include: {
          typeOuvrage: { include: { priorityRules: true } },
          composants: { include: { composantType: true } },
          tachesPreventives: true,
          interventions: { include: { preuve: true }, orderBy: { createdAt: "desc" } },
          signalements: { orderBy: { createdAt: "desc" } },
          arrondissement: true,
        },
      },
      stocks: true,
    },
  });

  if (!commune) redirect("/");

  // ─── KPIs ────────────────────────────────────────────────────────────────────
  const ouvragesTotal = commune.ouvrages.length;
  const ouvragesHorsSvc = commune.ouvrages.filter((o) => o.etat === "HORS_SERVICE").length;
  const disponibilite = calcDisponibilite(ouvragesTotal, ouvragesHorsSvc);

  const allInterventions = commune.ouvrages.flatMap((o) =>
    o.interventions.filter((i) => i.statut === "CLOS" && i.signalementId).map((i) => {
      const sign = o.signalements.find((s) => s.id === i.signalementId);
      return {
        signalementCreatedAt: sign?.createdAt ?? i.createdAt,
        closedAt: i.syncedAt ?? i.updatedAt,
        delaiViséHeures: o.typeOuvrage.priorityRules[0]?.delaiHeures ?? 48,
      };
    })
  );

  const delaiMedian = calcDelaiMedian(allInterventions);
  const allTaches = commune.ouvrages.flatMap((o) => o.tachesPreventives);
  const preventifPct = calcPreventifFaitATempsPct(allTaches);
  const dansDelaiPct = calcSignalementsDansDelaiPct(allInterventions);
  const coutTotal = calcCoutEntretienAnnuel(
    commune.ouvrages.flatMap((o) =>
      o.interventions.filter((i) => i.statut === "CLOS").map((i) => ({ coutMO: i.coutMO ?? undefined, coutPieces: i.coutPieces ?? undefined }))
    )
  );
  const ageMoyenPct = calcAgeMoyenFaceDureeVie(
    commune.ouvrages.flatMap((o) =>
      o.composants.map((c) => ({ datePose: c.datePose, dureeVieAns: c.composantType.dureeVieAns }))
    )
  );
  const couverturePct = calcCouvertureRegistrePct(ouvragesTotal, ouvragesTotal);

  // ─── Signalements actifs ──────────────────────────────────────────────────────
  const signalements = commune.ouvrages
    .flatMap((o) =>
      o.signalements
        .filter((s) => !["CLOS"].includes(s.statut))
        .map((s) => ({ ...s, ouvrage: o }))
    )
    .sort((a, b) => {
      const prio = { P1: 0, P2: 1, P3: 2 };
      return (prio[a.priorite as keyof typeof prio] ?? 3) - (prio[b.priorite as keyof typeof prio] ?? 3);
    });

  // ─── Stocks sous seuil ───────────────────────────────────────────────────────
  const stocksSousSeuil = commune.stocks.filter((s) => s.quantite <= s.seuilAlerte);

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-black" style={{ color: "var(--ink)" }}>{commune.nom}</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{ouvragesTotal} ouvrages enregistrés</p>
        </div>
        <Link
          href="/commune/carte"
          className="text-sm font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
          style={{ background: "var(--lilac)", color: "var(--navy)", border: "1px solid var(--line)" }}
        >
          🗺️ Carte
        </Link>
      </div>

      {/* 7 KPIs */}
      <section>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
          Indicateurs de performance
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Disponibilité"
            value={`${Math.round(disponibilite * 10) / 10} %`}
            target="≥ 85 %"
            ok={disponibilite >= 85}
            highlight
          />
          <KpiCard label="Délai médian" value={delaiMedian > 0 ? `${Math.round(delaiMedian)}h` : "—"}
            target="< 72h" ok={delaiMedian > 0 && delaiMedian < 72} />
          <KpiCard label="Préventif à temps" value={`${Math.round(preventifPct)} %`}
            target="≥ 80 %" ok={preventifPct >= 80} />
          <KpiCard label="Dans délai" value={`${Math.round(dansDelaiPct)} %`}
            target="≥ 90 %" ok={dansDelaiPct >= 90} />
          <KpiCard label="Coût annuel" value={coutTotal > 0 ? `${Math.round(coutTotal / 1000)} k FCFA` : "—"}
            target="" ok={null} />
          <KpiCard label="Âge moy. équip." value={`${Math.round(ageMoyenPct)} %`}
            target="< 70 %" ok={ageMoyenPct < 70} />
          <KpiCard label="Couverture registre" value={`${Math.round(couverturePct)} %`}
            target="100 %" ok={couverturePct >= 100} />
          <KpiCard label="Ouvrages HS" value={`${ouvragesHorsSvc} / ${ouvragesTotal}`}
            target="0" ok={ouvragesHorsSvc === 0} />
        </div>
      </section>

      {/* Alertes stock */}
      {stocksSousSeuil.length > 0 && (
        <section>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
            Stocks sous seuil d&apos;alerte
          </p>
          <div className="space-y-2">
            {stocksSousSeuil.map((s) => (
              <StockAlert key={s.id} stock={s} />
            ))}
          </div>
        </section>
      )}

      {/* File de signalements */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            File de signalements ({signalements.length})
          </p>
          <Link href="/commune/signalements" className="text-xs font-semibold hover:underline"
                style={{ color: "var(--blue)" }}>
            Voir tout →
          </Link>
        </div>
        <SignalementQueue
          signalements={signalements.slice(0, 10).map((s) => ({
            id: s.id,
            numero: s.numero,
            panneLibelle: s.panneLibelle,
            priorite: s.priorite ?? "",
            statut: s.statut,
            createdAt: s.createdAt.toISOString(),
            ouvrageNom: s.ouvrage.nom,
            ouvrageCode: s.ouvrage.code,
          }))}
          communeId={communeId}
        />
      </section>

      {/* Liens rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { href: "/commune/ouvrages", icon: "🏗️", label: "Ouvrages" },
          { href: "/commune/carte",    icon: "🗺️", label: "Carte" },
          { href: "/commune/stocks",   icon: "📦", label: "Stocks" },
          { href: "/pole",             icon: "📊", label: "Vue pôle" },
        ].map((l) => (
          <Link key={l.href} href={l.href}
                className="text-center text-sm font-semibold py-3 rounded-xl transition-opacity hover:opacity-80"
                style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)" }}>
            {l.icon} {l.label}
          </Link>
        ))}
      </div>

      <p className="text-xs text-center pb-4" style={{ color: "var(--muted)" }}>
        Données fictives — isFictif=true — conception auteur
      </p>
    </main>
  );
}
