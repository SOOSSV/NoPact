// @ts-nocheck
import { cache } from "react";
import { cookies } from "next/headers";
import { getUserById, getLabelById, getLabelMembers, getLabelAgreements } from "./db";
import type { User, Label, Membership } from "./types";

export const SPACE_COOKIE = "nopact_space";
export const USER_COOKIE = "nopact_user";

/** La base répond mais refuse : on le dit, on ne redirige pas en boucle. */
export class DatabaseUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseUnavailable";
  }
}

export const can = {
  importRevenue: (r: string) => r === "label",
  createExpense: (r: string) => r === "label",
  validate: (r: string) => r === "manager",
  seal: (r: string) => r === "label",
  dispute: () => true,
  requestAdvance: (r: string) => r === "artiste",
  manageRules: (r: string) => r === "artiste" || r === "manager",
};

export type Member = Membership & { name: string; handle: string };

export type Context = {
  user: User;
  label: Label;
  members: Member[];
  me: Member;
};

const getUserIdFromCookie = cache(async (): Promise<string | null> => {
  const jar = await cookies();
  return jar.get(USER_COOKIE)?.value ?? null;
});

export async function currentUser(): Promise<User | null> {
  const userId = await getUserIdFromCookie();
  if (!userId) return null;
  return await getUserById(userId);
}

/**
 * Résout compte + label courant. Renvoie null si l'un des deux manque :
 * les pages redirigent alors, elles ne devinent jamais.
 */
export async function context(): Promise<Context | null> {
  const user = await currentUser();
  if (!user) return null;

  // Pour MVP : charger le premier label où l'utilisateur est membre
  const jar = await cookies();
  const wantedLabelId = jar.get(SPACE_COOKIE)?.value;

  // TODO: implémenter getLabelsByUserId
  // Pour maintenant, on va charger le premier label connu
  const labelId = wantedLabelId || "763c5e99-8996-416a-a902-2212d489ac96"; // SOOSSV label ID
  const label = await getLabelById(labelId);
  if (!label) return null;

  const members = await getLabelMembers(labelId);
  const me = members.find((m) => m.userId === user.id);
  if (!me) return null;

  return {
    user,
    label,
    members,
    me,
  };
}

/** Pour les calculs : seuls les membres inscrits reçoivent de l'argent.
 *  Une part réservée à un invité reste en attente tant qu'il n'est pas entré. */
export function parties(members: Member[]) {
  return members.map((m) => ({
    userId: m.userId,
    role: m.role,
    share: m.share,
  }));
}
