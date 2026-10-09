import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/auth";
import { calcPriorite } from "@/lib/indicateurs";

let compteur = 142; // départ S-2026-0142 selon Deck 3 slide 7

async function genNumero(): Promise<string> {
  const annee = new Date().getFullYear();
  const count = await prisma.signalement.count();
  return `S-${annee}-${String(count + 143).padStart(4, "0")}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    ouvrageId, ouvrageCode, panneCode, fonctionne, canal, description,
    photoUrl, lat, lng, telephone, telephoneContact, anonyme,
  } = body;

  if ((!ouvrageId && !ouvrageCode) || !panneCode) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const ouvrage = await prisma.ouvrage.findUnique({
    where: ouvrageId ? { id: ouvrageId } : { code: (ouvrageCode as string).toUpperCase() },
    include: { typeOuvrage: { include: { priorityRules: true, pannesTypiques: true } } },
  });
  if (!ouvrage) return NextResponse.json({ error: "Ouvrage introuvable" }, { status: 404 });

  const panne = ouvrage.typeOuvrage.pannesTypiques.find((p) => p.code === panneCode);
  const rules = ouvrage.typeOuvrage.priorityRules.map((r) => ({
    panneCodes: JSON.parse(r.panneCodes) as string[],
    priorite: r.priorite,
    delaiHeures: r.delaiHeures,
  }));
  const { priorite } = calcPriorite(panneCode, rules);
  const numero = await genNumero();

  const tel = telephoneContact ?? telephone ?? null;
  const signalement = await prisma.signalement.create({
    data: {
      numero,
      ouvrageId: ouvrage.id,
      panneCode,
      panneLibelle: panne?.libelle ?? panneCode,
      fonctionne: fonctionne ?? true,
      canal: canal ?? "QR",
      statut: "RECU",
      priorite,
      description,
      photoUrl,
      lat,
      lng,
      telephoneContact: tel,
      anonyme: anonyme ?? !tel,
      numeroSuivi: numero,
    },
  });

  await audit("CREATE_SIGNALEMENT", "Signalement", signalement.id, null, { canal, panneCode }, signalement.id);

  // Simulateur SMS : log dans la console (boîte simulée)
  console.log(`[SMS SIMULÉ] → Habitant : Signalement ${numero} reçu. Suivi : /suivi/${numero}`);

  return NextResponse.json({ signalement, numero }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const communeId = searchParams.get("communeId");
  const statut = searchParams.get("statut");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const where: Record<string, unknown> = {};
  if (communeId) where.ouvrage = { communeId };
  if (statut) where.statut = statut;

  const signalements = await prisma.signalement.findMany({
    where,
    include: { ouvrage: { include: { typeOuvrage: true, commune: true } }, affectation: { include: { technicien: true } } },
    orderBy: [{ priorite: "asc" }, { createdAt: "asc" }],
    take: limit,
  });

  return NextResponse.json({ signalements });
}
