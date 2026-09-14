// @ts-nocheck
import { Card, Eyebrow, PageHeader, Stat } from "@/components/ui";
import { Landing } from "@/components/landing";
import { InviteBox } from "@/components/invite-box";
import { getPendingInvitations } from "@/lib/db";
import { can, context, currentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Dashboard() {
  // Visiteur : landing page
  const visiteur = await currentUser();
  if (visiteur?.mustChange) redirect("/bienvenue");

  const ctx = await context();
  if (!ctx) {
    if (visiteur) redirect("/espaces");
    return <Landing />;
  }

  const { space, members } = ctx;
  const canInvite = can.manageRules(ctx.me.role);
  const pending = canInvite ? await getPendingInvitations(space.id) : [];

  return (
    <>
      <PageHeader
        eyebrow={`Tableau de bord · ${space.name}`}
        title="Vue d'ensemble"
        sub="Où en est le projet."
      />

      {/* Stats principales */}
      <div className="grid gap-4 mb-7 sm:grid-cols-3">
        <Stat label="Revenus" value="0 €" hint="Aucun revenu pour l'instant" />
        <Stat label="Dépenses" value="0 €" hint="Aucune dépense" />
        <Stat label="Accord" value="À établir" hint="Aucun accord signé" />
      </div>

      {/* Membres */}
      <Card className="mb-7">
        <div className="mb-4">
          <Eyebrow>Membres du label ({members.length})</Eyebrow>
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.userId}
              className="flex items-center justify-between py-2 border-b border-line last:border-0"
            >
              <div>
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-xs text-muted">{m.email}</p>
              </div>
              <span className="text-xs font-mono bg-raised px-2 py-1 rounded capitalize">
                {m.role}
              </span>
            </div>
          ))}
        </div>
        {canInvite ? <InviteBox pending={pending} labelName={space.name} /> : null}
      </Card>

      {/* Quick actions */}
      <Card>
        <div className="mb-4">
          <Eyebrow>Actions rapides</Eyebrow>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-2">
            Commencez par établir un accord avec vos collaborateurs.
          </p>
          <a
            href="/accord"
            className="inline-flex rounded-lg bg-iris px-4 py-2.5 text-sm font-medium text-ground hover:bg-iris-soft transition-colors"
          >
            Proposer un accord →
          </a>
        </div>
      </Card>
    </>
  );
}
