"use client";

// Composant @google/model-viewer — chargé en lazy client-only
// Source : D-005 (@google/model-viewer web component), Deck 2 slide 8 (jumeau numérique)
// Conception auteur : import dynamique pour éviter erreur SSR avec web component

import { useEffect, useState } from "react";

interface Props {
  glbPath: string;
  alt: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean | string;
        "auto-rotate"?: boolean | string;
        style?: React.CSSProperties;
        loading?: string;
      }, HTMLElement>;
    }
  }
}

export default function ModelViewer3D({ glbPath, alt }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Import du web component uniquement côté client
    import("@google/model-viewer").then(() => setLoaded(true)).catch(() => setLoaded(false));
  }, []);

  if (!loaded) {
    return (
      <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-sm text-gray-400">Chargement du modèle 3D…</p>
      </div>
    );
  }

  return (
    <model-viewer
      src={glbPath}
      alt={alt}
      camera-controls
      auto-rotate
      loading="lazy"
      style={{ width: "100%", height: "300px", borderRadius: "12px" }}
    />
  );
}
