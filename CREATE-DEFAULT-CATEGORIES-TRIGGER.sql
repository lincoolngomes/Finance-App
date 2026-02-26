-- =====================================================
-- CRIAR CATEGORIAS PADRAO AUTOMATICAMENTE NO CADASTRO
-- =====================================================
-- Execute este SQL no Supabase SQL Editor
-- Ele cria:
-- 1) Função para inserir categorias padrão por usuário
-- 2) Trigger em auth.users para rodar automaticamente
--
-- OBS:
-- - Evita inserir duplicadas (comparação por nome + tipo)
-- - Compatível com schema que usa user_id OU userid
-- =====================================================

create or replace function public.ensure_default_categories_for_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  has_user_id boolean;
  has_userid boolean;
  has_tipo boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categorias'
      and column_name = 'user_id'
  ) into has_user_id;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categorias'
      and column_name = 'userid'
  ) into has_userid;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'categorias'
      and column_name = 'tipo'
  ) into has_tipo;

  if not has_user_id and not has_userid then
    raise exception 'Tabela public.categorias sem coluna user_id/userid.';
  end if;

  if has_tipo then
    if has_user_id then
      insert into public.categorias (user_id, nome, tipo)
      select
        p_user_id,
        base.nome,
        base.tipo
      from (
        values
          ('Aluguel', 'receita'),
          ('Investimentos', 'receita'),
          ('Recompensas', 'receita'),
          ('Renda Extra', 'receita'),
          ('Salário', 'receita'),
          ('Transferência', 'receita'),
          ('Vendas', 'receita'),
          ('Academia', 'despesa'),
          ('Água', 'despesa'),
          ('Alimentação', 'despesa'),
          ('Aluguel', 'despesa'),
          ('Assinaturas', 'despesa'),
          ('Carro', 'despesa'),
          ('Celular', 'despesa'),
          ('Compras', 'despesa'),
          ('Condomínio', 'despesa'),
          ('Casa', 'despesa'),
          ('Dívida', 'despesa'),
          ('Educação', 'despesa'),
          ('Energia', 'despesa'),
          ('Farmácia', 'despesa'),
          ('Internet', 'despesa'),
          ('Investimento', 'despesa'),
          ('Lazer', 'despesa'),
          ('Necessidades', 'despesa'),
          ('Salão / Barbearia', 'despesa'),
          ('Saúde', 'despesa'),
          ('Transporte', 'despesa'),
          ('Transferência', 'despesa')
      ) as base(nome, tipo)
      where not exists (
        select 1
        from public.categorias c
        where c.user_id = p_user_id
          and lower(trim(c.nome)) = lower(trim(base.nome))
          and lower(trim(coalesce(c.tipo, ''))) = lower(trim(base.tipo))
      );
    elsif has_userid then
      insert into public.categorias (userid, nome, tipo)
      select
        p_user_id,
        base.nome,
        base.tipo
      from (
        values
          ('Aluguel', 'receita'),
          ('Investimentos', 'receita'),
          ('Recompensas', 'receita'),
          ('Renda Extra', 'receita'),
          ('Salário', 'receita'),
          ('Transferência', 'receita'),
          ('Vendas', 'receita'),
          ('Academia', 'despesa'),
          ('Água', 'despesa'),
          ('Alimentação', 'despesa'),
          ('Aluguel', 'despesa'),
          ('Assinaturas', 'despesa'),
          ('Carro', 'despesa'),
          ('Celular', 'despesa'),
          ('Compras', 'despesa'),
          ('Condomínio', 'despesa'),
          ('Casa', 'despesa'),
          ('Dívida', 'despesa'),
          ('Educação', 'despesa'),
          ('Energia', 'despesa'),
          ('Farmácia', 'despesa'),
          ('Internet', 'despesa'),
          ('Investimento', 'despesa'),
          ('Lazer', 'despesa'),
          ('Necessidades', 'despesa'),
          ('Salão / Barbearia', 'despesa'),
          ('Saúde', 'despesa'),
          ('Transporte', 'despesa'),
          ('Transferência', 'despesa')
      ) as base(nome, tipo)
      where not exists (
        select 1
        from public.categorias c
        where c.userid = p_user_id
          and lower(trim(c.nome)) = lower(trim(base.nome))
          and lower(trim(coalesce(c.tipo, ''))) = lower(trim(base.tipo))
      );
    end if;
  else
    if has_user_id then
      insert into public.categorias (user_id, nome)
      select
        p_user_id,
        base.nome
      from (
        select distinct nome
        from (
          values
            ('Aluguel', 'receita'),
            ('Investimentos', 'receita'),
            ('Recompensas', 'receita'),
            ('Renda Extra', 'receita'),
            ('Salário', 'receita'),
            ('Transferência', 'receita'),
            ('Vendas', 'receita'),
            ('Academia', 'despesa'),
            ('Água', 'despesa'),
            ('Alimentação', 'despesa'),
            ('Aluguel', 'despesa'),
            ('Assinaturas', 'despesa'),
            ('Carro', 'despesa'),
            ('Celular', 'despesa'),
            ('Compras', 'despesa'),
            ('Condomínio', 'despesa'),
            ('Casa', 'despesa'),
            ('Dívida', 'despesa'),
            ('Educação', 'despesa'),
            ('Energia', 'despesa'),
            ('Farmácia', 'despesa'),
            ('Internet', 'despesa'),
            ('Investimento', 'despesa'),
            ('Lazer', 'despesa'),
            ('Necessidades', 'despesa'),
            ('Salão / Barbearia', 'despesa'),
            ('Saúde', 'despesa'),
            ('Transporte', 'despesa'),
            ('Transferência', 'despesa')
        ) as raw(nome, tipo)
      ) as base
      where not exists (
        select 1
        from public.categorias c
        where c.user_id = p_user_id
          and lower(trim(c.nome)) = lower(trim(base.nome))
      );
    elsif has_userid then
      insert into public.categorias (userid, nome)
      select
        p_user_id,
        base.nome
      from (
        select distinct nome
        from (
          values
            ('Aluguel', 'receita'),
            ('Investimentos', 'receita'),
            ('Recompensas', 'receita'),
            ('Renda Extra', 'receita'),
            ('Salário', 'receita'),
            ('Transferência', 'receita'),
            ('Vendas', 'receita'),
            ('Academia', 'despesa'),
            ('Água', 'despesa'),
            ('Alimentação', 'despesa'),
            ('Aluguel', 'despesa'),
            ('Assinaturas', 'despesa'),
            ('Carro', 'despesa'),
            ('Celular', 'despesa'),
            ('Compras', 'despesa'),
            ('Condomínio', 'despesa'),
            ('Casa', 'despesa'),
            ('Dívida', 'despesa'),
            ('Educação', 'despesa'),
            ('Energia', 'despesa'),
            ('Farmácia', 'despesa'),
            ('Internet', 'despesa'),
            ('Investimento', 'despesa'),
            ('Lazer', 'despesa'),
            ('Necessidades', 'despesa'),
            ('Salão / Barbearia', 'despesa'),
            ('Saúde', 'despesa'),
            ('Transporte', 'despesa'),
            ('Transferência', 'despesa')
        ) as raw(nome, tipo)
      ) as base
      where not exists (
        select 1
        from public.categorias c
        where c.userid = p_user_id
          and lower(trim(c.nome)) = lower(trim(base.nome))
      );
    end if;
  end if;
end;
$$;

create or replace function public.handle_new_user_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_default_categories_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_categories on auth.users;

create trigger on_auth_user_created_categories
after insert on auth.users
for each row execute function public.handle_new_user_categories();

-- Backfill opcional para usuários já existentes:
-- do $$
-- declare u record;
-- begin
--   for u in select id from auth.users loop
--     perform public.ensure_default_categories_for_user(u.id);
--   end loop;
-- end $$;
