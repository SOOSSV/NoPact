// @ts-nocheck
"use client";

import { useActionState } from "react";
import { signIn, type ActionState } from "@/lib/actions";
import { Alert, Button, Card, Field } from "@/components/ui";

export function ConnexionForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    signIn,
    null,
  );

  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Identifiant">
          <input
            name="handle"
            placeholder="soossv"
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            required
          />
        </Field>

        <Field label="Code (6 chiffres)">
          <input
            name="password"
            type="text"
            placeholder="000000"
            maxLength="6"
            pattern="\d{6}"
            required
          />
        </Field>

        {state?.error ? <Alert>{state.error}</Alert> : null}

        <div className="pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "Entrer"}
          </Button>
        </div>

        <p className="text-[13px] text-faint">
          Pas de compte ? C&apos;est l&apos;artiste ou un manager qui te
          l&apos;ouvre et te donne ton identifiant.
        </p>
      </form>
    </Card>
  );
}

