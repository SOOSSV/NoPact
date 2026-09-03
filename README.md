# NoPact

Comptes partagés entre un artiste, ses managers, ses producteurs et son label.
Plusieurs personnes, plusieurs deals, une seule version des faits.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 22 tests : règles, répartition, chaîne du journal, étanchéité
```

Au premier lancement, rien : ni compte, ni espace, ni mouvement. Tu crées ton
compte, tu ouvres un espace, tu ajoutes les autres.

## Multi-espaces

Un **espace** = un deal avec un label. Toi et tes managers gardez le **même
compte** d'un espace à l'autre ; c'est le label qui change. Une même personne
peut avoir une part différente selon l'espace.

Rien ne traverse la frontière : revenus, dépenses, journal et parts sont
rattachés à un espace, et le journal a une chaîne d'empreintes **par espace**
— falsifier l'un n'accuse pas l'autre.

## Rôles

| Rôle | Ce qu'il peut faire |
| --- | --- |
| Artiste | voit tout, conteste, demande des avances, fixe les règles |
| Manager | valide les dépenses, conteste, fixe les règles |
| Producteur | voit tout et conteste, ne valide pas |
| Label | importe les revenus, saisit les dépenses, clôture le mois |

Autant de personnes que nécessaire par rôle : deux managers et deux
producteurs se répartissent comme n'importe quelle autre combinaison.

## Ce qui tourne

- **Réglages** — parts et rôles de chacun. Refusé si le total ne fait pas 100 %,
  s'il n'y a pas d'artiste ou de label, ou si l'artiste passe sous 50 %.
- **Tableau de bord** différent selon le rôle : l'artiste voit sa part, les
  managers leur file de validation, le label l'état de son investissement.
- **Revenus** dérivés d'un relevé distributeur — jamais de saisie manuelle —
  avec les trois états d'un euro : généré, encaissé, versé.
- **Dépenses** avec justificatif, prestataire, validation au-delà du seuil,
  validation de **tous** les managers pour un prestataire lié au label,
  détection du fractionnement, et interdiction de valider sa propre saisie.
- **Royalties** réparties selon le modèle de recoupement, avec les trois
  modèles comparés côte à côte sur le mois en cours.
- **Journal** chaîné en SHA-256, une chaîne par espace. Modifier une ligne
  dans le stockage casse la chaîne, et l'app l'affiche.
- **Contrat** avec compte à rebours sur la fenêtre de résiliation et clôture
  mensuelle scellée.

## Connexion

Provisoire : on entre avec son adresse e-mail, **sans mot de passe**, le temps
de brancher l'authentification Supabase. À ne pas exposer publiquement en
l'état.

Une connexion par personne, jamais partagée : c'est ce qui permet de dire qui a
saisi quoi et qui a validé quoi. Un compte commun viderait la validation
manager de tout son sens.

## Stockage

Pour l'instant `data/store.json`, écrit par des Server Actions. Toute écriture
passe par `src/lib/store.ts`, qui n'expose aucune fonction de suppression ni de
modification : on ajoute, on annule par une nouvelle ligne. Les lectures passent
par les helpers `…Of(store, spaceId)` — le filtre par espace vit à un seul
endroit, donc il ne peut s'oublier qu'à un seul endroit.

Le schéma Supabase équivalent est prêt dans
`supabase/migrations/0001_init.sql` : mêmes règles, appliquées par la base —
`UPDATE`/`DELETE` révoqués, empreinte calculée par un trigger, contrainte des
100 %, et RLS par appartenance à l'espace.

## À faire ensuite

1. Authentification Supabase, et suppression de la connexion sans mot de passe.
2. Splits par œuvre — un featuring casse le calcul tant que les ayants droit du
   titre ne sont pas retirés en amont.
3. Avances sur royalties tracées comme une dette déduite des versements.
4. Rapprochement dû / payé avec preuve de virement.
5. Rapport mensuel PDF envoyé à tous les membres avec l'empreinte de clôture.
6. Sortie d'un membre d'un espace (aujourd'hui on ajoute, on ne retire pas).

## Voir le rendu sans ouvrir le navigateur

```bash
npm run dev                       # dans un terminal
node tools/shot.cjs home connexion
```

Les captures sortent **hors du projet** (dossier temporaire), sinon le
watcher de Next les voit apparaître et relance une compilation à chaque fois.

## Si la machine chauffe

Le serveur `next dev` peut monter à plusieurs Go après des dizaines de
recompilations. Il n'y a rien à déboguer : on le coupe et on le relance.

```powershell
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*nopact*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```
