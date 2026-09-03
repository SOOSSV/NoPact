"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, switchSpace } from "@/lib/actions";
import { ROLE_LABEL, initialsOf } from "@/lib/defaults";
import { Logo } from "./logo";
import type { Space, SpaceRole } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/revenus", label: "Revenus" },
  { href: "/depenses", label: "Dépenses" },
  { href: "/royalties", label: "Royalties" },
  { href: "/journal", label: "Journal" },
  { href: "/accord", label: "Accord" },
  { href: "/contrat", label: "Contrat" },
  { href: "/reglages", label: "Réglages" },
];

export function Nav({
  userName,
  role,
  space,
  spaces,
}: {
  userName: string;
  role: SpaceRole;
  space: Space;
  spaces: Space[];
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-ground/80 backdrop-blur-xl">
      <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3 sm:px-8">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Logo />
        </Link>

        {/* Sélecteur d'espace : un espace = un deal avec un label. */}
        <form action={switchSpace} className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:inline">
            Espace
          </span>
          <select
            name="spaceId"
            defaultValue={space.id}
            className="w-auto max-w-[190px] py-1.5 text-[13px]"
          >
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md border border-line px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink"
          >
            ok
          </button>
        </form>

        <nav className="-mx-1 order-3 w-full overflow-x-auto sm:order-none sm:mx-0 sm:w-auto">
          <ul className="flex items-center gap-1">
            {LINKS.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`block whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                      active ? "bg-raised text-ink" : "text-muted hover:text-ink-2"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-iris font-mono text-[10px] text-ground">
              {initialsOf(userName)}
            </span>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-[13px]">{userName}</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {ROLE_LABEL[role]}
              </span>
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-line px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink"
            >
              sortir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
