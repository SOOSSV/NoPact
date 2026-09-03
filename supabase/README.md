# Base

Projet Supabase : `obtftxaxgkhnxpxyffri` — **partagé avec la boutique VINIALACE**.

NoPact vit dans son propre schéma `nopact`. Le schéma `public` appartient à la
boutique et n'est jamais touché.

| Schéma | À qui | Contenu |
| --- | --- | --- |
| `public` | VINIALACE | products, product_variants, orders, categories, settings… |
| `nopact` | NoPact | spaces, memberships, revenues, expenses, validations, ledger, sealed_months, vendors, works |

## Migrations appliquées

1. `nopact_schema` — schéma, types, tables, index
2. `nopact_rules_and_rls` — trigger d'empreinte chaînée, blocage des mois
   scellés, droits (UPDATE/DELETE révoqués) et RLS par appartenance

`0001_init.sql` est la version générique du schéma (tables dans `public`),
gardée comme référence lisible. Ce qui tourne réellement, c'est la version
`nopact.*` ci-dessus.

## À faire côté tableau de bord Supabase

Le schéma `nopact` doit être ajouté dans **Settings → API → Exposed schemas**,
sinon PostgREST refuse toutes les requêtes.

## Vérifier la chaîne du journal

```sql
select nopact.ledger_verify('<space_id>');  -- null = intacte
```
