import Link from "next/link";
import {
  Card,
  Checklist,
  Eyebrow,
  Gauge,
  NextStep,
  PageHeader,
  Pill,
  Stat,
  Why,
} from "@/components/ui";
import { Reveal } from "@/components/reveal";
import {
  balances,
  cashedPool,
  distribute,
  eur,
  monthLabel,
  pendingPool,
  periods,
  projection,
  recoupment,
} from "@/lib/money";
import { ROLE_LABEL, initialsOf } from "@/lib/defaults";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing";
import { context, currentUser } from "@/lib/session";
import { parties } from "@/lib/session";
import { expensesOf, ledgerOf, revenuesOf, sealedOf } from "@/lib/store";
import { verifyChainDb } from "@/lib/db";

export default async function Dashboard() {
  // Visiteur : la page d'accueil. Connecté sans espace : on va en créer un.
  const visiteur = await currentUser();
  if (visiteur?.mustChange) redirect("/bienvenue");

  const ctx = await context();
  if (!ctx) {
    if (visiteur) redirect("/espaces");
    return <Landing />;
  }
  const { store, space, members, me, user } = ctx;

  const cfg = space.config;
  const ps = parties(members);
  const revenues = revenuesOf(store, space.id);
  const expenses = expensesOf(store, space.id);

  // Les invités comptent comme membres de l'équipe : leur part est réservée.
  const people = members.map((m) => ({ role: m.role, share: m.share }));
  const total = people.reduce((s, p) => s + p.share, 0);
  const artistShare = people
    .filter((p) => p.role === "artiste")
    .reduce((s, p) => s + p.share, 0);
  const sharesOk =
    space.configured && Math.abs(total - 100) < 0.01 && artistShare >= 50;

  const steps = [
    { label: "Ton compte", done: true },
    { label: "Ton équipe", done: people.length >= 2, href: "/reglages" },
    { label: "L'accord signé", done: sharesOk, href: "/accord" },
    { label: "Le premier relevé", done: revenues.length > 0, href: "/revenus" },
  ];
  const next = steps.find((s) => !s.done);

  // Tant que tout n'est pas en place, une seule chose à l'écran : quoi faire.
  if (next) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader eyebrow={space.name} title={`Salut ${user.name}`} />
        <div className="stagger flex flex-col gap-4">
          <NextStep
            title={
              !steps[1].done
                ? "Ajoute les gens qui partagent l'argent"
                : !steps[2].done
                  ? "Mettez-vous d'accord sur les parts"
                  : "Importe ton premier relevé"
            }
            detail={
              !steps[1].done
                ? "Tes managers, tes producteurs, le label."
                : !steps[2].done
                  ? "Il faut ton accord et celui d'un manager."
                  : "Le CSV de ton distributeur ouvre le premier mois."
            }
            href={next.href ?? "/reglages"}
            cta={steps[1].done && steps[2].done ? "Aller aux revenus" : "Continuer"}
          />
          <Checklist steps={steps} />
        </div>
      </div>
    );
  }

  const rec = recoupment(store, space.id, cfg, ps);
  const bal = balances(store, space.id, cfg, ps);
  const months = periods(store, space.id);
  const last = months[0] ?? new Date().toISOString().slice(0, 7);
  const pending = expenses.filter((e) => e.status === "en_attente");
  const disputed = expenses.filter((e) => e.disputed);
  const chain = await verifyChainDb(space.id);
  const entries = ledgerOf(store, space.id);

  const monthPool = cashedPool(store, space.id, last);
  const monthSplit = distribute(monthPool, cfg, ps, rec.remaining);
  const monthExpenses = expenses
    .filter((e) => e.date.startsWith(last) && e.status !== "contestee")
    .reduce((s, e) => s + e.amount, 0);
  const proj = projection(store, space.id, cfg, ps);

  const enRoute = pendingPool(store, space.id) * (me.share / 100);
  const isLabel = me.role === "label";
  const isManager = me.role === "manager";

  return (
    <>
      <PageHeader
        eyebrow={`${space.name} · ${monthLabel(last)}`}
        title={
          isLabel
            ? "Où en est l'investissement"
            : isManager
              ? "Ce qui attend ton contrôle"
              : "Ta part"
        }
        action={
          <Pill tone={chain.ok ? "ok" : "alert"}>
            {chain.ok
              ? `journal intègre · ${entries.length}`
              : `altéré au rang ${chain.brokenAt}`}
          </Pill>
        }
      />

      {isManager && pending.length > 0 ? (
        <Link href="/depenses" className="rise mb-5 block">
          <Card className="border-warn/30 bg-warn-dim/40">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <Eyebrow>À valider</Eyebrow>
                <p className="text-lg font-semibold">
                  {pending.length} dépense{pending.length > 1 ? "s" : ""} en
                  attente
                </p>
                <p className="tnum text-xs text-muted">
                  {eur(pending.reduce((s, e) => s + e.amount, 0))}
                </p>
              </div>
              <span className="text-sm text-warn">Ouvrir →</span>
            </div>
          </Card>
        </Link>
      ) : null}

      <section className="stagger mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={isLabel ? "Reste à recouvrer" : "Ta part cumulée"}
          value={eur(isLabel ? rec.remaining : (bal[user.id] ?? 0))}
          hint={isLabel ? `sur ${eur(rec.invested)} engagés` : `${me.share} % du net`}
          tone="iris"
        />
        <Stat
          label="En route"
          value={eur(isLabel ? pendingPool(store, space.id) : enRoute)}
          hint="généré, pas encore encaissé"
        />
        <Stat
          label={`Encaissé en ${monthLabel(last)}`}
          value={eur(monthPool)}
          hint={
            monthPool > 0
              ? `dont ${eur(monthSplit.toDebt)} au remboursement`
              : "rien versé sur ce mois"
          }
        />
        <Stat
          label="Dépenses du mois"
          value={eur(monthExpenses)}
          hint={`${pending.length} en attente · ${disputed.length} contestée${disputed.length > 1 ? "s" : ""}`}
        />
      </section>

      <Reveal>
        <Card className="mb-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <Eyebrow>Remboursement</Eyebrow>
              <p className="tnum text-xl font-semibold">
                {eur(rec.recouped)}{" "}
                <span className="text-faint">/ {eur(rec.invested)}</span>
              </p>
            </div>
            <p className="text-sm text-ink-2">
              {rec.invested <= 0
                ? "Aucun investissement déclaré."
                : rec.remaining <= 0
                  ? "Soldé. Répartition pleine."
                  : proj
                    ? `Soldé dans ${proj} mois au rythme actuel.`
                    : "Pas encore de quoi projeter."}
            </p>
          </div>
          <Gauge pct={rec.invested <= 0 ? 0 : rec.pct} />
          <div className="mt-4">
            <Why label="Comment ça se calcule">
              {cfg.recoupModel === "plancher"
                ? `L'artiste touche ${cfg.floorPct} % du brut quoi qu'il arrive ; les ${100 - cfg.floorPct} % restants remboursent l'investissement jusqu'à extinction, puis tout repart au prorata des parts.`
                : cfg.recoupModel === "brut"
                  ? "Le label prélève l'intégralité des revenus jusqu'à extinction. Personne ne touche rien avant."
                  : "Le label se rembourse uniquement sur sa propre part ; les autres touchent la leur dès le premier mois."}
            </Why>
          </div>
        </Card>
      </Reveal>

      <section className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <Card>
            <Eyebrow>Qui touche quoi</Eyebrow>
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {members.map((m) => (
                <li
                  key={m.userId}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid h-7 w-7 flex-none place-items-center rounded-md font-mono text-[10px] ${
                        m.userId === user.id
                          ? "bg-iris text-ground"
                          : "bg-raised text-faint"
                      }`}
                    >
                      {initialsOf(m.name)}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm">{m.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-faint">
                        {ROLE_LABEL[m.role]} · {m.share} %
                      </span>
                    </div>
                  </div>
                  <span className="tnum text-sm">{eur(bal[m.userId] ?? 0)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card>
            <Eyebrow>Mois</Eyebrow>
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {months.slice(0, 5).map((p) => {
                const sealed = sealedOf(store, space.id).find(
                  (s) => s.period === p,
                );
                return (
                  <li
                    key={p}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-col leading-tight">
                      <span className="text-sm capitalize">{monthLabel(p)}</span>
                      <span className="font-mono text-[10px] text-faint">
                        {sealed
                          ? `scellé · ${sealed.hash.slice(0, 8)}…`
                          : "ouvert"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tnum text-sm">
                        {eur(cashedPool(store, space.id, p))}
                      </span>
                      {sealed ? (
                        <Pill tone="ok">scellé</Pill>
                      ) : (
                        <Pill tone="warn">ouvert</Pill>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Reveal>
      </section>
    </>
  );
}
