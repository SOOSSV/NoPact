// @ts-nocheck
import { expensesOf, revenuesOf } from "./store";
import type { Config, Revenue, SpaceRole, Store } from "./types";

export const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));

export const eur2 = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function monthLabel(period: string) {
  const [y, m] = period.split("-");
  return `${MONTHS[Number(m) - 1] ?? "?"} ${y}`;
}

export function shortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()].slice(0, 4)}.`;
}

/** Montant net en euros, frais déduits et change appliqué. */
export function netOf(r: Revenue) {
  return (r.gross - r.fees) * r.fxRate;
}

/** Un ayant droit de l'espace : c'est la part qui compte, pas le rôle. */
export type Party = { userId: string; role: SpaceRole; share: number };

export type Distribution = {
  pool: number;
  toDebt: number;
  parts: Record<string, number>;
};

/**
 * Répartit un pool net entre les membres d'un espace selon le modèle de
 * recoupement. Le nombre de personnes et de rôles est libre : deux managers
 * et deux producteurs se répartissent comme n'importe quelle autre
 * combinaison, du moment que les parts font 100 %.
 */
export function distribute(
  pool: number,
  cfg: Config,
  parties: Party[],
  debt: number,
): Distribution {
  const parts: Record<string, number> = {};
  for (const p of parties) parts[p.userId] = 0;

  const splitAll = (amount: number) => {
    for (const p of parties) parts[p.userId] += amount * (p.share / 100);
  };

  if (pool <= 0) return { pool, toDebt: 0, parts };
  if (debt <= 0) {
    splitAll(pool);
    return { pool, toDebt: 0, parts };
  }

  let toDebt = 0;

  if (cfg.recoupModel === "brut") {
    toDebt = Math.min(pool, debt);
    splitAll(pool - toDebt);
  } else if (cfg.recoupModel === "part_label") {
    // Seul le label rembourse, sur sa propre part. Les autres touchent tout.
    const labels = parties.filter((p) => p.role === "label");
    const labelPct = labels.reduce((s, p) => s + p.share, 0);
    const labelPool = pool * (labelPct / 100);
    toDebt = Math.min(labelPool, debt);
    const kept = labelPool - toDebt;
    for (const p of parties) {
      if (p.role === "label") {
        parts[p.userId] += labelPct > 0 ? kept * (p.share / labelPct) : 0;
      } else {
        parts[p.userId] += pool * (p.share / 100);
      }
    }
  } else {
    // Plancher : les artistes touchent un minimum garanti avant tout
    // remboursement, réparti entre eux au prorata de leurs parts.
    const artists = parties.filter((p) => p.role === "artiste");
    const artistPct = artists.reduce((s, p) => s + p.share, 0);
    const floor = pool * (cfg.floorPct / 100);
    if (artistPct > 0) {
      for (const p of artists) parts[p.userId] += floor * (p.share / artistPct);
    }
    const available = pool - (artistPct > 0 ? floor : 0);
    toDebt = Math.min(available, debt);
    splitAll(available - toDebt);
  }

  return { pool, toDebt, parts };
}

/** Périodes présentes dans les revenus, de la plus récente à la plus ancienne. */
export function periods(store: Store, spaceId: string) {
  return [...new Set(revenuesOf(store, spaceId).map((r) => r.period))]
    .sort()
    .reverse();
}

/** Pool net encaissé sur une période. L'argent seulement généré n'entre pas. */
export function cashedPool(store: Store, spaceId: string, period: string) {
  return revenuesOf(store, spaceId)
    .filter((r) => r.period === period && r.status !== "genere")
    .reduce((s, r) => s + netOf(r), 0);
}

export function pendingPool(store: Store, spaceId: string) {
  return revenuesOf(store, spaceId)
    .filter((r) => r.status === "genere")
    .reduce((s, r) => s + netOf(r), 0);
}

/**
 * Seules les dépenses validées ET récupérables entament le montant à recouvrer.
 * Le marketing, par défaut, reste à la charge du label.
 */
export function validatedExpenses(store: Store, spaceId: string) {
  return expensesOf(store, spaceId)
    .filter((e) => e.status === "validee" && e.recoupable)
    .reduce((s, e) => s + e.amount, 0);
}

/** Ce que le label assume sans le récupérer. */
export function labelBearsExpenses(store: Store, spaceId: string) {
  return expensesOf(store, spaceId)
    .filter((e) => e.status === "validee" && !e.recoupable)
    .reduce((s, e) => s + e.amount, 0);
}

export type Recoup = {
  invested: number;
  recouped: number;
  remaining: number;
  pct: number;
};

export function recoupment(
  store: Store,
  spaceId: string,
  cfg: Config,
  parties: Party[],
): Recoup {
  // Ce que le label a réellement engagé : des dépenses prouvées et validées.
  const invested = validatedExpenses(store, spaceId);
  let debt = invested;
  for (const p of [...periods(store, spaceId)].reverse()) {
    debt -= distribute(cashedPool(store, spaceId, p), cfg, parties, debt).toDebt;
  }
  const recouped = invested - debt;
  return {
    invested,
    recouped,
    remaining: Math.max(0, debt),
    pct: invested > 0 ? Math.min(100, (recouped / invested) * 100) : 0,
  };
}

/** Soldes cumulés de chacun sur toute l'histoire de l'espace. */
export function balances(
  store: Store,
  spaceId: string,
  cfg: Config,
  parties: Party[],
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const p of parties) totals[p.userId] = 0;
  let debt = validatedExpenses(store, spaceId);
  for (const period of [...periods(store, spaceId)].reverse()) {
    const d = distribute(
      cashedPool(store, spaceId, period), cfg, parties, debt,
    );
    debt -= d.toDebt;
    for (const p of parties) totals[p.userId] += d.parts[p.userId] ?? 0;
  }
  return totals;
}

/** Mois restants avant extinction de la dette, au rythme observé. */
export function projection(
  store: Store,
  spaceId: string,
  cfg: Config,
  parties: Party[],
) {
  const r = recoupment(store, spaceId, cfg, parties);
  if (r.remaining <= 0) return null;
  const ps = periods(store, spaceId);
  if (ps.length === 0) return null;
  const avg =
    ps.reduce((s, p) => s + cashedPool(store, spaceId, p), 0) / ps.length;
  if (avg <= 0) return null;
  const perMonth = distribute(avg, cfg, parties, r.remaining).toDebt;
  if (perMonth <= 0) return null;
  return Math.ceil(r.remaining / perMonth);
}
