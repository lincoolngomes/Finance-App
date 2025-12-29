import { supabase } from '@/lib/supabase';

async function diagnosticoCategoriasResgate() {
  // Busca todas as categorias que contenham "Resgate" no nome
  const { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('id, nome, tipo, userid')
    .ilike('nome', '%Resgate%');
  if (catError) {
    console.error('Erro ao buscar categorias:', catError);
    return;
  }
  if (!categorias || categorias.length === 0) {
    console.log('Nenhuma categoria com "Resgate" encontrada.');
    return;
  }
  console.log('Categorias encontradas:', categorias);

  // Busca todas as transações vinculadas a essas categorias
  for (const categoria of categorias) {
    const { data: transacoes, error: txError } = await supabase
      .from('transacoes')
      .select('id, tipo, category_id')
      .eq('category_id', categoria.id);
    if (txError) {
      console.error(`Erro ao buscar transações da categoria ${categoria.id}:`, txError);
      continue;
    }
    const receitas = transacoes.filter(t => t.tipo === 'receita');
    const despesas = transacoes.filter(t => t.tipo === 'despesa');
    console.log(`Categoria ${categoria.id} (${categoria.nome}, ${categoria.tipo}): receitas=${receitas.length}, despesas=${despesas.length}`);
  }
}

diagnosticoCategoriasResgate().then(() => process.exit(0));

export default diagnosticoCategoriasResgate;
