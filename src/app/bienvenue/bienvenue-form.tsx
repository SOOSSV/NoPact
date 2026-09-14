// @ts-nocheck
"use client";

import { useActionState } from "react";
import { finishSetup, type ActionState } from "@/lib/actions";
import { Alert, Button, Card, Field } from "@/components/ui";

export function BienvenueForm({
  handle,
  name,
}: {
  handle: string;
  name: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    finishSetup,
    null,
  );

  return (
    <Card>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Ton nom">
          <input name="name" defaultValue={name} required />
        </Field>
        <Field label="Ton identifiant">
          <input
            name="handle"
            defaultValue={handle}
            autoCapitalize="none"
            autoCorrect="off"
            required
          />
        </Field>
        <Field label="Ton mot de passe">
          <input
            name="password"
            type="password"
            placeholder="6 caractères minimum"
            autoComplete="new-password"
            minLength={6}
            required
          />
        </Field>

        {state?.error ? <Alert>{state.error}</Alert> : null}

        <div className="pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "…" : "C'est bon"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

