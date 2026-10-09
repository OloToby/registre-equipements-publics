// Formulaire d'intervention terrain — technicien
// Source : Deck 3 slides 9-10 (checklist, photos, double horodatage)
// Conception auteur : checklist dynamique, consignation électrique bloquante, sync hors-ligne

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import InterventionForm from "./InterventionForm";

type Props = { params: { id: string } };

export default async function InterventionPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect(`/login?redirect=/technicien/intervention/${params.id}`);

  const signalement = await prisma.signalement.findUnique({
    where: { id: params.id },
    include: {
      ouvrage: {
        include: {
          commune: true,
          typeOuvrage: {
            include: {
              checklistItems: {
                where: {
                  OR: [{ typeIntervention: "CORRECTIF" }, { typeIntervention: "TOUS" }],
                },
                orderBy: { ordre: "asc" },
              },
              pannesTypiques: true,
            },
          },
          composants: { include: { composantType: true } },
        },
      },
    },
  });

  if (!signalement) notFound();

  const checklistItems = signalement.ouvrage.typeOuvrage.checklistItems.map((item) => ({
    id: item.id,
    label: item.label,
    obligatoire: item.obligatoire,
    bloqueCloture: item.bloqueCloture,
    typeIntervention: item.typeIntervention,
  }));

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* En-tête */}
      <div>
        <p className="text-xs text-gray-400 font-mono">{signalement.numero}</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">{signalement.panneLibelle}</h1>
        <p className="text-sm text-gray-600">{signalement.ouvrage.nom}</p>
        <p className="text-xs text-gray-400">{signalement.ouvrage.commune.nom}</p>
        {signalement.priorite === "P1" && (
          <span className="inline-block mt-2 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
            ⚡ PRIORITÉ 1 — Intervention sous 48h
          </span>
        )}
      </div>

      <InterventionForm
        signalementId={signalement.id}
        ouvrageId={signalement.ouvrageId}
        checklistItems={checklistItems}
        technicienId={session.id}
      />
    </main>
  );
}
