import { importRevenues } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { Button, Card, Empty, Eyebrow, Field, PageHeader, Pill, Why } from "@/components/ui";
import { eur, eur2, monthLabel, netOf, periods } from "@/lib/money";
import { requirePage } from "@/lib/guard";
import { can } from "@/lib/session";
import { revenuesOf, sealedOf } from "@/lib/store";
import type { RevenueStatus } from "@/lib/types";

const STATUS: Record<RevenueStatus, { label: string; tone: "warn" | "iris" | "ok" }> = {
  genere: { label: "généré", tone: "warn" },
  encaisse: { label: "encaissé", tone: "iris" },
  verse: { label: "versé", tone: "ok" },
};

const TH =
  "px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted";

export default async function RevenusPage() {
  const { store, space, me } = await requirePage();
  const months = periods(store, space.id);
  const rows = revenuesOf(store, space.id);
  const sealedMonths = sealedOf(store, space.id);

  return (
    <>
      <PageHeader
        eyebrow={`Revenus · ${space.name}`}
        title="Chaque ligne vient d'un relevé"
        sub="Importées depuis le relevé du distributeur, jamais saisies à la main."
      />

      {can.importRevenue(me.role) ? (
        <details className="mb-6">
          <summary className="mb-3 cursor-pointer list-none">
            <span className="inline-flex rounded-lg border border-line px-3.5 py-2 text-sm text-ink-2 hover:border-line-strong hover:text-ink">
              + Importer un relevé
            </span>
          </summary>
          <Card>
            <ActionForm action="importRevenues" submit="Importer">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fichier source">
                  <input
                    name="sourceFile"
                    placeholder="nom du fichier du relevé"
                    required
                  />
                </Field>
                <Field label="Période d'exploitation">
                  <input
                    name="period"
                    placeholder="2026-08"
                    pattern="\d{4}-\d{2}"
                    required
                  />
                </Field>
              </div>
              <Field label="Lignes du relevé — source, brut, frais">
                <textarea
                  name="rows"
                  rows={4}
                  placeholder={"Spotify, 3900, 234\nDeezer, 410, 25"}
                  required
                />
              </Field>
              <p className="text-xs text-faint">
                Format : une ligne par source — <code>Spotify, 3900, 234</code>
              </p>
            </ActionForm>
          </Card>
        </details>
      ) : null}

      {months.length === 0 ? (
        <Empty>
          Aucun relevé importé.{" "}
          {can.importRevenue(me.role)
            ? "Colle les lignes du CSV de ton distributeur pour ouvrir le premier mois."
            : "Le label n'a encore rien importé dans cet espace."}
        </Empty>
      ) : null}

      <div className="flex flex-col gap-6">
        {months.map((p) => {
          const lines = rows.filter((r) => r.period === p);
          const sealed = sealedMonths.find((s) => s.period === p);
          const total = lines.reduce((s, r) => s + netOf(r), 0);
          return (
            <section key={p}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-semibold capitalize">
                    {monthLabel(p)}
                  </h2>
                  {sealed ? (
                    <Pill tone="ok">scellé</Pill>
                  ) : (
                    <Pill tone="warn">ouvert</Pill>
                  )}
                </div>
                <span className="tnum text-sm text-ink-2">{eur(total)} net</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-raised/60 text-left">
                      <th className={TH}>Source</th>
                      <th className={TH}>Brut</th>
                      <th className={TH}>Frais</th>
                      <th className={TH}>Net</th>
                      <th className={TH}>Relevé</th>
                      <th className={TH}>État</th>
                      <th className="px-4 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((r) => (
                      <tr key={r.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3">{r.source}</td>
                        <td className="tnum px-4 py-3 text-ink-2">
                          {r.gross.toLocaleString("fr-FR")} {r.currency}
                        </td>
                        <td className="tnum px-4 py-3 text-muted">
                          {eur(r.fees * r.fxRate)}
                        </td>
                        <td className="tnum px-4 py-3">{eur2(netOf(r))}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[10px] text-muted">
                            {r.sourceFile}
                          </span>
                          {r.currency === "USD" ? (
                            <span className="ml-2 font-mono text-[10px] text-iris">
                              fx {r.fxRate}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Pill tone={STATUS[r.status].tone}>
                              {STATUS[r.status].label}
                            </Pill>
                            {r.disputed ? <Pill tone="alert">contestée</Pill> : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {sealed ? (
                            <span className="font-mono text-[10px] text-muted">
                              verrouillé
                            </span>
                          ) : (
                            <details>
                              <summary className="cursor-pointer list-none font-mono text-[10px] text-muted hover:text-alert">
                                contester
                              </summary>
                              <ActionForm
                                action="disputeLine"
                                className="mt-2 flex flex-col gap-2"
                                submit="Envoyer"
                                variant="ghost"
                              >
                                <input type="hidden" name="id" value={r.id} />
                                <input type="hidden" name="kind" value="revenu" />
                                <input
                                  name="reason"
                                  placeholder="Ce qui ne va pas"
                                  required
                                />
                              </ActionForm>
                            </details>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-8">
        <Why label="Généré, encaissé, versé ?">
          <strong className="text-ink-2">Généré</strong> : les streams ont eu
          lieu, l&apos;argent n&apos;est nulle part.{" "}
          <strong className="text-ink-2">Encaissé</strong> : le distributeur a
          versé au label, change figé ce jour-là.{" "}
          <strong className="text-ink-2">Versé</strong> : chacun a reçu sa part,
          preuve de virement à l&apos;appui.
        </Why>
      </div>
    </>
  );
}
