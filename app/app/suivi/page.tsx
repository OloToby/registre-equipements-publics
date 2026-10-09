// Redirection /suivi?numero=S-2026-0142 → /suivi/S-2026-0142
import { redirect } from "next/navigation";

export default function SuiviRedirectPage({
  searchParams,
}: {
  searchParams: { numero?: string };
}) {
  const numero = searchParams.numero;
  if (numero) redirect(`/suivi/${encodeURIComponent(numero.toUpperCase())}`);
  return (
    <main className="max-w-lg mx-auto px-4 py-12 text-center">
      <h1 className="text-xl font-bold mb-4" style={{ color: "var(--navy)" }}>Suivre un signalement</h1>
      <form action="/suivi" method="get" className="flex gap-2 max-w-xs mx-auto">
        <input
          name="numero"
          type="text"
          placeholder="S-2026-0142"
          autoFocus
          className="flex-1 rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={{ border: "1px solid var(--line)", color: "var(--ink)", background: "var(--bg)" }}
        />
        <button
          type="submit"
          className="text-white text-sm px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: "var(--navy)" }}
        >
          Voir
        </button>
      </form>
    </main>
  );
}
