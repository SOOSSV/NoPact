// @ts-nocheck
import { Card, Empty, Eyebrow, PageHeader, Pill } from "@/components/ui";
import {
  cashedPool,
  distribute,
  eur,
  monthLabel,
  periods,
  recoupment,
} from "@/lib/money";
import { ROLE_LABEL } from "@/lib/defaults";
import { requirePage } from "@/lib/guard";
import { parties } from "@/lib/session";
import { sealedOf } from "@/lib/store";
import type { Config, RecoupModel, SpaceRole } from "@/lib/types";

const ROLE_COLOR: Record<SpaceRole, string> = {
  artiste: "bg-iris",
  manager: "bg-ink-2",
  producteur: "bg-warn",
  label: "bg-ok",
};

const MODELS: { id: RecoupModel; title: string; note: string }[] = [
  {
    id: "brut",
    title: "Sur le brut",
    note: "Le label prend tout jusqu'à extinction. L'artiste ne touche rien pendant ce temps.",
  },
  {
    id: "part_label",
    title: "Sur la part label",
    note: "Chacun touche sa part tout de suite, mais la dette met beaucoup plus longtemps à s'éteindre.",
  },
  {
    id: "plancher",
    title: "Plancher artiste",
    note: "L'artiste touche un minimum garanti chaque mois, le reste rembourse.",
  },
];

export default async function RoyaltiesPage() {
  const { store, space, members, user } = await requirePage();
  const cfg = space.config;
  const ps = parties(members);
  const rec = recoupment(store, space.id, cfg, ps);
  const months = periods(store, space.id);
  const last = months[0];
  const lastPool = last ? cashedPool(store, space.id, last) : 0;
  const artistIds = members.filter((m) => m.role === "artiste").map((m) => m.userId);

  return (
    <>
      <PageHeader
        eyebrow={`Royalties · ${space.name}`}
        title="Le partage, ligne par ligne"
        sub="Ce que chacun touche réellement, mois par mois."
      />

      <section className="stagger mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <Card
            key={m.userId}
            className="flex items-center justify-between gap-3 p-4"
          >
            <div className="flex flex-col">
              <span className="text-sm">
                {m.name}
                {m.userId === user.id ? (
                  <span className="ml-2 font-mono text-[10px] text-muted">
                    toi
                  </span>
                ) : null}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {ROLE_LABEL[m.role]}
              </span>
            </div>
            <span
              className={`tnum text-lg font-semibold ${m.role === "artiste" ? "text-iris" : ""}`}
            >
              {m.share} %
            </span>
          </Card>
        ))}
      </section>

      <h2 className="mb-3 text-base font-semibold">Répartition par mois</h2>
      {months.length === 0 ? (
        <Empty>Rien à répartir tant qu&apos;aucun relevé n&apos;est importé.</Empty>
      ) : null}

      <div className="mb-10 flex flex-col gap-4">
        {months.map((p, i) => {
          // On rejoue l'historique pour connaître la dette au début de ce mois.
          let debt = rec.invested;
          for (const past of [...months].reverse()) {
            if (past === p) break;
            debt -= distribute(
              cashedPool(store, space.id, past), cfg, ps, debt,
            ).toDebt;
          }
          const pool = cashedPool(store, space.id, p);
          const d = distribute(pool, cfg, ps, debt);
          const sealed = sealedOf(store, space.id).find((s) => s.period === p);
          const segs = [
            {
              key: "dette",
              value: d.toDebt,
              label: "remboursement",
              color: "bg-line-strong",
            },
            ...members.map((m) => ({
              key: m.userId,
              value: d.parts[m.userId] ?? 0,
              label: m.name,
              color: ROLE_COLOR[m.role],
            })),
          ].filter((s) => s.value > 0.5);

          return (
            <Card key={p}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-[15px] font-medium capitalize">
                    {monthLabel(p)}
                  </h3>
                  {sealed ? (
                    <Pill tone="ok">scellé</Pill>
                  ) : (
                    <Pill tone="warn">ouvert</Pill>
                  )}
                  {i === 0 ? <Pill tone="iris">en cours</Pill> : null}
                </div>
                <span className="tnum text-sm">{eur(pool)} net encaissé</span>
              </div>

              {pool > 0 ? (
                <>
                  <div className="flex h-9 overflow-hidden rounded-lg border border-line">
                    {segs.map((s) => (
                      <div
                        key={s.key}
                        className={s.color}
                        style={{ width: `${(s.value / pool) * 100}%` }}
                        title={`${s.label} — ${eur(s.value)}`}
                      />
                    ))}
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                    {segs.map((s) => (
                      <li key={s.key} className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-sm ${s.color}`} />
                        <span className="font-mono text-[11px] text-muted">
                          {s.label} {eur(s.value)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-muted">
                  Rien d&apos;encaissé sur ce mois.
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {lastPool > 0 ? (
        <>
          <h2 className="mb-1 text-base font-semibold">
            Ce que change la règle de recoupement
          </h2>
          <p className="mb-4 text-sm text-muted">
            Mêmes {eur(lastPool)} encaissés, trois résultats très différents.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {MODELS.map((m) => {
              const alt: Config = { ...cfg, recoupModel: m.id };
              const d = distribute(lastPool, alt, ps, rec.remaining);
              const forArtists = artistIds.reduce(
                (s, id) => s + (d.parts[id] ?? 0),
                0,
              );
              const active = cfg.recoupModel === m.id;
              return (
                <Card key={m.id} className={active ? "border-iris/40" : ""}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <Eyebrow>{m.title}</Eyebrow>
                    {active ? <Pill tone="iris">actif</Pill> : null}
                  </div>
                  <p className="tnum text-2xl font-semibold text-iris">
                    {eur(forArtists)}
                  </p>
                  <p className="mb-3 font-mono text-[11px] text-muted">
                    pour l&apos;artiste ce mois-ci · {eur(d.toDebt)} au
                    remboursement
                  </p>
                  <p className="text-sm text-ink-2">{m.note}</p>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}
    </>
  );
}

