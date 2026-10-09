"use client";

// Générateur de plaque QR — D-006 (qrcode npm)
// Source : programme p. 36 (identité numérique), Deck 2 slide 5 (QR plate)
// Conception auteur : génère une image QR + instruction d'impression

import { useEffect, useRef } from "react";

interface Props {
  ouvrageCode: string;
  ouvrageNom: string;
  ficheUrl: string;
}

export default function QrPlatePrint({ ouvrageCode, ouvrageNom, ficheUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      const QRCode = (await import("qrcode")).default;
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, ficheUrl, {
          width: 160,
          margin: 1,
          color: { dark: "#1e293b", light: "#ffffff" },
        });
      }
    })();
  }, [ficheUrl]);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="rounded-xl p-4 text-center shrink-0" style={{ width: 200, background: "var(--surface)", border: "2px solid var(--navy)" }}>
        <canvas ref={canvasRef} className="block mx-auto" />
        <p className="text-xs font-bold mt-2 font-mono" style={{ color: "var(--navy)" }}>{ouvrageCode}</p>
        <p className="text-xs mt-0.5 leading-tight" style={{ color: "var(--muted)" }}>{ouvrageNom}</p>
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Scannez pour signaler</p>
      </div>
      <div className="text-sm space-y-2">
        <p className="font-medium" style={{ color: "var(--ink)" }}>Impression de la plaque QR</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          URL encodée : <span className="font-mono break-all" style={{ color: "var(--navy)" }}>{ficheUrl}</span>
        </p>
        <button
          onClick={() => window.print()}
          className="text-xs text-white px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
          style={{ background: "var(--navy)" }}
        >
          🖨️ Imprimer la plaque
        </button>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Conception auteur — plaque fictive à des fins de démonstration</p>
      </div>
    </div>
  );
}
