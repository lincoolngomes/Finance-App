import { supabase } from '@/lib/supabase';

async function corrigirTiposCategorias() {
  // Busca todas as categorias
  const { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('id, nome, tipo, userid');
  if (catError) {
    console.error('Erro ao buscar categorias:', catError);
    return;
  }

  for (const categoria of categorias) {
    // Busca todos os tipos das transações dessa categoria
    const { data: transacoes, error: txError } = await supabase
      .from('transacoes')
      .select('tipo')
      .eq('category_id', categoria.id);
    if (txError) {
      console.error(`Erro ao buscar transações da categoria ${categoria.nome}:`, txError);
      continue;
    }
    const tipos = Array.from(new Set((transacoes || []).map(t => t.tipo).filter(Boolean)));
    if (tipos.length === 1 && tipos[0] !== categoria.tipo) {
      // Só existe um tipo, mas está diferente do tipo da categoria: corrige
      const { error: updError } = await supabase
        .from('categorias')
        .update({ tipo: tipos[0] })
        .eq('id', categoria.id);
      if (updError) {
        console.error(`Erro ao atualizar tipo da categoria ${categoria.nome}:`, updError);
      } else {
        console.log(`Categoria '${categoria.nome}' corrigida para tipo '${tipos[0]}'`);
      }
    } else if (tipos.length > 1) {
      // Tipos mistos: alerta
      console.warn(`Categoria '${categoria.nome}' possui tipos mistos:`, tipos);
    }
  }
  console.log('Correção concluída.');
}


// Executa sempre que rodar o script
corrigirTiposCategorias().then(() => process.exit(0));

export default corrigirTiposCategorias;
