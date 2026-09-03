import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut, switchSpace } from "@/lib/actions";
import { ActionForm } from "@/components/action-form";
import { Button, Card, Empty, Eyebrow, Field, Pill } from "@/components/ui";
import { ROLE_LABEL, SPACE_ROLES } from "@/lib/defaults";
import { loadStore } from "@/lib/db";
import { membersOf, spacesOfUser } from "@/lib/store";

export default async function EspacesPage() {
  const loaded = await loadStore();
  if (!loaded) redirect("/connexion");
  const { store, userId } = loaded;
  const user = store.users.find((u) => u.id === userId);
  if (!user) redirect("/connexion");
  // Tant que la personne n'a pas choisi ses identifiants, rien d'autre.
  if (user.mustChange) redirect("/bienvenue");

  const spaces = spacesOfUser(store, userId);

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Eyebrow>Tes espaces</Eyebrow>
          <h1 className="text-3xl font-semibold tracking-tight">
            Bonjour {user.name}
          </h1>
          <p className="text-sm text-muted">
            Un espace par deal. Rien ne circule entre deux espaces.
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost">
            Se déconnecter
          </Button>
        </form>
      </div>

      {spaces.length === 0 ? (
        <Empty>
          Tu n&apos;es dans aucun espace. Crée le tien, ou demande à être invité.
        </Empty>
      ) : (
        <ul className="stagger mb-8 flex flex-col gap-3">
          {spaces.map((s) => {
            const members = membersOf(store, s.id);
            const me = members.find((m) => m.userId === userId)!;
            return (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-medium">{s.name}</span>
                      <Pill tone={s.configured ? "ok" : "warn"}>
                        {s.configured ? ROLE_LABEL[me.role] : "à configurer"}
                      </Pill>
                    </div>
                    <span className="font-mono text-[11px] text-muted">
                      {s.config.projectName || "projet sans nom"} ·{" "}
                      {members.length} personne{members.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <form action={switchSpace}>
                    <input type="hidden" name="spaceId" value={s.id} />
                    <Button type="submit" variant="ghost">
                      Ouvrir
                    </Button>
                  </form>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Card>
        <Eyebrow>Nouvel espace</Eyebrow>
        <p className="mt-2 mb-5 max-w-lg text-sm text-muted">
          Un espace = un deal. Nomme-le d&apos;après le label avec qui tu
          signes, ou d&apos;après le projet si rien n&apos;est encore signé —
          ça se renomme quand tu veux.
        </p>
        <ActionForm action="createSpace" submit="Créer l'espace">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom de l'espace">
              <input
                name="name"
                placeholder="Le label avec qui tu signes"
                required
              />
            </Field>
            <Field label="Projet en cours">
              <input name="projectName" placeholder="EP, album, single" />
            </Field>
          </div>
          <Field label="Toi, dans cet espace">
            <select name="role" defaultValue="artiste">
              {SPACE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
        </ActionForm>
      </Card>

      {spaces.length > 0 ? (
        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/" className="text-iris">
            Retourner au tableau de bord
          </Link>
        </p>
      ) : null}
    </div>
  );
}
