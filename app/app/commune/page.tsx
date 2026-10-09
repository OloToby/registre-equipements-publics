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
  void calcCouvertureRegistrePct(ouvragesTotal, ouvragesTotal);

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

  const nf = (n: number, d = 0) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const fcfa = (n: number) => Math.round(n).toLocaleString("fr-FR").replace(/ /g, " ") + " FCFA";

  // Composants proches fin de vie
  const composantsUsés = commune.ouvrages.flatMap((o) =>
    o.composants
      .filter((c) => {
        if (!c.datePose) return false;
        const ageAns = (Date.now() - c.datePose.getTime()) / (365.25 * 86400000);
        return ageAns / c.composantType.dureeVieAns >= 0.9;
      })
      .map((c) => ({ c, o }))
  ).sort((a, b) => {
    const rA = (Date.now() - a.c.datePose!.getTime()) / (365.25 * 86400000) / a.c.composantType.dureeVieAns;
    const rB = (Date.now() - b.c.datePose!.getTime()) / (365.25 * 86400000) / b.c.composantType.dureeVieAns;
    return rB - rA;
  });

  // Entretiens en retard
  const ouvragesRetard = commune.ouvrages.filter((o) =>
    o.tachesPreventives.some((t) => !t.faiteAt && t.echeanceAt < new Date())
  );

  return (
    <div className="desk">

      {/* En-tête */}
      <div className="dhead">
        <div>
          <span className="lbl">{commune.nom} · services techniques</span>
          <h1>Tableau de bord du patrimoine</h1>
          <div className="muted">{ouvragesTotal} ouvrages inscrits · {commune.ouvrages.map(o => o.arrondissement?.nom).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).length} arrondissements</div>
        </div>
        <div className="row">
          <span className="muted" style={{ fontSize: "12px" }}>Mis à jour {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
        </div>
      </div>

      {/* Tabs */}
      <nav className="tabs" role="tablist">
        <Link href="/commune" role="tab" aria-selected="true">Tableau de bord</Link>
        <Link href="/commune/ouvrages" role="tab" aria-selected="false">Registre des ouvrages</Link>
        <Link href="/commune/carte" role="tab" aria-selected="false">Carte</Link>
      </nav>

      {/* KPIs principaux (4) */}
      <section className="kpis">
        <div className="kpi hl">
          <span>Disponibilité des ouvrages</span>
          <b>{nf(disponibilite)} %</b>
          <em>service rendu, pondéré par l&apos;état</em>
        </div>
        <div className="kpi">
          <span>Délai médian de remise en service</span>
          <b>{delaiMedian > 0 ? `${nf(delaiMedian)} h` : "—"}</b>
          <em className="muted">{allInterventions.filter((i) => { const d = i.closedAt; return d && d > new Date(Date.now() - 90 * 86400000); }).length} signalements clos sur 90 j</em>
        </div>
        <div className="kpi">
          <span>Signalements traités dans le délai</span>
          <b>{nf(dansDelaiPct)} %</b>
          <em className="muted">délai fixé par priorité</em>
        </div>
        <div className="kpi">
          <span>Entretiens préventifs faits à temps</span>
          <b>{nf(preventifPct)} %</b>
          <em className="muted">{allTaches.length} tâches sur 12 mois</em>
        </div>
      </section>

      {/* KPIs secondaires (3) */}
      <section className="kpis k3">
        <div className="kpi sm">
          <span>Coût d&apos;entretien par ouvrage (12 mois)</span>
          <b>{coutTotal > 0 ? fcfa(coutTotal / Math.max(ouvragesTotal, 1)) : "—"}</b>
        </div>
        <div className="kpi sm">
          <span>Âge moyen des pièces / durée de vie</span>
          <b>{nf(ageMoyenPct)} %</b>
        </div>
        <div className="kpi sm">
          <span>Couverture du registre</span>
          <b>{ouvragesTotal} ouvrages inscrits</b>
        </div>
      </section>

      {/* Colonnes : signalements + carte */}
      <div className="cols">
        <section className="sec">
          <h2>
            À traiter
            <span className="count">{signalements.length}</span>
          </h2>
          <div className="list">
            {signalements.length === 0 ? (
              <div className="item" style={{ cursor: "default", gridTemplateColumns: "1fr" }}>
                <strong>Aucun signalement en attente</strong>
              </div>
            ) : (
              signalements.slice(0, 10).map((s) => (
                <Link key={s.id} href={`/commune/signalement/${s.id}`} className={`item${s.statut === "RECU" ? " new" : ""}`}>
                  <span className={`prio ${s.priorite || "P3"}`}>{s.priorite || "—"}</span>
                  <div>
                    <strong>{s.ouvrage.nom}</strong>
                    <span className="meta">{s.numero} · {s.panneLibelle} · {s.statut === "RECU" ? "QR" : "SMS"} · {s.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
                  </div>
                  <span className={`pill ${s.statut === "RECU" ? "panne" : "neutral"}`}>
                    <i />{s.statut === "RECU" ? "Nouveau" : s.statut === "AFFECTE" ? "Affecté" : s.statut === "EN_COURS" ? "En cours" : s.statut}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="sec">
          <h2>Carte des ouvrages</h2>
          <div className="card mapcard">
            <svg viewBox="0 0 620 380" role="img" aria-label="Carte schématique des ouvrages par arrondissement">
              {/* Arrondissements */}
              <polygon points="30,40 300,22 318,190 40,205" fill="#E3E6F5" stroke="#fff" strokeWidth="4" opacity=".85" />
              <text x="162" y="117" textAnchor="middle" fontSize="15" fontWeight="800" fill="#253970" opacity=".28" letterSpacing="2">ZOGBÉ</text>
              <polygon points="300,22 590,48 575,200 318,190" fill="#C7DDED" stroke="#fff" strokeWidth="4" opacity=".85" />
              <text x="446" y="115" textAnchor="middle" fontSize="15" fontWeight="800" fill="#253970" opacity=".28" letterSpacing="2">HOUNKPA</text>
              <polygon points="40,205 318,190 300,355 22,340" fill="#ECE2CE" stroke="#fff" strokeWidth="4" opacity=".85" />
              <text x="170" y="273" textAnchor="middle" fontSize="15" fontWeight="800" fill="#253970" opacity=".28" letterSpacing="2">AGBODJI</text>
              <polygon points="318,190 575,200 598,360 300,355" fill="#E3E6F5" stroke="#fff" strokeWidth="4" opacity=".85" />
              <text x="448" y="276" textAnchor="middle" fontSize="15" fontWeight="800" fill="#253970" opacity=".28" letterSpacing="2">SÈDJRO</text>
              {/* Points ouvrages */}
              {commune.ouvrages.slice(0, 20).map((o, i) => {
                const isHS = o.etat === "HORS_SERVICE";
                const isDeg = o.etat === "DEGRADE" || o.etat === "ATTENTION";
                const col = isHS ? "#AE2F27" : isDeg ? "#F2B134" : "#fff";
                const x = 60 + (i % 5) * 110 + (Math.floor(i / 5) % 2) * 40;
                const y = 80 + Math.floor(i / 5) * 70;
                const letter = o.typeOuvrage?.famille?.charAt(0) ?? "?";
                return (
                  <g key={o.id}>
                    {(isHS || isDeg) && <circle cx={x} cy={y} r="15" fill={col} opacity=".25" />}
                    <circle cx={x} cy={y} r="10" fill={col} stroke="#253970" strokeWidth="2" />
                    <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill={isHS ? "#fff" : "#253970"}>{letter}</text>
                  </g>
                );
              })}
            </svg>
            <div className="legend">
              <span><i className="lg" style={{ background: "#fff", border: "2px solid #253970" }} />En service</span>
              <span><i className="lg" style={{ background: "#F2B134", border: "2px solid #253970" }} />Dégradé</span>
              <span><i className="lg" style={{ background: "#AE2F27", border: "2px solid #253970" }} />En panne</span>
            </div>
          </div>
        </section>
      </div>

      {/* Alertes */}
      <section className="sec">
        <h2>Alertes du registre</h2>
        <div className="alerts">
          {stocksSousSeuil.map((s) => (
            <div key={s.id} className="alert bad">
              <span className="prio P1">Stock</span>
              <div>
                <b>{s.designation} : {s.quantite} en magasin, seuil {s.seuilAlerte}</b>
                Réapprovisionner avant la prochaine panne.
              </div>
            </div>
          ))}
          {composantsUsés.slice(0, 3).map(({ c, o }) => {
            const ageAns = c.datePose ? (Date.now() - c.datePose.getTime()) / (365.25 * 86400000) : 0;
            return (
              <div key={c.id} className="alert">
                <span className="prio P2">Usure</span>
                <div>
                  <b>{c.composantType.nom} · {o.nom}</b>
                  {nf(ageAns, 1)} ans pour une durée de vie de {c.composantType.dureeVieAns} ans. Prévoir le remplacement.
                </div>
              </div>
            );
          })}
          {ouvragesRetard.length > 0 && (
            <div className="alert">
              <span className="prio P3">Préventif</span>
              <div>
                <b>{ouvragesRetard.length} ouvrage{ouvragesRetard.length > 1 ? "s ont" : " a"} un entretien en retard</b>
                {ouvragesRetard.slice(0, 4).map((o) => o.nom).join(", ")}{ouvragesRetard.length > 4 ? "…" : ""}
              </div>
            </div>
          )}
          {stocksSousSeuil.length === 0 && composantsUsés.length === 0 && ouvragesRetard.length === 0 && (
            <div className="alert">
              <span className="prio P3">OK</span>
              <div><b>Aucune alerte</b>Stocks, composants et préventifs sont dans les normes.</div>
            </div>
          )}
        </div>
      </section>

      <p className="foot" style={{ textAlign: "center" }}>Prototype. Données, noms de lieux et montants fictifs — conception auteur</p>
    </div>
  );
}
