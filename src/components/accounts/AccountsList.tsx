import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export type Account = {
  id: string;
  name: string;
  type: "banco" | "cartao";
};

export default function AccountsList() {
  // Log imediato para garantir montagem
  // eslint-disable-next-line no-console
  console.log('[DEBUG AccountsList] componente montado!');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      const { data, error } = await supabase.from("accounts").select("id, name, type");
      // Log para depuração (mesmo se vazio ou erro)
      // eslint-disable-next-line no-console
      console.log('[DEBUG AccountsList] contas carregadas:', data);
      if (!error && data) {
        setAccounts(data);
      }
      setLoading(false);
    }
    fetchAccounts();
  }, []);

  if (loading) return <div>Carregando contas...</div>;
  if (!accounts.length) return <div>Nenhuma conta cadastrada.</div>;

  return (
    <div className="space-y-2">
      {accounts.map((acc) => (
        <div key={acc.id} className="border rounded p-2 flex items-center justify-between">
          <span>{acc.name} <span className="text-xs text-gray-500">({acc.type})</span></span>
          {/* Botões de editar/remover podem ser adicionados aqui */}
        </div>
      ))}
    </div>
  );
}
