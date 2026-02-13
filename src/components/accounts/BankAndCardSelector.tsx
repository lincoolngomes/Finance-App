import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAccounts() {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq('user_id', user.id);
      if (!error && data) {
        // Filtrar apenas contas (tipo 'bank')
        const normaliza = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        const filtered = data.filter((acc: any) => {
          const tipo = (acc.type || acc.tipo || '').toLowerCase();
          return tipo === 'bank' || tipo === 'conta' || !tipo;
        });
        // Mapear para o tipo Account
        const mapped = filtered.map((acc: any) => ({
          id: acc.id,
          name: acc.nome || acc.name,
          type: 'banco'
        }));
        setAccounts(mapped);
      }
      setLoading(false);
    }
    fetchAccounts();
  }, [user?.id]);

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
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCartoes() {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("cartoes")
        .select("*")
        .eq('user_id', user.id);
      if (!error && data) {
        const mapped = data.map((cartao: any) => ({
          id: cartao.id,
          name: cartao.nome,
          type: 'cartao' as const
        }));
        setAccounts(mapped);
      }
      setLoading(false);
    }
    fetchCartoes();
  }, [user?.id]);

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
