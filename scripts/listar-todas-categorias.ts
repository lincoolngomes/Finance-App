import { supabase } from '@/lib/supabase';

async function listarTodasCategorias() {
  // Busca todas as categorias do banco
  const { data: categorias, error: catError } = await supabase
    .from('categorias')
    .select('id, nome, tipo, userid');
  if (catError) {
    console.error('Erro ao buscar categorias:', catError);
    return;
  }
  if (!categorias || categorias.length === 0) {
    console.log('Nenhuma categoria encontrada.');
    return;
  }
  console.log('Categorias encontradas:');
  categorias.forEach(cat => {
    console.log(`ID: ${cat.id} | Nome: ${cat.nome} | Tipo: ${cat.tipo}`);
  });
}

listarTodasCategorias().then(() => process.exit(0));

export default listarTodasCategorias;
