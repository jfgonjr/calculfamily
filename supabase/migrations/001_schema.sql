-- =====================================================================
-- Calculadora Familioa - Fase 1: Schema, RLS e Realtime
-- Execute no Supabase: SQL Editor > New query > Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------
create table if not exists public.families (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  monthly_budget numeric(12,2) not null default 0 check (monthly_budget >= 0), -- limite mensal (alerta de orçamento)
  created_at     timestamptz not null default now()
);

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  family_id  uuid not null references public.families(id) on delete cascade,
  full_name  text not null,
  color      text not null default '#6366f1',  -- cor de identificação (hex)
  avatar_url text,
  role       text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now()
);
create index if not exists profiles_family_idx on public.profiles(family_id);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  name       text not null,
  type       text not null check (type in ('income','expense')),
  icon       text not null default 'tag',      -- nome do ícone lucide-react
  color      text not null default '#94a3b8',
  created_at timestamptz not null default now(),
  unique (family_id, name, type)
);
create index if not exists categories_family_idx on public.categories(family_id);

create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references public.families(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete restrict, -- quem pagou / recebeu
  category_id uuid references public.categories(id) on delete set null,
  title       text not null,
  amount      numeric(12,2) not null check (amount > 0),
  type        text not null check (type in ('income','expense')),
  date        date not null default current_date,
  status      text not null default 'paid' check (status in ('paid','pending')),
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists transactions_family_date_idx on public.transactions(family_id, date desc);
create index if not exists transactions_user_idx        on public.transactions(user_id);
create index if not exists transactions_category_idx    on public.transactions(category_id);

-- ---------------------------------------------------------------------
-- FUNÇÕES AUXILIARES (security definer evita recursão nas políticas RLS)
-- ---------------------------------------------------------------------
create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_family_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Garante que o membro/categoria referenciados pertencem à mesma família da transação
create or replace function public.check_transaction_family()
returns trigger
language plpgsql
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.user_id and p.family_id = new.family_id) then
    raise exception 'Membro não pertence à família da transação';
  end if;
  if new.category_id is not null and not exists (
    select 1 from public.categories c where c.id = new.category_id and c.family_id = new.family_id
  ) then
    raise exception 'Categoria não pertence à família da transação';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_transaction_family on public.transactions;
create trigger trg_check_transaction_family
  before insert or update on public.transactions
  for each row execute function public.check_transaction_family();

-- Cria o perfil automaticamente quando um usuário é criado com metadata
-- { "family_id": "...", "full_name": "...", "color": "#hex" }
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data ? 'family_id' then
    insert into public.profiles (id, family_id, full_name, color)
    values (
      new.id,
      (new.raw_user_meta_data->>'family_id')::uuid,
      coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
      coalesce(new.raw_user_meta_data->>'color', '#6366f1')
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.families     enable row level security;
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

-- families
drop policy if exists "families_select_own" on public.families;
create policy "families_select_own" on public.families
  for select to authenticated
  using (id = public.current_family_id());

drop policy if exists "families_update_admin" on public.families;
create policy "families_update_admin" on public.families
  for update to authenticated
  using (id = public.current_family_id() and public.is_family_admin())
  with check (id = public.current_family_id());

-- profiles
drop policy if exists "profiles_select_family" on public.profiles;
create policy "profiles_select_family" on public.profiles
  for select to authenticated
  using (family_id = public.current_family_id());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and family_id = public.current_family_id());  -- não pode trocar de família

-- categories
drop policy if exists "categories_select_family" on public.categories;
create policy "categories_select_family" on public.categories
  for select to authenticated using (family_id = public.current_family_id());

drop policy if exists "categories_insert_family" on public.categories;
create policy "categories_insert_family" on public.categories
  for insert to authenticated with check (family_id = public.current_family_id());

drop policy if exists "categories_update_family" on public.categories;
create policy "categories_update_family" on public.categories
  for update to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

drop policy if exists "categories_delete_family" on public.categories;
create policy "categories_delete_family" on public.categories
  for delete to authenticated using (family_id = public.current_family_id());

-- transactions
drop policy if exists "transactions_select_family" on public.transactions;
create policy "transactions_select_family" on public.transactions
  for select to authenticated using (family_id = public.current_family_id());

drop policy if exists "transactions_insert_family" on public.transactions;
create policy "transactions_insert_family" on public.transactions
  for insert to authenticated with check (family_id = public.current_family_id());

drop policy if exists "transactions_update_family" on public.transactions;
create policy "transactions_update_family" on public.transactions
  for update to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

drop policy if exists "transactions_delete_family" on public.transactions;
create policy "transactions_delete_family" on public.transactions
  for delete to authenticated using (family_id = public.current_family_id());

-- ---------------------------------------------------------------------
-- REALTIME (atualização instantânea entre os celulares)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;
