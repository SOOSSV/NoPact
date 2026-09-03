import type { Config, SpaceRole, Store } from "./types";

export const SPACE_ROLES: SpaceRole[] = [
  "artiste",
  "manager",
  "producteur",
  "label",
];

export const ROLE_LABEL: Record<SpaceRole, string> = {
  artiste: "Artiste",
  manager: "Manager",
  producteur: "Producteur",
  label: "Label",
};

/* Le rôle dit ce que la personne peut faire dans les comptes, pas son métier.
   « Producteur exécutif » qui avance l'argent = rôle label, quel que soit le
   mot employé entre vous. */
export const ROLE_HINT: Record<SpaceRole, string> = {
  artiste: "touche sa part, conteste, demande des avances",
  manager: "valide les dépenses, ne saisit rien",
  producteur: "touche une part sans rien financer",
  label: "met l'argent et se rembourse dessus, saisit tout",
};

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const DEFAULT_CONFIG: Config = {
  projectName: "",
  contractStart: "",
  contractEnd: "",
  exitWindowDays: 90,
  investment: 0,
  recoupModel: "plancher",
  floorPct: 20,
  validationThreshold: 500,
  monthlyCategoryThreshold: 1000,
  nonRecoupable: ["Marketing"],
};

/** Rien du tout : ni compte, ni espace, ni mouvement. */
export function emptyStore(): Store {
  return {
    users: [],
    invitations: [],
    proposals: [],
    spaces: [],
    memberships: [],
    revenues: [],
    expenses: [],
    ledger: [],
    sealedMonths: [],
  };
}
