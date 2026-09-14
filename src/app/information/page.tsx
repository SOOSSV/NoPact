// @ts-nocheck
import { Card, Eyebrow, PageHeader } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/defaults";
import { getAgreementState, getUserById } from "@/lib/db";
import { requirePage } from "@/lib/guard";

const MODEL_LABEL = {
  plancher: "Plancher artiste",
  brut: "Sur le brut",
  part_label: "Sur la part label",
};

const day = (d) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Paris",
      })
    : "—";

function Item({ label, children }) {
  return (
    <div>
      <dt className="mb-1 text-xs text-muted">{label}</dt>
      <dd className="text-sm font-semibold">{children}</dd>
    </div>
  );
}

export default async function InformationPage() {
  const { label, members } = await requirePage();
  const [{ current, pending }, creator] = await Promise.all([
    getAgreementState(label.id),
    getUserById(label.created_by),
  ]);
  const shareOf = (id) => current?.shares.find((s) => s.user_id === id);

  return (
    <>
      <PageHeader eyebrow="Information" title={label.name} sub="L'essentiel sur le label et l'accord." />

      <Card className="mb-5">
        <div className="mb-4">
          <Eyebrow>Label</Eyebrow>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Item label="Nom">{label.name}</Item>
          <Item label="Créé par">{creator?.name ?? "—"}</Item>
          <Item label="Date de création">{day(label.created_at)}</Item>
          <Item label="Membres">{members.length}</Item>
        </dl>
      </Card>

      <Card className="mb-5">
        <div className="mb-4">
          <Eyebrow>Accord actuel</Eyebrow>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Item label="Statut">
            {current ? "En vigueur" : pending ? "Proposition en cours" : "Aucun accord"}
          </Item>
          <Item label="Remboursement">{current ? MODEL_LABEL[current.recoup_model] : "—"}</Item>
          <Item label="Minimum artiste">
            {current?.recoup_model === "plancher" ? `${Number(current.floor_pct)} %` : "—"}
          </Item>
          <Item label="Depuis le">{current ? day(current.signed_at) : "—"}</Item>
        </dl>
      </Card>

      <Card>
        <div className="mb-4">
          <Eyebrow>Membres</Eyebrow>
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0">
              <p className="text-sm font-semibold">{m.name}</p>
              <div className="flex items-center gap-3">
                <span className="tnum text-sm text-muted">
                  {shareOf(m.userId) ? `${Number(shareOf(m.userId).proposed_pct)} %` : "—"}
                </span>
                <span className="rounded bg-raised px-2 py-1 font-mono text-xs">{ROLE_LABEL[m.role] ?? m.role}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
