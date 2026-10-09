import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
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
  themeColor: "#1d4ed8",
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gray-50`}>
        {/* Bandeau DONNÉES FICTIVES — slide 14 Deck 3 */}
        <div className="bg-amber-400 text-amber-900 text-xs font-semibold text-center py-1 px-2 sticky top-0 z-50">
          ⚠ DONNÉES FICTIVES — Prototype de démonstration — Ne pas utiliser comme référence officielle
        </div>
        {children}
      </body>
    </html>
  );
}
