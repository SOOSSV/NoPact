// @ts-nocheck
import Link from "next/link";
import { ROLE_LABEL } from "@/lib/defaults";
import { getInvitationByToken, getLabelById } from "@/lib/db";
import { InvitationForm } from "./invitation-form";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const inv = await getInvitationByToken(token);
  const valid = inv && !inv.accepted_at && new Date(inv.expires_at) > new Date();
  const label = valid ? await getLabelById(inv.label_id) : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-extrabold text-white"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              letterSpacing: "-1px",
              boxShadow: "0 4px 16px rgba(59, 130, 246, 0.4)",
            }}
          >
            N
          </div>
          <h1 className="text-2xl font-bold text-ink">
            {label ? `Rejoins ${label.name}` : "Lien plus valable"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {label
              ? `Rôle : ${ROLE_LABEL[inv.role] ?? inv.role}. Choisis ton identifiant et ton code.`
              : "Ce lien a déjà servi ou a expiré. Demande une nouvelle invitation."}
          </p>
        </div>

        {label ? (
          <InvitationForm token={token} name={inv.name} />
        ) : (
          <p className="text-center text-sm">
            <Link href="/connexion" className="text-iris">
              J&apos;ai déjà un accès
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
