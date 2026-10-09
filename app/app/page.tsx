// Page d'accueil — portail de navigation pour la démonstration
// Source : Deck 3 slide 12 (scénario guidé 12 étapes)
// Conception auteur : 4 entrées selon le rôle, accès rapide au scénario fil rouge

import Link from "next/link";

const VIEWS = [
  {
    title: "Habitant",
    description: "Scanner un QR code, signaler un problème, suivre une demande",
    icon: "👥",
    href: "/ouvrage/EAU-004",
    color: "bg-blue-50 border-blue-200 hover:border-blue-400",
    badge: "Sans compte",
  },
  {
    title: "Technicien",
    description: "Interventions terrain, checklist, photos, mode hors-ligne",
    icon: "🔧",
    href: "/technicien",
    color: "bg-green-50 border-green-200 hover:border-green-400",
    badge: "PWA hors-ligne",
  },
  {
    title: "Commune",
    description: "File de signalements, carte des ouvrages, stock de pièces, indicateurs",
    icon: "🏛️",
    href: "/commune",
    color: "bg-purple-50 border-purple-200 hover:border-purple-400",
    badge: "Responsable communal",
  },
  {
    title: "Pôle régional",
    description: "Tableau comparatif, renouvellements, communes à appuyer",
    icon: "📊",
    href: "/pole",
    color: "bg-orange-50 border-orange-200 hover:border-orange-400",
    badge: "Agence pôle",
  },
];

const SCENARIO_STEPS = [
  { step: "1", label: "Scanner QR EAU-004", href: "/ouvrage/EAU-004" },
  { step: "2", label: "Signaler « pas d'eau »", href: "/signaler/EAU-004?panne=PAS_EAU" },
  { step: "3", label: "Suivi S-2026-0142", href: "/suivi/S-2026-0142" },
  { step: "4", label: "Simulateur SMS", href: "/sms-demo" },
];

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* En-tête */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Registre du cycle de vie<br />des équipements publics
        </h1>
        <p className="text-sm text-gray-500">Prototype de démonstration — Bénin 2026</p>
        <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full inline-block border border-amber-200">
          Toutes les données sont fictives
        </p>
      </div>

      {/* 4 portails */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Accès par profil
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VIEWS.map((v) => (
            <Link
              key={v.href}
              href={v.href}
              className={`rounded-2xl border-2 p-5 transition-colors ${v.color}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{v.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900">{v.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{v.description}</p>
                  <span className="text-xs font-medium text-gray-400 mt-2 block">{v.badge}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Scénario fil rouge */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Scénario fil rouge</h2>
        <p className="text-xs text-gray-400 mb-4">
          EAU-004 · Sèdjro-village · De la panne à la réparation — Deck 3 slide 5
        </p>
        <div className="space-y-2">
          {SCENARIO_STEPS.map((s) => (
            <Link
              key={s.step}
              href={s.href}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-colors border border-gray-100"
            >
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {s.step}
              </span>
              <span className="text-sm text-gray-700">{s.label}</span>
              <span className="ml-auto text-gray-400 text-sm">→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Liens utiles */}
      <section className="grid grid-cols-2 gap-2 text-sm">
        <Link href="/sms-demo" className="text-center py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
          📱 Simulateur SMS
        </Link>
        <Link href="/suivi" className="text-center py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
          🔍 Suivre un signalement
        </Link>
      </section>

      <footer className="text-center text-xs text-gray-400 pb-4">
        Prototype démonstration — conception auteur — données fictives (isFictif=true)
      </footer>
    </main>
  );
}
