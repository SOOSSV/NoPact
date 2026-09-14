// @ts-nocheck
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ROLE_LABEL, SPACE_ROLES } from "./defaults";
import { eur, monthLabel } from "./money";
import { SPACE_COOKIE, USER_COOKIE, can, context } from "./session";
import { membersOf } from "./store";
import { supabase } from "./supabase/server";
import {
  acceptProposal,
  applyProposalIfAccepted,
  closeProposal,
  createAccountFromInvitation,
  createInvitation,
  createProposal,
  getAgreementState,
  getInvitationByToken,
  uploadReceipt,
  vendorId,
  verifyChainDb,
  writeLedger,
} from "./db";
import { lireFacture, type ReadReceipt } from "./ocr";
import type { ExpenseCategory, SpaceRole } from "./types";

/**
 * Une erreur remonte dans le formulaire, jamais en écran rouge : chaque action
 * renvoie son état plutôt que de jeter une exception.
 */
export type ActionState = {
  error?: string;
  notice?: string;
  /** Ce que la lecture de la facture a trouvé, à confirmer par la personne. */
  lecture?: ReadReceipt;
  /** Invitation tout juste créée : le lien s'affiche pour être envoyé. */
  invite?: { name: string; token: string };
} | null;

const ok: ActionState = null;
const fail = (error: string): ActionState => ({ error });

const CATEGORIES: ExpenseCategory[] = [
  "Studio", "Clip", "Marketing", "Déplacement", "Hôtel", "Restaurant", "Autre",
];

const PAGES = [
  "/", "/", "/", "/royalties", "/journal", "/contrat",
  "/information", "/accord", "/espaces", "/connexion", "/bienvenue",
];

function refresh() {
  for (const p of PAGES) revalidatePath(p);
}

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/** Traduit les erreurs Supabase en français, sans jargon technique. */
function readable(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Identifiant ou mot de passe incorrect.";
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Cet identifiant est déjà pris.";
  }
  if (m.includes("password should be") || m.includes("at least")) {
    return "Le mot de passe doit faire au moins 6 caractères.";
  }
  if (m.includes("email not confirmed")) {
    return "Compte pas encore actif.";
  }
  if (m.includes("row-level security") || m.includes("violates row")) {
    return "Tu n'as pas le droit de faire ça dans cet espace.";
  }
  if (m.includes("mois scelle")) {
    return "Ce mois est scellé : passe par une ligne d'ajustement.";
  }
  return message;
}

// --- comptes -----------------------------------------------------------------

/** Supabase exige une adresse : on la fabrique, on ne la montre jamais. */
const asEmail = (handle: string) =>
  handle.includes("@") ? handle : `${handle}@nopact.local`;

export async function signIn(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const handle = text(formData, "handle").toLowerCase().trim();
  const code = String(formData.get("password") ?? "").trim();
  if (!handle || !code) return fail("Identifiant et code demandés.");

  // Bypass Supabase cache issue - use direct REST API with Service Role key
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const response = await fetch(`${supabaseUrl}/rest/v1/login_users?username=eq.${encodeURIComponent(handle)}&password=eq.${encodeURIComponent(code)}`, {
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) return fail("Erreur serveur.");

    const users = await response.json();
    if (!Array.isArray(users) || users.length === 0) return fail("Identifiant ou code incorrect.");

    const user = users[0];

    // Crée une session
    const jar = await cookies();
    jar.set(USER_COOKIE, user.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    });
  } catch (err) {
    return fail(`Erreur: ${err instanceof Error ? err.message : "Connexion impossible"}`);
  }

  // Hors du try : redirect() lève une exception que le catch avalait.
  refresh();
  redirect("/");
}

/**
 * Première connexion : chacun choisit son identifiant, son nom et son mot de
 * passe. Après ça, personne d'autre ne les connaît.
 */
export async function finishSetup(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const handle = text(formData, "handle").toLowerCase();
  const name = text(formData, "name");
  const password = String(formData.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,32}$/.test(handle)) {
    return fail("Identifiant : 3 à 32 caractères, lettres, chiffres, . _ -");
  }
  if (password.length < 6) {
    return fail("Le mot de passe doit faire au moins 6 caractères.");
  }

  const sb = await supabase();
  const { data, error } = await sb.rpc("finish_setup", {
    new_handle: handle,
    new_name: name,
  });
  if (error) return fail(readable(error.message));
  if (data === "identifiant pris") return fail("Cet identifiant est déjà pris.");
  if (data !== "ok") return fail(String(data));

  const up = await sb.auth.updateUser({ password });
  if (up.error) return fail(readable(up.error.message));

  refresh();
  redirect("/");
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
  jar.delete(SPACE_COOKIE);
  refresh();
  redirect("/connexion");
}

/** Crée un lien d'invitation : la personne choisit elle-même son identifiant et son code. */
export async function inviteMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  if (!can.invite(ctx.me.role)) {
    return fail("Seuls l'artiste et le label invitent quelqu'un.");
  }

  const name = text(formData, "name");
  const role = text(formData, "role") as SpaceRole;
  if (!name) return fail("Indique le nom de la personne.");
  if (!SPACE_ROLES.includes(role)) return fail("Choisis un rôle.");

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  try {
    const inv = await createInvitation(ctx.label.id, "", name, role, expires);
    refresh();
    return { invite: { name, token: inv.token } };
  } catch {
    return fail("Impossible de créer l'invitation. Réessaie.");
  }
}

export async function acceptInvite(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const token = text(formData, "token");
  const name = text(formData, "name");
  const handle = text(formData, "handle").toLowerCase();
  const code = text(formData, "code");
  if (!name) return fail("Indique ton nom.");
  if (!/^[a-z0-9._-]{3,32}$/.test(handle)) {
    return fail("Identifiant : 3 à 32 caractères, lettres, chiffres, . _ -");
  }
  if (!/^\d{6}$/.test(code)) return fail("Le code fait exactement 6 chiffres.");

  const inv = await getInvitationByToken(token);
  if (!inv || inv.accepted_at || new Date(inv.expires_at) < new Date()) {
    return fail("Ce lien n'est plus valable. Demande une nouvelle invitation.");
  }

  const created = await createAccountFromInvitation(inv, handle, name, code);
  if ("error" in created) return fail(created.error);

  const jar = await cookies();
  jar.set(USER_COOKIE, created.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  jar.set(SPACE_COOKIE, created.labelId, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  refresh();
  redirect("/");
}

// --- espaces -----------------------------------------------------------------

export async function createSpace(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const sb = await supabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return fail("Connecte-toi avant de créer un espace.");

  const name = text(formData, "name");
  if (!name) return fail("Donne un nom à l'espace.");

  const space = await sb
    .from("spaces")
    .insert({
      name,
      project_name: text(formData, "projectName"),
      created_by: auth.user.id,
    })
    .select("id")
    .single();
  if (space.error) return fail(readable(space.error.message));

  const membership = await sb.from("memberships").insert({
    space_id: space.data.id,
    user_id: auth.user.id,
    role: text(formData, "role") as SpaceRole,
    share: 0,
  });
  if (membership.error) return fail(readable(membership.error.message));

  await writeLedger({
    spaceId: space.data.id,
    actor: auth.user.id,
    type: "reglages",
    text: `Espace « ${name} » créé`,
  });

  const jar = await cookies();
  jar.set(SPACE_COOKIE, space.data.id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  refresh();
  redirect("/information");
}

export async function switchSpace(formData: FormData) {
  const ctx = await context();
  const id = String(formData.get("spaceId") ?? "");
  // On ne bascule que vers un espace dont on est membre.
  if (!ctx || !ctx.spaces.some((s) => s.id === id)) return;
  const jar = await cookies();
  jar.set(SPACE_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  refresh();
}

export async function addMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  if (!can.manageRules(ctx.me.role)) {
    return fail("Seuls l'artiste et les managers ajoutent quelqu'un.");
  }

  const handle = text(formData, "handle").toLowerCase();
  const name = text(formData, "name") || handle;
  const role = text(formData, "role") as SpaceRole;
  if (!/^[a-z0-9._-]{3,32}$/.test(handle)) {
    return fail("Identifiant : 3 à 32 caractères, lettres, chiffres, . _ -");
  }

  // Mot de passe provisoire lisible : il se transmet de vive voix.
  const temp = `nopact-${Math.random().toString(36).slice(2, 8)}`;

  const sb = await supabase();
  const { data, error } = await sb.rpc("create_member", {
    target: ctx.space.id,
    new_handle: handle,
    new_name: name,
    new_role: role,
    temp_pass: temp,
  });
  if (error) return fail(readable(error.message));
  if (data === "deja membre") return fail(`${name} est déjà dans l'espace.`);
  if (data === "refuse") return fail("Tu n'as pas le droit d'ajouter quelqu'un.");
  if (data !== "ok") return fail(String(data));

  await writeLedger({
    spaceId: ctx.space.id,
    actor: ctx.user.id,
    type: "membre",
    text: `${name} ajouté comme ${ROLE_LABEL[role].toLowerCase()} (identifiant « ${handle} »)`,
  });

  refresh();
  return {
    notice: `${name} peut se connecter : identifiant « ${handle} », mot de passe provisoire « ${temp} ». Il le changera à sa première connexion.`,
  };
}

export async function saveTeam(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  if (!can.manageRules(ctx.me.role)) {
    return fail("Seuls l'artiste et les managers modifient l'espace.");
  }

  const name = text(formData, "spaceName") || ctx.space.name;
  const sb = await supabase();
  // Ouvrir l'espace, c'est dire qui en fait partie. Rien d'autre.
  const { error } = await sb
    .from("spaces")
    .update({ name, configured: true })
    .eq("id", ctx.space.id);
  if (error) return fail(readable(error.message));

  if (name !== ctx.space.name) {
    await writeLedger({
      spaceId: ctx.space.id,
      actor: ctx.user.id,
      type: "reglages",
      text: `Espace renommé « ${ctx.space.name} » → « ${name} »`,
    });
  }
  refresh();
  return ok;
}

/**
 * Propose une répartition. Rien ne change tant que l'artiste et au moins un
 * manager ne l'ont pas acceptée.
 */
export async function proposeTerms(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  const { pending } = await getAgreementState(ctx.label.id);
  if (pending) return fail("Une proposition est déjà en cours. Traite-la d'abord.");

  const shares = ctx.members.map((m) => ({
    userId: m.userId,
    role: m.role,
    pct: Number(text(formData, `share_${m.userId}`)),
  }));
  if (shares.some((s) => !Number.isFinite(s.pct) || s.pct < 0 || s.pct > 100)) {
    return fail("Chaque part va de 0 à 100 %.");
  }
  const total = Math.round(shares.reduce((t, s) => t + s.pct, 0) * 100) / 100;
  if (total !== 100) return fail(`Le total fait ${total} % : il doit faire 100 %.`);
  const artiste = shares.filter((s) => s.role === "artiste");
  if (artiste.length && artiste.reduce((t, s) => t + s.pct, 0) < 50) {
    return fail("L'artiste ne descend jamais sous 50 %.");
  }

  const recoupModel = text(formData, "recoupModel");
  if (!["plancher", "brut", "part_label"].includes(recoupModel)) {
    return fail("Choisis comment le label se rembourse.");
  }
  const floorPct = Number(text(formData, "floorPct") || 0);
  if (!Number.isFinite(floorPct) || floorPct < 0 || floorPct > 100) {
    return fail("Le minimum artiste va de 0 à 100 %.");
  }

  const created = await createProposal({
    labelId: ctx.label.id,
    userId: ctx.user.id,
    projectName: ctx.label.name,
    recoupModel,
    floorPct,
    shares,
  });
  if ("error" in created) return fail(created.error);

  const applied = await applyProposalIfAccepted(created.id, ctx.label.id);
  refresh();
  return {
    notice: applied
      ? "Accord en vigueur."
      : "Proposition envoyée. Elle s'applique dès que l'artiste et un manager l'ont acceptée.",
  };
}

export async function voteProposal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  const id = text(formData, "id");
  const accept = text(formData, "accept") === "oui";
  const { pending } = await getAgreementState(ctx.label.id);
  if (!pending || pending.id !== id) {
    return fail("Cette proposition n'est plus en cours.");
  }
  const mine = pending.shares.find((s) => s.user_id === ctx.user.id);
  if (!mine) return fail("Tu ne fais pas partie de cette proposition.");
  if (mine.validated) return fail("Tu l'as déjà acceptée.");

  if (accept) {
    await acceptProposal(id, ctx.user.id);
    await applyProposalIfAccepted(id, ctx.label.id);
  } else {
    await closeProposal(id);
  }
  refresh();
  return ok;
}

export async function withdrawProposal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  const id = text(formData, "id");
  const { pending } = await getAgreementState(ctx.label.id);
  if (!pending || pending.id !== id) return ok;
  if (pending.created_by !== ctx.user.id) {
    return fail("Seule la personne qui a proposé peut retirer sa proposition.");
  }
  await closeProposal(id);
  refresh();
  return ok;
}

// --- dépenses ----------------------------------------------------------------

export async function createExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  if (!can.createExpense(ctx.me.role)) {
    return fail("Seul le label saisit une dépense.");
  }

  const amount = Number(formData.get("amount") ?? 0);
  const label = text(formData, "label");
  const vendor = text(formData, "vendor");
  const relatedParty = formData.get("relatedParty") === "on";
  const category = text(formData, "category") as ExpenseCategory;

  if (!label) return fail("Il manque le libellé.");
  if (!vendor) return fail("Il manque le prestataire.");

  // Pas de justificatif, pas de dépense : la base le refuse aussi.
  const fichier = formData.get("receipt");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return fail("Ajoute la facture : photo, capture d'écran ou PDF.");
  }
  if (fichier.size > 10 * 1024 * 1024) {
    return fail("Le fichier dépasse 10 Mo.");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Le montant doit être supérieur à zéro.");
  }

  const vid = await vendorId(ctx.space.id, vendor, relatedParty);
  if (!vid) return fail("Impossible d'enregistrer ce prestataire.");

  const depot = await uploadReceipt(ctx.space.id, fichier);
  if ("error" in depot) return fail(`Justificatif refusé : ${depot.error}`);
  const receipt = depot.path;

  const sb = await supabase();
  const { error } = await sb.from("expenses").insert({
    space_id: ctx.space.id,
    label,
    category: CATEGORIES.includes(category) ? category : "Autre",
    amount,
    date: text(formData, "date") || new Date().toISOString().slice(0, 10),
    vendor_id: vid,
    receipt,
    comment: text(formData, "comment"),
    // Toute dépense attend un manager, quel que soit le montant.
    status: "en_attente",
    created_by: ctx.user.id,
  });
  if (error) return fail(readable(error.message));

  await writeLedger({
    spaceId: ctx.space.id,
    actor: ctx.user.id,
    type: "depense",
    text: `Dépense ${label} — ${eur(amount)} créée${relatedParty ? " (prestataire lié)" : ""}`,
  });
  {
    await writeLedger({
      spaceId: ctx.space.id,
      actor: ctx.user.id,
      type: "justificatif",
      text: `Justificatif joint (${fichier.name})`,
    });
  }

  refresh();
  return ok;
}

export async function validateExpense(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  if (!can.validate(ctx.me.role)) return fail("Seuls les managers valident.");

  const id = text(formData, "id");
  const comment = text(formData, "comment");
  const expense = ctx.store.expenses.find(
    (e) => e.id === id && e.spaceId === ctx.space.id,
  );
  if (!expense) return fail("Dépense introuvable dans cet espace.");
  if (expense.createdBy === ctx.user.id) {
    return fail("On ne valide pas sa propre saisie.");
  }
  if (expense.validations.some((v) => v.by === ctx.user.id)) return ok;

  const sb = await supabase();
  const { error } = await sb.from("validations").insert({
    space_id: ctx.space.id,
    expense_id: id,
    by_user: ctx.user.id,
    comment,
  });
  if (error) return fail(readable(error.message));

  // Un prestataire lié au label exige tous les managers de l'espace.
  const managers = membersOf(ctx.store, ctx.space.id).filter(
    (m) => m.role === "manager",
  ).length;
  // Un prestataire lié au label exige tous les managers, sinon un seul suffit.
  const required = expense.relatedParty ? Math.max(1, managers) : 1;
  if (expense.validations.length + 1 >= required) {
    await sb.from("expenses").update({ status: "validee" }).eq("id", id);
  }

  await writeLedger({
    spaceId: ctx.space.id,
    actor: ctx.user.id,
    type: "validation",
    text: `Validée par ${ctx.user.name}${comment ? ` — « ${comment} »` : ""}`,
    ref: id,
  });

  refresh();
  return ok;
}

export async function disputeLine(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  const id = text(formData, "id");
  const kind = text(formData, "kind");
  const reason = text(formData, "reason");
  if (!reason) return fail("Explique ce que tu contestes.");

  // Une contestation n'efface rien. Elle marque, elle notifie, elle reste.
  const sb = await supabase();
  const table = kind === "revenu" ? "revenues" : "expenses";
  const patch = kind === "revenu" ? { disputed: true } : { disputed: true, status: "contestee" };
  const { error } = await sb
    .from(table)
    .update(patch)
    .eq("id", id)
    .eq("space_id", ctx.space.id);
  if (error) return fail(readable(error.message));

  await writeLedger({
    spaceId: ctx.space.id,
    actor: ctx.user.id,
    type: "contestation",
    text: `Ligne contestée par ${ctx.user.name} — « ${reason} »`,
    ref: id,
  });

  refresh();
  return ok;
}

export async function sealMonth(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  if (!can.seal(ctx.me.role)) return fail("Seul le label clôture le mois.");

  const period = text(formData, "period");
  if (
    ctx.store.sealedMonths.some(
      (s) => s.period === period && s.spaceId === ctx.space.id,
    )
  ) {
    return ok;
  }

  // L'empreinte du mois est celle de l'entrée de clôture, calculée en base.
  await writeLedger({
    spaceId: ctx.space.id,
    actor: ctx.user.id,
    type: "cloture",
    text: `Mois ${monthLabel(period)} scellé`,
    ref: period,
  });

  const sb = await supabase();
  const last = await sb
    .from("ledger")
    .select("hash")
    .eq("space_id", ctx.space.id)
    .order("seq", { ascending: false })
    .limit(1)
    .single();

  const { error } = await sb.from("sealed_months").insert({
    space_id: ctx.space.id,
    period,
    hash: last.data?.hash ?? "",
  });
  if (error) return fail(readable(error.message));

  refresh();
  return ok;
}

export async function importRevenues(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  if (!can.importRevenue(ctx.me.role)) {
    return fail("Seul le label importe un relevé.");
  }

  const file = text(formData, "sourceFile");
  const period = text(formData, "period");
  const rows = text(formData, "rows");
  if (!file) return fail("Indique le nom du fichier du relevé.");
  if (!/^\d{4}-\d{2}$/.test(period)) return fail("La période s'écrit comme 2026-08.");
  if (!rows) return fail("Colle au moins une ligne du relevé.");

  // Aucune ligne de revenu ne se saisit à la main : on dérive du relevé brut.
  const today = new Date().toISOString().slice(0, 10);
  const lines = [];
  let gross = 0;
  for (const line of rows.split("\n")) {
    const [source, amount, fees] = line.split(",").map((s) => s.trim());
    const g = Number(amount);
    if (!source || !Number.isFinite(g)) continue;
    lines.push({
      space_id: ctx.space.id,
      source,
      period,
      cashed_at: today,
      gross: g,
      fees: Number(fees) || 0,
      currency: "EUR",
      fx_rate: 1,
      status: "encaisse",
      source_file: file,
      created_by: ctx.user.id,
    });
    gross += g;
  }
  if (lines.length === 0) {
    return fail("Aucune ligne lisible. Format attendu : source, brut, frais.");
  }

  const sb = await supabase();
  const { error } = await sb.from("revenues").insert(lines);
  if (error) return fail(readable(error.message));

  await writeLedger({
    spaceId: ctx.space.id,
    actor: ctx.user.id,
    type: "revenu",
    text: `Import relevé ${file} ${period} — ${lines.length} lignes, ${eur(gross)} bruts`,
  });

  refresh();
  return ok;
}

export { verifyChainDb };

/**
 * Lit la facture et renvoie ce qu'elle contient. Rien n'est enregistré ici :
 * les champs remplissent le formulaire, la personne corrige et valide.
 */
export async function readReceipt(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await context();
  if (!ctx) return fail("Session expirée. Reconnecte-toi.");
  if (!can.createExpense(ctx.me.role)) {
    return fail("Seul le label saisit une dépense.");
  }

  const fichier = formData.get("receipt");
  if (!(fichier instanceof File) || fichier.size === 0) {
    return fail("Choisis d'abord la photo de la facture.");
  }

  const lu = await lireFacture(fichier);
  if (!lu.ok) return fail(lu.error);

  return { lecture: lu.data };
}

