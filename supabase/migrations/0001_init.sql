-- NoPact — schéma multi-espaces.
-- Deux règles portent tout le fichier :
--   1. rien ne traverse la frontière d'un espace ;
--   2. l'historique ne se réécrit pas, y compris par qui possède la base.

create extension if not exists pgcrypto;

create type space_role     as enum ('artiste', 'manager', 'producteur', 'label');
create type revenue_status as enum ('genere', 'encaisse', 'verse');
create type expense_status as enum ('en_attente', 'validee', 'contestee');
create type ledger_type    as enum (
  'revenu', 'depense', 'validation', 'justificatif',
  'contestation', 'cloture', 'avance', 'reglages', 'membre'
);

-- ---------------------------------------------------------------------------
-- Espaces et appartenances
-- ---------------------------------------------------------------------------

create table spaces (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  configured                  boolean not null default false,
  project_name                text not null default '',
  contract_start              date,
  contract_end                date,
  exit_window_days            int not null default 90,
  investment                  numeric(12, 2) not null default 0,
  recoup_model                text not null default 'plancher'
                                check (recoup_model in ('brut', 'part_label', 'plancher')),
  floor_pct                   numeric(5, 2) not null default 20,
  validation_threshold        numeric(12, 2) not null default 500,
  monthly_category_threshold  numeric(12, 2) not null default 1000,
  created_by                  uuid not null references auth.users (id),
  created_at                  timestamptz not null default now()
);

create table memberships (
  id        uuid primary key default gen_random_uuid(),
  space_id  uuid not null references spaces (id) on delete cascade,
  user_id   uuid not null references auth.users (id),
  role      space_role not null,
  share     numeric(5, 2) not null default 0 check (share >= 0 and share <= 100),
  joined_at timestamptz not null default now(),
  -- Une seule appartenance par personne et par espace.
  unique (space_id, user_id)
);

create index on memberships (user_id);

/* Les parts d'un espace font 100 % et l'artiste ne descend pas sous 50 %.
   Vérifié en base : l'interface n'est pas le seul rempart. */
create or replace function check_shares(target uuid) returns void
language plpgsql as $$
declare
  total numeric;
  artists numeric;
begin
  select coalesce(sum(share), 0) into total
    from memberships where space_id = target;
  select coalesce(sum(share), 0) into artists
    from memberships where space_id = target and role = 'artiste';

  if not exists (select 1 from spaces where id = target and configured) then
    return; -- espace encore en cours d'ouverture
  end if;
  if abs(total - 100) > 0.01 then
    raise exception 'Les parts de l''espace font %, elles doivent faire 100.', total;
  end if;
  if artists < 50 then
    raise exception 'L''artiste tombe à % : il ne descend jamais sous 50.', artists;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Données, toutes rattachées à un espace
-- ---------------------------------------------------------------------------

create table vendors (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references spaces (id) on delete cascade,
  name          text not null,
  siren         text,
  -- Société liée au label : validation de tous les managers, quel que soit le montant.
  related_party boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (space_id, name)
);

create table works (
  id       uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces (id) on delete cascade,
  title    text not null,
  -- Splits des ayants droit du titre, retirés AVANT le partage de l'espace.
  splits   jsonb not null default '[]'::jsonb
);

create table revenues (
  id          uuid primary key default gen_random_uuid(),
  space_id    uuid not null references spaces (id) on delete cascade,
  source      text not null,
  period      text not null check (period ~ '^\d{4}-\d{2}$'),
  cashed_at   date,
  gross       numeric(12, 2) not null,
  fees        numeric(12, 2) not null default 0,
  currency    text not null default 'EUR',
  fx_rate     numeric(12, 6) not null default 1,
  status      revenue_status not null default 'genere',
  work_id     uuid references works (id),
  -- Obligatoire : aucune ligne de revenu ne se saisit à la main.
  source_file text not null,
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  disputed    boolean not null default false
);

create table expenses (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references spaces (id) on delete cascade,
  label      text not null,
  category   text not null,
  amount     numeric(12, 2) not null check (amount > 0),
  date       date not null,
  vendor_id  uuid not null references vendors (id),
  receipt    text,
  comment    text default '',
  status     expense_status not null default 'en_attente',
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  disputed   boolean not null default false
);

create table validations (
  id         uuid primary key default gen_random_uuid(),
  space_id   uuid not null references spaces (id) on delete cascade,
  expense_id uuid not null references expenses (id),
  by_user    uuid not null references auth.users (id),
  comment    text default '',
  created_at timestamptz not null default now(),
  -- Personne ne valide deux fois la même ligne.
  unique (expense_id, by_user)
);

create table sealed_months (
  space_id  uuid not null references spaces (id) on delete cascade,
  period    text not null,
  sealed_at timestamptz not null default now(),
  hash      text not null,
  primary key (space_id, period)
);

-- ---------------------------------------------------------------------------
-- Journal : une chaîne par espace
-- ---------------------------------------------------------------------------

create table ledger (
  id        bigserial primary key,
  space_id  uuid not null references spaces (id) on delete cascade,
  seq       bigint not null,
  at        timestamptz not null default now(),
  actor     uuid not null references auth.users (id),
  type      ledger_type not null,
  text      text not null,
  ref       text,
  prev_hash text not null,
  hash      text not null,
  unique (space_id, seq)
);

-- Rang et empreinte sont calculés par la base, jamais fournis par le client.
create or replace function ledger_seal() returns trigger
language plpgsql as $$
declare
  prev ledger%rowtype;
begin
  select * into prev from ledger
    where space_id = new.space_id order by seq desc limit 1;

  new.seq := coalesce(prev.seq, 0) + 1;
  new.prev_hash := coalesce(prev.hash, repeat('0', 64));
  new.hash := encode(digest(
    new.space_id || '|' || new.seq || '|' || new.at || '|' || new.actor
      || '|' || new.type || '|' || new.text || '|' || coalesce(new.ref, '')
      || '|' || new.prev_hash, 'sha256'), 'hex');
  return new;
end;
$$;

create trigger ledger_seal_trg before insert on ledger
  for each row execute function ledger_seal();

/* Vérifie la chaîne d'un espace. Renvoie le premier rang altéré, sinon null. */
create or replace function ledger_verify(target uuid) returns bigint
language plpgsql as $$
declare
  e ledger%rowtype;
  prev text := repeat('0', 64);
  expected text;
begin
  for e in select * from ledger where space_id = target order by seq loop
    expected := encode(digest(
      e.space_id || '|' || e.seq || '|' || e.at || '|' || e.actor
        || '|' || e.type || '|' || e.text || '|' || coalesce(e.ref, '')
        || '|' || prev, 'sha256'), 'hex');
    if e.prev_hash <> prev or e.hash <> expected then
      return e.seq;
    end if;
    prev := e.hash;
  end loop;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Immutabilité : les droits d'écriture n'existent pas
-- ---------------------------------------------------------------------------

revoke update, delete on revenues, expenses, validations, ledger, sealed_months
  from authenticated, anon;

-- Un mois scellé se fige. La correction passe par une ligne d'ajustement.
create or replace function block_sealed() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from sealed_months
     where space_id = new.space_id
       and period = to_char(coalesce(new.cashed_at, current_date), 'YYYY-MM')
  ) then
    raise exception 'Mois scellé : ajoute une ligne d''ajustement dans le mois courant.';
  end if;
  return new;
end;
$$;

create trigger revenues_sealed_trg before insert on revenues
  for each row execute function block_sealed();

-- ---------------------------------------------------------------------------
-- RLS — la frontière de l'espace est appliquée par la base
-- ---------------------------------------------------------------------------

alter table spaces        enable row level security;
alter table memberships   enable row level security;
alter table vendors       enable row level security;
alter table works         enable row level security;
alter table revenues      enable row level security;
alter table expenses      enable row level security;
alter table validations   enable row level security;
alter table ledger        enable row level security;
alter table sealed_months enable row level security;

/* Appartenance : la seule question que posent toutes les politiques. */
create or replace function is_member(target uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships
     where space_id = target and user_id = auth.uid()
  );
$$;

create or replace function my_role(target uuid) returns space_role
language sql stable security definer set search_path = public as $$
  select role from memberships
   where space_id = target and user_id = auth.uid();
$$;

-- Lecture : transparence totale, mais uniquement dans ses propres espaces.
create policy read_own on spaces        for select using (is_member(id));
create policy read_own on memberships   for select using (is_member(space_id));
create policy read_own on vendors       for select using (is_member(space_id));
create policy read_own on works         for select using (is_member(space_id));
create policy read_own on revenues      for select using (is_member(space_id));
create policy read_own on expenses      for select using (is_member(space_id));
create policy read_own on validations   for select using (is_member(space_id));
create policy read_own on ledger        for select using (is_member(space_id));
create policy read_own on sealed_months for select using (is_member(space_id));

-- Le label saisit, dans son espace et nulle part ailleurs.
create policy label_inserts on revenues for insert
  with check (my_role(space_id) = 'label' and created_by = auth.uid());
create policy label_inserts on expenses for insert
  with check (my_role(space_id) = 'label' and created_by = auth.uid());
create policy label_seals on sealed_months for insert
  with check (my_role(space_id) = 'label');
create policy label_vendors on vendors for insert
  with check (my_role(space_id) = 'label');

-- Les managers valident, jamais leur propre saisie.
create policy managers_validate on validations for insert
  with check (
    my_role(space_id) = 'manager'
    and by_user = auth.uid()
    and exists (
      select 1 from expenses e
       where e.id = expense_id
         and e.space_id = validations.space_id
         and e.created_by <> auth.uid()
    )
  );

-- Tout membre écrit dans le journal de son espace, personne n'y revient.
create policy anyone_appends on ledger for insert
  with check (is_member(space_id) and actor = auth.uid());

-- N'importe qui crée son espace ; on n'y entre ensuite que par invitation.
create policy create_space on spaces for insert
  with check (created_by = auth.uid());
create policy manage_members on memberships for insert
  with check (
    -- premier membre : le créateur de l'espace se rattache lui-même
    (user_id = auth.uid()
      and exists (select 1 from spaces s
                   where s.id = space_id and s.created_by = auth.uid()))
    -- ensuite, artiste et managers invitent
    or my_role(space_id) in ('artiste', 'manager')
  );
