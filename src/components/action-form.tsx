"use client";

import { useActionState, type ReactNode } from "react";
import * as actions from "@/lib/actions";
import type { ActionState } from "@/lib/actions";
import { Alert, Button } from "./ui";

/**
 * Next n'enregistre une action serveur que si elle est référencée depuis le
 * module qui l'utilise. Passée en simple prop depuis un composant serveur,
 * elle n'apparaît pas dans le manifeste et l'envoi échoue par « Server Action
 * not found ». On l'importe donc ici, et on la désigne par son nom.
 */
type ActionName = {
  [K in keyof typeof actions]: (typeof actions)[K] extends (
    prev: ActionState,
    data: FormData,
  ) => Promise<ActionState>
    ? K
    : never;
}[keyof typeof actions];

export function ActionForm({
  action,
  children,
  className = "flex flex-col gap-4",
  submit,
  variant = "primary",
  pendingLabel,
}: {
  action: ActionName;
  children: ReactNode;
  className?: string;
  submit?: string;
  variant?: "primary" | "ghost";
  pendingLabel?: string;
}) {
  const fn = actions[action] as (
    prev: ActionState,
    data: FormData,
  ) => Promise<ActionState>;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    fn,
    null,
  );

  return (
    <form action={formAction} className={className} encType="multipart/form-data">
      {children}
      {state?.error ? <Alert>{state.error}</Alert> : null}
      {state?.notice ? (
        <p className="rise rounded-lg border border-ok/30 bg-ok-dim/60 px-3.5 py-2.5 text-[13px] text-ok">
          {state.notice}
        </p>
      ) : null}
      {submit ? (
        <div>
          <Button type="submit" variant={variant} disabled={pending}>
            {pending ? (pendingLabel ?? "…") : submit}
          </Button>
        </div>
      ) : null}
    </form>
  );
}
