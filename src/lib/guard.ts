import { redirect } from "next/navigation";
import { context, currentUser } from "./session";

/**
 * Toute page de l'app passe par là. Pas de compte → connexion ;
 * compte mais aucun espace → création d'espace. Aucune page ne devine.
 */
export async function requirePage() {
  const user = await currentUser();
  if (user?.mustChange) redirect("/bienvenue");
  const ctx = await context();
  if (ctx) return ctx;
  redirect(user ? "/espaces" : "/connexion");
}
