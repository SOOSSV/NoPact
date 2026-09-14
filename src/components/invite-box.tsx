// @ts-nocheck
"use client";

import { useActionState, useEffect, useState } from "react";
import { inviteMember, type ActionState } from "@/lib/actions";
import { ROLE_LABEL, SPACE_ROLES } from "@/lib/defaults";
import { Alert, Button, Field } from "@/components/ui";

type Pending = { id: string; name: string; role: string; token: string };

function ShareButtons({ name, token }: { name: string; token: string }) {
  const [copied, setCopied] = useState(false);
  const link = () => `${window.location.origin}/invitation/${token}`;
  const message = () => `Salut ${name}, voici ton accès NoPact : ${link()}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie ce lien :", link());
    }
  };

  const send = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: message() });
      } catch {}
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message())}`, "_blank", "noopener");
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="ghost" onClick={copy}>
        {copied ? "Lien copié" : "Copier le lien"}
      </Button>
      <Button type="button" onClick={send}>
        Envoyer
      </Button>
    </div>
  );
}

export function InviteBox({ pending }: { pending: Pending[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, busy] = useActionState<ActionState, FormData>(inviteMember, null);
  const fresh = state?.invite;

  useEffect(() => {
    if (fresh) setOpen(false);
  }, [fresh]);

  const waiting = pending.filter((p) => p.token !== fresh?.token);

  return (
    <div className="mt-5 flex flex-col gap-5 border-t border-line pt-5">
      {fresh ? (
        <div className="flex flex-col gap-3 rounded-lg border border-ok/30 bg-ok-dim/60 px-4 py-3">
          <p className="text-sm text-ok">
            Lien prêt pour {fresh.name}. Envoie-le : il suffit de l&apos;ouvrir pour choisir son identifiant et son code.
          </p>
          <ShareButtons name={fresh.name} token={fresh.token} />
        </div>
      ) : null}

      {waiting.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted">En attente ({waiting.length})</p>
          {waiting.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{p.name}</p>
                <p className="text-xs text-muted">{ROLE_LABEL[p.role] ?? p.role} · pas encore inscrit</p>
              </div>
              <ShareButtons name={p.name} token={p.token} />
            </div>
          ))}
        </div>
      ) : null}

      {open ? (
        <form action={action} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom">
              <input name="name" placeholder="Ryan" required autoFocus />
            </Field>
            <Field label="Rôle">
              <select name="role" defaultValue="manager">
                {SPACE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {state?.error ? <Alert>{state.error}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Création…" : "Créer le lien"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button type="button" onClick={() => setOpen(true)}>
            Inviter quelqu&apos;un
          </Button>
        </div>
      )}
    </div>
  );
}
