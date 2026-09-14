// @ts-nocheck
import { validateExpense } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { DepenseForm } from "./depense-form";
import { Button, Card, Empty, Eyebrow, Field, PageHeader, Pill, Why } from "@/components/ui";
import { eur, labelBearsExpenses, shortDate } from "@/lib/money";
import { requirePage } from "@/lib/guard";
import { can, type Member } from "@/lib/session";
import { expensesOf, userName } from "@/lib/store";
import type { Expense, ExpenseStatus, Store } from "@/lib/types";

const CATEGORIES = [
  "Studio", "Clip", "Marketing", "Déplacement", "Hôtel", "Restaurant", "Autre",
];

const STATUS: Record<ExpenseStatus, { label: string; tone: "warn" | "ok" | "alert" }> = {
  en_attente: { label: "en attente", tone: "warn" },
  validee: { label: "validée", tone: "ok" },
  contestee: { label: "contestée", tone: "alert" },
};

/** Plusieurs factures juste sous le seuil chez le même prestataire. */
function splitAlerts(expenses: Expense[], threshold: number, monthly: number) {
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    const key = `${e.vendor}|${e.date.slice(0, 7)}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.entries()]
    .filter(([, group]) => {
      const sum = group.reduce((s, e) => s + e.amount, 0);
      const under = group.filter(
        (e) => e.amount < threshold && e.amount > threshold * 0.6,
      );
      return under.length >= 2 && sum >= monthly;
    })
    .map(([key, group]) => ({
      vendor: key.split("|")[0],
      month: key.split("|")[1],
      total: group.reduce((s, e) => s + e.amount, 0),
      count: group.length,
    }));
}

export default async function DepensesPage() {
  const { store, space, members, me, user } = await requirePage();
  const expenses = expensesOf(store, space.id);
  const cfg = space.config;
  const alerts = splitAlerts(
    expenses,
    cfg.validationThreshold,
    cfg.monthlyCategoryThreshold,
  );

  const porteParLabel = labelBearsExpenses(store, space.id);
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  const waiting = sorted.filter((e) => e.status === "en_attente");
  const rest = sorted.filter((e) => e.status !== "en_attente");
  const managerCount = members.filter((m) => m.role === "manager").length;

  return (
    <>
      <PageHeader
        eyebrow={`Dépenses · ${space.name}`}
        title="Rien n'est officiel sans contrôle"
        sub="Chaque dépense a sa facture, et attend un manager. Sans exception."
      />

      {porteParLabel > 0 ? (
        <Card className="mb-6 border-ok/25 bg-ok-dim/25">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Eyebrow>À la charge du label</Eyebrow>
              <p className="tnum text-lg font-semibold text-ok">
                {eur(porteParLabel)}
              </p>
              <p className="text-xs text-muted">
                {cfg.nonRecoupable.join(", ") || "aucune catégorie"} — ces
                dépenses ne se remboursent pas sur tes revenus.
              </p>
            </div>
            <Why label="Pourquoi ces dépenses ne comptent pas">
              Tout ce que le label avance, tu le rembourses normalement sur tes
              revenus avant de toucher ta part pleine. Les catégories
              convenues comme non récupérables font exception : elles restent à
              sa charge. Le marketing en fait partie parce que c&apos;est le
              travail du label — s&apos;il ne te promeut pas, il n&apos;a pas de
              raison d&apos;exister — et parce que c&apos;est la dépense la plus
              difficile à vérifier.
            </Why>
          </div>
        </Card>
      ) : null}

      {alerts.length > 0 ? (
        <Card className="mb-6 border-warn/30 bg-warn-dim/30">
          <Eyebrow>Fractionnement possible</Eyebrow>
          <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-2">
            {alerts.map((a) => (
              <li key={`${a.vendor}${a.month}`}>
                <strong className="text-ink">{a.vendor}</strong> — {a.count}{" "}
                dépenses en {a.month} pour {eur(a.total)}, plusieurs juste sous
                le seuil.
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {can.createExpense(me.role) ? (
        <details className="mb-8">
          <summary className="mb-3 cursor-pointer list-none">
            <span className="inline-flex rounded-lg bg-iris px-3.5 py-2 text-sm font-medium text-ground">
              + Nouvelle dépense
            </span>
          </summary>
          <Card>
            <DepenseForm />
          </Card>
        </details>
      ) : null}

      {waiting.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold">En attente de validation</h2>
          <div className="flex flex-col gap-3">
            {waiting.map((e) => (
              <Row
                key={e.id}
                e={e}
                store={store}
                userId={user.id}
                members={members}
                canValidate={can.validate(me.role)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Historique</h2>
          <Why label="Qui valide quoi">
            Une dépense au-delà du seuil attend un manager. Chez un prestataire
            lié au label, elle attend les {managerCount || 2} managers. Personne
            ne valide sa propre saisie, et rien ne s&apos;efface.
          </Why>
        </div>
        {rest.length === 0 ? (
          <Empty>
            Aucune dépense enregistrée.{" "}
            {can.createExpense(me.role)
              ? "Commence par celles déjà engagées."
              : "Le label n'a rien saisi dans cet espace."}
          </Empty>
        ) : (
          <div className="stagger flex flex-col gap-3">
            {rest.map((e) => (
              <Row
                key={e.id}
                e={e}
                store={store}
                userId={user.id}
                members={members}
                canValidate={false}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Row({
  e,
  store,
  userId,
  members,
  canValidate,
}: {
  e: Expense;
  store: Store;
  userId: string;
  members: Member[];
  canValidate: boolean;
}) {
  const already = e.validations.some((v) => v.by === userId);
  const mine = e.createdBy === userId;
  const required = e.relatedParty
    ? Math.max(1, members.filter((m) => m.role === "manager").length)
    : 1;

  return (
    <Card className="flex flex-col gap-3 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-medium">{e.label}</h3>
            <Pill tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Pill>
            {e.relatedParty ? <Pill tone="alert">partie liée</Pill> : null}
            {!e.recoupable ? <Pill tone="ok">à la charge du label</Pill> : null}
            {e.receipt ? <Pill tone="ok">facture jointe</Pill> : null}
          </div>
          <p className="font-mono text-[11px] text-muted">
            {e.category} · {e.vendor} · {shortDate(e.date)} · saisie par{" "}
            {userName(store, e.createdBy)}
          </p>
        </div>
        <span className="tnum text-lg font-semibold">{eur(e.amount)}</span>
      </div>

      {e.validations.length > 0 ? (
        <ul className="flex flex-col gap-1 border-t border-line pt-3">
          {e.validations.map((v, i) => (
            <li key={i} className="font-mono text-[11px] text-muted">
              validée par {userName(store, v.by)} le {v.at}
              {v.comment ? ` — « ${v.comment} »` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-3">
        {canValidate && !already && !mine && e.status === "en_attente" ? (
          <ActionForm
            action="validateExpense"
            className="flex flex-1 flex-wrap items-center gap-2"
            submit={`Valider${required > 1 ? ` (${e.validations.length}/${required})` : ""}`}
          >
            <input type="hidden" name="id" value={e.id} />
            <input
              name="comment"
              placeholder="Commentaire (facultatif)"
              className="flex-1"
            />
          </ActionForm>
        ) : null}

        {canValidate && mine ? (
          <span className="font-mono text-[11px] text-muted">
            tu l&apos;as saisie — quelqu&apos;un d&apos;autre doit la valider
          </span>
        ) : null}

        {e.status !== "contestee" ? (
          <details className="ml-auto">
            <summary className="cursor-pointer list-none font-mono text-[11px] text-muted hover:text-alert">
              contester
            </summary>
            <ActionForm
              action="disputeLine"
              className="mt-2 flex flex-wrap items-center gap-2"
              submit="Envoyer"
              variant="ghost"
            >
              <input type="hidden" name="id" value={e.id} />
              <input type="hidden" name="kind" value="depense" />
              <input name="reason" placeholder="Motif" required className="flex-1" />
            </ActionForm>
          </details>
        ) : (
          <span className="ml-auto font-mono text-[11px] text-alert">
            contestée — visible à vie
          </span>
        )}
      </div>
    </Card>
  );
}

