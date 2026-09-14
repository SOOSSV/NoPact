// @ts-nocheck
import Link from "next/link";
import { sealMonth } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { Button, Card, Eyebrow, PageHeader, Pill } from "@/components/ui";
import { eur, monthLabel, periods, recoupment } from "@/lib/money";
import { ROLE_LABEL } from "@/lib/defaults";
import { requirePage } from "@/lib/guard";
import { can, parties } from "@/lib/session";
import { sealedOf } from "@/lib/store";

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return Number.isFinite(d) ? d : null;
}

function minusDays(iso: string, days: number) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const MODEL_LABEL = {
  plancher: "Plancher artiste",
  brut: "Sur le brut",
  part_label: "Sur la part label",
} as const;

export default async function ContratPage() {
  const { store, space, members, me } = await requirePage();
  const cfg = space.config;
  const rec = recoupment(store, space.id, cfg, parties(members));

  const toEnd = daysUntil(cfg.contractEnd);
  const toExit = daysUntil(minusDays(cfg.contractEnd, cfg.exitWindowDays));
  const managers = members.filter((m) => m.role === "manager");
  const labels = members.filter((m) => m.role === "label");

  const open = periods(store, space.id).filter(
    (p) => !sealedOf(store, space.id).some((s) => s.period === p),
  );

  const clauses = [
    {
      t: "Répartition",
      v: `${members.map((m) => `${m.name} ${m.share} % (${ROLE_LABEL[m.role].toLowerCase()})`).join(" · ")}. Chacun détient sa part en propre : personne n'est payé par quelqu'un d'autre.`,
    },
    {
      t: "Recoupement",
      v:
        cfg.recoupModel === "plancher"
          ? `${cfg.floorPct} % du brut versés à l'artiste chaque mois quoi qu'il arrive, ${100 - cfg.floorPct} % au remboursement jusqu'à extinction.`
          : cfg.recoupModel === "brut"
            ? "Le label prélève l'intégralité des revenus jusqu'à extinction de son investissement. L'artiste ne touche rien pendant cette période."
            : "Le label se rembourse uniquement sur sa propre part. Chacun touche la sienne dès le premier mois.",
    },
    {
      t: "Investissement",
      v: `${eur(cfg.investment)} apportés par ${labels.map((l) => l.name).join(", ") || "le label"}, plus les dépenses validées. Uniquement sur facture, aucun bénéfice prélevé avant partage.`,
    },
    {
      t: "Périmètre du recoupement",
      v: "Chaque espace se rembourse sur ses propres revenus. Les pertes d'un deal ne se reportent jamais sur un autre.",
    },
    {
      t: "Contrôle des dépenses",
      v: `Au-delà de ${eur(cfg.validationThreshold)}, validation d'un manager. Prestataire lié au label : les ${managers.length || 2} managers, quel que soit le montant. Personne ne valide sa propre saisie.`,
    },
    {
      t: "Valeur du registre",
      v: "Les parties reconnaissent le journal de l'application comme référence commune en cas de désaccord.",
    },
    {
      t: "Après le contrat",
      v: `Part manager dégressive à la sortie : ${managers[0]?.share ?? 10} % pendant le contrat, la moitié les deux années suivantes, puis extinction.`,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow={`Contrat · ${space.name}`}
        title={cfg.projectName || space.name}
        sub={
          cfg.contractStart && cfg.contractEnd
            ? `Du ${cfg.contractStart} au ${cfg.contractEnd}.`
            : "Les dates du contrat ne sont pas encore renseignées."
        }
        action={
          toEnd !== null ? (
            <Pill tone={toEnd < 120 ? "warn" : "neutral"}>
              fin dans {toEnd} jours
            </Pill>
          ) : (
            <Link href="/reglages">
              <Pill tone="warn">dates à renseigner</Pill>
            </Link>
          )
        }
      />

      <section className="stagger mb-8 grid gap-4 sm:grid-cols-3">
        <Card className="flex flex-col gap-1.5">
          <Eyebrow>Fenêtre de résiliation</Eyebrow>
          <p className="tnum text-2xl font-semibold">
            {toExit === null ? "—" : toExit > 0 ? `dans ${toExit} j` : "ouverte"}
          </p>
          <p className="text-xs text-muted">
            {cfg.exitWindowDays} jours avant la fin
          </p>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <Eyebrow>Reste à recouvrer</Eyebrow>
          <p className="tnum text-2xl font-semibold text-iris">
            {eur(rec.remaining)}
          </p>
          <p className="text-xs text-muted">sur {eur(rec.invested)} engagés</p>
        </Card>
        <Card className="flex flex-col gap-1.5">
          <Eyebrow>Modèle de recoupement</Eyebrow>
          <p className="text-2xl font-semibold">{MODEL_LABEL[cfg.recoupModel]}</p>
          <p className="text-xs text-muted">
            {cfg.recoupModel === "plancher"
              ? `${cfg.floorPct} % garantis à l'artiste, ${100 - cfg.floorPct} % au remboursement`
              : cfg.recoupModel === "brut"
                ? "l'artiste ne touche rien tant que la dette court"
                : "le label se rembourse sur sa seule part"}
          </p>
        </Card>
      </section>

      <h2 className="mb-3 text-base font-semibold">Clauses</h2>
      <div className="mb-8 overflow-hidden rounded-2xl border border-line bg-surface">
        {clauses.map((c) => (
          <div
            key={c.t}
            className="grid gap-1 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[200px_1fr] sm:gap-6"
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              {c.t}
            </span>
            <p className="text-sm text-ink-2">{c.v}</p>
          </div>
        ))}
      </div>

      {can.seal(me.role) && open.length > 0 ? (
        <Card>
          <Eyebrow>Clôture mensuelle</Eyebrow>
          <p className="mt-2 mb-4 max-w-xl text-sm text-ink-2">
            Sceller un mois le rend définitif. Une erreur découverte après se
            corrige par une ligne d&apos;ajustement dans le mois courant, jamais
            en revenant en arrière.
          </p>
          <div className="flex flex-wrap gap-3">
            {open.map((p) => (
              <ActionForm
                key={p}
                action="sealMonth"
                className="flex"
                submit={`Sceller ${monthLabel(p)}`}
                variant="ghost"
              >
                <input type="hidden" name="period" value={p} />
              </ActionForm>
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}

