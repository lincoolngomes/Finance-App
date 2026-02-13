import React, { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AccountForm({ onAccountCreated }: { onAccountCreated?: () => void }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.from("accounts").insert({ nome: name, tipo: 'bank' });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setName("");
      onAccountCreated?.();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        className="border rounded px-2 py-1 w-full bg-background text-foreground placeholder:text-muted-foreground"
        placeholder="Nome da conta bancária"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
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
