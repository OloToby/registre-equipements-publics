import Link from "next/link";

const VIEWS = [
  {
    title: "Habitant",
    description: "Scanner un QR code, signaler un problème, suivre une demande",
    icon: "👥",
    href: "/ouvrage/EAU-004",
    badge: "Sans compte",
    accent: "var(--sky)",
    accentBorder: "#8BBDD9",
  },
  {
    title: "Technicien",
    description: "Interventions terrain, checklist sécurité, photos, mode hors-ligne",
    icon: "🔧",
    href: "/technicien",
    badge: "PWA hors-ligne",
    accent: "var(--ok-bg)",
    accentBorder: "#A3D9BC",
  },
  {
    title: "Commune",
    description: "File de signalements, carte des ouvrages, stocks, indicateurs",
    icon: "🏛️",
    href: "/commune",
    badge: "Responsable communal",
    accent: "var(--lilac)",
    accentBorder: "#B0B8E0",
  },
  {
    title: "Pôle régional",
    description: "Tableau comparatif, renouvellements, communes à appuyer",
    icon: "📊",
    href: "/pole",
    badge: "Agence pôle",
    accent: "var(--warn-bg)",
    accentBorder: "#E0C570",
  },
];

const SCENARIO_STEPS = [
  { step: "1", label: "Scanner QR — forage EAU-004 de Sèdjro-village", href: "/ouvrage/EAU-004" },
  { step: "2", label: "Signaler « pas d'eau »", href: "/signaler/EAU-004?panne=PAS_EAU" },
  { step: "3", label: "Suivi S-2026-0142", href: "/suivi/S-2026-0142" },
  { step: "4", label: "Simulateur SMS", href: "/sms-demo" },
];

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 pb-12">

      {/* En-tête brand */}
      <div className="py-10 text-center space-y-3">
        <div className="inline-flex items-center gap-3 mb-2">
          {/* Sun SVG — identique au prototype */}
          <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true">
            <g fill="#F2B134">
              <circle cx="20" cy="20" r="8"/>
              {Array.from({length: 16}, (_, i) => {
                const a = i * Math.PI / 8;
                const l = i % 2 ? 15 : 19;
                return (
                  <line key={i}
                    x1={20 + 11 * Math.cos(a)} y1={20 + 11 * Math.sin(a)}
                    x2={20 + l  * Math.cos(a)} y2={20 + l  * Math.sin(a)}
                    stroke="#F2B134" strokeWidth="2" strokeLinecap="round"/>
                );
              })}
            </g>
          </svg>
          <div className="text-left">
            <p className="text-xl font-black leading-tight" style={{ color: "var(--navy)" }}>
              Registre des ouvrages publics
            </p>
            <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
              Commune pilote · prototype de démonstration
            </p>
          </div>
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Bénin 2026 — Toutes les données sont fictives</p>
      </div>

      {/* 4 portails */}
      <section className="space-y-3 mb-8">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Accès par profil</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VIEWS.map((v) => (
            <Link
              key={v.href}
              href={v.href}
              className="rounded-2xl p-5 transition-all hover:shadow-md"
              style={{ background: v.accent, border: `1.5px solid ${v.accentBorder}` }}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{v.icon}</span>
                <div>
                  <p className="font-bold text-base" style={{ color: "var(--ink)" }}>{v.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{v.description}</p>
                  <span className="mt-2 inline-block text-xs font-bold rounded-full px-2 py-0.5"
                        style={{ background: "rgba(37,57,112,.12)", color: "var(--navy)" }}>
                    {v.badge}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Scénario fil rouge */}
      <section className="rounded-2xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
        <p className="text-xs font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--muted)" }}>Scénario fil rouge</p>
        <p className="text-sm font-bold mb-1" style={{ color: "var(--ink)" }}>EAU-004 · Sèdjro-village</p>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>De la panne à la réparation en 12 étapes — Deck 3 slide 5</p>
        <div className="space-y-1">
          {SCENARIO_STEPS.map((s) => (
            <Link
              key={s.step}
              href={s.href}
              className="scenario-step flex items-center gap-3 p-3 rounded-xl transition-colors"
              style={{ border: "1px solid var(--line)" }}
            >
              <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-white"
                    style={{ background: "var(--navy)" }}>
                {s.step}
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>{s.label}</span>
              <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Liens utiles */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link href="/sms-demo"
              className="text-center py-2.5 rounded-xl font-semibold transition-colors"
              style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)" }}>
          📱 Simulateur SMS
        </Link>
        <Link href="/suivi"
              className="text-center py-2.5 rounded-xl font-semibold transition-colors"
              style={{ background: "var(--soft)", color: "var(--ink)", border: "1px solid var(--line)" }}>
          🔍 Suivre un signalement
        </Link>
      </div>

      <footer className="text-center text-xs pt-8 pb-2" style={{ color: "var(--muted)" }}>
        Prototype démonstration · données fictives (isFictif=true)
      </footer>
    </main>
  );
}
