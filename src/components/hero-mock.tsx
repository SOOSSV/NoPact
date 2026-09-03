"use client";

import { useEffect, useRef, useState } from "react";

const PLATFORMS = [
  { name: "Spotify", plays: "1 284 902", amount: 3873, color: "#1DB954" },
  { name: "Apple Music", plays: "312 440", amount: 1204, color: "#FA57C1" },
  { name: "TikTok", plays: "4 902 118", amount: 812, color: "#25F4EE" },
  { name: "YouTube", plays: "628 771", amount: 649, color: "#FF4E45" },
  { name: "Deezer", plays: "96 330", amount: 218, color: "#A238FF" },
];

const SPLIT = [
  { who: "SOOSSV", role: "artiste", pct: 50, color: "#e8110c" },
  { who: "Ryan", role: "manager", pct: 10, color: "#b9c2d0" },
  { who: "Kenza", role: "manager", pct: 10, color: "#9aa6b8" },
  { who: "Prod", role: "producteurs", pct: 10, color: "#fbbf24" },
  { who: "Label", role: "label", pct: 20, color: "#34d399" },
];

const MONTHS = [38, 52, 47, 66, 71, 59, 84, 92, 78, 96, 88, 100];

/** Compteur qui monte à l'arrivée. Le chiffre bouge, pas la mise en page. */
function useCountUp(target: number, ms = 1400) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      // même easing que le reste du site
      setN(Math.round(target * (1 - Math.pow(1 - p, 5))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}

export function HeroMock() {
  const total = useCountUp(6756);
  const wrap = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState(0);

  // La maquette suit très légèrement la souris : elle est vivante, pas figée.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setTilt(((e.clientX - r.left) / r.width - 0.5) * 4);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div
      ref={wrap}
      className="pointer-events-none relative mx-auto mt-4 w-full max-w-[1040px] select-none"
      style={{ perspective: "2400px" }}
      aria-hidden="true"
    >
      {/* halo derrière la maquette */}
      <div
        className="absolute inset-x-24 top-16 h-64 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(232,17,12,.45), transparent)",
        }}
      />

      <div
        className="hero-tilt relative origin-top"
        style={{
          // Assez incliné pour donner de la profondeur, assez droit pour rester lisible.
          transform: `rotateX(22deg) rotateZ(${-6 + tilt * 0.4}deg)`,
        }}
      >
        <div className="overflow-hidden rounded-2xl border border-line bg-[#111520] shadow-[0_50px_110px_-30px_rgba(0,0,0,1),0_0_0_1px_rgba(232,17,12,.16)]">
          {/* barre de fenêtre */}
          <div className="flex items-center gap-2 border-b border-line bg-raised/60 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
              NoPact · Nuit Blanche · septembre
            </span>
          </div>

          <div className="grid gap-5 p-6 md:grid-cols-[1.45fr_1fr]">
            {/* colonne gauche : plateformes */}
            <div className="flex flex-col gap-4">
              <div className="flex items-end justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                    Encaissé ce mois
                  </span>
                  <span className="tnum text-4xl font-semibold tracking-tight">
                    {total.toLocaleString("fr-FR")} €
                  </span>
                </div>
                <div className="flex h-14 items-end gap-1">
                  {MONTHS.map((h, i) => (
                    <span
                      key={i}
                      className="hero-bar w-2 rounded-sm bg-iris/70"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${0.5 + i * 0.045}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
                {PLATFORMS.map((p, i) => (
                  <li
                    key={p.name}
                    className="hero-row flex items-center gap-3 px-4 py-3"
                    style={{ animationDelay: `${0.35 + i * 0.09}s` }}
                  >
                    <span
                      className="h-6 w-6 flex-none rounded-md"
                      style={{
                        background: p.color,
                        boxShadow: `0 0 16px -4px ${p.color}`,
                      }}
                    />
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="text-[13px]">{p.name}</span>
                      <span className="font-mono text-[10px] text-faint">
                        {p.plays} écoutes
                      </span>
                    </div>
                    <span className="tnum ml-auto text-[13px]">
                      {p.amount.toLocaleString("fr-FR")} €
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* colonne droite : partage et journal */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-line p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                  Partage
                </span>
                <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
                  {SPLIT.map((s, i) => (
                    <span
                      key={s.who}
                      className="hero-seg h-full"
                      style={{
                        width: `${s.pct}%`,
                        background: s.color,
                        animationDelay: `${0.8 + i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {SPLIT.map((s, i) => (
                    <li
                      key={s.who}
                      className="hero-row flex items-center gap-2"
                      style={{ animationDelay: `${0.9 + i * 0.07}s` }}
                    >
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ background: s.color }}
                      />
                      <span className="text-[12px]">{s.who}</span>
                      <span className="font-mono text-[10px] text-faint">
                        {s.role}
                      </span>
                      <span className="tnum ml-auto text-[12px]">{s.pct} %</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-line p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">
                  Journal
                </span>
                <ul className="mt-3 flex flex-col gap-2">
                  {[
                    ["02", "Clip « Nuit Blanche » — 4 000 €", "#fbbf24"],
                    ["03", "Validé par Ryan", "#34d399"],
                    ["05", "Facture attachée", "#9aa6b8"],
                    ["28", "Relevé Believe importé", "#e8110c"],
                  ].map(([d, t, c], i) => (
                    <li
                      key={d}
                      className="hero-row flex items-center gap-2.5"
                      style={{ animationDelay: `${1.05 + i * 0.09}s` }}
                    >
                      <span className="tnum text-[10px] text-faint">{d}</span>
                      <span
                        className="h-1.5 w-1.5 flex-none rounded-full"
                        style={{ background: c as string }}
                      />
                      <span className="truncate text-[12px] text-ink-2">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* la maquette se fond dans le noir en bas */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ground via-ground/70 to-transparent" />
    </div>
  );
}
