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
    <Card className="space-y-5">
      <form action={action} className="space-y-5">
        <Field label="Identifiant">
          <input
            name="handle"
            placeholder="daniel"
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
            placeholder="••••••"
            maxLength="6"
            pattern="\d{6}"
            required
            className="text-center text-[22px] font-bold tracking-[0.5em]"
          />
        </Field>

        {state?.error && (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{
              background: "rgba(220,38,38,0.08)",
              borderColor: "rgba(220,38,38,0.3)",
              color: "#991B1B",
            }}
          >
            {state.error}
          </div>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </Card>
  );
}

