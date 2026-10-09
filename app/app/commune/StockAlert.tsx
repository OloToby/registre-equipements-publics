// Alerte stock sous seuil — Deck 3 slide 13 (pompe COM-A : 1 → 0)
// Conception auteur

interface StockPiece {
  id: string;
  designation: string;
  quantite: number;
  seuilAlerte: number;
  composantTypeCode: string;
}

export default function StockAlert({ stock }: { stock: StockPiece }) {
  const critical = stock.quantite === 0;
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
      critical ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
    }`}>
      <div>
        <p className={`text-sm font-semibold ${critical ? "text-red-800" : "text-amber-800"}`}>
          {critical ? "🚨" : "⚠️"} {stock.designation}
        </p>
        <p className={`text-xs mt-0.5 ${critical ? "text-red-600" : "text-amber-600"}`}>
          En stock : <strong>{stock.quantite}</strong> (seuil : {stock.seuilAlerte})
        </p>
      </div>
      <span className={`text-xs font-mono px-2 py-1 rounded-lg ${
        critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
      }`}>
        {stock.composantTypeCode}
      </span>
    </div>
  );
}
