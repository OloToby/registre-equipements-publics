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
      <h1 className="text-xl font-bold text-gray-900 mb-4">Suivre un signalement</h1>
      <form action="/suivi" method="get" className="flex gap-2 max-w-xs mx-auto">
        <input
          name="numero"
          type="text"
          placeholder="S-2026-0142"
          autoFocus
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-blue-700"
        >
          Voir
        </button>
      </form>
    </main>
  );
}
