-- Mantém a mesma taxonomia padrão para usuários atuais e novos.
create or replace function public.ensure_default_categories(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categorias (user_id, nome, tipo)
  select p_user_id, base.nome, base.tipo
  from (
    values
      ('Aluguel', 'receita'),
      ('Benefícios', 'receita'),
      ('Investimentos', 'receita'),
      ('Recompensas', 'receita'),
      ('Reembolsos', 'receita'),
      ('Renda Extra', 'receita'),
      ('Rendimentos', 'receita'),
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
      ('Combustível', 'despesa'),
      ('Compras', 'despesa'),
      ('Condomínio', 'despesa'),
      ('Casa', 'despesa'),
      ('Dívida', 'despesa'),
      ('Educação', 'despesa'),
      ('Energia', 'despesa'),
      ('Farmácia', 'despesa'),
      ('Impostos e Taxas', 'despesa'),
      ('Internet', 'despesa'),
      ('Investimento', 'despesa'),
      ('Lazer', 'despesa'),
      ('Moradia', 'despesa'),
      ('Necessidades', 'despesa'),
      ('Pagamento de Fatura', 'despesa'),
      ('Salão / Barbearia', 'despesa'),
      ('Saúde', 'despesa'),
      ('Seguros', 'despesa'),
      ('Serviços', 'despesa'),
      ('Transporte', 'despesa'),
      ('Transferência', 'despesa'),
      ('Utilidades', 'despesa'),
      ('Vestuário', 'despesa')
  ) as base(nome, tipo)
  where not exists (
    select 1
    from public.categorias c
    where c.user_id = p_user_id
      and translate(
        lower(trim(c.nome)),
        'áàâãäéèêëíìîïóòôõöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
      ) = translate(
        lower(trim(base.nome)),
        'áàâãäéèêëíìîïóòôõöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
      )
      and coalesce(lower(trim(c.tipo)), '') = lower(trim(base.tipo))
  );
end;
$$;

revoke all on function public.ensure_default_categories(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user_standard_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_default_categories(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_standard_categories on auth.users;
create trigger on_auth_user_created_standard_categories
  after insert on auth.users
  for each row execute function public.handle_new_user_standard_categories();

do $$
declare
  current_user_id uuid;
begin
  for current_user_id in select id from auth.users loop
    perform public.ensure_default_categories(current_user_id);
  end loop;
end;
$$;
