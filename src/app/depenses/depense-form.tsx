// @ts-nocheck
"use client";

import { useActionState, useRef, useState } from "react";
import { createExpense, readReceipt, type ActionState } from "@/lib/actions";
import { Alert, Button, Field } from "@/components/ui";

const CATEGORIES = [
  "Studio", "Clip", "Marketing", "Déplacement", "Hôtel", "Restaurant", "Autre",
];

/**
 * La photo d'abord, le formulaire ensuite. La lecture pré-remplit, elle ne
 * décide de rien : tout reste modifiable avant l'enregistrement.
 */
export function DepenseForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createExpense,
    null,
  );
  const [lecture, lireAction, enLecture] = useActionState<ActionState, FormData>(
    readReceipt,
    null,
  );

  const fichierRef = useRef<HTMLInputElement>(null);
  const [aUnFichier, setAUnFichier] = useState(false);
  const lu = lecture?.lecture;

  // Relit la photo choisie et lance la lecture, sans quitter le formulaire.
  const lire = () => {
    const f = fichierRef.current?.files?.[0];
    if (!f) return;
    const data = new FormData();
    data.set("receipt", f);
    lireAction(data);
  };

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label="Facture — photo, capture ou PDF (obligatoire)">
        <input
          ref={fichierRef}
          name="receipt"
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          required
          onChange={(e) => setAUnFichier(Boolean(e.target.files?.length))}
          className="file:mr-3 file:rounded-md file:border-0 file:bg-iris file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ground"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={lire}
          disabled={!aUnFichier || enLecture}
        >
          {enLecture ? "Lecture…" : "Lire la facture"}
        </Button>
        <span className="text-xs text-faint">
          Remplit les champs à ta place. Vérifie toujours le montant.
        </span>
      </div>

      {lecture?.error ? <Alert>{lecture.error}</Alert> : null}
      {lu ? (
        <p
          className={`rise rounded-lg border px-3.5 py-2.5 text-[13px] ${
            lu.confiance === "basse"
              ? "border-warn/30 bg-warn-dim/60 text-warn"
              : "border-ok/30 bg-ok-dim/60 text-ok"
          }`}
        >
          {lu.confiance === "basse"
            ? "Document peu lisible — relis chaque champ avant d'enregistrer."
            : "Facture lue. Vérifie le montant, puis enregistre."}
        </p>
      ) : null}

      {/* La lecture change les valeurs par défaut : la clé force le remplissage. */}
      <div key={lu ? JSON.stringify(lu) : "vide"} className="grid gap-4 sm:grid-cols-2">
        <Field label="Libellé">
          <input
            name="label"
            defaultValue={lu?.label ?? ""}
            placeholder="Ce que couvre la dépense"
            required
          />
        </Field>
        <Field label="Prestataire">
          <input
            name="vendor"
            defaultValue={lu?.vendor ?? ""}
            placeholder="Nom du prestataire"
            required
          />
        </Field>
        <Field label="Montant (€)">
          <input
            name="amount"
            type="number"
            min="1"
            step="0.01"
            defaultValue={lu?.amount ?? ""}
            required
          />
        </Field>
        <Field label="Date">
          <input name="date" type="date" defaultValue={lu?.date ?? ""} />
        </Field>
        <Field label="Catégorie">
          <select name="category" defaultValue={lu?.category ?? "Autre"}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Commentaire">
          <input name="comment" placeholder="Ce que ça couvre" />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 normal-case tracking-normal">
        <input type="checkbox" name="relatedParty" className="h-4 w-auto" />
        <span className="font-sans text-[13px] text-ink-2">
          Prestataire lié au label
        </span>
      </label>

      {state?.error ? <Alert>{state.error}</Alert> : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
}

