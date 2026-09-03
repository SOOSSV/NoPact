import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Button, Card, Eyebrow, Field, PageHeader, Pill, Why } from "@/components/ui";
import { ROLE_HINT, ROLE_LABEL, SPACE_ROLES, initialsOf } from "@/lib/defaults";
import { requirePage } from "@/lib/guard";
import { can } from "@/lib/session";

export default async function ReglagesPage() {
  const { space, members, me } = await requirePage();
  const editable = can.manageRules(me.role);
  const first = !space.configured;

  const people = members.map((m) => ({
    id: m.userId,
    name: m.name,
    handle: m.handle,
    role: m.role,
  }));

  return (
    <div className={first ? "mx-auto max-w-2xl" : ""}>
      <PageHeader
        eyebrow={space.name}
        title={first ? "Qui est dans l'espace ?" : "L'espace"}
        sub={
          first
            ? "Tu y es déjà. Ajoute les autres maintenant ou plus tard, puis ouvre l'espace."
            : undefined
        }
        action={
          first ? (
            <Pill tone="warn">à ouvrir</Pill>
          ) : (
            <Pill tone="ok">{people.length} personnes</Pill>
          )
        }
      />

      <div className="flex flex-col gap-5">
        {first ? (
          <ol className="flex flex-col gap-2 rounded-2xl border border-line bg-surface/60 p-5 text-sm sm:flex-row sm:items-center sm:gap-6">
            <li className="flex items-center gap-2 text-muted">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-iris text-[10px] text-ground">
                ✓
              </span>
              Toi, artiste
            </li>
            <li className="flex items-center gap-2 text-ink">
              <span className="grid h-5 w-5 place-items-center rounded-full border border-iris font-mono text-[10px] text-iris">
                2
              </span>
              Les autres — facultatif maintenant
            </li>
            <li className="flex items-center gap-2 text-muted">
              <span className="grid h-5 w-5 place-items-center rounded-full border border-line font-mono text-[10px]">
                3
              </span>
              Ouvrir l&apos;espace
            </li>
          </ol>
        ) : null}

        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <Eyebrow>L&apos;équipe</Eyebrow>
            <Why>
              Chacun a son propre compte : c&apos;est ce qui permet de dire plus
              tard qui a saisi quoi et qui a validé quoi. Une personne invitée
              entre dans l&apos;espace en créant son compte avec la même adresse.
            </Why>
          </div>

          <ul className="flex flex-col divide-y divide-line">
            {people.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-raised font-mono text-[10px] text-muted">
                  {initialsOf(p.name)}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="flex items-center gap-2 text-sm">
                    {p.name}
                    {p.id === me.userId ? (
                      <span className="font-mono text-[10px] text-iris">toi</span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    {p.handle}
                  </span>
                </div>
                <Pill>{ROLE_LABEL[p.role]}</Pill>
              </li>
            ))}
          </ul>
        </Card>

        {editable ? (
          <Card>
            <Eyebrow>Ajouter quelqu&apos;un</Eyebrow>
            <p className="mt-2 max-w-2xl text-sm text-ink-2">
              Le rôle décrit ce qu&apos;il peut faire dans les comptes, pas son
              métier : quelqu&apos;un qui avance l&apos;argent et le récupère sur
              tes revenus prend le rôle <strong className="text-ink">label</strong>,
              même si vous l&apos;appelez producteur entre vous.
            </p>
            <p className="mt-2 mb-1 max-w-2xl text-sm text-ink-2">
              Tape l&apos;identifiant avec lequel il se connectera. S&apos;il a
              déjà un compte, il est simplement rattaché à cet espace — sinon tu
              lui en ouvres un et l&apos;app te donne son mot de passe
              provisoire.
            </p>
            <ActionForm
              action="addMember"
              className="mt-4 flex flex-col gap-4"
              submit="Ouvrir son compte"
              variant="ghost"
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Nom (si le compte n'existe pas encore)">
                  <input name="name" placeholder="Prénom" />
                </Field>
                <Field label="Identifiant">
                  <input
                    name="handle"
                    placeholder="josue"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                  />
                </Field>
                <Field label="Rôle">
                  <select name="role" defaultValue="manager">
                    {SPACE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]} — {ROLE_HINT[r]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </ActionForm>
          </Card>
        ) : null}

        {editable ? (
          <Card className={first ? "border-iris/30" : ""}>
            <Eyebrow>{first ? "Dernière étape" : "Nom de l'espace"}</Eyebrow>
            {first ? (
              <p className="mt-2 mb-1 text-sm text-ink-2">
                Vérifie le nom, puis ouvre l&apos;espace. Tu pourras ajouter du
                monde à tout moment.
              </p>
            ) : null}
            <ActionForm
              action="saveTeam"
              className="mt-4 flex flex-col gap-4"
              submit={first ? "Ouvrir l'espace" : "Enregistrer"}
            >
              <Field label="Nom">
                <input name="spaceName" defaultValue={space.name} required />
              </Field>
            </ActionForm>
          </Card>
        ) : null}

        {!first ? (
          <Card className="border-iris/25">
            <Eyebrow>Et l&apos;argent ?</Eyebrow>
            <p className="mt-2 mb-4 text-sm text-ink-2">
              Les parts, l&apos;investissement et le remboursement se décident
              dans l&apos;accord — et ne changent qu&apos;avec ta signature et
              celle d&apos;un manager.
            </p>
            <Link
              href="/accord"
              className="inline-flex rounded-lg bg-iris px-4 py-2.5 text-sm font-medium text-ground"
            >
              Ouvrir l&apos;accord
            </Link>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
