import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AccountForm({ onAccountCreated }: { onAccountCreated?: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"banco" | "cartao">("banco");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.from("accounts").insert({ name, type });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setName("");
      setType("banco");
      onAccountCreated?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        className="border rounded px-2 py-1 w-full bg-background text-foreground placeholder:text-muted-foreground"
        placeholder="Nome da conta ou cartão"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      <select
        className="border rounded px-2 py-1 w-full bg-background text-foreground"
        value={type}
        onChange={e => setType(e.target.value as any)}
      >
        <option value="banco">Conta bancária</option>
        <option value="cartao">Cartão de crédito</option>
      </select>
      <button
        type="submit"
        className="bg-blue-600 text-white rounded px-4 py-1 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? "Salvando..." : "Adicionar conta"}
      </button>
      {error && <div className="text-red-500 text-sm">{error}</div>}
    </form>
  );
}
