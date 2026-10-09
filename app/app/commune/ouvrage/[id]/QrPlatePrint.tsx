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
      <div className="bg-white border-2 border-gray-800 rounded-xl p-4 text-center shrink-0" style={{ width: 200 }}>
        <canvas ref={canvasRef} className="block mx-auto" />
        <p className="text-xs font-bold text-gray-800 mt-2 font-mono">{ouvrageCode}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{ouvrageNom}</p>
        <p className="text-xs text-gray-400 mt-1">Scannez pour signaler</p>
      </div>
      <div className="text-sm text-gray-600 space-y-2">
        <p className="font-medium">Impression de la plaque QR</p>
        <p className="text-xs text-gray-500">
          URL encodée : <span className="font-mono text-blue-600 break-all">{ficheUrl}</span>
        </p>
        <button
          onClick={() => window.print()}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          🖨️ Imprimer la plaque
        </button>
        <p className="text-xs text-gray-400">Conception auteur — plaque fictive à des fins de démonstration</p>
      </div>
    </div>
  );
}
