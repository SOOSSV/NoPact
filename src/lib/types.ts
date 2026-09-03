/**
 * Multi-espaces. Un espace = un deal avec un label.
 * L'artiste et ses managers gardent le même compte d'un espace à l'autre ;
 * c'est le label qui change. Les données ne traversent jamais un espace.
 */

export type SpaceRole = "artiste" | "manager" | "producteur" | "label";

export type User = {
  id: string;
  name: string;
  /** Identifiant de connexion. L'adresse interne n'est jamais montrée. */
  handle: string;
  createdAt: string;
  /** Vrai tant que la personne n'a pas choisi ses propres identifiants. */
  mustChange: boolean;
};

export type Membership = {
  id: string;
  spaceId: string;
  userId: string;
  role: SpaceRole;
  /** Part de royalties détenue en propre, en pourcentage. */
  share: number;
  joinedAt: string;
};

/** Personne invitée mais pas encore inscrite : sa part est déjà réservée. */
export type Invitation = {
  id: string;
  spaceId: string;
  email: string;
  name: string;
  role: SpaceRole;
  share: number;
};

export type RecoupModel = "brut" | "part_label" | "plancher";

export type Config = {
  projectName: string;
  contractStart: string;
  contractEnd: string;
  exitWindowDays: number;
  investment: number;
  recoupModel: RecoupModel;
  /** Part du brut versée aux artistes quoi qu'il arrive, en %. */
  floorPct: number;
  validationThreshold: number;
  monthlyCategoryThreshold: number;
  /** Catégories que le label assume : elles n'entrent jamais dans la dette. */
  nonRecoupable: string[];
};

export type Space = {
  id: string;
  /** Nom de l'espace, en général celui du label. */
  name: string;
  configured: boolean;
  config: Config;
  createdBy: string;
  createdAt: string;
};

export type RevenueSource = string;

/** Un euro a trois dates : généré, encaissé, versé. */
export type RevenueStatus = "genere" | "encaisse" | "verse";

export type Revenue = {
  id: string;
  spaceId: string;
  source: RevenueSource;
  /** Mois d'exploitation : "2026-06". */
  period: string;
  cashedAt: string | null;
  gross: number;
  fees: number;
  currency: "EUR" | "USD";
  /** Taux figé au jour de l'encaissement. */
  fxRate: number;
  status: RevenueStatus;
  work: string | null;
  /** Relevé distributeur d'origine. Obligatoire : pas de saisie manuelle. */
  sourceFile: string;
  createdBy: string;
  createdAt: string;
  disputed: boolean;
};

export type ExpenseCategory =
  | "Studio"
  | "Clip"
  | "Marketing"
  | "Déplacement"
  | "Hôtel"
  | "Restaurant"
  | "Autre";

export type ExpenseStatus = "en_attente" | "validee" | "contestee";

export type Validation = { by: string; at: string; comment: string };

export type Expense = {
  id: string;
  spaceId: string;
  label: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  vendor: string;
  /** Prestataire lié au label : exige la validation de tous les managers. */
  relatedParty: boolean;
  receipt: string | null;
  comment: string;
  project: string;
  status: ExpenseStatus;
  /** Faux : le label l'assume, elle ne se rembourse pas sur les revenus. */
  recoupable: boolean;
  validations: Validation[];
  createdBy: string;
  createdAt: string;
  disputed: boolean;
};

export type LedgerType =
  | "revenu"
  | "depense"
  | "validation"
  | "justificatif"
  | "contestation"
  | "cloture"
  | "avance"
  | "reglages"
  | "membre";

export type LedgerEntry = {
  spaceId: string;
  /** Rang dans la chaîne de cet espace. Chaque espace a la sienne. */
  seq: number;
  at: string;
  actor: string;
  type: LedgerType;
  text: string;
  ref: string | null;
  prevHash: string;
  hash: string;
};

export type SealedMonth = {
  spaceId: string;
  period: string;
  sealedAt: string;
  hash: string;
};

/** Une part proposée : membre inscrit ou personne encore invitée. */
export type ProposedShare = {
  kind: "member" | "invite";
  id: string;
  role: SpaceRole;
  share: number;
};

export type Terms = {
  projectName: string;
  contractStart: string;
  contractEnd: string;
  exitWindowDays: number;
  investment: number;
  recoupModel: RecoupModel;
  floorPct: number;
  validationThreshold: number;
  monthlyCategoryThreshold: number;
  nonRecoupable: string[];
  shares: ProposedShare[];
};

export type ProposalStatus = "en_attente" | "applique" | "refuse" | "retire";

export type ProposalVote = {
  proposalId: string;
  voter: string;
  accept: boolean;
  comment: string;
  at: string;
};

/** Aucun terme ne change sans accord : toute modification passe par là. */
export type TermProposal = {
  id: string;
  spaceId: string;
  proposedBy: string;
  note: string;
  terms: Terms;
  status: ProposalStatus;
  createdAt: string;
  votes: ProposalVote[];
};

export type Store = {
  users: User[];
  invitations: Invitation[];
  proposals: TermProposal[];
  spaces: Space[];
  memberships: Membership[];
  revenues: Revenue[];
  expenses: Expense[];
  ledger: LedgerEntry[];
  sealedMonths: SealedMonth[];
};

/** Un espace résolu avec ses membres, tel que le voient les pages. */
export type SpaceView = {
  space: Space;
  members: (Membership & { name: string; email: string })[];
  me: Membership & { name: string; email: string };
};
