// @ts-nocheck
import { Card, Empty, Eyebrow, PageHeader, Pill } from "@/components/ui";
import { initialsOf } from "@/lib/defaults";
import { requirePage } from "@/lib/guard";
import { ledgerOf, sealedOf, userName } from "@/lib/store";
import { verifyChainDb } from "@/lib/db";
import type { LedgerEntry, LedgerType } from "@/lib/types";

const TONE: Record<LedgerType, "neutral" | "ok" | "warn" | "alert" | "iris"> = {
  revenu: "iris",
  depense: "neutral",
  validation: "ok",
  justificatif: "neutral",
  contestation: "alert",
  cloture: "ok",
  avance: "warn",
  reglages: "iris",
  membre: "neutral",
};

const LABEL: Record<LedgerType, string> = {
  revenu: "revenu",
  depense: "dépense",
  validation: "validation",
  justificatif: "pièce",
  contestation: "contestation",
  cloture: "clôture",
  avance: "avance",
  reglages: "règles",
  membre: "membre",
};

export default async function JournalPage() {
  const { store, space } = await requirePage();
  const chain = await verifyChainDb(space.id);
  const entries = [...ledgerOf(store, space.id)].reverse();
  const sealed = sealedOf(store, space.id);

  const byDay = new Map<string, LedgerEntry[]>();
  for (const e of entries) byDay.set(e.at, [...(byDay.get(e.at) ?? []), e]);

  return (
    <>
      <PageHeader
        eyebrow={`Journal · ${space.name}`}
        title="Rien ne s'efface"
        sub="Chaque entrée scelle la précédente. Rien ne s'efface."
        action={
          <Pill tone={chain.ok ? "ok" : "alert"}>
            {chain.ok
              ? `chaîne vérifiée · ${entries.length} entrée${entries.length > 1 ? "s" : ""}`
              : `rompue au rang ${chain.brokenAt}`}
          </Pill>
        }
      />

      {entries.length === 0 ? (
        <Empty>
          Le journal commence à la première opération. Rien n&apos;y est écrit
          pour l&apos;instant.
        </Empty>
      ) : null}

      <div className="flex flex-col gap-6">
        {[...byDay.entries()].map(([day, rows]) => (
          <section key={day}>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                {day}
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              {rows.map((e) => (
                <div
                  key={e.seq}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 last:border-0"
                >
                  <span className="tnum w-8 text-[11px] text-muted">
                    {String(e.seq).padStart(3, "0")}
                  </span>
                  <Pill tone={TONE[e.type]}>{LABEL[e.type]}</Pill>
                  <span className="min-w-[200px] flex-1 text-sm text-ink-2">
                    {e.text}
                  </span>
                  <span
                    className="font-mono text-[10px] uppercase text-muted"
                    title={userName(store, e.actor)}
                  >
                    {initialsOf(userName(store, e.actor))}
                  </span>
                  <span
                    className="font-mono text-[10px] text-line-strong"
                    title={e.hash}
                  >
                    {e.hash.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {sealed.length > 0 ? (
        <Card className="mt-8">
          <Eyebrow>Mois scellés</Eyebrow>
          <ul className="mt-3 flex flex-col gap-2">
            {sealed.map((s) => (
              <li key={s.period} className="flex flex-wrap items-center gap-3">
                <span className="text-sm">{s.period}</span>
                <span className="font-mono text-[11px] text-muted">
                  scellé le {s.sealedAt}
                </span>
                <span className="font-mono text-[11px] break-all text-line-strong">
                  {s.hash}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            L&apos;empreinte part par e-mail à tous les membres : elle vit hors
            de la base, hors de portée de qui que ce soit.
          </p>
        </Card>
      ) : null}
    </>
  );
}

