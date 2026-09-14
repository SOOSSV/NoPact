// @ts-nocheck
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { context } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoPact",
  description:
    "Comptes partagés entre un artiste, ses managers, ses producteurs et son label. Chaque euro a une trace.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pas de contexte (pas connecté, aucun espace, ou base injoignable) :
  // les pages s'affichent seules, sans navigation d'application.
  const ctx = await context().catch(() => null);

  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        {ctx ? (
          <Nav
            userName={ctx.user.name}
            role={ctx.me.role}
            space={ctx.space}
            spaces={ctx.spaces}
          />
        ) : null}
        {/* Connecté : colonne cadrée. Visiteur : la page gère son propre plein écran. */}
        <main
          className={
            ctx ? "mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8 sm:py-10" : undefined
          }
        >
          {children}
        </main>
      </body>
    </html>
  );
}

