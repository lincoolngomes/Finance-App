import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/utils/currency";
import { Account } from "./AccountsList";

interface AccountWithBalance extends Account {
  saldo: number;
}

export default function AccountsWithBalanceList() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccountsAndBalances() {
      setLoading(true);
      // Busca contas
      const { data: accountsData, error: accError } = await supabase.from("accounts").select("id, name, type");
      if (accError || !accountsData) {
        setAccounts([]);
        setLoading(false);
        return;
      }
      // Busca saldos por conta
      const { data: transData, error: transError } = await supabase.from("transacoes").select("account_id, tipo, valor");
      if (transError || !transData) {
        setAccounts(accountsData.map(acc => ({ ...acc, saldo: 0 })));
        setLoading(false);
        return;
      }
      // Calcula saldo por conta
      const saldoPorConta: Record<string, number> = {};
      for (const t of transData) {
        if (!t.account_id || typeof t.valor !== 'number') continue;
        if (!saldoPorConta[t.account_id]) saldoPorConta[t.account_id] = 0;
        saldoPorConta[t.account_id] += t.tipo === 'receita' ? t.valor : -t.valor;
      }
      const contasComSaldo = accountsData.map(acc => ({
        ...acc,
        saldo: saldoPorConta[acc.id] || 0
      }));
      // Log de depuração
      // eslint-disable-next-line no-console
      console.log('[DEBUG AccountsWithBalanceList] contas carregadas:', contasComSaldo.map(acc => ({ id: acc.id, name: acc.name })));
      setAccounts(contasComSaldo);
      setLoading(false);
    }
    fetchAccountsAndBalances();
  }, []);

  if (loading) return <div>Carregando contas...</div>;
  if (!accounts.length) return <div>Nenhuma conta cadastrada.</div>;

  return (
    <div className="space-y-2 mt-6">
      {accounts.map((acc) => (
        <div
          key={acc.id}
          className={`flex items-center justify-between rounded-lg px-4 py-3 shadow-sm border border-slate-800 bg-gradient-to-r ${acc.type === 'banco' ? 'from-blue-900/60 to-blue-800/40' : 'from-purple-900/60 to-purple-800/40'} transition hover:scale-[1.02] hover:shadow-lg`}
        >
          <div className="flex flex-col">
            <span className="font-semibold text-lg text-white">{acc.name}</span>
            <span className="text-xs text-slate-300">{acc.type === 'banco' ? 'Conta bancária' : 'Cartão de crédito'}</span>
          </div>
          <span className={`font-bold text-lg ${acc.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(acc.saldo)}</span>
        </div>
      ))}
    </div>
  );
}
