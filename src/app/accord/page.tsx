// @ts-nocheck
import { ActionForm } from "@/components/action-form";
import { Card, Eyebrow, Field, PageHeader, Pill, Why } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/defaults";
import { getAgreementState } from "@/lib/db";
import { requirePage } from "@/lib/guard";

const MODELS = [
  { id: "plancher", title: "Plancher artiste" },
  { id: "brut", title: "Sur le brut" },
  { id: "part_label", title: "Sur la part label" },
];
const MODEL_LABEL = Object.fromEntries(MODELS.map((m) => [m.id, m.title]));

const day = (d) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Paris",
      })
    : "—";

export default async function AccordPage() {
  const { label, members, user } = await requirePage();
  const { current, pending } = await getAgreementState(label.id);

  const nameOf = (id) => members.find((m) => m.userId === id)?.name ?? "Ancien membre";
  const roleOf = (id) => members.find((m) => m.userId === id)?.role;
  const shareOf = (agreement, id) => agreement?.shares.find((s) => s.user_id === id);

  const mine = shareOf(pending, user.id);
  const needed = pending
    ? ["artiste", "manager"].filter((r) => pending.shares.some((s) => roleOf(s.user_id) === r))
    : [];
  const acceptedBy = (r) => pending.shares.some((s) => s.validated && roleOf(s.user_id) === r);

  return (
    <>
      <PageHeader
        eyebrow={`Accord · ${label.name}`}
        title="Ce qui a été convenu"
        sub="Personne ne change ces chiffres tout seul."
        action={
          pending ? (
            <Pill tone="warn">proposition en cours</Pill>
          ) : current ? (
            <Pill tone="ok">en vigueur</Pill>
          ) : (
            <Pill tone="warn">rien de convenu</Pill>
          )
        }
      />

      {pending ? (
        <Card className="mb-5 border-warn/35 bg-warn-dim/25">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Eyebrow>Proposé par {nameOf(pending.created_by)}</Eyebrow>
              <p className="text-lg font-semibold">
                {MODEL_LABEL[pending.recoup_model]}
                {pending.recoup_model === "plancher"
                  ? ` · ${Number(pending.floor_pct)} % minimum artiste`
                  : ""}
              </p>
            </div>

            <ul className="flex flex-col gap-2 border-t border-warn/20 pt-3">
              {pending.shares.map((s) => {
                const before = shareOf(current, s.user_id);
                const pct = Number(s.proposed_pct);
                const changed = before && Number(before.proposed_pct) !== pct;
                return (
                  <li key={s.user_id} className="flex items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">
                      {nameOf(s.user_id)}
                      <span className="ml-2 font-mono text-[10px] uppercase text-muted">
                        {ROLE_LABEL[roleOf(s.user_id)] ?? ""}
                      </span>
                    </span>
                    <span className={`font-mono text-[10px] ${s.validated ? "text-ok" : "text-muted"}`}>
                      {s.validated ? "accepte" : "en attente"}
                    </span>
                    <span className="tnum w-24 text-right">
                      {changed ? (
                        <>
                          <span className="text-muted line-through">{Number(before.proposed_pct)} %</span>{" "}
                          <span className="text-warn">{pct} %</span>
                        </>
                      ) : (
                        `${pct} %`
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="border-t border-warn/20 pt-3 font-mono text-[11px] text-muted">
              Il faut l&apos;accord : {needed.map((r) => `${ROLE_LABEL[r]} ${acceptedBy(r) ? "✓" : "○"}`).join(" · ")}
            </p>

            {mine && !mine.validated ? (
              <div className="flex flex-wrap gap-3">
                <ActionForm action="voteProposal" className="flex" submit="Accepter">
                  <input type="hidden" name="id" value={pending.id} />
                  <input type="hidden" name="accept" value="oui" />
                </ActionForm>
                <ActionForm action="voteProposal" className="flex" submit="Refuser" variant="ghost">
                  <input type="hidden" name="id" value={pending.id} />
                  <input type="hidden" name="accept" value="non" />
                </ActionForm>
              </div>
            ) : mine ? (
              <p className="text-sm text-ink-2">Tu as accepté. En attente des autres.</p>
            ) : null}

            {pending.created_by === user.id ? (
              <ActionForm action="withdrawProposal" className="flex" submit="Retirer ma proposition" variant="ghost">
                <input type="hidden" name="id" value={pending.id} />
              </ActionForm>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="mb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Eyebrow>En vigueur</Eyebrow>
          <Why>
            Une modification ne s&apos;applique que si l&apos;artiste et au moins un
            manager l&apos;acceptent.
          </Why>
        </div>

        {current ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <ul className="flex flex-col divide-y divide-line">
              {current.shares.map((s) => (
                <li key={s.user_id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <span className="text-sm">
                    {nameOf(s.user_id)}
                    <span className="ml-2 font-mono text-[10px] uppercase text-muted">
                      {ROLE_LABEL[roleOf(s.user_id)] ?? ""}
                    </span>
                  </span>
                  <span className="tnum text-sm">{Number(s.proposed_pct)} %</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Remboursement</dt>
                <dd>{MODEL_LABEL[current.recoup_model]}</dd>
              </div>
              {current.recoup_model === "plancher" ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Minimum artiste</dt>
                  <dd className="tnum">{Number(current.floor_pct)} %</dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Depuis le</dt>
                <dd>{day(current.signed_at)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-muted">Rien n&apos;a encore été convenu.</p>
        )}
      </Card>

      {!pending ? (
        <Card>
          <Eyebrow>Proposer une répartition</Eyebrow>
          <p className="mt-2 mb-5 text-sm text-ink-2">
            Total 100 %, et l&apos;artiste jamais sous 50 %.
          </p>
          <ActionForm action="proposeTerms" submit="Envoyer la proposition">
            <div className="flex flex-col gap-3">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-[15px]">
                    {m.name}
                    <span className="ml-2 font-mono text-[10px] uppercase text-muted">
                      {ROLE_LABEL[m.role]}
                    </span>
                  </span>
                  <div className="flex w-28 items-center gap-2">
                    <input
                      name={`share_${m.userId}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="0.5"
                      defaultValue={Number(shareOf(current, m.userId)?.proposed_pct ?? (members.length === 1 ? 100 : 0))}
                      required
                    />
                    <span className="font-mono text-sm text-muted">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <Field label="Le label se rembourse">
                <select name="recoupModel" defaultValue={current?.recoup_model ?? "plancher"}>
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Minimum artiste (%)">
                <input
                  name="floorPct"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  defaultValue={Number(current?.floor_pct ?? 50)}
                />
              </Field>
            </div>
          </ActionForm>
        </Card>
      ) : null}
    </>
  );
}
