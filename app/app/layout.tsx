import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Registre équipements publics — Bénin",
  description: "Registre du cycle de vie des équipements publics — Prototype démonstration",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Registre" },
};

export const viewport: Viewport = {
  themeColor: "#253970",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${montserrat.variable} ${geistMono.variable} antialiased min-h-screen`}
            style={{ background: "var(--bg)", color: "var(--ink)" }}>
        {/* Bandeau DONNÉES FICTIVES */}
        <div className="sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2"
             style={{ background: "var(--navy)", color: "#fff", fontSize: 12 }}>
          <span className="font-black tracking-widest uppercase px-2 py-0.5 rounded text-[10px]"
                style={{ background: "var(--gold)", color: "var(--ink)" }}>
            DONNÉES FICTIVES
          </span>
          <span className="font-semibold opacity-80">Prototype de démonstration — Ne pas utiliser comme référence officielle</span>
        </div>
        {children}
      </body>
    </html>
  );
}
