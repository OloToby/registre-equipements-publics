// Carte KPI réutilisable — slide 15 Deck 2
// Conception auteur : vert si ok, rouge si hors cible

interface Props {
  label: string;
  value: string;
  target: string;
  ok: boolean | null;
}

export default function KpiCard({ label, value, target, ok }: Props) {
  const color =
    ok === true ? "border-green-200 bg-green-50" :
    ok === false ? "border-red-200 bg-red-50" :
    "border-gray-200 bg-white";
  const valueColor =
    ok === true ? "text-green-700" :
    ok === false ? "text-red-700" :
    "text-gray-900";

  return (
    <div className={`rounded-2xl border ${color} p-4`}>
      <p className="text-xs text-gray-500 mb-1 leading-tight">{label}</p>
      <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
      {target && (
        <p className="text-xs text-gray-400 mt-1">Cible : {target}</p>
      )}
    </div>
  );
}
