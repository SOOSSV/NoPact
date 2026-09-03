import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { currentUser } from "@/lib/session";
import { ConnexionForm } from "./connexion-form";

export default async function ConnexionPage() {
  if (await currentUser()) redirect("/");

  return (
    <div className="relative min-h-screen">
      {/* Le logo tient le coin, il ne flotte pas au milieu. */}
      <header className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-7 sm:px-10">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-faint sm:inline">
          Artiste · Managers · Producteurs · Label
        </span>
      </header>

      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Colonne gauche : le discours */}
        <section className="flex items-center px-6 pt-28 pb-10 sm:px-10 lg:pt-6">
          <div className="rise w-full max-w-lg">
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Une seule version
              <br />
              <span className="text-iris">des comptes</span>
            </h1>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted">
              Un compte par personne. C&apos;est ce qui permet de dire qui a
              saisi quoi, et qui a validé quoi.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {[
                "Les revenus viennent du relevé, jamais d'une saisie",
                "Chaque opération scelle la précédente",
                "Personne ne valide sa propre dépense",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-sm text-ink-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-iris" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Colonne droite : le formulaire, sur un fond légèrement détaché */}
        <section className="flex items-center border-t border-line bg-surface/40 px-6 py-12 sm:px-10 lg:border-l lg:border-t-0 lg:py-6">
          <div className="stagger w-full max-w-md lg:mx-auto">
            <ConnexionForm />
          </div>
        </section>
      </div>
    </div>
  );
}
