import type { Config, RecoupModel, SpaceRole } from "./types";

/** Un ayant droit de l'espace : déjà inscrit, ou seulement invité. */
export type MemberInput = {
  id: string;
  pending?: boolean;
  role: SpaceRole;
  share: number;
};

export type RulesResult =
  | { ok: false; error: string }
  | { ok: true; members: MemberInput[]; config: Config };

const MODELS: RecoupModel[] = ["plancher", "brut", "part_label"];
const ROLES: SpaceRole[] = ["artiste", "manager", "producteur", "label"];

/**
 * Valide les règles d'un espace. Pure : aucune I/O, aucune requête — les
 * garde-fous vivent ici, donc ils se testent seuls.
 */
export function parseRules(
  current: Config,
  members: MemberInput[],
  input: Record<string, string>,
): RulesResult {
  const text = (k: string) => (input[k] ?? "").trim();
  /* Absent du formulaire = inchangé ; présent mais vide = effacé.
     Sans cette distinction, retirer un champ de l'écran remettrait le réglage
     à zéro en silence — et on ne pourrait plus vider une liste. */
  const present = (k: string) => input[k] !== undefined;
  const has = (k: string) => present(k) && input[k] !== "";
  const num = (k: string, actuel: number) =>
    has(k) && Number.isFinite(Number(input[k])) ? Number(input[k]) : actuel;

  if (members.length === 0) {
    return { ok: false, error: "Un espace a besoin d'au moins une personne." };
  }
  if (members.some((m) => !ROLES.includes(m.role))) {
    return { ok: false, error: "Rôle inconnu." };
  }
  if (members.some((m) => !Number.isFinite(m.share) || m.share < 0)) {
    return { ok: false, error: "Chaque part doit être un pourcentage positif." };
  }

  const artists = members.filter((m) => m.role === "artiste");
  if (artists.length === 0) {
    return { ok: false, error: "Il faut au moins un artiste dans l'espace." };
  }
  if (!members.some((m) => m.role === "label")) {
    return { ok: false, error: "Il faut un label dans l'espace." };
  }

  const total = members.reduce((s, m) => s + m.share, 0);
  if (Math.abs(total - 100) > 0.01) {
    return {
      ok: false,
      error: `Les parts font ${Math.round(total * 100) / 100} %, elles doivent faire 100 %.`,
    };
  }

  // La règle que l'artiste s'est fixée : il ne descend jamais sous la moitié.
  const artistShare = artists.reduce((s, m) => s + m.share, 0);
  if (artistShare < 50) {
    return {
      ok: false,
      error: `L'artiste tombe à ${artistShare} %. Il ne descend jamais sous 50 %.`,
    };
  }

  const floorPct = num("floorPct", current.floorPct);
  if (!Number.isFinite(floorPct) || floorPct < 0 || floorPct > 100) {
    return { ok: false, error: "Le plancher artiste se situe entre 0 et 100 %." };
  }

  const recoupModel = (has("recoupModel")
    ? text("recoupModel")
    : current.recoupModel) as RecoupModel;
  if (!MODELS.includes(recoupModel)) {
    return { ok: false, error: "Modèle de recoupement inconnu." };
  }

  const start = has("contractStart") ? text("contractStart") : current.contractStart;
  const end = has("contractEnd") ? text("contractEnd") : current.contractEnd;
  if (start && end && end <= start) {
    return { ok: false, error: "La fin du contrat doit suivre son début." };
  }

  return {
    ok: true,
    members,
    config: {
      ...current,
      projectName:
        (has("projectName") ? text("projectName") : current.projectName) ||
        "Projet principal",
      contractStart: start,
      contractEnd: end,
      exitWindowDays: num("exitWindowDays", current.exitWindowDays) || 90,
      investment: 0,
      recoupModel,
      floorPct,
      validationThreshold: Math.max(0, num("validationThreshold", current.validationThreshold)),
      monthlyCategoryThreshold: Math.max(
        0,
        num("monthlyCategoryThreshold", current.monthlyCategoryThreshold),
      ),
      nonRecoupable: present("nonRecoupable")
        ? input.nonRecoupable.split(",").map((x) => x.trim()).filter(Boolean)
        : current.nonRecoupable,
    },
  };
}
