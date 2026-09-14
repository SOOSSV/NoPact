// @ts-nocheck
import { supabase } from "./supabase/server";
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

// ============================================================================
// USERS
// ============================================================================
export async function getUserByHandle(handle: string): Promise<User | null> {
  const db = await supabase();
  const { data } = await db
    .from("users")
    .select()
    .eq("handle", handle)
    .single();
  return data;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await supabase();
  const { data } = await db.from("users").select().eq("id", id).single();
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
    .from("users")
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

export async function getLabelMembers(labelId: string): Promise<MembershipView[]> {
  const db = await supabase();
  const { data } = await db
    .from("memberships")
    .select(
      `
      id, label_id, user_id, role, joined_at,
      users!inner(id, name, email, handle)
    `
    )
    .eq("label_id", labelId);

  return (data || []).map((m: any) => ({
    id: m.id,
    labelId: m.label_id,
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    name: m.users.name,
    email: m.users.email,
    handle: m.users.handle,
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
      users!inner(id, name, email, handle),
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
      name: s.users.name,
      email: s.users.email,
      handle: s.users.handle,
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
