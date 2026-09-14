// @ts-nocheck
import { ActionForm } from "@/components/action-form";
import { Card, Eyebrow, Field, PageHeader, Pill, Why } from "@/components/ui";
import { ROLE_LABEL, SPACE_ROLES, initialsOf } from "@/lib/defaults";
import { eur } from "@/lib/money";
import { requirePage } from "@/lib/guard";
import { userName } from "@/lib/store";
import type { SpaceRole } from "@/lib/types";

const MODELS = [
  { id: "plancher", title: "Plancher artiste" },
  { id: "brut", title: "Sur le brut" },
  { id: "part_label", title: "Sur la part label" },
];

const MODEL_LABEL: Record<string, string> = {
  plancher: "Plancher artiste",
  brut: "Sur le brut",
  part_label: "Sur la part label",
};

export default async function AccordPage() {
  const { store, space, members, proposal, me, user } = await requirePage();
  const cfg = space.config;

  const people = members.map((m) => ({
    id: m.userId,
    name: m.name,
    role: m.role,
    share: m.share,
  }));
  const total = Math.round(people.reduce((s, p) => s + p.share, 0) * 100) / 100;
  const jamaisFixe = total === 0;

  const monVote = proposal?.votes.find((v: any) => v.voter === user.id);
  const roleDe = (id: string) => members.find((m) => m.userId === id)?.role;
  const artisteOk = proposal?.votes.some(
    (v: any) => v.accept && roleDe(v.voter) === "artiste",
  );
  const managerOk = proposal?.votes.some(
    (v: any) => v.accept && roleDe(v.voter) === "manager",
  );

  return (
    <>
      <PageHeader
        eyebrow={`Accord · ${space.name}`}
        title="Ce qui a été convenu"
        sub="Personne ne change ces chiffres tout seul."
        action={
          proposal ? (
            <Pill tone="warn">proposition en cours</Pill>
          ) : jamaisFixe ? (
            <Pill tone="warn">rien de convenu</Pill>
          ) : (
            <Pill tone="ok">en vigueur</Pill>
          )
        }
      />

      {proposal ? (
        <Card className="mb-5 border-warn/35 bg-warn-dim/25">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Eyebrow>Proposé par {userName(store, proposal.proposedBy)}</Eyebrow>
              <p className="text-lg font-semibold">
                {eur(proposal.terms.investment)} d&apos;investissement ·{" "}
                {MODEL_LABEL[proposal.terms.recoupModel] ?? proposal.terms.recoupModel}
              </p>
              {proposal.note ? (
                <p className="text-sm text-ink-2">« {proposal.note} »</p>
              ) : null}
            </div>

            <ul className="flex flex-col gap-1.5 border-t border-warn/20 pt-3">
              {proposal.terms.shares.map((s) => {
                const avant = people.find((p) => p.id === s.id);
                const change = (avant?.share ?? 0) !== s.share;
                return (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <span className="w-40 truncate">{avant?.name ?? "—"}</span>
                    <span className="font-mono text-[10px] uppercase text-muted">
                      {ROLE_LABEL[s.role as SpaceRole]}
                    </span>
                    <span className="tnum ml-auto">
                      {change ? (
                        <>
                          <span className="text-muted line-through">
                            {avant?.share ?? 0} %
                          </span>
                          <span className="ml-2 text-warn">{s.share} %</span>
                        </>
                      ) : (
                        <span className="text-muted">{s.share} %</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center gap-4 border-t border-warn/20 pt-3">
              <span className="font-mono text-[11px] text-muted">
                Artiste {artisteOk ? "✓" : "○"} · Manager {managerOk ? "✓" : "○"}
              </span>
              {proposal.votes.map((v) => (
                <span key={v.voter} className="flex items-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded bg-raised font-mono text-[9px] text-muted">
                    {initialsOf(userName(store, v.voter))}
                  </span>
                  <span
                    className={`font-mono text-[10px] ${v.accept ? "text-ok" : "text-alert"}`}
                  >
                    {v.accept ? "accepte" : "refuse"}
                  </span>
                </span>
              ))}
            </div>

            {!monVote ? (
              <div className="flex flex-wrap gap-3 border-t border-warn/20 pt-3">
                <ActionForm action="voteProposal" className="flex" submit="Accepter">
                  <input type="hidden" name="id" value={proposal.id} />
                  <input type="hidden" name="accept" value="oui" />
                </ActionForm>
                <ActionForm
                  action="voteProposal"
                  className="flex"
                  submit="Refuser"
                  variant="ghost"
                >
                  <input type="hidden" name="id" value={proposal.id} />
                  <input type="hidden" name="accept" value="non" />
                </ActionForm>
              </div>
            ) : (
              <p className="border-t border-warn/20 pt-3 text-sm text-ink-2">
                Tu as {monVote.accept ? "accepté" : "refusé"}. En attente des autres.
              </p>
            )}

            {proposal.proposedBy === user.id ? (
              <ActionForm
                action="withdrawProposal"
                className="flex"
                submit="Retirer ma proposition"
                variant="ghost"
              >
                <input type="hidden" name="id" value={proposal.id} />
              </ActionForm>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Eyebrow>En vigueur</Eyebrow>
          <Why>
            Une modification n&apos;entre en vigueur que si l&apos;artiste et au
            moins un manager l&apos;acceptent. Ce n&apos;est pas une règle
            d&apos;affichage : la base refuse toute écriture directe sur ces
            chiffres.
          </Why>
        </div>

        {jamaisFixe ? (
          <p className="text-sm text-muted">
            Rien n&apos;a encore été convenu. Propose des termes ci-dessous.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <ul className="flex flex-col divide-y divide-line">
              {people.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0"
                >
                  <span className="text-sm">
                    {p.name}
                    <span className="ml-2 font-mono text-[10px] uppercase text-muted">
                      {ROLE_LABEL[p.role]}
                    </span>
                  </span>
                  <span className="tnum text-sm">{p.share} %</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Investissement</dt>
                <dd className="tnum">{eur(cfg.investment)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Remboursement</dt>
                <dd>{MODEL_LABEL[cfg.recoupModel]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Plancher artiste</dt>
                <dd className="tnum">{cfg.floorPct} %</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Validation dès</dt>
                <dd className="tnum">{eur(cfg.validationThreshold)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">À la charge du label</dt>
                <dd className="text-right">
                  {cfg.nonRecoupable.length
                    ? cfg.nonRecoupable.join(", ")
                    : "rien — tout se rembourse"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </Card>

      {!proposal ? (
        <Card>
          <Eyebrow>Proposer de nouveaux termes</Eyebrow>
          <p className="mt-2 mb-5 max-w-2xl text-sm text-ink-2">
            Rien ne bouge tant que{" "}
            {me.role === "artiste" ? "un manager n'a" : "l'artiste et un manager n'ont"}{" "}
            pas accepté.
          </p>
          <ActionForm action="proposeTerms" submit="Envoyer la proposition">
            {/* 1. L'essentiel : qui touche quoi. */}
            <div className="flex flex-col gap-3">
              {people.map((p) => (
                <div
                  key={p.id}
                  className="grid items-center gap-3 sm:grid-cols-[1fr_160px_120px]"
                >
                  <span className="text-[15px]">{p.name}</span>
                  <select name={`role_${p.id}`} defaultValue={p.role}>
                    {SPACE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <input
                      name={`share_${p.id}`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      defaultValue={p.share}
                      required
                    />
                    <span className="font-mono text-sm text-muted">%</span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-faint">
                Total actuel {total} % — il doit faire 100 %, et l&apos;artiste
                jamais moins de 50 %.
              </p>
            </div>

            {/* 2. L'argent du label. */}
            <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <Field label="Il se rembourse">
                <select name="recoupModel" defaultValue={cfg.recoupModel}>
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tu touches au minimum (%)">
                <input
                  name="floorPct"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={cfg.floorPct}
                />
              </Field>
            </div>

            {/* Les seuils, les catégories et les dates ne sont pas ici :
                les valeurs en place sont conservées telles quelles. */}

            <Field label="Pourquoi ce changement">
              <input name="note" placeholder="Une phrase pour les autres" />
            </Field>
          </ActionForm>
        </Card>
      ) : null}
    </>
  );
}
