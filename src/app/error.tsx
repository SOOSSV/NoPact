"use client";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  const schemaManquant =
    error.message.includes("nopact") || error.name === "DatabaseUnavailable";

  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-alert">
        La base refuse de répondre
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {schemaManquant
          ? "Le schéma « nopact » n'est pas exposé"
          : "Quelque chose bloque côté données"}
      </h1>

      {schemaManquant ? (
        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm text-ink-2">
            Les tables existent, l&apos;authentification marche, mais
            l&apos;API Supabase ne laisse pas passer le schéma. À corriger dans
            le tableau de bord :
          </p>
          <ol className="flex flex-col gap-2 text-sm text-muted">
            <li>1. Settings → Integrations → <strong className="text-ink-2">Data API</strong></li>
            <li>2. <strong className="text-ink-2">Exposed schemas</strong> → coche <code className="text-iris">nopact</code></li>
            <li>3. <strong className="text-ink-2">Enregistre</strong> — c&apos;est cette étape qui a sauté</li>
            <li>4. Recharge cette page</li>
          </ol>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 font-mono text-[12px] text-muted">
          {error.message}
        </p>
      )}

      <button
        onClick={() => location.reload()}
        className="mt-6 rounded-lg bg-iris px-4 py-2.5 text-sm font-medium text-ground"
      >
        Réessayer
      </button>
    </div>
  );
}
