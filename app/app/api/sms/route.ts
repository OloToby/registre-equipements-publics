// Simulateur SMS — interface SmsGateway (implémentation console/simulateur)
// Le parsing d'un SMS entrant "EAU-004 pas d'eau" crée un vrai signalement
// Source : programme p. 64 (SMS et relais digitaux). Implémentation : conception auteur.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calcPriorite } from "@/lib/indicateurs";

// Boîte de réception virtuelle (en mémoire pour la démo)
const smsBox: { from: string; body: string; receivedAt: Date; signalementId?: string }[] = [];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { from, text } = body;

  if (!text) return NextResponse.json({ error: "Corps SMS manquant" }, { status: 400 });

  // Parsing : "[CODE_OUVRAGE] [description optionnelle]"
  const parts = text.trim().split(/\s+/);
  const code = parts[0].toUpperCase();
  const description = parts.slice(1).join(" ") || "Signalement par SMS";

  const ouvrage = await prisma.ouvrage.findUnique({
    where: { code },
    include: { typeOuvrage: { include: { priorityRules: true, pannesTypiques: true } } },
  });

  if (!ouvrage) {
    smsBox.push({ from: from ?? "inconnu", body: text, receivedAt: new Date() });
    console.log(`[SMS SIMULÉ] ← Inconnu (${from}): "${text}" — code ouvrage "${code}" non trouvé`);
    return NextResponse.json({ ok: false, message: `Code ouvrage "${code}" introuvable` }, { status: 404 });
  }

  const lowerDesc = description.toLowerCase();
  const panne = ouvrage.typeOuvrage.pannesTypiques.find(
    (p) => lowerDesc.includes(p.libelle.toLowerCase().split(" ")[0]) || lowerDesc.includes(p.code.toLowerCase())
  ) ?? ouvrage.typeOuvrage.pannesTypiques[0];

  const rules = ouvrage.typeOuvrage.priorityRules.map((r) => ({
    panneCodes: JSON.parse(r.panneCodes) as string[],
    priorite: r.priorite,
    delaiHeures: r.delaiHeures,
  }));
  const { priorite } = calcPriorite(panne?.code ?? "AUTRE", rules);

  const count = await prisma.signalement.count();
  const numero = `S-${new Date().getFullYear()}-${String(count + 143).padStart(4, "0")}`;

  const signalement = await prisma.signalement.create({
    data: {
      numero,
      ouvrageId: ouvrage.id,
      panneCode: panne?.code ?? "AUTRE",
      panneLibelle: panne?.libelle ?? description,
      fonctionne: !lowerDesc.includes("panne") && !lowerDesc.includes("arrêt"),
      canal: "SMS",
      statut: "RECU",
      priorite,
      description,
      telephoneContact: from ?? null,
      anonyme: !from,
      numeroSuivi: numero,
    },
  });

  smsBox.push({ from: from ?? "inconnu", body: text, receivedAt: new Date(), signalementId: signalement.id });

  console.log(`[SMS SIMULÉ] ← ${from}: "${text}" → Signalement ${numero} créé`);
  console.log(`[SMS SIMULÉ] → ${from}: Signalement ${numero} reçu. Suivi : /suivi/${numero}`);

  return NextResponse.json({ ok: true, signalement, numero });
}

// Lire la boîte de réception simulée
export async function GET() {
  return NextResponse.json({ smsBox, count: smsBox.length });
}
