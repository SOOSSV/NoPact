// @ts-nocheck
"use client";

import { useState } from "react";
import { useActionState } from "react";
import { signIn, type ActionState } from "@/lib/actions";
import { Alert, Button, Card, Field } from "@/components/ui";

export function ConnexionForm() {
  const [showCode, setShowCode] = useState(false);
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
            placeholder="soossv"
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            required
          />
        </Field>

        <Field label="Code (6 chiffres)">
          <div className="relative">
            <input
              name="password"
              type={showCode ? "text" : "password"}
              placeholder={showCode ? "123456" : "••••••"}
              maxLength="6"
              pattern="\d{6}"
              required
              className="w-full text-center text-[22px] font-bold tracking-[0.5em]"
            />
            <button
              type="button"
              onClick={() => setShowCode(!showCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors"
              aria-label={showCode ? "Masquer le code" : "Afficher le code"}
            >
              {showCode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1 -4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
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

