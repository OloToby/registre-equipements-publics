// Page de synchronisation manuelle — technicien
// Conception auteur : bouton de sync + résultat

import { redirect } from "next/navigation";

// Simple redirect — la sync se fait depuis OfflineBanner ou /technicien/offline
export default function SyncPage() {
  redirect("/technicien/offline");
}
