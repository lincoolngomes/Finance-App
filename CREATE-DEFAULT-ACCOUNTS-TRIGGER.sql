-- Função e trigger para criar contas padrão ao cadastrar novo usuário
create or replace function public.handle_new_user_accounts()
returns trigger as $$
begin
  -- Conta bancária principal (na tabela accounts)
  insert into public.accounts (user_id, nome, tipo, cor)
  values (new.id, 'Conta Principal', 'bank', '#2563eb');

  -- Cartão de crédito principal (na tabela cartoes - separada de accounts)
  insert into public.cartoes (user_id, nome, cor, limite, dia_fechamento, dia_vencimento)
  values (new.id, 'Cartão de Crédito Principal', '#eab308', 0, '1', '10');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_accounts on auth.users;

create trigger on_auth_user_created_accounts
after insert on auth.users
for each row execute procedure public.handle_new_user_accounts();