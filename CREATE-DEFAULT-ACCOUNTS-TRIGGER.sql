-- Função e trigger para criar contas padrão ao cadastrar novo usuário
create or replace function public.handle_new_user_accounts()
returns trigger as $$
begin
  -- Conta bancária principal
  insert into public.accounts (user_id, nome, tipo, icone, cor)
  values (new.id, 'Conta Bancária Principal', 'bank', 'bank', '#2563eb');

  -- Cartão de crédito principal
  insert into public.accounts (user_id, nome, tipo, icone, cor)
  values (new.id, 'Cartão de Crédito Principal', 'credit_card', 'credit_card', '#eab308');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_accounts on auth.users;

create trigger on_auth_user_created_accounts
after insert on auth.users
for each row execute procedure public.handle_new_user_accounts();