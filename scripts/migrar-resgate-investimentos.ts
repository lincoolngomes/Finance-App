import { supabase } from '@/lib/supabase';

async function migrarResgateInvestimentos() {
  // Busca todas as categorias com nome "Resgate Investimentos"
  const { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('id, nome, tipo, userid')
    .ilike('nome', 'Resgate Investimentos');
  if (catError) {
    console.error('Erro ao buscar categorias:', catError);
    return;
  }
  if (!categorias || categorias.length === 0) {
    console.log('Nenhuma categoria "Resgate Investimentos" encontrada.');
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
    console.log(`Categoria ${categoria.id} (${categoria.tipo}): receitas=${receitas.length}, despesas=${despesas.length}`);
  }

  // Migração: para cada transação do tipo receita vinculada à categoria tipo despesa,
  // mover para a categoria correta (tipo receita)
  const categoriaReceita = categorias.find(c => c.tipo === 'receita');
  const categoriaDespesa = categorias.find(c => c.tipo === 'despesa');
  if (!categoriaReceita || !categoriaDespesa) {
    console.log('Não há ambas as categorias (receita e despesa) para migrar.');
    return;
  }
  // Busca transações receita na categoria despesa
  const { data: transacoesMigrar, error: txMigError } = await supabase
    .from('transacoes')
    .select('id, tipo, category_id')
    .eq('category_id', categoriaDespesa.id)
    .eq('tipo', 'receita');
  if (txMigError) {
    console.error('Erro ao buscar transações para migrar:', txMigError);
    return;
  }
  if (!transacoesMigrar || transacoesMigrar.length === 0) {
    console.log('Nenhuma transação receita para migrar.');
    return;
  }
  // Atualiza as transações para apontar para a categoria correta
  const idsMigrar = transacoesMigrar.map(t => t.id);
  const { error: updError } = await supabase
    .from('transacoes')
    .update({ category_id: categoriaReceita.id })
    .in('id', idsMigrar);
  if (updError) {
    console.error('Erro ao migrar transações:', updError);
  } else {
    console.log(`Migradas ${idsMigrar.length} transações receita para a categoria correta.`);
  }
}

migrarResgateInvestimentos().then(() => process.exit(0));

export default migrarResgateInvestimentos;
