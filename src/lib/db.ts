// @ts-nocheck
import { createClient } from "@supabase/supabase-js";
import type {
  User,
  Label,
  Membership,
  Invitation,
  Agreement,
  Share,
  MembershipView,
  ShareView,
} from "./types";

// Clé secrète côté serveur : les tables ont la RLS sans règle publique.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
const supabase = async () => admin;

// ============================================================================
// USERS
// ============================================================================
export async function getUserByHandle(handle: string): Promise<User | null> {
  const db = await supabase();
  const { data } = await db
    .from("app_users")
    .select()
    .eq("handle", handle)
    .single();
  return data;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await supabase();
  const { data } = await db.from("app_users").select().eq("id", id).single();
  return data;
}

export async function createUser(
  email: string,
  name: string,
  handle: string,
  passwordHash: string
): Promise<User> {
  const db = await supabase();
  const { data } = await db
    .from("app_users")
    .insert({ email, name, handle, password_hash: passwordHash })
    .select()
    .single();
  if (!data) throw new Error("Failed to create user");
  return data;
}

// ============================================================================
// LABELS
// ============================================================================
export async function getLabelById(id: string): Promise<Label | null> {
  const db = await supabase();
  const { data } = await db.from("labels").select().eq("id", id).single();
  return data;
}

export async function createLabel(
  name: string,
  slug: string,
  createdBy: string
): Promise<Label> {
  const db = await supabase();
  const { data } = await db
    .from("labels")
    .insert({ name, slug, created_by: createdBy })
    .select()
    .single();
  if (!data) throw new Error("Failed to create label");
  return data;
}

// ============================================================================
// MEMBERSHIPS
// ============================================================================
export async function getMembership(
  labelId: string,
  userId: string
): Promise<Membership | null> {
  const db = await supabase();
  const { data } = await db
    .from("memberships")
    .select()
    .eq("label_id", labelId)
    .eq("user_id", userId)
    .single();
  return data ? { ...data, share: 0 } : null;
}

export async function getUserLabelIds(userId: string): Promise<string[]> {
  const db = await supabase();
  const { data } = await db
    .from("memberships")
    .select("label_id")
    .eq("user_id", userId)
    .order("joined_at");
  return (data || []).map((m: any) => m.label_id);
}

export async function getLabelMembers(labelId: string): Promise<MembershipView[]> {
  const db = await supabase();
  const { data } = await db
    .from("memberships")
    .select(
      `
      id, label_id, user_id, role, joined_at,
      app_users!inner(id, name, email, handle)
    `
    )
    .eq("label_id", labelId);

  return (data || []).map((m: any) => ({
    id: m.id,
    labelId: m.label_id,
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    name: m.app_users.name,
    email: m.app_users.email,
    handle: m.app_users.handle,
    share: 0,
  }));
}

export async function addMember(
  labelId: string,
  userId: string,
  role: string
): Promise<Membership> {
  const db = await supabase();
  const { data } = await db
    .from("memberships")
    .insert({ label_id: labelId, user_id: userId, role })
    .select()
    .single();
  if (!data) throw new Error("Failed to add member");
  return { ...data, share: 0 };
}

// ============================================================================
// INVITATIONS
// ============================================================================
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  const db = await supabase();
  const { data } = await db
    .from("invitations")
    .select()
    .eq("token", token)
    .single();
  return data;
}

export async function createInvitation(
  labelId: string,
  email: string,
  name: string,
  role: string,
  expiresAt: string
): Promise<Invitation> {
  const db = await supabase();
  const token = crypto.randomUUID();
  const { data } = await db
    .from("invitations")
    .insert({
      label_id: labelId,
      email,
      name,
      role,
      token,
      expires_at: expiresAt,
    })
    .select()
    .single();
  if (!data) throw new Error("Failed to create invitation");
  return data;
}

export async function acceptInvitation(
  invitationId: string,
  userId: string
): Promise<void> {
  const db = await supabase();
  await db
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invitationId);

  const inv = await db
    .from("invitations")
    .select()
    .eq("id", invitationId)
    .single();

  if (!inv.data) throw new Error("Invitation not found");
  await addMember(inv.data.label_id, userId, inv.data.role);
}

export async function getPendingInvitations(labelId: string) {
  const db = await supabase();
  const { data } = await db
    .from("invitations")
    .select("id, name, role, token, expires_at")
    .eq("label_id", labelId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return data || [];
}

/** L'invitation est réservée avant d'écrire : un même lien ne crée jamais deux comptes. */
export async function createAccountFromInvitation(
  inv: any,
  handle: string,
  name: string,
  code: string,
): Promise<{ id: string; labelId: string } | { error: string }> {
  const db = await supabase();
  const claimed = await db
    .from("invitations")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id)
    .is("accepted_at", null)
    .select("id");
  if (claimed.error || !claimed.data?.length) {
    return { error: "Ce lien a déjà été utilisé." };
  }
  const release = () =>
    db.from("invitations").update({ accepted_at: null }).eq("id", inv.id);

  const login = await db
    .from("login_users")
    .insert({ username: handle, password: code })
    .select("id")
    .single();
  if (login.error) {
    await release();
    return {
      error: login.error.code === "23505"
        ? "Cet identifiant est déjà pris."
        : "Impossible de créer le compte. Réessaie.",
    };
  }

  const id = login.data.id;
  const undo = async (labelId?: string) => {
    if (labelId) await db.from("labels").delete().eq("id", labelId);
    await db.from("app_users").delete().eq("id", id);
    await db.from("login_users").delete().eq("id", id);
    await release();
    return { error: "Impossible de créer le compte. Réessaie." };
  };

  const profile = await db.from("app_users").insert({ id, handle, name });
  if (profile.error) return undo();

  // La personne invitée arrive dans son propre espace, jamais dans celui de l'invitant.
  const space = await db
    .from("labels")
    .insert({ name, slug: `${handle}-${crypto.randomUUID().slice(0, 8)}`, created_by: id })
    .select("id")
    .single();
  if (space.error) return undo();

  const member = await db
    .from("memberships")
    .insert({ label_id: space.data.id, user_id: id, role: inv.role });
  if (member.error) return undo(space.data.id);

  return { id, labelId: space.data.id };
}

// ============================================================================
// AGREEMENTS
// ============================================================================
export async function getAgreement(id: string): Promise<Agreement | null> {
  const db = await supabase();
  const { data } = await db.from("agreements").select().eq("id", id).single();
  return data;
}

export async function getLabelAgreements(labelId: string): Promise<Agreement[]> {
  const db = await supabase();
  const { data } = await db.from("agreements").select().eq("label_id", labelId);
  return data || [];
}

export async function createAgreement(
  labelId: string,
  projectName: string,
  createdBy: string,
  investment?: number,
  recoupModel?: string,
  floorPct?: number
): Promise<Agreement> {
  const db = await supabase();
  const { data } = await db
    .from("agreements")
    .insert({
      label_id: labelId,
      project_name: projectName,
      created_by: createdBy,
      investment: investment || 0,
      recoup_model: recoupModel || "brut",
      floor_pct: floorPct || 0,
    })
    .select()
    .single();
  if (!data) throw new Error("Failed to create agreement");
  return data;
}

// ============================================================================
// SHARES
// ============================================================================
export async function getAgreementShares(agreementId: string): Promise<ShareView[]> {
  const db = await supabase();
  const { data } = await db
    .from("shares")
    .select(
      `
      id, agreement_id, user_id, proposed_pct, validated, validated_at, created_at,
      app_users!inner(id, name, email, handle),
      agreements!inner(label_id)
    `
    )
    .eq("agreement_id", agreementId);

  if (!data) return [];

  // Get role from memberships
  const shares: ShareView[] = [];
  for (const s of data) {
    const membership = await getMembership(s.agreements.label_id, s.user_id);
    shares.push({
      id: s.id,
      agreementId: s.agreement_id,
      userId: s.user_id,
      proposedPct: s.proposed_pct,
      validated: s.validated,
      validatedAt: s.validated_at,
      createdAt: s.created_at,
      name: s.app_users.name,
      email: s.app_users.email,
      handle: s.app_users.handle,
      role: (membership?.role as any) || "manager",
    });
  }
  return shares;
}

export async function proposeShare(
  agreementId: string,
  userId: string,
  pct: number
): Promise<Share> {
  const db = await supabase();
  const existing = await db
    .from("shares")
    .select()
    .eq("agreement_id", agreementId)
    .eq("user_id", userId)
    .single();

  if (existing.data) {
    // Update existing
    const { data } = await db
      .from("shares")
      .update({ proposed_pct: pct })
      .eq("id", existing.data.id)
      .select()
      .single();
    if (!data) throw new Error("Failed to update share");
    return data;
  }

  // Create new
  const { data } = await db
    .from("shares")
    .insert({ agreement_id: agreementId, user_id: userId, proposed_pct: pct })
    .select()
    .single();
  if (!data) throw new Error("Failed to create share");
  return data;
}

export async function validateShares(agreementId: string): Promise<void> {
  const db = await supabase();
  const now = new Date().toISOString();
  await db
    .from("shares")
    .update({ validated: true, validated_at: now })
    .eq("agreement_id", agreementId)
    .eq("validated", false);
}

const AGREEMENT_FIELDS =
  "id, project_name, status, recoup_model, floor_pct, created_by, created_at, signed_at, shares(user_id, proposed_pct, validated, validated_at)";

/** L'accord en vigueur et la proposition en cours, avec leurs parts. */
export async function getAgreementState(labelId: string) {
  const db = await supabase();
  const { data, error } = await db
    .from("agreements")
    .select(AGREEMENT_FIELDS)
    .eq("label_id", labelId)
    .in("status", ["validee", "en_attente"]);
  if (error) throw new Error(error.message);
  const byShare = (a: any) =>
    a && { ...a, shares: [...a.shares].sort((x, y) => Number(y.proposed_pct) - Number(x.proposed_pct)) };
  return {
    current: byShare(data.find((a) => a.status === "validee")) ?? null,
    pending: byShare(data.find((a) => a.status === "en_attente")) ?? null,
  };
}

export async function createProposal(p: {
  labelId: string;
  userId: string;
  projectName: string;
  recoupModel: string;
  floorPct: number;
  shares: { userId: string; pct: number }[];
}): Promise<{ id: string } | { error: string }> {
  const db = await supabase();
  const created = await db
    .from("agreements")
    .insert({
      label_id: p.labelId,
      project_name: p.projectName,
      status: "en_attente",
      recoup_model: p.recoupModel,
      floor_pct: p.floorPct,
      created_by: p.userId,
    })
    .select("id")
    .single();
  if (created.error) {
    return {
      error: created.error.code === "23505"
        ? "Une proposition est déjà en cours."
        : "Impossible d'enregistrer la proposition.",
    };
  }

  // Proposer, c'est déjà accepter.
  const now = new Date().toISOString();
  const shares = await db.from("shares").insert(
    p.shares.map((s) => ({
      agreement_id: created.data.id,
      user_id: s.userId,
      proposed_pct: s.pct,
      validated: s.userId === p.userId,
      validated_at: s.userId === p.userId ? now : null,
    })),
  );
  if (shares.error) {
    await db.from("agreements").delete().eq("id", created.data.id);
    return { error: "Impossible d'enregistrer la proposition." };
  }
  return { id: created.data.id };
}

export async function acceptProposal(agreementId: string, userId: string) {
  const db = await supabase();
  const { error } = await db
    .from("shares")
    .update({ validated: true, validated_at: new Date().toISOString() })
    .eq("agreement_id", agreementId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function closeProposal(agreementId: string) {
  const db = await supabase();
  const { error } = await db
    .from("agreements")
    .update({ status: "archivee" })
    .eq("id", agreementId)
    .eq("status", "en_attente");
  if (error) throw new Error(error.message);
}

/**
 * S'applique quand l'artiste et au moins un manager ont accepté. Un rôle
 * absent de la proposition n'est pas attendu.
 */
export async function applyProposalIfAccepted(agreementId: string, labelId: string) {
  const db = await supabase();
  const [{ data: shares, error }, members] = await Promise.all([
    db.from("shares").select("user_id, validated").eq("agreement_id", agreementId),
    getLabelMembers(labelId),
  ]);
  if (error) throw new Error(error.message);

  const roleOf = (id: string) => members.find((m) => m.userId === id)?.role;
  for (const role of ["artiste", "manager"]) {
    const inProposal = shares.some((s) => roleOf(s.user_id) === role);
    const accepted = shares.some((s) => s.validated && roleOf(s.user_id) === role);
    if (inProposal && !accepted) return false;
  }
  if (!shares.some((s) => s.validated)) return false;

  const archived = await db
    .from("agreements")
    .update({ status: "archivee" })
    .eq("label_id", labelId)
    .eq("status", "validee");
  if (archived.error) throw new Error(archived.error.message);
  const applied = await db
    .from("agreements")
    .update({ status: "validee", signed_at: new Date().toISOString() })
    .eq("id", agreementId)
    .eq("status", "en_attente");
  if (applied.error) throw new Error(applied.error.message);
  return true;
}

// ============================================================================
// LEGACY STUBS (for backward compatibility during refactor)
// ============================================================================
export async function loadStore() {
  console.warn("loadStore is deprecated, use new DB functions");
  return null;
}

export async function verifyChainDb() {
  return { ok: true, brokenAt: null, unavailable: false };
}

export async function writeLedger() {
  console.warn("writeLedger is deprecated");
}

export async function uploadReceipt() {
  throw new Error("uploadReceipt not implemented in new architecture");
}

export async function vendorId() {
  throw new Error("vendorId not implemented in new architecture");
}

export async function receiptUrl() {
  return null;
}
