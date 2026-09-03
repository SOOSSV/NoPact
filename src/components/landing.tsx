import Link from "next/link";
import { Logo } from "./logo";
import { HeroMock } from "./hero-mock";

const POINTS = [
  {
    t: "Chaque euro a une source",
    d: "Les revenus viennent du relevé du distributeur, jamais d'une saisie à la main.",
  },
  {
    t: "Rien ne s'efface",
    d: "Chaque opération scelle la précédente. Toucher une ligne casse la chaîne, et ça se voit.",
  },
  {
    t: "Personne ne valide seul",
    d: "Au-delà du seuil, un manager valide. Chez un prestataire lié au label, ils valident tous.",
  },
];

export function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="flex w-full items-center justify-between px-5 py-6 sm:px-8">
        <Logo />
        <Link
          href="/connexion"
          className="rounded-lg border border-line px-4 py-2 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
        >
          Entrer
        </Link>
      </header>

      {/* Calé à gauche, comme une page de produit — pas centré. */}
      <section className="rise w-full max-w-[1240px] px-5 pt-10 pb-4 sm:px-8">
        <h1 className="max-w-3xl text-5xl leading-[1.03] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
          L&apos;argent de ta musique,
          <br />
          <span className="text-iris">à la vue de tous</span>
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-muted">
          Les comptes partagés entre un artiste, ses managers, ses producteurs et
          son label. Une seule version des faits, que personne ne peut réécrire.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/connexion"
            className="rounded-lg bg-iris px-5 py-3 text-sm font-medium text-ground shadow-[0_8px_26px_-8px_rgba(232,17,12,.9)] transition-all duration-300 hover:-translate-y-px hover:bg-iris-soft"
          >
            Ouvrir mes comptes
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
            Spotify · Apple Music · TikTok · SACEM
          </span>
        </div>
      </section>

      {/* La maquette a sa propre zone : elle ne passe plus sous le bouton. */}
      <div className="relative mt-10 w-full max-w-[1240px] px-5 sm:px-8">
        <HeroMock />
      </div>

      <section className="stagger mt-4 grid w-full max-w-[1240px] gap-4 px-5 pb-20 sm:grid-cols-3 sm:px-8">
        {POINTS.map((p) => (
          <div
            key={p.t}
            className="lift rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-sm"
          >
            <h2 className="text-[15px] font-semibold">{p.t}</h2>
            <p className="mt-2 text-sm text-muted">{p.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
