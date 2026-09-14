// @ts-nocheck
"use client";

import { useActionState, useState } from "react";
import { acceptInvite, type ActionState } from "@/lib/actions";
import { Alert, Button, Card, Field } from "@/components/ui";

export function InvitationForm({ token, name }: { token: string; name: string }) {
  const [fullName, setFullName] = useState(name);
  const [handle, setHandle] = useState("");
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(true);
  const [state, action, pending] = useActionState<ActionState, FormData>(acceptInvite, null);

  return (
    <Card className="space-y-5">
      <form action={action} className="space-y-5">
        <input type="hidden" name="token" value={token} />

        <Field label="Ton nom">
          <input name="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </Field>

        <Field label="Identifiant">
          <input
            name="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="ryan"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            required
          />
        </Field>

        <Field label="Code (6 chiffres)">
          <div className="relative">
            <input
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              type={showCode ? "text" : "password"}
              inputMode="numeric"
              autoComplete="new-password"
              placeholder={showCode ? "123456" : "••••••"}
              maxLength={6}
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

        <p className="text-xs text-muted">Retiens-les : ce sont eux qui te serviront à te connecter.</p>

        {state?.error ? <Alert>{state.error}</Alert> : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer mon accès"}
        </Button>
      </form>
    </Card>
  );
}
