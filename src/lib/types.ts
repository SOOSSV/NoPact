/**
 * NoPact: Multi-tenant platform for music labels
 * Architecture: Label → Users → Memberships → Agreements
 */

export type Role = "artiste" | "manager" | "producteur" | "label";
export type SpaceRole = Role; // Backward compatibility
export type RecoupModel = "brut" | "part_label" | "plancher";
export type AgreementStatus = "en_attente" | "validee" | "signee" | "archivee";

// ============================================================================
// Users
// ============================================================================
export type User = {
  id: string;
  handle: string; // User's chosen ID (e.g., "daniel_soossv")
  email: string;
  name: string;
  createdAt: string;
  mustChange?: boolean; // Legacy
};

// ============================================================================
// Labels (Organizations)
// ============================================================================
export type Label = {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  createdAt: string;
};

export type Space = Label; // Legacy alias

// ============================================================================
// Memberships
// ============================================================================
export type Membership = {
  id: string;
  labelId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  share: number; // Legacy: % is now in Shares table (default 0)
};

export type MembershipView = Membership & {
  name: string;
  email: string;
  handle: string;
};

// ============================================================================
// Invitations
// ============================================================================
export type Invitation = {
  id: string;
  labelId: string;
  email: string;
  name: string;
  role: Role;
  token: string;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
};

// ============================================================================
// Agreements (Contracts)
// ============================================================================
export type Agreement = {
  id: string;
  labelId: string;
  projectName: string;
  status: AgreementStatus;
  investment: number;
  recoupModel: RecoupModel;
  floorPct: number;
  createdBy: string;
  createdAt: string;
  signedAt: string | null;
  signedByDoc: string | null; // URL to signed document
};

// ============================================================================
// Shares (% Proposals)
// ============================================================================
export type Share = {
  id: string;
  agreementId: string;
  userId: string;
  proposedPct: number;
  validated: boolean;
  validatedAt: string | null;
  createdAt: string;
};

export type ShareView = Share & {
  name: string;
  email: string;
  handle: string;
  role: Role;
};

// ============================================================================
// Views (for pages)
// ============================================================================
export type LabelView = {
  label: Label;
  me: MembershipView;
  members: MembershipView[];
  agreements: Agreement[];
};

export type AgreementView = {
  agreement: Agreement;
  shares: ShareView[];
  canValidate: boolean; // true if user is artiste
  canSign: boolean; // true if all shares are validated
};

// ============================================================================
// LEGACY TYPES (backward compatibility)
// ============================================================================
export type ExpenseCategory =
  | "Studio"
  | "Clip"
  | "Marketing"
  | "Déplacement"
  | "Hôtel"
  | "Restaurant"
  | "Autre";

export type Revenue = any;
export type Expense = any;
export type LedgerEntry = any;
export type LedgerType = any;
export type SealedMonth = any;
export type Store = any;
export type TermProposal = any;
export type ProposalVote = any;
export type Config = any;
export type Validation = any;
