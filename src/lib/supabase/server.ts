import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Client Supabase côté serveur, utilise le schéma public.
 */
export async function supabase() {
  const jar = await cookies();
  return createServerClient(URL, KEY, {
    db: { schema: "public" },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        // Impossible pendant le rendu d'un composant serveur : sans effet,
        // la session est rafraîchie par les actions et les route handlers.
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {}
      },
    },
  });
}
