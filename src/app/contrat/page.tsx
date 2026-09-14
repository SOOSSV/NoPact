// @ts-nocheck
import Link from "next/link";
import { Card, Eyebrow, PageHeader, Pill } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/defaults";
import { getAgreementState } from "@/lib/db";
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

export default async function ContratPage() {
  const { label, members } = await requirePage();
  const { current } = await getAgreementState(label.id);

  if (!current) {
    return (
      <>
        <PageHeader
          eyebrow={`Contrat · ${label.name}`}
          title={label.name}
          sub="Pas encore de contrat."
          action={<Pill tone="warn">rien de convenu</Pill>}
        />
        <Card>
          <p className="text-sm text-ink-2">
            Le contrat se remplit dès qu&apos;une répartition est acceptée.
          </p>
          <Link
            href="/accord"
            className="mt-4 inline-flex rounded-lg bg-iris px-4 py-2.5 text-sm font-medium text-ground transition-colors hover:bg-iris-soft"
          >
            Proposer une répartition →
          </Link>
        </Card>
      </>
    );
  }

  const nameOf = (id) => members.find((m) => m.userId === id)?.name ?? "Ancien membre";
  const roleOf = (id) => members.find((m) => m.userId === id)?.role;
  const floor = Number(current.floor_pct);
  const manager = current.shares.find((s) => roleOf(s.user_id) === "manager");

  const clauses = [
    {
      t: "Répartition",
      v: `${current.shares
        .map((s) => `${nameOf(s.user_id)} ${Number(s.proposed_pct)} % (${(ROLE_LABEL[roleOf(s.user_id)] ?? "ancien membre").toLowerCase()})`)
        .join(" · ")}. Chacun détient sa part en propre : personne n'est payé par quelqu'un d'autre.`,
    },
    {
      t: "Recoupement",
      v:
        current.recoup_model === "plancher"
          ? `${floor} % du brut versés à l'artiste chaque mois quoi qu'il arrive, ${100 - floor} % au remboursement jusqu'à extinction.`
          : current.recoup_model === "brut"
            ? "Le label prélève l'intégralité des revenus jusqu'à extinction de son investissement. L'artiste ne touche rien pendant cette période."
            : "Le label se rembourse uniquement sur sa propre part. Chacun touche la sienne dès le premier mois.",
    },
    {
      t: "Investissement",
      v: "Seules les dépenses prouvées par facture et validées comptent. Aucun bénéfice prélevé avant partage.",
    },
    {
      t: "Contrôle des dépenses",
      v: "Toute dépense attend la validation d'un manager. Prestataire lié au label : tous les managers. Personne ne valide sa propre saisie.",
    },
    {
      t: "Modifications",
      v: "Rien ne change sans l'accord de l'artiste et d'au moins un manager.",
    },
    {
      t: "Valeur du registre",
      v: "Les parties reconnaissent le journal de l'application comme référence commune en cas de désaccord.",
    },
    ...(manager
      ? [
          {
            t: "Après le contrat",
            v: `Part manager dégressive à la sortie : ${Number(manager.proposed_pct)} % pendant le contrat, la moitié les deux années suivantes, puis extinction.`,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow={`Contrat · ${label.name}`}
        title={current.project_name || label.name}
        sub={`En vigueur depuis le ${day(current.signed_at)}.`}
        action={<Pill tone="ok">en vigueur</Pill>}
      />

      <section className="stagger mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-1.5">
          <Eyebrow>Modèle de recoupement</Eyebrow>
          <p className="text-2xl font-semibold">{MODEL_LABEL[current.recoup_model]}</p>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <Eyebrow>Minimum artiste</Eyebrow>
          <p className="tnum text-2xl font-semibold text-iris">
            {current.recoup_model === "plancher" ? `${floor} %` : "—"}
          </p>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <Eyebrow>Membres</Eyebrow>
          <p className="tnum text-2xl font-semibold">{current.shares.length}</p>
        </Card>
      </section>

      <h2 className="mb-3 text-base font-semibold">Clauses</h2>
      <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-surface">
        {clauses.map((c) => (
          <div
            key={c.t}
            className="grid gap-1 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[200px_1fr] sm:gap-6"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{c.t}</span>
            <p className="text-sm text-ink-2">{c.v}</p>
          </div>
        ))}
      </div>
    </>
  );
}
