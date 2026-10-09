import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const user = await prisma.utilisateur.findUnique({ where: { email } });
  if (!user || !user.actif) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 heures

  await prisma.session.create({ data: { utilisateurId: user.id, token, expiresAt } });
  await audit("LOGIN", "Utilisateur", user.id, user.id);

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, nom: user.nom, role: user.role, communeId: user.communeId, poleCode: user.poleCode },
  });
  res.cookies.set("session_token", token, {
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
  return res;
}
