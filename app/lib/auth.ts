import { cookies } from "next/headers";
import { prisma } from "./db";

export interface SessionUser {
  id: string;
  email: string;
  nom: string;
  role: string;
  communeId: string | null;
  poleCode: string | null;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { utilisateur: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (!session.utilisateur.actif) return null;

  return {
    id: session.utilisateur.id,
    email: session.utilisateur.email,
    nom: session.utilisateur.nom,
    role: session.utilisateur.role,
    communeId: session.utilisateur.communeId,
    poleCode: session.utilisateur.poleCode,
  };
}

export async function requireSession(
  allowedRoles?: string[]
): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("NON_AUTHENTIFIE");
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new Error("ACCES_REFUSE");
  }
  return session;
}

export async function requireSameCommune(
  session: SessionUser,
  communeId: string
): Promise<void> {
  if (session.role === "ADMIN" || session.role === "AGENCE_POLE") return;
  if (session.communeId !== communeId) throw new Error("ACCES_REFUSE");
}

export async function audit(
  action: string,
  entite: string,
  entiteId: string,
  userId: string | null,
  details?: Record<string, unknown>,
  signalementId?: string
) {
  await prisma.auditLog.create({
    data: {
      action,
      entite,
      entiteId,
      utilisateurId: userId,
      signalementId,
      details: details ? JSON.stringify(details) : null,
    },
  });
}
