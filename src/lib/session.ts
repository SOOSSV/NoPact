import { cache } from "react";
import { cookies } from "next/headers";
import { loadStore } from "./db";
import {
  invitationsOf,
  membersOf,
  membershipIn,
  pendingProposal,
  spacesOfUser,
} from "./store";
import type {
  Invitation,
  Membership,
  Space,
  SpaceRole,
  Store,
  TermProposal,
  User,
} from "./types";

export const SPACE_COOKIE = "nopact_space";

/** La base répond mais refuse : on le dit, on ne redirige pas en boucle. */
export class DatabaseUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseUnavailable";
  }
}

/**
 * Droits par rôle, dans un espace donné. Le label saisit, les managers
 * contrôlent, tout le monde conteste. Personne ne modifie ni ne supprime :
 * ces actions n'existent nulle part, ni ici ni en base.
 */
export const can = {
  importRevenue: (r: SpaceRole) => r === "label",
  createExpense: (r: SpaceRole) => r === "label",
  validate: (r: SpaceRole) => r === "manager",
  seal: (r: SpaceRole) => r === "label",
  dispute: () => true,
  requestAdvance: (r: SpaceRole) => r === "artiste",
  /** Les règles se décident côté artiste, pas côté payeur. */
  manageRules: (r: SpaceRole) => r === "artiste" || r === "manager",
};

export type Member = Membership & { name: string; handle: string };

export type Context = {
  dbError?: string;
  store: Store;
  user: User;
  space: Space;
  members: Member[];
  invitations: Invitation[];
  proposal: TermProposal | null;
  me: Member;
  spaces: Space[];
};

/** Une seule lecture de la base par requête, même si plusieurs pages la demandent. */
const load = cache(loadStore);

export async function currentUser(): Promise<User | null> {
  const loaded = await load();
  if (!loaded) return null;
  if (loaded.dbError) throw new DatabaseUnavailable(loaded.dbError);
  return loaded.store.users.find((u) => u.id === loaded.userId) ?? null;
}

/**
 * Résout compte + espace courant. Renvoie null si l'un des deux manque :
 * les pages redirigent alors, elles ne devinent jamais.
 */
export async function context(): Promise<Context | null> {
  const loaded = await load();
  if (!loaded) return null;
  const { store, userId, dbError } = loaded;
  if (dbError) throw new DatabaseUnavailable(dbError);

  const user = store.users.find((u) => u.id === userId);
  if (!user) return null;

  const spaces = spacesOfUser(store, userId);
  if (spaces.length === 0) return null;

  const jar = await cookies();
  const wanted = jar.get(SPACE_COOKIE)?.value;
  // On ne sert un espace que si l'utilisateur y est membre.
  const space = (wanted && spaces.find((s) => s.id === wanted)) || spaces[0];

  const membership = membershipIn(store, space.id, userId);
  if (!membership) return null;

  const members = membersOf(store, space.id);
  const me = members.find((m) => m.userId === userId)!;

  return {
    store,
    user,
    space,
    members,
    invitations: invitationsOf(store, space.id),
    proposal: pendingProposal(store, space.id),
    me,
    spaces,
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
