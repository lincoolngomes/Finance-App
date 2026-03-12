create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  nome text,
  email text unique,
  avatar_url text,
  phone text,
  whatsapp text,
  telefone text,
  cpf varchar(14),
  nascimento date,
  profissao text,
  localizacao text,
  renda_mensal numeric(15, 2),
  role text default 'user',
  assinatura_id text,
  assinatura_ativa boolean default false,
  dashboard_preferences jsonb default '{}'::jsonb,
  ativo boolean default true,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    nome,
    email,
    phone,
    telefone,
    cpf,
    nascimento,
    role
  )
  values (
    new.id,
    split_part(coalesce(new.email, new.id::text), '@', 1),
    nullif(coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)), ''),
    new.email,
    nullif(new.raw_user_meta_data->>'telefone', ''),
    nullif(new.raw_user_meta_data->>'telefone', ''),
    nullif(new.raw_user_meta_data->>'cpf', ''),
    nullif(new.raw_user_meta_data->>'nascimento', '')::date,
    coalesce(new.raw_user_meta_data->>'role', 'user')
  )
  on conflict (id) do update
  set
    nome = coalesce(excluded.nome, public.profiles.nome),
    email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(excluded.phone, public.profiles.phone),
    telefone = coalesce(excluded.telefone, public.profiles.telefone),
    cpf = coalesce(excluded.cpf, public.profiles.cpf),
    nascimento = coalesce(excluded.nascimento, public.profiles.nascimento),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  name text generated always as (nome) stored,
  tipo text default 'bank',
  type text generated always as (tipo) stored,
  saldo numeric(15, 2) default 0,
  saldo_inicial numeric(15, 2) default 0,
  banco text,
  limite numeric(15, 2) default 0,
  dia_fechamento varchar(2),
  dia_vencimento varchar(2),
  cor varchar(7) default '#3b82f6',
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.accounts enable row level security;

drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own"
  on public.accounts for select
  using (auth.uid() = user_id);

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own"
  on public.accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own"
  on public.accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_delete_own"
  on public.accounts for delete
  using (auth.uid() = user_id);

create index if not exists idx_accounts_user_id on public.accounts(user_id);
create index if not exists idx_accounts_tipo on public.accounts(tipo);

drop trigger if exists update_accounts_updated_at on public.accounts;
create trigger update_accounts_updated_at
  before update on public.accounts
  for each row execute function public.update_updated_at_column();

create table if not exists public.cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  name text generated always as (nome) stored,
  bandeira text,
  limite numeric(15, 2) default 0,
  dia_fechamento integer,
  dia_vencimento integer,
  cor varchar(7) default '#3b82f6',
  banco text,
  linked_account_id uuid references public.accounts(id) on delete set null,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.cartoes enable row level security;

drop policy if exists "cartoes_select_own" on public.cartoes;
create policy "cartoes_select_own"
  on public.cartoes for select
  using (auth.uid() = user_id);

drop policy if exists "cartoes_insert_own" on public.cartoes;
create policy "cartoes_insert_own"
  on public.cartoes for insert
  with check (auth.uid() = user_id);

drop policy if exists "cartoes_update_own" on public.cartoes;
create policy "cartoes_update_own"
  on public.cartoes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cartoes_delete_own" on public.cartoes;
create policy "cartoes_delete_own"
  on public.cartoes for delete
  using (auth.uid() = user_id);

create index if not exists idx_cartoes_user_id on public.cartoes(user_id);
create index if not exists idx_cartoes_linked_account_id on public.cartoes(linked_account_id);

drop trigger if exists update_cartoes_updated_at on public.cartoes;
create trigger update_cartoes_updated_at
  before update on public.cartoes
  for each row execute function public.update_updated_at_column();

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  userid uuid generated always as (user_id) stored,
  nome text not null,
  tags text,
  tipo text,
  icone text,
  cor varchar(7) default '#3b82f6',
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.categorias enable row level security;

drop policy if exists "categorias_select_own" on public.categorias;
create policy "categorias_select_own"
  on public.categorias for select
  using (auth.uid() = user_id);

drop policy if exists "categorias_insert_own" on public.categorias;
create policy "categorias_insert_own"
  on public.categorias for insert
  with check (auth.uid() = user_id);

drop policy if exists "categorias_update_own" on public.categorias;
create policy "categorias_update_own"
  on public.categorias for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "categorias_delete_own" on public.categorias;
create policy "categorias_delete_own"
  on public.categorias for delete
  using (auth.uid() = user_id);

create index if not exists idx_categorias_user_id on public.categorias(user_id);
create index if not exists idx_categorias_tipo on public.categorias(tipo);

drop trigger if exists update_categorias_updated_at on public.categorias;
create trigger update_categorias_updated_at
  before update on public.categorias
  for each row execute function public.update_updated_at_column();

create table if not exists public.transacoes (
  id bigint generated by default as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  userid uuid generated always as (user_id) stored,
  conta_id uuid references public.accounts(id) on delete set null,
  account_id uuid generated always as (conta_id) stored,
  cartao_id uuid references public.cartoes(id) on delete set null,
  categoria_id uuid references public.categorias(id) on delete set null,
  descricao text,
  estabelecimento text generated always as (descricao) stored,
  valor numeric(15, 2) not null default 0,
  tipo text,
  data date,
  quando timestamptz generated always as (
    case
      when data is null then null
      else (data::timestamp at time zone 'UTC')
    end
  ) stored,
  pago boolean default true,
  recorrente boolean default false,
  recorrencia_tipo text,
  observacao text,
  observacoes text generated always as (observacao) stored,
  detalhes text generated always as (observacao) stored,
  categoria text,
  status text,
  parcela_atual integer,
  total_parcelas integer,
  fatura_mes integer,
  fatura_ano integer,
  fatura_id uuid,
  referencia_importacao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.transacoes enable row level security;

drop policy if exists "transacoes_select_own" on public.transacoes;
create policy "transacoes_select_own"
  on public.transacoes for select
  using (auth.uid() = user_id);

drop policy if exists "transacoes_insert_own" on public.transacoes;
create policy "transacoes_insert_own"
  on public.transacoes for insert
  with check (auth.uid() = user_id);

drop policy if exists "transacoes_update_own" on public.transacoes;
create policy "transacoes_update_own"
  on public.transacoes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "transacoes_delete_own" on public.transacoes;
create policy "transacoes_delete_own"
  on public.transacoes for delete
  using (auth.uid() = user_id);

create index if not exists idx_transacoes_user_id on public.transacoes(user_id);
create index if not exists idx_transacoes_data on public.transacoes(data);
create index if not exists idx_transacoes_categoria_id on public.transacoes(categoria_id);
create index if not exists idx_transacoes_conta_id on public.transacoes(conta_id);
create index if not exists idx_transacoes_cartao_id on public.transacoes(cartao_id);

drop trigger if exists update_transacoes_updated_at on public.transacoes;
create trigger update_transacoes_updated_at
  before update on public.transacoes
  for each row execute function public.update_updated_at_column();

create table if not exists public.lembretes (
  id bigint generated by default as identity primary key,
  userid uuid not null references auth.users(id) on delete cascade,
  titulo text,
  descricao text,
  data timestamptz,
  valor numeric(15, 2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.lembretes enable row level security;

drop policy if exists "lembretes_select_own" on public.lembretes;
create policy "lembretes_select_own"
  on public.lembretes for select
  using (auth.uid() = userid);

drop policy if exists "lembretes_insert_own" on public.lembretes;
create policy "lembretes_insert_own"
  on public.lembretes for insert
  with check (auth.uid() = userid);

drop policy if exists "lembretes_update_own" on public.lembretes;
create policy "lembretes_update_own"
  on public.lembretes for update
  using (auth.uid() = userid)
  with check (auth.uid() = userid);

drop policy if exists "lembretes_delete_own" on public.lembretes;
create policy "lembretes_delete_own"
  on public.lembretes for delete
  using (auth.uid() = userid);

drop trigger if exists update_lembretes_updated_at on public.lembretes;
create trigger update_lembretes_updated_at
  before update on public.lembretes
  for each row execute function public.update_updated_at_column();

create table if not exists public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  mes integer not null check (mes between 1 and 12),
  ano integer not null,
  valor numeric(15, 2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, categoria_id, mes, ano)
);

alter table public.orcamentos enable row level security;

drop policy if exists "orcamentos_select_own" on public.orcamentos;
create policy "orcamentos_select_own"
  on public.orcamentos for select
  using (auth.uid() = user_id);

drop policy if exists "orcamentos_insert_own" on public.orcamentos;
create policy "orcamentos_insert_own"
  on public.orcamentos for insert
  with check (auth.uid() = user_id);

drop policy if exists "orcamentos_update_own" on public.orcamentos;
create policy "orcamentos_update_own"
  on public.orcamentos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "orcamentos_delete_own" on public.orcamentos;
create policy "orcamentos_delete_own"
  on public.orcamentos for delete
  using (auth.uid() = user_id);

create index if not exists idx_orcamentos_user_id on public.orcamentos(user_id);
create index if not exists idx_orcamentos_categoria_id on public.orcamentos(categoria_id);

drop trigger if exists update_orcamentos_updated_at on public.orcamentos;
create trigger update_orcamentos_updated_at
  before update on public.orcamentos
  for each row execute function public.update_updated_at_column();

create table if not exists public.import_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  userid uuid generated always as (user_id) stored,
  account_id uuid not null references public.cartoes(id) on delete cascade,
  file_name text not null,
  file_type text not null check (file_type in ('csv', 'pdf')),
  transactions_count integer not null default 0,
  imported_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.import_history enable row level security;

drop policy if exists "import_history_select_own" on public.import_history;
create policy "import_history_select_own"
  on public.import_history for select
  using (auth.uid() = user_id);

drop policy if exists "import_history_insert_own" on public.import_history;
create policy "import_history_insert_own"
  on public.import_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "import_history_delete_own" on public.import_history;
create policy "import_history_delete_own"
  on public.import_history for delete
  using (auth.uid() = user_id);

create index if not exists idx_import_history_user_id on public.import_history(user_id);
create index if not exists idx_import_history_account_id on public.import_history(account_id);

create or replace function public.handle_new_user_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.accounts (user_id, nome, tipo, cor)
  values (new.id, 'Conta Principal', 'bank', '#2563eb')
  on conflict do nothing;

  insert into public.cartoes (user_id, nome, cor, limite, dia_fechamento, dia_vencimento)
  values (new.id, 'Cartao Principal', '#eab308', 0, 1, 10)
  on conflict do nothing;

  insert into public.categorias (user_id, nome, tipo)
  select new.id, base.nome, base.tipo
  from (
    values
      ('Salario', 'receita'),
      ('Transferencia', 'receita'),
      ('Alimentacao', 'despesa'),
      ('Moradia', 'despesa'),
      ('Transporte', 'despesa'),
      ('Saude', 'despesa'),
      ('Lazer', 'despesa'),
      ('Pagamento de Fatura', 'despesa')
  ) as base(nome, tipo)
  where not exists (
    select 1
    from public.categorias c
    where c.user_id = new.id
      and lower(trim(c.nome)) = lower(trim(base.nome))
      and coalesce(lower(trim(c.tipo)), '') = lower(trim(base.tipo))
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_defaults on auth.users;
create trigger on_auth_user_created_defaults
  after insert on auth.users
  for each row execute function public.handle_new_user_defaults();
