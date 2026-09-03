import type { Membership, Store } from "./types";

/*
 * Lectures cadrées par espace. C'est le seul endroit où le filtre existe,
 * donc le seul endroit où on peut l'oublier. La base applique la même
 * frontière par RLS : ces fonctions ne sont qu'une commodité de rendu.
 */

export const spaceOf = (store: Store, id: string) =>
  store.spaces.find((s) => s.id === id) ?? null;

export const membersOf = (store: Store, spaceId: string) =>
  store.memberships
    .filter((m) => m.spaceId === spaceId)
    .map((m) => {
      const u = store.users.find((x) => x.id === m.userId);
      return { ...m, name: u?.name ?? "Compte inconnu", handle: u?.handle ?? "" };
    });

export const spacesOfUser = (store: Store, userId: string) =>
  store.memberships
    .filter((m) => m.userId === userId)
    .map((m) => store.spaces.find((s) => s.id === m.spaceId))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

export const membershipIn = (
  store: Store,
  spaceId: string,
  userId: string,
): Membership | null =>
  store.memberships.find((m) => m.spaceId === spaceId && m.userId === userId) ??
  null;

export const revenuesOf = (store: Store, spaceId: string) =>
  store.revenues.filter((r) => r.spaceId === spaceId);

export const expensesOf = (store: Store, spaceId: string) =>
  store.expenses.filter((e) => e.spaceId === spaceId);

export const ledgerOf = (store: Store, spaceId: string) =>
  store.ledger.filter((e) => e.spaceId === spaceId);

export const sealedOf = (store: Store, spaceId: string) =>
  store.sealedMonths.filter((s) => s.spaceId === spaceId);

export const userName = (store: Store, userId: string) =>
  store.users.find((u) => u.id === userId)?.name ?? "Compte inconnu";

export const invitationsOf = (store: Store, spaceId: string) =>
  store.invitations.filter((i) => i.spaceId === spaceId);

export const proposalsOf = (store: Store, spaceId: string) =>
  store.proposals.filter((p) => p.spaceId === spaceId);

/** La proposition en cours, s'il y en a une. Il n'y en a qu'une à la fois. */
export const pendingProposal = (store: Store, spaceId: string) =>
  proposalsOf(store, spaceId).find((p) => p.status === "en_attente") ?? null;
