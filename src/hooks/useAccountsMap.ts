import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useAccountsMap() {
  const [accountsMap, setAccountsMap] = useState<Record<string, { name: string; type: string }> | null>(null);

  useEffect(() => {
    async function fetchAccounts() {
      const { data, error } = await supabase.from('accounts').select('id, name, type');
      if (!error && data) {
        const map: Record<string, { name: string; type: string }> = {};
        for (const acc of data) {
          map[acc.id] = { name: acc.name, type: acc.type };
        }
        setAccountsMap(map);
      }
    }
    fetchAccounts();
  }, []);

  return accountsMap;
}
