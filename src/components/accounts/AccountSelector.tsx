import React, { useEffect, useState } from "react";
import { useDebugAccountSelector } from "./useDebugAccountSelector";
import { supabase } from "@/lib/supabase";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export type Account = {
  id: string;
  name: string;
  type: "banco" | "cartao";
};

export default function AccountSelector({ value, onValueChange, placeholder }: {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useDebugAccountSelector(accounts, value);

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      const { data, error } = await supabase.from("accounts").select("id, name, type");
      if (!error && data) setAccounts(data);
      setLoading(false);
    }
    fetchAccounts();
  }, []);

  // Removido: não limpar valor automaticamente. O select só mostra o placeholder se o valor não existir na lista.

  // Só mostra o valor se ele existir na lista, senão mostra o placeholder, mas nunca altera o formData
  const selectValue = value && accounts.find(acc => acc.id === value) ? value : '';
  return (
    <Select value={selectValue} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder || "Selecione a conta"} />
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <SelectItem value="carregando" disabled>Carregando...</SelectItem>
        ) : accounts.length === 0 ? (
          <SelectItem value="nenhuma" disabled>Nenhuma conta cadastrada</SelectItem>
        ) : (
          accounts.map(acc => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.name} <span className="text-xs text-gray-500">({acc.type})</span>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
