// Tableau de bord pôle — vue comparatif communes
// Source : Deck 3 slide 13 (p-dash), programme p. 41 (agence de pôle)
// Conception auteur : tableau comparatif, suggestion achat groupé, calendrier renouvellements

import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  calcDisponibilite, calcPreventifFaitATempsPct,
  calcSignalementsDansDelaiPct, calcDelaiMedian,
} from "@/lib/indicateurs";

export default async function PoleDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/pole");
  if (session.role !== "AGENCE_POLE" && session.role !== "ADMIN") redirect("/commune");

  const poleCode = session.poleCode ?? "ATL";

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
            },
          },
          stocks: true,
        },
      },
    },
  });

  if (!pole) redirect("/commune");

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
    const stocksSousSeuil = commune.stocks.filter((s) => s.quantite <= s.seuilAlerte);

    // Composants proches fin de vie
    const piecesFinVie = commune.ouvrages.flatMap((o) =>
      o.composants.filter((c) => {
        if (!c.datePose) return false;
        const ageAns = (Date.now() - c.datePose.getTime()) / (365.25 * 86400000);
        return ageAns / c.composantType.dureeVieAns >= 0.9;
      })
    ).length;

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
      piecesFinVie,
    };
  });

  const maxDispo = tableau.length ? Math.max(...tableau.map((c) => c.indicateurs.disponibilite)) : 0;
  const maxPrev = tableau.length ? Math.max(...tableau.map((c) => c.indicateurs.preventifFaitATempsPct)) : 0;
  const delaiValues = tableau.filter((c) => c.indicateurs.delaiMedianH > 0).map((c) => c.indicateurs.delaiMedianH);
  const minDelai = delaiValues.length ? Math.min(...delaiValues) : 0;

  const prioriteAppui = tableau
    .filter((c) => c.indicateurs.preventifFaitATempsPct < 60)
    .sort((a, b) => a.indicateurs.preventifFaitATempsPct - b.indicateurs.preventifFaitATempsPct);

  const communesSousSeuil = tableau.filter((c) => c.stocksSousSeuil > 0);
  const achatsGroupes = communesSousSeuil.length >= 2
    ? `Pompes immergées sous seuil dans ${communesSousSeuil.length} communes sur ${tableau.length} — achat groupé suggéré`
    : null;

  // Données pour le graphique à barres (disponibilité par commune)
  const chartMax = 100;
  const barH = 140;

  return (
    <div className="desk">

      {/* En-tête */}
      <div className="dhead">
        <div>
          <span className="lbl">Agence de pôle · {pole.code}</span>
          <h1>{pole.nom}</h1>
          <div className="muted">{tableau.length} communes · {tableau.reduce((s, c) => s + c.ouvragesTotal, 0)} ouvrages</div>
        </div>
        <div className="row">
          <Link href="/pole/renouvellements" className="btn ghost">Calendrier renouvellements</Link>
          <span className="muted" style={{ fontSize: "12px" }}>
            Mis à jour {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* Alerte achat groupé */}
      {achatsGroupes && (
        <div className="note gold">
          <b>Suggestion achat groupé ·</b> {achatsGroupes} — Données fictives
        </div>
      )}

      {/* Communes à appuyer */}
      {prioriteAppui.length > 0 && (
        <div className="note" style={{ background: "var(--warn-bg)", color: "var(--warn)", border: "1px solid #E0C570" }}>
          <b>Communes à appuyer en priorité (&lt; 60 % préventif) :</b>{" "}
          {prioriteAppui.map((c) => `${c.communeCode} (${c.indicateurs.preventifFaitATempsPct} %)`).join(", ")}
        </div>
      )}

      {/* Tableau comparatif */}
      <section className="sec">
        <h2>
          Tableau comparatif
          <span className="count">{tableau.length}</span>
        </h2>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Commune</th>
                <th className="n">Ouvrages</th>
                <th className="n">Disponibilité %</th>
                <th className="n">Préventif %</th>
                <th className="n">Délai médian h</th>
                <th className="n">Dans délai %</th>
                <th className="n">Stocks ⚠</th>
                <th className="n">Pièces fin de vie</th>
              </tr>
            </thead>
            <tbody>
              {tableau.map((c, i) => {
                const isBestDispo = c.indicateurs.disponibilite === maxDispo && maxDispo > 0;
                const isBestPrev = c.indicateurs.preventifFaitATempsPct === maxPrev && maxPrev > 0;
                const isBestDelai = c.indicateurs.delaiMedianH > 0 && c.indicateurs.delaiMedianH === minDelai;
                return (
                  <tr key={c.communeId} className={i === 0 ? "" : ""}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--ink)" }}>{c.communeNom}</div>
                      <div style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--muted)" }}>{c.communeCode}</div>
                    </td>
                    <td className="n" style={{ color: "var(--muted)" }}>{c.ouvragesTotal}</td>
                    <td className="n" style={{
                      fontWeight: 700,
                      background: isBestDispo ? "var(--ok-bg)" : undefined,
                      color: isBestDispo ? "var(--ok)" : c.indicateurs.disponibilite < 80 ? "var(--bad)" : "var(--ink)",
                    }}>
                      {c.indicateurs.disponibilite} %
                    </td>
                    <td className="n" style={{
                      fontWeight: 700,
                      background: isBestPrev ? "var(--ok-bg)" : undefined,
                      color: isBestPrev ? "var(--ok)" : c.indicateurs.preventifFaitATempsPct < 60 ? "var(--bad)" : "var(--warn)",
                    }}>
                      {c.indicateurs.preventifFaitATempsPct} %
                    </td>
                    <td className="n" style={{
                      fontWeight: 700,
                      background: isBestDelai ? "var(--ok-bg)" : undefined,
                      color: isBestDelai ? "var(--ok)" : "var(--ink)",
                    }}>
                      {c.indicateurs.delaiMedianH > 0 ? `${c.indicateurs.delaiMedianH} h` : "—"}
                    </td>
                    <td className="n" style={{ color: "var(--muted)" }}>
                      {c.indicateurs.signalementsDansDelaiPct > 0 ? `${c.indicateurs.signalementsDansDelaiPct} %` : "—"}
                    </td>
                    <td className="n">
                      {c.stocksSousSeuil > 0 ? (
                        <span className="pill panne"><i />{c.stocksSousSeuil} réf.</span>
                      ) : (
                        <span style={{ color: "var(--ok)", fontWeight: 700 }}>OK</span>
                      )}
                    </td>
                    <td className="n" style={{ fontWeight: c.piecesFinVie > 0 ? 700 : 400, color: c.piecesFinVie > 0 ? "var(--warn)" : "var(--muted)" }}>
                      {c.piecesFinVie > 0 ? c.piecesFinVie : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Graphique disponibilité */}
      {tableau.length > 0 && (
        <section className="sec">
          <h2>Disponibilité par commune</h2>
          <div className="card chart">
            <svg viewBox={`0 0 ${Math.max(tableau.length * 80, 320)} ${barH + 40}`} style={{ width: "100%", height: "auto" }}>
              {tableau.map((c, i) => {
                const barW = 48;
                const gap = 80;
                const x = i * gap + 20;
                const h = Math.max(4, (c.indicateurs.disponibilite / chartMax) * barH);
                const y = barH - h;
                const col = c.indicateurs.disponibilite < 80 ? "var(--bad)" : c.indicateurs.disponibilite === maxDispo ? "var(--ok)" : "var(--blue)";
                return (
                  <g key={c.communeId}>
                    <rect x={x} y={y} width={barW} height={h} rx="4" fill={col} opacity=".85" />
                    <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="700" fill={col}>
                      {c.indicateurs.disponibilite} %
                    </text>
                    <text x={x + barW / 2} y={barH + 18} textAnchor="middle" fontSize="11" fill="var(--muted)">
                      {c.communeCode}
                    </text>
                  </g>
                );
              })}
            </svg>
            <p className="muted" style={{ fontSize: "11px", textAlign: "center", marginTop: "8px" }}>
              Disponibilité pondérée par l&apos;état · Données fictives
            </p>
          </div>
        </section>
      )}

      {/* Alertes */}
      <section className="sec">
        <h2>Alertes pôle</h2>
        <div className="alerts">
          {tableau.filter((c) => c.stocksSousSeuil > 0).map((c) => (
            <div key={c.communeId} className="alert bad">
              <span className="prio P1">Stock</span>
              <div>
                <b>{c.communeNom} : {c.stocksSousSeuil} référence{c.stocksSousSeuil > 1 ? "s" : ""} sous seuil</b>
                Réapprovisionner avant la prochaine panne.
              </div>
            </div>
          ))}
          {prioriteAppui.map((c) => (
            <div key={c.communeId} className="alert">
              <span className="prio P2">Préventif</span>
              <div>
                <b>{c.communeNom} — {c.indicateurs.preventifFaitATempsPct} % préventif fait à temps</b>
                Appui technique recommandé.
              </div>
            </div>
          ))}
          {tableau.filter((c) => c.stocksSousSeuil === 0).length === tableau.length && prioriteAppui.length === 0 && (
            <div className="alert">
              <span className="prio P3">OK</span>
              <div><b>Aucune alerte</b>Tous les stocks et indicateurs préventifs sont dans les normes.</div>
            </div>
          )}
        </div>
      </section>

      <p className="foot" style={{ textAlign: "center" }}>Prototype. Données, noms de lieux et montants fictifs — conception auteur</p>
    </div>
  );
}
