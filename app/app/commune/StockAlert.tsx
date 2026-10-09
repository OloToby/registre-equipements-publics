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
    <div className="rounded-xl px-4 py-3 flex items-center justify-between"
         style={{
           background: critical ? "var(--bad-bg)" : "var(--warn-bg)",
           border: `1px solid ${critical ? "#EBADA8" : "#E0C570"}`,
         }}>
      <div>
        <p className="text-sm font-bold" style={{ color: critical ? "var(--bad)" : "var(--warn)" }}>
          {critical ? "🚨" : "⚠️"} {stock.designation}
        </p>
        <p className="text-xs mt-0.5" style={{ color: critical ? "var(--bad)" : "var(--warn)" }}>
          En stock : <strong>{stock.quantite}</strong> (seuil : {stock.seuilAlerte})
        </p>
      </div>
      <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg"
            style={{
              background: critical ? "rgba(174,47,39,.12)" : "rgba(135,87,0,.12)",
              color: critical ? "var(--bad)" : "var(--warn)",
            }}>
        {stock.composantTypeCode}
      </span>
    </div>
  );
}
