const assert = require("node:assert");
const { parseRules } = require("../.test-build/settings");
const { emptyStore, DEFAULT_CONFIG } = require("../.test-build/defaults");
const { distribute } = require("../.test-build/money");
const {
  membershipIn,
  spacesOfUser,
  revenuesOf,
  expensesOf,
  membersOf,
} = require("../.test-build/store");

let pass = 0;
const t = (name, fn) => {
  fn();
  pass++;
  console.log("  ok  " + name);
};

// Cinq personnes plus le label : deux managers, deux producteurs.
const TEAM = [
  { userId: "u_artiste", role: "artiste", share: 50 },
  { userId: "u_ryan", role: "manager", share: 10 },
  { userId: "u_kenza", role: "manager", share: 10 },
  { userId: "u_prod1", role: "producteur", share: 5 },
  { userId: "u_prod2", role: "producteur", share: 5 },
  { userId: "u_label", role: "label", share: 20 },
];

const cfg = { ...DEFAULT_CONFIG, investment: 12000 };
const form = (o) => ({
  floorPct: "20",
  recoupModel: "plancher",
  investment: "12000",
  validationThreshold: "500",
  monthlyCategoryThreshold: "1000",
  ...o,
});
const team = (over = {}) =>
  TEAM.map((m) => ({ ...m, ...(over[m.userId] ?? {}) }));

console.log("\nRègles de l'espace");
t("accepte six personnes dont deux producteurs", () => {
  const r = parseRules(cfg, team(), form());
  assert.equal(r.ok, true);
  assert.equal(r.members.filter((m) => m.role === "producteur").length, 2);
});
t("refuse des parts qui ne font pas 100 %", () => {
  const r = parseRules(cfg, team({ u_label: { share: 30 } }), form());
  assert.equal(r.ok, false);
  assert.match(r.error, /110 %/);
});
t("refuse l'artiste sous 50 %", () => {
  const r = parseRules(
    cfg,
    team({ u_artiste: { share: 45 }, u_label: { share: 25 } }),
    form(),
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /jamais sous 50/);
});
t("refuse un espace sans artiste", () => {
  const r = parseRules(
    cfg,
    team().map((m) => (m.role === "artiste" ? { ...m, role: "producteur" } : m)),
    form(),
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /au moins un artiste/);
});
t("refuse un espace sans label", () => {
  const r = parseRules(
    cfg,
    team().filter((m) => m.role !== "label").concat([
      { userId: "u_label", role: "producteur", share: 20 },
    ]),
    form(),
  );
  assert.equal(r.ok, false);
  assert.match(r.error, /un label/);
});
t("retient les catégories à la charge du label", () => {
  const r = parseRules(cfg, team(), form({ nonRecoupable: "Marketing, Restaurant" }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.config.nonRecoupable, ["Marketing", "Restaurant"]);
});
t("champ vidé = plus aucune catégorie à la charge du label", () => {
  const r = parseRules(cfg, team(), form({ nonRecoupable: "" }));
  assert.equal(r.ok, true);
  assert.deepEqual(r.config.nonRecoupable, []);
});
t("champ absent de l'écran = réglage inchangé", () => {
  const base = { ...cfg, nonRecoupable: ["Marketing"], floorPct: 25 };
  const sans = form();
  delete sans.nonRecoupable;
  delete sans.floorPct;
  const r = parseRules(base, team(), sans);
  assert.equal(r.ok, true);
  assert.deepEqual(r.config.nonRecoupable, ["Marketing"]);
  assert.equal(r.config.floorPct, 25);
});
t("refuse une fin de contrat avant le début", () => {
  const r = parseRules(
    cfg,
    team(),
    form({ contractStart: "2026-09-01", contractEnd: "2026-01-01" }),
  );
  assert.equal(r.ok, false);
});

console.log("\nRépartition à six");
t("plancher : le minimum va aux artistes, pas aux producteurs", () => {
  const d = distribute(5000, cfg, TEAM, 12000);
  assert.equal(d.parts.u_artiste, 1000); // 20 % de 5 000
  assert.equal(d.parts.u_prod1, 0);
  assert.equal(d.parts.u_label, 0);
  assert.equal(d.toDebt, 4000);
});
t("brut : personne ne touche rien tant que la dette court", () => {
  const d = distribute(5000, { ...cfg, recoupModel: "brut" }, TEAM, 12000);
  assert.equal(d.toDebt, 5000);
  for (const p of TEAM) assert.equal(d.parts[p.userId], 0);
});
t("part label : les producteurs touchent dès le premier mois", () => {
  const d = distribute(5000, { ...cfg, recoupModel: "part_label" }, TEAM, 12000);
  assert.equal(d.parts.u_artiste, 2500);
  assert.equal(d.parts.u_prod1, 250);
  assert.equal(d.parts.u_prod2, 250);
  assert.equal(d.parts.u_label, 0);
  assert.equal(d.toDebt, 1000);
});
t("dette éteinte : répartition pleine au prorata des parts", () => {
  const d = distribute(1000, cfg, TEAM, 0);
  assert.equal(d.toDebt, 0);
  assert.equal(d.parts.u_artiste, 500);
  assert.equal(d.parts.u_ryan, 100);
  assert.equal(d.parts.u_prod1, 50);
  assert.equal(d.parts.u_label, 200);
});
t("le total réparti égale toujours le pool", () => {
  for (const model of ["plancher", "brut", "part_label"]) {
    for (const debt of [0, 500, 12000]) {
      const d = distribute(5000, { ...cfg, recoupModel: model }, TEAM, debt);
      const sum =
        d.toDebt + Object.values(d.parts).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - 5000) < 0.01, `${model} / dette ${debt} → ${sum}`);
    }
  }
});

console.log("\nÉtanchéité entre espaces");

function twoSpaces() {
  const s = emptyStore();
  s.users.push(
    { id: "u1", name: "Artiste", email: "a@x.fr", createdAt: "2026-01-01" },
    { id: "u2", name: "Label A", email: "la@x.fr", createdAt: "2026-01-01" },
    { id: "u3", name: "Label B", email: "lb@x.fr", createdAt: "2026-01-01" },
  );
  for (const id of ["A", "B"]) {
    s.spaces.push({
      id, name: "Espace " + id, configured: true, config: cfg,
      createdBy: "u1", createdAt: "2026-01-01",
    });
  }
  s.memberships.push(
    { id: "m1", spaceId: "A", userId: "u1", role: "artiste", share: 80, joinedAt: "" },
    { id: "m2", spaceId: "A", userId: "u2", role: "label", share: 20, joinedAt: "" },
    { id: "m3", spaceId: "B", userId: "u1", role: "artiste", share: 70, joinedAt: "" },
    { id: "m4", spaceId: "B", userId: "u3", role: "label", share: 30, joinedAt: "" },
  );
  const rev = (id, spaceId, gross, file) => ({
    id, spaceId, source: "Spotify", period: "2026-05", cashedAt: "2026-05-01",
    gross, fees: 0, currency: "EUR", fxRate: 1, status: "encaisse", work: null,
    sourceFile: file, createdBy: "u2", createdAt: "", disputed: false,
  });
  s.revenues.push(rev("r1", "A", 1000, "a.csv"), rev("r2", "B", 9000, "b.csv"));
  s.expenses.push({
    id: "e1", spaceId: "A", label: "clip", category: "Clip", amount: 400,
    date: "2026-05-02", vendor: "V", relatedParty: false, receipt: null,
    comment: "", project: "p", status: "validee", validations: [],
    createdBy: "u2", createdAt: "", disputed: false,
  });
  return s;
}

t("les revenus d'un espace ne fuient pas dans l'autre", () => {
  const s = twoSpaces();
  assert.deepEqual(revenuesOf(s, "A").map((r) => r.id), ["r1"]);
  assert.deepEqual(revenuesOf(s, "B").map((r) => r.id), ["r2"]);
  assert.equal(expensesOf(s, "B").length, 0);
});
t("l'artiste est dans les deux espaces, chaque label dans un seul", () => {
  const s = twoSpaces();
  assert.deepEqual(spacesOfUser(s, "u1").map((x) => x.id), ["A", "B"]);
  assert.deepEqual(spacesOfUser(s, "u2").map((x) => x.id), ["A"]);
  assert.deepEqual(spacesOfUser(s, "u3").map((x) => x.id), ["B"]);
});
t("le label d'un espace n'est membre nulle part ailleurs", () => {
  const s = twoSpaces();
  assert.equal(membershipIn(s, "B", "u2"), null);
  assert.equal(membershipIn(s, "A", "u2").role, "label");
});
t("la même personne peut avoir une part différente selon l'espace", () => {
  const s = twoSpaces();
  assert.equal(membershipIn(s, "A", "u1").share, 80);
  assert.equal(membershipIn(s, "B", "u1").share, 70);
});
t("la liste des membres est celle de l'espace demandé", () => {
  const s = twoSpaces();
  assert.deepEqual(membersOf(s, "A").map((m) => m.name), ["Artiste", "Label A"]);
  assert.deepEqual(membersOf(s, "B").map((m) => m.name), ["Artiste", "Label B"]);
});

console.log(`\n${pass} tests passés\n`);
