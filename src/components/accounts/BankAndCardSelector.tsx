import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export type Account = {
  id: string;
  name: string;
  type: "banco" | "cartao";
};

export function BankSelector({ value, onValueChange, placeholder }: {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      const { data, error } = await supabase.from("accounts").select("id, name, type");
      if (!error && data) setAccounts(data);
      setLoading(false);
    }
    fetchAccounts();
  }, []);

  // Permite mostrar o valor mesmo se ainda não carregou a lista
  const selectValue = value || '';
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
              {acc.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export function CardSelector({ value, onValueChange, placeholder }: {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      setLoading(true);
      const { data, error } = await supabase.from("accounts").select("id, name, type").eq("type", "cartao");
      if (!error && data) setAccounts(data);
      setLoading(false);
    }
    fetchAccounts();
  }, []);

  // Permite mostrar o valor mesmo se ainda não carregou a lista
  const selectValue = value || '';
  return (
    <Select value={selectValue} onValueChange={onValueChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder || "Selecione o cartão"} />
      </SelectTrigger>
      <SelectContent>
        {loading ? (
          <SelectItem value="carregando" disabled>Carregando...</SelectItem>
        ) : accounts.length === 0 ? (
          <SelectItem value="nenhuma" disabled>Nenhum cartão cadastrado</SelectItem>
        ) : (
          accounts.map(acc => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
