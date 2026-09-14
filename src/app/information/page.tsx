// @ts-nocheck
import { Card, Eyebrow, PageHeader } from "@/components/ui";

export default async function InformationPage() {
  return (
    <>
      <PageHeader
        eyebrow="Information"
        title="Infos du label & accord"
        sub="Tout ce que tu dois savoir sur ce projet."
      />

      <Card className="mb-5">
        <div className="mb-4">
          <Eyebrow>Label</Eyebrow>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted mb-1">Nom</dt>
            <dd className="text-sm font-semibold">Kimia Music</dd>
          </div>
          <div>
            <dt className="text-xs text-muted mb-1">Créé par</dt>
            <dd className="text-sm font-semibold">Daniel Gomes</dd>
          </div>
          <div>
            <dt className="text-xs text-muted mb-1">Date de création</dt>
            <dd className="text-sm font-semibold">14 sept. 2026</dd>
          </div>
          <div>
            <dt className="text-xs text-muted mb-1">Slug</dt>
            <dd className="text-sm font-mono text-muted">kimia-music</dd>
          </div>
        </dl>
      </Card>

      <Card className="mb-5">
        <div className="mb-4">
          <Eyebrow>Accord actuel</Eyebrow>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted mb-1">Projet</dt>
            <dd className="text-sm font-semibold">—</dd>
          </div>
          <div>
            <dt className="text-xs text-muted mb-1">Statut</dt>
            <dd className="text-sm font-semibold">Aucun accord</dd>
          </div>
          <div>
            <dt className="text-xs text-muted mb-1">Investissement</dt>
            <dd className="text-sm font-semibold">—</dd>
          </div>
          <div>
            <dt className="text-xs text-muted mb-1">Modèle de remboursement</dt>
            <dd className="text-sm font-semibold">—</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <div className="mb-4">
          <Eyebrow>Membres</Eyebrow>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-line">
            <div>
              <p className="text-sm font-semibold">Daniel Gomes</p>
              <p className="text-xs text-muted">daniel@example.com</p>
            </div>
            <span className="text-xs font-mono bg-raised px-2 py-1 rounded">label</span>
          </div>
        </div>
      </Card>
    </>
  );
}
