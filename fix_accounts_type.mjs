// Script para corrigir todas as contas existentes para type: 'bank' via Supabase
// Basta rodar: node fix_accounts_type.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://<SUA-URL>.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '<SUA-CHAVE-ADMIN>';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixAllAccountsType() {
  const { data: accounts, error } = await supabase.from('accounts').select('id, type');
  if (error) {
    console.error('Erro ao buscar contas:', error);
    process.exit(1);
  }
  for (const acc of accounts) {
    if (acc.type !== 'bank') {
      const { error: updateError } = await supabase.from('accounts').update({ type: 'bank' }).eq('id', acc.id);
      if (updateError) {
        console.error(`Erro ao atualizar conta ${acc.id}:`, updateError);
      } else {
        console.log(`Conta ${acc.id} corrigida para type 'bank'`);
      }
    }
  }
  console.log('Correção concluída.');
}

fixAllAccountsType();
