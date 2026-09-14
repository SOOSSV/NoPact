// @ts-nocheck
import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { ConnexionForm } from "./connexion-form";

export default async function ConnexionPage() {
  if (await currentUser()) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-block transition-opacity hover:opacity-80">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                letterSpacing: "-1px",
                boxShadow: "0 4px 16px rgba(59, 130, 246, 0.4)",
              }}
            >
              N
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-ink">
            Connexion à NoPact
          </h1>
          <p className="mt-1 text-sm text-muted">
            Gère les parts et les revenus en toute transparence
          </p>
        </div>

        <ConnexionForm />

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          L&apos;accès à NoPact se fait uniquement sur invitation.
          <br />
          Si tu es artiste, demande à ton label de te générer un lien.
        </p>
      </div>
    </main>
  );
}

