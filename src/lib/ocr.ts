import Anthropic from "@anthropic-ai/sdk";
import type { ExpenseCategory } from "./types";

/**
 * Lecture d'une facture photographiée. Le modèle propose, il ne décide pas :
 * ce qu'il renvoie remplit le formulaire, l'humain corrige et valide, et c'est
 * le code qui calcule. Aucun chiffre n'entre en base sans passer par là.
 */

export type ReadReceipt = {
  amount: number | null;
  date: string | null;
  vendor: string | null;
  category: ExpenseCategory | null;
  label: string | null;
  confiance: "haute" | "moyenne" | "basse";
};

const CATEGORIES = [
  "Studio", "Clip", "Marketing", "Déplacement", "Hôtel", "Restaurant", "Autre",
];

const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const CONSIGNE = `Tu lis une facture ou un reçu pour une application de comptes d'artiste.

Renvoie UNIQUEMENT un objet JSON, sans texte autour, avec ces clés :
- "amount"   : le montant TOTAL TTC payé, en euros, nombre sans symbole. null si illisible.
- "date"     : la date de la facture au format AAAA-MM-JJ. null si absente.
- "vendor"   : le nom du prestataire ou du commerce. null si absent.
- "category" : une seule valeur parmi ${CATEGORIES.join(", ")}.
- "label"    : une description courte de la dépense, 6 mots maximum, en français.
- "confiance": "haute", "moyenne" ou "basse" selon la lisibilité du document.

Règles :
- Prends le TOTAL TTC, jamais un sous-total ni le HT.
- Si plusieurs montants se ressemblent, prends le plus grand marqué total.
- N'invente jamais une valeur : dans le doute, mets null et baisse la confiance.
- Studio = enregistrement, mixage, mastering. Clip = tournage, montage.
  Marketing = pub, promo, presse, photos. Déplacement = train, avion, essence.`;

export type OcrResult =
  | { ok: true; data: ReadReceipt }
  | { ok: false; error: string };

export async function lireFacture(file: File): Promise<OcrResult> {
  const cle = process.env.ANTHROPIC_API_KEY;
  if (!cle) {
    return {
      ok: false,
      error:
        "Lecture automatique non configurée : il manque ANTHROPIC_API_KEY dans .env.local.",
    };
  }
  if (!TYPES_IMAGE.includes(file.type)) {
    return {
      ok: false,
      error: "La lecture automatique ne marche que sur une photo, pas un PDF.",
    };
  }

  const donnees = Buffer.from(await file.arrayBuffer()).toString("base64");
  const client = new Anthropic({ apiKey: cle });

  try {
    const reponse = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1000,
      // Lire un ticket ne demande pas de longue réflexion.
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as "image/jpeg",
                data: donnees,
              },
            },
            { type: "text", text: CONSIGNE },
          ],
        },
      ],
    });

    const texte = reponse.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();

    // Le modèle encadre parfois son JSON : on prend ce qui est entre accolades.
    const debut = texte.indexOf("{");
    const fin = texte.lastIndexOf("}");
    if (debut === -1 || fin === -1) {
      return { ok: false, error: "Facture illisible. Saisis les champs à la main." };
    }

    const brut = JSON.parse(texte.slice(debut, fin + 1)) as Record<string, unknown>;
    const montant = Number(brut.amount);
    const categorie = String(brut.category ?? "");

    return {
      ok: true,
      data: {
        amount: Number.isFinite(montant) && montant > 0 ? montant : null,
        date: /^\d{4}-\d{2}-\d{2}$/.test(String(brut.date))
          ? String(brut.date)
          : null,
        vendor: brut.vendor ? String(brut.vendor).slice(0, 80) : null,
        category: CATEGORIES.includes(categorie)
          ? (categorie as ExpenseCategory)
          : null,
        label: brut.label ? String(brut.label).slice(0, 80) : null,
        confiance:
          brut.confiance === "haute" || brut.confiance === "basse"
            ? brut.confiance
            : "moyenne",
      },
    };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "Clé Anthropic refusée." };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Trop de lectures d'un coup. Réessaie." };
    }
    return {
      ok: false,
      error: `Lecture impossible : ${(e as Error).message.slice(0, 120)}`,
    };
  }
}
