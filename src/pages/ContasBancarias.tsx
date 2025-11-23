import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Contas() {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContas() {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('type', 'banco');
      if (!error && data) setContas(data);
      setLoading(false);
    }
    fetchContas();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Contas Bancárias</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : contas.length === 0 ? (
        <p>Nenhuma conta cadastrada.</p>
      ) : (
        contas.map((conta) => (
          <Card key={conta.id} className="mb-2">
            <CardContent className="p-4 flex justify-between items-center">
              <span>{conta.name}</span>
              <span className="text-xs text-gray-500">Banco</span>
            </CardContent>
          </Card>
        ))
      )}
      <Button className="mt-4">Adicionar Conta</Button>
    </div>
  );
}
