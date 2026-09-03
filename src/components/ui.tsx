import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`lift rounded-2xl border border-line bg-surface/80 p-5 sm:p-6 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {sub ? <p className="max-w-xl text-sm text-ink-2">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "ok" | "warn" | "alert" | "iris";

const TONES: Record<Tone, string> = {
  neutral: "bg-raised text-muted border-line",
  ok: "bg-ok-dim text-ok border-ok/25",
  warn: "bg-warn-dim text-warn border-warn/25",
  alert: "bg-alert-dim text-alert border-alert/25",
  iris: "bg-iris-dim text-iris border-iris/25",
};

export function Pill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  const color =
    tone === "iris" ? "text-iris" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <Card className="rise flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      <p className={`tnum text-2xl font-semibold tracking-tight ${color}`}>
        {value}
      </p>
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

/** Jauge de remboursement : la seule animation de l'application. */
export function Gauge({ pct }: { pct: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-raised">
      <div
        className="grow-x h-full rounded-full bg-gradient-to-r from-iris to-iris-soft"
        style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  ...rest
}: React.ComponentProps<"button"> & { variant?: "primary" | "ghost" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium " +
    "transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] " +
    "hover:-translate-y-px active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0";
  const look =
    variant === "primary"
      ? "bg-iris text-ground shadow-[0_6px_20px_-8px_rgba(232,17,12,.85)] hover:bg-iris-soft hover:shadow-[0_10px_28px_-8px_rgba(232,17,12,.85)]"
      : "border border-line text-ink-2 hover:border-line-strong hover:text-ink hover:bg-raised/50";
  return (
    <button {...rest} className={`${base} ${look}`}>
      {children}
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-sm text-muted">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label>{label}</label>
      {children}
    </div>
  );
}

/** Explication repliée. Par défaut on ne lit rien : on ouvre si on veut. */
export function Why({
  children,
  label = "Pourquoi ?",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-iris">
        <span className="grid h-4 w-4 place-items-center rounded-full border border-line text-[9px]">
          ?
        </span>
        {label}
      </summary>
      <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
        {children}
      </p>
    </details>
  );
}

export type Step = { label: string; done: boolean; href?: string };

/** Où on en est, en un coup d'œil. Le premier point non fait est le suivant. */
export function Checklist({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  return (
    <Card className="gap-4">
      <div className="flex items-center justify-between gap-4">
        <Eyebrow>Mise en route</Eyebrow>
        <span className="tnum font-mono text-[11px] text-muted">
          {done}/{steps.length}
        </span>
      </div>
      <div className="flex gap-1.5">
        {steps.map((s) => (
          <span
            key={s.label}
            className={`h-1 flex-1 rounded-full ${s.done ? "bg-iris" : "bg-raised"}`}
          />
        ))}
      </div>
      <ol className="flex flex-col gap-2.5">
        {steps.map((s) => {
          const current = s === next;
          return (
            <li key={s.label} className="flex items-center gap-3">
              <span
                className={`grid h-5 w-5 flex-none place-items-center rounded-full text-[10px] ${
                  s.done
                    ? "bg-iris text-ground"
                    : current
                      ? "border border-iris text-iris"
                      : "border border-line text-muted"
                }`}
              >
                {s.done ? "✓" : ""}
              </span>
              <span
                className={`text-sm ${s.done ? "text-muted line-through decoration-line" : current ? "text-ink" : "text-muted"}`}
              >
                {s.label}
              </span>
              {current && s.href ? (
                <a href={s.href} className="ml-auto text-[13px] text-iris">
                  Commencer →
                </a>
              ) : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

/** Une seule chose à faire, en grand. Zéro ambiguïté sur le clic suivant. */
export function NextStep({
  title,
  detail,
  href,
  cta,
}: {
  title: string;
  detail?: string;
  href: string;
  cta: string;
}) {
  return (
    <Card className="gap-4 border-iris/30">
      <div className="flex flex-col gap-1.5">
        <Eyebrow>À faire maintenant</Eyebrow>
        <p className="text-xl font-semibold tracking-tight">{title}</p>
        {detail ? <p className="text-sm text-ink-2">{detail}</p> : null}
      </div>
      <div>
        <a
          href={href}
          className="inline-flex rounded-lg bg-iris px-4 py-2.5 text-sm font-medium text-ground"
        >
          {cta}
        </a>
      </div>
    </Card>
  );
}

/** Message d'erreur d'un formulaire. Dit ce qui ne va pas, à sa place. */
export function Alert({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rise flex items-start gap-2.5 rounded-lg border border-alert/30 bg-alert-dim/60 px-3.5 py-2.5 text-[13px] text-alert"
    >
      <span className="mt-px font-mono text-[11px]">!</span>
      <span>{children}</span>
    </p>
  );
}
