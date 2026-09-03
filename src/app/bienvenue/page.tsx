import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { currentUser } from "@/lib/session";
import { BienvenueForm } from "./bienvenue-form";

export default async function BienvenuePage() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  // Une fois les identifiants choisis, cette page n'a plus lieu d'être.
  if (!user.mustChange) redirect("/");

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rise mb-8 flex flex-col gap-4">
        <Logo size="lg" />
        <h1 className="text-4xl font-semibold tracking-tight">
          À toi de jouer
        </h1>
        <p className="text-[15px] text-muted">
          Ce compte a été ouvert pour toi. Choisis ton identifiant et ton mot de
          passe : personne d&apos;autre ne les connaîtra.
        </p>
      </div>
      <div className="stagger">
        <BienvenueForm handle={user.handle} name={user.name} />
      </div>
    </div>
  );
}
