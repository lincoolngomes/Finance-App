// DEBUG: Hook para logar contas e valor selecionado
import { useEffect } from 'react';

export function useDebugAccountSelector(accounts, value) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[DEBUG AccountSelector] contas:', accounts, 'valor:', value);
  }, [accounts, value]);
}
