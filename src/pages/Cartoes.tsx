import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Cartoes() {
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCartoes() {
      setLoading(true);
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('type', 'cartao');
      if (!error && data) setCartoes(data);
      setLoading(false);
    }
    fetchCartoes();
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Cartões</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : cartoes.length === 0 ? (
        <p>Nenhum cartão cadastrado.</p>
      ) : (
        cartoes.map((cartao) => (
          <Card key={cartao.id} className="mb-2">
            <CardContent className="p-4 flex justify-between items-center">
              <span>{cartao.name}</span>
              <span className="text-xs text-gray-500">Cartão</span>
            </CardContent>
          </Card>
        ))
      )}
      <Button className="mt-4">Adicionar Cartão</Button>
    </div>
  );
}
