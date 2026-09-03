import { supabase } from "./supabase/server";
import type {
  Expense,
  LedgerEntry,
  LedgerType,
  Membership,
  Revenue,
  SealedMonth,
  Space,
  SpaceRole,
  Store,
  User,
} from "./types";

/* Le schéma parle snake_case, l'app camelCase. La traduction vit ici et
   nulle part ailleurs, pour que le reste du code ignore la base. */

type Row = Record<string, unknown>;

const toSpace = (r: Row): Space => ({
  id: r.id as string,
  name: r.name as string,
  configured: r.configured as boolean,
  createdBy: r.created_by as string,
  createdAt: String(r.created_at).slice(0, 10),
  config: {
    projectName: (r.project_name as string) ?? "",
    contractStart: (r.contract_start as string) ?? "",
    contractEnd: (r.contract_end as string) ?? "",
    exitWindowDays: Number(r.exit_window_days),
    investment: Number(r.investment),
    recoupModel: r.recoup_model as Space["config"]["recoupModel"],
    floorPct: Number(r.floor_pct),
    validationThreshold: Number(r.validation_threshold),
    monthlyCategoryThreshold: Number(r.monthly_category_threshold),
    nonRecoupable: (r.non_recoupable as string[]) ?? [],
  },
});

const toMembership = (r: Row): Membership => ({
  id: r.id as string,
  spaceId: r.space_id as string,
  userId: r.user_id as string,
  role: r.role as SpaceRole,
  share: Number(r.share),
  joinedAt: String(r.joined_at).slice(0, 10),
});

const toRevenue = (r: Row): Revenue => ({
  id: r.id as string,
  spaceId: r.space_id as string,
  source: r.source as string,
  period: r.period as string,
  cashedAt: (r.cashed_at as string) ?? null,
  gross: Number(r.gross),
  fees: Number(r.fees),
  currency: r.currency as "EUR" | "USD",
  fxRate: Number(r.fx_rate),
  status: r.status as Revenue["status"],
  work: null,
  sourceFile: r.source_file as string,
  createdBy: r.created_by as string,
  createdAt: String(r.created_at).slice(0, 10),
  disputed: r.disputed as boolean,
});

const toExpense = (r: Row, vendors: Map<string, string>): Expense => ({
  id: r.id as string,
  spaceId: r.space_id as string,
  label: r.label as string,
  category: r.category as Expense["category"],
  amount: Number(r.amount),
  date: r.date as string,
  vendor: vendors.get(r.vendor_id as string) ?? "—",
  relatedParty: Boolean(r.related_party),
  receipt: (r.receipt as string) ?? null,
  comment: (r.comment as string) ?? "",
  project: "",
  status: r.status as Expense["status"],
  recoupable: r.recoupable !== false,
  validations: [],
  createdBy: r.created_by as string,
  createdAt: String(r.created_at).slice(0, 10),
  disputed: r.disputed as boolean,
});

const toLedger = (r: Row): LedgerEntry => ({
  spaceId: r.space_id as string,
  seq: Number(r.seq),
  at: String(r.at).slice(0, 10),
  actor: r.actor as string,
  type: r.type as LedgerType,
  text: r.text as string,
  ref: (r.ref as string) ?? null,
  prevHash: r.prev_hash as string,
  hash: r.hash as string,
});

/**
 * Charge tout ce que la personne connectée a le droit de voir. Le RLS fait le
 * tri côté base : si une ligne d'un autre espace remonte ici, c'est un bug de
 * politique, pas de requête.
 */
export type Loaded = { store: Store; userId: string; dbError?: string };

export async function loadStore(): Promise<Loaded | null> {
  const sb = await supabase();
  const { data: auth } = await sb.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  // Les invitations en attente deviennent des appartenances à la connexion.
  await sb.rpc("claim_invitations");

  const [memberships, spaces, profiles, revenues, expenses, vendors, ledger, sealed, validations, invites, proposals, votes] =
    await Promise.all([
      sb.from("memberships").select("*"),
      sb.from("spaces").select("*"),
      sb.from("profiles").select("*"),
      sb.from("revenues").select("*"),
      sb.from("expenses").select("*"),
      sb.from("vendors").select("*"),
      sb.from("ledger").select("*").order("seq"),
      sb.from("sealed_months").select("*"),
      sb.from("validations").select("*"),
      sb.from("invitations").select("*").is("accepted_at", null),
      sb.from("term_proposals").select("*").order("created_at", { ascending: false }),
      sb.from("proposal_votes").select("*"),
    ]);

  // Une erreur de base ne doit pas passer pour « aucune donnée » : sinon
  // l'application renvoie sans fin vers la connexion sans jamais dire pourquoi.
  const failed = [memberships, spaces, profiles, revenues, expenses, vendors, ledger, sealed, validations, invites, proposals, votes]
    .map((r) => r.error)
    .find(Boolean);

  const vendorNames = new Map<string, string>();
  for (const v of vendors.data ?? []) {
    vendorNames.set(v.id as string, v.name as string);
  }

  const users: User[] = (profiles.data ?? []).map((p: Row) => ({
    id: p.id as string,
    name: p.name as string,
    handle: (p.handle as string) ?? "",
    createdAt: String(p.created_at).slice(0, 10),
    mustChange: Boolean(p.must_change),
  }));

  const builtExpenses = (expenses.data ?? []).map((e: Row) =>
    toExpense(e, vendorNames),
  );
  for (const v of validations.data ?? []) {
    const target = builtExpenses.find((e) => e.id === v.expense_id);
    target?.validations.push({
      by: v.by_user as string,
      at: String(v.created_at).slice(0, 10),
      comment: (v.comment as string) ?? "",
    });
  }

  const allVotes = (votes.data ?? []).map((v: Row) => ({
    proposalId: v.proposal_id as string,
    voter: v.voter as string,
    accept: v.accept as boolean,
    comment: (v.comment as string) ?? "",
    at: String(v.created_at).slice(0, 10),
  }));

  const store: Store = {
    users,
    proposals: (proposals.data ?? []).map((r: Row) => ({
      id: r.id as string,
      spaceId: r.space_id as string,
      proposedBy: r.proposed_by as string,
      note: (r.note as string) ?? "",
      terms: r.terms as never,
      status: r.status as never,
      createdAt: String(r.created_at).slice(0, 10),
      votes: allVotes.filter((v) => v.proposalId === r.id),
    })),
    invitations: (invites.data ?? []).map((i: Row) => ({
      id: i.id as string,
      spaceId: i.space_id as string,
      email: i.email as string,
      name: i.name as string,
      role: i.role as SpaceRole,
      share: Number(i.share),
    })),
    spaces: (spaces.data ?? []).map(toSpace),
    memberships: (memberships.data ?? []).map(toMembership),
    revenues: (revenues.data ?? []).map(toRevenue),
    expenses: builtExpenses,
    ledger: (ledger.data ?? []).map(toLedger),
    sealedMonths: (sealed.data ?? []).map((s: Row) => ({
      spaceId: s.space_id as string,
      period: s.period as string,
      sealedAt: String(s.sealed_at).slice(0, 10),
      hash: s.hash as string,
    })) as SealedMonth[],
  };

  // Le projet est porté par l'espace, pas par la ligne de dépense.
  for (const e of store.expenses) {
    const sp = store.spaces.find((s) => s.id === e.spaceId);
    e.project = sp?.config.projectName || "Projet principal";
  }

  return {
    store,
    userId: user.id,
    dbError: failed
      ? failed.code === "PGRST106"
        ? "Le schéma « nopact » n'est pas exposé dans l'API Supabase."
        : failed.message
      : undefined,
  };
}

/** Vérifie la chaîne côté base : c'est elle qui calcule les empreintes. */
export async function verifyChainDb(spaceId: string) {
  const sb = await supabase();
  const { data, error } = await sb.rpc("ledger_verify", { target: spaceId });
  if (error) return { ok: true, brokenAt: null, unavailable: true };
  return { ok: data === null, brokenAt: (data as number) ?? null, unavailable: false };
}

// --- écritures ---------------------------------------------------------------
// Aucune ne met à jour ni ne supprime : la base a révoqué ces droits.

export async function writeLedger(entry: {
  spaceId: string;
  actor: string;
  type: LedgerType;
  text: string;
  ref?: string | null;
}) {
  const sb = await supabase();
  // seq, prev_hash et hash sont calculés par le trigger, jamais ici.
  return sb.from("ledger").insert({
    space_id: entry.spaceId,
    actor: entry.actor,
    type: entry.type,
    text: entry.text,
    ref: entry.ref ?? null,
    prev_hash: "",
    hash: "",
  });
}

/** Retrouve ou crée le prestataire, puis renvoie son identifiant. */
export async function vendorId(
  spaceId: string,
  name: string,
  relatedParty: boolean,
) {
  const sb = await supabase();
  const found = await sb
    .from("vendors")
    .select("id")
    .eq("space_id", spaceId)
    .eq("name", name)
    .maybeSingle();
  if (found.data?.id) return found.data.id as string;

  const created = await sb
    .from("vendors")
    .insert({ space_id: spaceId, name, related_party: relatedParty })
    .select("id")
    .single();
  return created.data?.id as string | undefined;
}

/**
 * Dépose le justificatif dans le coffre. Le chemin commence par l'identifiant
 * de l'espace : c'est ce que lisent les règles d'accès du stockage.
 */
export async function uploadReceipt(spaceId: string, file: File) {
  const sb = await supabase();
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().slice(0, 5);
  const chemin = `${spaceId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage
    .from("justificatifs")
    .upload(chemin, file, { contentType: file.type, upsert: false });
  if (error) return { error: error.message };
  return { path: chemin };
}

/** Lien temporaire vers un justificatif. Rien n'est public. */
export async function receiptUrl(chemin: string) {
  const sb = await supabase();
  const { data } = await sb.storage
    .from("justificatifs")
    .createSignedUrl(chemin, 60 * 30);
  return data?.signedUrl ?? null;
}
