
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatarValorBR, parseValorBR } from '@/utils/currency';

// Importa o modal de extrato já padronizado de Contas.tsx
// Copie o componente ImportarExtratoModal para um arquivo compartilhado se desejar reutilizar, ou copie aqui para uso local
function ImportarExtratoModal({ open, onClose, onImport }) {
    const [regrasTexto, setRegrasTexto] = useState(`# Academia\nsmart fit = Academia\nbluefit = Academia\nselfit = Academia\nbodytech = Academia\njust fit = Academia\ngympass = Academia\nacademia = Academia\n\n# Água\nsabesp = Água\nsanepar = Água\ncopasa = Água\ncaesb = Água\ncasan = Água\ndmae = Água\nembasa = Água\nsaae = Água\n\n# Alimentação\nifood = Alimentação\nub...existing code...\npagamento cliente = Vendas`);
              <div className="mb-2">
                <label className="block text-xs font-bold mb-1 text-zinc-200">Regras de categorização (edite ou cole suas regras):</label>
                  <textarea
                    className="w-full font-mono bg-zinc-900 text-yellow-400 p-2 rounded resize-none"
                    style={{ height: 400, overflowY: 'auto' }}
                    value={`# Academia\nsmart fit = Academia\nbluefit = Academia\nselfit = Academia\nbodytech = Academia\njust fit = Academia\ngympass = Academia\nacademia = Academia\n\n# Água\nsabesp = Água\nsanepar = Água\ncopasa = Água\ncaesb = Água\ncasan = Água\ndmae = Água\nembasa = Água\nsaae = Água\n\n# Alimentação\nifood = Alimentação\nubereats = Alimentação\nrestaurante = Alimentação\nlanchonete = Alimentação\npadaria = Alimentação\npizzaria = Alimentação\nhamburgueria = Alimentação\nhabibs = Alimentação\noutback = Alimentação\nmcdonalds = Alimentação\nburger king = Alimentação\nbk = Alimentação\ngiraffas = Alimentação\nsubway = Alimentação\nspoleto = Alimentação\n\n# Aluguel\naluguel = Aluguel\nlocacao residencial = Aluguel\nimobiliaria = Aluguel\nquinto andar = Aluguel\nquintoandar = Aluguel\n\n# Aplicação Investimento\naplicacao cdb = Aplicação Investimento\naplicacao cdb cofrinhos = Aplicação Investimento\naplicacao cdb di = Aplicação Investimento\ncof aplicacao cdb = Aplicação Investimento\ndi aplicacao cdb = Aplicação Investimento\npix transf avenue = Aplicação Investimento\naporte = Aplicação Investimento\nenvio corretora = Aplicação Investimento\ncompra tesouro = Aplicação Investimento\ncompra fundos = Aplicação Investimento\n\n# Assinaturas\nseguro cartao = Assinaturas\nnetflix = Assinaturas\nspotify = Assinaturas\nprime video = Assinaturas\ndisney = Assinaturas\ngloboplay = Assinaturas\nmax = Assinaturas\nhbo = Assinaturas\nyoutube premium = Assinaturas\napple tv = Assinaturas\napple music = Assinaturas\nicloud = Assinaturas\ngoogle one = Assinaturas\nmicrosoft 365 = Assinaturas\nadobe = Assinaturas\nchatgpt = Assinaturas\nnotion = Assinaturas\nonepassword = Assinaturas\ndeezer = Assinaturas\nparamount = Assinaturas\ncanva = Assinaturas\n\n# Carro\nipva = Carro\nlicenciamento = Carro\npag licenciamento de vei = Carro\necovias = Carro\nsem parar = Carro\nrscss ecovias = Carro\nposto = Carro\ngasolina = Carro\netanol = Carro\ndiesel = Carro\nestacionamento = Carro\nmanutencao veiculo = Carro\n\n# Celular\nvivo recarga = Celular\nclaro recarga = Celular\ntim recarga = Celular\noi recarga = Celular\nvivo pos = Celular\nclaro pos = Celular\ntim pos = Celular\noi pos = Celular\nvivo controle = Celular\nclaro controle = Celular\ntim controle = Celular\nrecarga celular = Celular\n\n# Compras\nmercado livre = Compras\nmagalu = Compras\namericanas = Compras\nsubmarino = Compras\ncasas bahia = Compras\nshopee = Compras\namazon = Compras\nkabum = Compras\nfast shop = Compras\ncentauro = Compras\nkalunga = Compras\nshein = Compras\naliexpress = Compras\npaypal = Compras\npagseguro = Compras\nstone = Compras\nsumup = Compras\ngetnet = Compras\ncielo = Compras\nrede = Compras\nsafetopay = Compras\npay shopp = Compras\nreceita fed = Compras\nint pre-pago = Compras\npix qrs = Compras\npix whats = Compras\nmagazine lu = Compras\nnetshoes = Compras\n\n# Educação\nescola = Educação\nfaculdade = Educação\nuniversidade = Educação\ncurso = Educação\nead = Educação\nalura = Educação\nrocketseat = Educação\nudemy = Educação\ncoursera = Educação\nsenai = Educação\netec = Educação\npix transf thamire = Educação\n\n# Energia\nenel = Energia\nlight = Energia\ncemig = Energia\ncopel = Energia\nequatorial = Energia\nrge = Energia\ncelesc = Energia\ncpfl = Energia\nenergisa = Energia\n\n# Farmácia\ndrogaraia = Farmácia\ndroga raia = Farmácia\ndrogasil = Farmácia\npacheco = Farmácia\ndrogaria sao paulo = Farmácia\npanvel = Farmácia\nnissei = Farmácia\naraujo = Farmácia\nfarmaconde = Farmácia\nfarmacia = Farmácia\n\n# Fatura do Cartão\nint mc black = Fatura do Cartão\nint itau black = Fatura do Cartão\npix qrs mercado pag = Fatura do Cartão\npix qrs portoseg = Fatura do Cartão\nportoseg sa = Fatura do Cartão\npagamento fatura = Fatura do Cartão\nfatura cartao = Fatura do Cartão\n\n# Internet\nvivo fibra = Internet\nclaro net = Internet\ntim live = Internet\noi fibra = Internet\ngvt = Internet\nalgar = Internet\nbrisanet = Internet\ndesktop = Internet\nvogel = Internet\nprovedor = Internet\ninternet = Internet\n\n# Lazer\ncinema = Lazer\ncinemark = Lazer\ncinepolis = Lazer\nteatro = Lazer\nshow = Lazer\ningresso = Lazer\nparque = Lazer\nmuseu = Lazer\nthermas = Lazer\nhotel = Lazer\nbooking = Lazer\ndecolar = Lazer\nairbnb = Lazer\nresort = Lazer\nsympla = Lazer\ningresso.com = Lazer\n\n# Mercado\ncarrefour = Mercado\nextra = Mercado\npao de acucar = Mercado\nassai = Mercado\natacadao = Mercado\ndia = Mercado\nsonda = Mercado\ntenda = Mercado\nbig = Mercado\noba = Mercado\nhortifruti = Mercado\nsupermerc = Mercado\nsuper mercado = Mercado\n\n# Moradia\ncondominio = Moradia\niptu = Moradia\nmanutencao residencial = Moradia\nleroy merlin = Moradia\ntelha norte = Moradia\ntok stok = Moradia\ncamicado = Moradia\nmobly = Moradia\n\n# Necessidades\nsaque banco24h = Necessidades\nsaque din atm = Necessidades\natm banco24h = Necessidades\nloterica = Necessidades\ncaixa eletronico = Necessidades\n\n# Pet\npetz = Pet\ncobasi = Pet\npetlove = Pet\npet shop = Pet\nseres = Pet\nvet = Pet\nclinica veterinaria = Pet\ndrogavet = Pet\n\n# Salão/Barbearia\nbarbearia = Salão/ Barbearia\nsalao = Salão/ Barbearia\ncabeleireiro = Salão/ Barbearia\nesmalteria = Salão/ Barbearia\nmanicure = Salão/ Barbearia\nbarber = Salão/ Barbearia\npix transf sergio = Salão/ Barbearia\n\n# Saúde\nhospital = Saúde\nclinica = Saúde\nlaboratorio = Saúde\nexame = Saúde\nvacina = Saúde\ndasa = Saúde\nfleury = Saúde\nsabin = Saúde\neinstein = Saúde\nsirio = Saúde\nunimed = Saúde\namil = Saúde\nhapvida = Saúde\nprevent = Saúde\npix transf tania = Saúde\n\n# Transferência (Despesa)\npix transf lincoln = Transferência\npix transf conta itau = Transferência\nted transf conta = Transferência\ndoc transferencia = Transferência\ntransferencia entre contas = Transferência\npix transf minha conta = Transferência\n\n# Uber\nuber = Uber\n99 app = Uber\n99pop = Uber\ncabify = Uber\nindriver = Uber\n\n# Vestuário\nrenner = Vestuário\nriachuelo = Vestuário\ncea = Vestuário\nc&a = Vestuário\nzara = Vestuário\nhering = Vestuário\nmarisa = Vestuário\nyoucom = Vestuário\nnetshoes = Vestuário\ndafiti = Vestuário\n\n# ===== RECEITAS =====\n\n# Aluguel Recebido\naluguel recebido = Aluguel\nrepasse aluguel = Aluguel\ninquilino = Aluguel\nairbnb repasse = Aluguel\n\n# Benefícios/Ajuda\npgto itau itau-k = Benefícios / Ajuda\nsispag fund saude itau = Benefícios / Ajuda\nbeneficio = Benefícios / Ajuda\nreembolso = Benefícios / Ajuda\najuda = Benefícios / Ajuda\n\n# Investimentos\ndividendos = Investimentos\nproventos = Investimentos\njcp = Investimentos\naluguel de acoes = Investimentos\nrendimento fundos = Investimentos\nrendimento fii = Investimentos\nprovento fii = Investimentos\n\n# Juros Investimentos\ncor juros rf = Juros Investimentos\njuros cdb = Juros Investimentos\njuros = Juros Investimentos\nrend pago aplic aut mais = Juros Investimentos\n\n# Recompensas\ncashback = Recompensas\nrecompensa = Recompensas\nbonus = Recompensas\nted 104.0000caixa econ f = Recompensas\nmeliuz = Recompensas\name digital = Recompensas\n\n# Renda Extra\nfreela = Renda Extra\nfreelancer = Renda Extra\nconsultoria = Renda Extra\naula = Renda Extra\nbico = Renda Extra\nrevenda = Renda Extra\ncomissao = Renda Extra\npix cliente = Renda Extra\npagamento servico = Renda Extra\n\n# Resgate Investimentos\nresgate cdb = Resgate Investimentos\nresgate cdb di = Resgate Investimentos\nresgate cdb cofrinhos = Resgate Investimentos\ndi resgate cdb = Resgate Investimentos\ncor tes direto - venda = Resgate Investimentos\ncor amortizacao - rf = Resgate Investimentos\ncor irrf = Resgate Investimentos\nresgate fundo = Resgate Investimentos\nvenda tesouro = Resgate Investimentos\n\n# Salário\nfolha pagamento mensal = Salário\nfolha de ferias = Salário\n13. salario = Salário\nholerite = Salário\npagamento salario = Salário\nproventos folha = Salário\n\n# Transferência (Receita)\npix transf lincoln = Transferência\npix transf conta itau = Transferência\nted transf conta = Transferência\ndoc transferencia = Transferência\ntransferencia entre contas = Transferência\npix transf minha conta = Transferência\n\n# Vendas\nmercado pago receb = Vendas\npagseguro receb = Vendas\nstone receb = Vendas\ngetnet receb = Vendas\nsumup receb = Vendas\nifood repasse = Vendas\nshopee repasse = Vendas\nshopify payout = Vendas\nvenda = Vendas\npagamento cliente = Vendas\n`}
                    onChange={e => setRegrasTexto(e.target.value)}
                  />
              </div>
  const [csvFile, setCsvFile] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [step, setStep] = useState(1); // 1: upload, 2: preview/editar

  function handleFileChange(e) {
    setCsvFile(e.target.files[0]);
  }

  function handleParse() {
    if (!csvFile) return;
    import('papaparse').then(Papa => {
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Garante que pelo menos um campo relevante seja preenchido
          const dados = results.data.map(l => {
            const valor = l.valor || l.Valor || l.amount || l.Amount || '';
            const quando = l.quando || l.data || l.Data || l.date || l.Date || '';
            const estabelecimento = l.estabelecimento || l.descricao || l.Descricao || l.description || l.Description || '';
            const tipo = l.tipo || l.Tipo || l.type || l.Type || '';
            const categoria = l.categoria || l.Categoria || l.category || l.Category || '';
            // Se todos os campos estiverem vazios, ignora a linha
            if (!valor && !quando && !estabelecimento && !tipo && !categoria) return null;
            return {
              ...l,
              valor: Number(valor) || 0,
              quando,
              estabelecimento,
              tipo,
              categoria,
            };
          }).filter(Boolean);
          setLancamentos(dados);
          setStep(2);
        },
        error: () => alert('Erro ao ler o arquivo!'),
      });
    });
  }

  function handleEditLancamento(idx, field, value) {
    setLancamentos(lancamentos => lancamentos.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function handleImportar() {
    onImport(lancamentos);
    setCsvFile(null);
    setLancamentos([]);
    setStep(1);
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border rounded-lg shadow-2xl p-6 min-w-[350px] max-w-[90vw] max-h-[90vh] overflow-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-teal-500/10">
            <svg className="h-6 w-6 text-teal-600 dark:text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold">Importar Fatura do Cartão</h3>
            <p className="text-sm text-muted-foreground">Selecione o arquivo CSV da fatura</p>
          </div>
        </div>
        
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Arquivo CSV</label>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileChange}
                className="w-full p-3 rounded-lg border bg-background text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600 cursor-pointer transition"
              />
              {csvFile && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {csvFile.name}
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button size="sm" onClick={handleParse} disabled={!csvFile}>Próximo</Button>
            </div>
          </div>
        )}
        {step === 2 && (
          <>
            <div className="overflow-x-auto max-h-[50vh] mb-2">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-1 text-white bg-zinc-900" style={{backgroundColor: '#18181b', color: '#fff'}}>Data</th>
                    <th className="p-1 text-white bg-zinc-900" style={{backgroundColor: '#18181b', color: '#fff'}}>Descrição</th>
                    <th className="p-1 text-white bg-zinc-900" style={{backgroundColor: '#18181b', color: '#fff'}}>Valor</th>
                    <th className="p-1 text-white bg-zinc-900" style={{backgroundColor: '#18181b', color: '#fff'}}>Tipo</th>
                    <th className="p-1 text-white bg-zinc-900" style={{backgroundColor: '#18181b', color: '#fff'}}>Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.map((l, idx) => (
                    <tr key={idx}>
                      <td><input className="border rounded p-1 w-24 text-white bg-zinc-900 border-zinc-700 placeholder:text-gray-400 dark:placeholder:text-gray-400" value={l.quando} onChange={e => handleEditLancamento(idx, 'quando', e.target.value)} style={{backgroundColor: '#18181b', color: '#fff'}} /></td>
                      <td><input className="border rounded p-1 w-32 text-white bg-zinc-900 border-zinc-700 placeholder:text-gray-400 dark:placeholder:text-gray-400" value={l.estabelecimento} onChange={e => handleEditLancamento(idx, 'estabelecimento', e.target.value)} style={{backgroundColor: '#18181b', color: '#fff'}} /></td>
                      <td><input className="border rounded p-1 w-20 text-white bg-zinc-900 border-zinc-700 placeholder:text-gray-400 dark:placeholder:text-gray-400" type="text" inputMode="decimal" value={formatarValorBR(l.valor?.toString() ?? '')} onChange={e => { const formatted = formatarValorBR(e.target.value); handleEditLancamento(idx, 'valor', parseValorBR(formatted)); }} style={{backgroundColor: '#18181b', color: '#fff'}} /></td>
                      <td><input className="border rounded p-1 w-16 text-white bg-zinc-900 border-zinc-700 placeholder:text-gray-400 dark:placeholder:text-gray-400" value={l.tipo} onChange={e => handleEditLancamento(idx, 'tipo', e.target.value)} style={{backgroundColor: '#18181b', color: '#fff'}} /></td>
                      <td><input className="border rounded p-1 w-24 text-white bg-zinc-900 border-zinc-700 placeholder:text-gray-400 dark:placeholder:text-gray-400" value={l.categoria || ''} onChange={e => handleEditLancamento(idx, 'categoria', e.target.value)} style={{backgroundColor: '#18181b', color: '#fff'}} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>Voltar</Button>
              <Button size="sm" onClick={handleImportar} disabled={lancamentos.length === 0}>Finalizar Importação</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditCartaoModal({ cartao, open, onClose, onSave }) {
  const [name, setName] = useState(cartao?.name || '');
  const [type, setType] = useState(cartao?.type || '');
  const [saldoInicial, setSaldoInicial] = useState(cartao?.saldo_inicial ?? cartao?.saldoInicial ?? 0);
  useEffect(() => {
    setName(cartao?.name || '');
    setType(cartao?.type || '');
    setSaldoInicial(cartao?.saldo_inicial ?? cartao?.saldoInicial ?? 0);
  }, [cartao]);
  if (!open || !cartao) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 min-w-[300px]">
        <h3 className="font-bold mb-2">Editar Cartão</h3>
        {/* Campos de edição - layout novo, sem duplicidade */}
        <div className="flex flex-col gap-2 mb-2">
          <label className="text-xs text-zinc-500 dark:text-zinc-300 font-medium" htmlFor="edit-nome-cartao">Nome</label>
          <input
            id="edit-nome-cartao"
            className="border rounded p-2 w-full mb-1 bg-white text-black dark:bg-zinc-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome"
          />
        </div>
        <div className="flex flex-col gap-2 mb-2">
          <label className="text-xs text-zinc-500 dark:text-zinc-300 font-medium" htmlFor="edit-tipo-cartao">Tipo</label>
          <select
            id="edit-tipo-cartao"
            className="border rounded p-2 w-full mb-1 bg-white text-black dark:bg-zinc-800 dark:text-white"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="">Selecione o tipo</option>
            <option value="Cartão de Crédito">Cartão de Crédito</option>
            <option value="Cartão de Débito">Cartão de Débito</option>
          </select>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <label className="text-xs text-zinc-500 dark:text-zinc-300 font-medium" htmlFor="edit-saldo-cartao">Saldo inicial</label>
          <input
            id="edit-saldo-cartao"
            type="number"
            className="border rounded p-2 w-full mb-1 bg-white text-black dark:bg-zinc-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400"
            value={saldoInicial}
            onChange={e => setSaldoInicial(Number(e.target.value))}
            placeholder="Saldo Inicial"
          />
        </div>
        {/* Campos duplicados removidos, mantendo apenas o layout novo com label, input e sem texto extra */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave({ ...cartao, name, type, saldo_inicial: saldoInicial, saldoInicial: saldoInicial })}>Salvar</Button>
        </div>
      </div>
    </div>
  );
}


export default function Cartoes() {
  const [importOpen, setImportOpen] = useState(false);
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCartao, setEditCartao] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [transacoes, setTransacoes] = useState([]);

  async function fetchCartoes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('*');
    if (!error && data) {
      // Filtro: só tipos cartão/crédito/débito
      const normaliza = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const cartoesFiltrados = data.filter(acc => {
        if (!acc.type) return false;
        const tipo = normaliza(acc.type);
        return tipo.includes('cartao') || tipo.includes('cartão') || tipo.includes('credito') || tipo.includes('debito') || tipo.includes('débito');
      });
      setCartoes(cartoesFiltrados);
    }
    setLoading(false);
    // Busca transações
    const { data: transData, error: transError } = await supabase
      .from('transacoes')
      .select('id, valor, tipo, account_id');
    if (!transError && transData) {
      setTransacoes(transData);
    } else {
      setTransacoes([]);
    }
  }

  useEffect(() => {
    fetchCartoes();
  }, []);

  // Importação de fatura
  async function handleImportLancamentos(lancs) {
    // Se houver apenas um cartão, já associa automaticamente
    const cartaoId = cartoes.length === 1 ? cartoes[0].id : undefined;
    const toInsert = lancs.map(l => ({
      ...l,
      account_id: cartaoId,
    }));
    const { error } = await supabase.from('transacoes').insert(toInsert);
    if (error) {
      alert('Erro ao importar: ' + error.message);
    } else {
      fetchCartoes();
      alert('Importação realizada com sucesso!');
    }
  }

  // Excluir cartão
  async function handleDeleteCartao(cartao) {
    if (!window.confirm('Tem certeza que deseja excluir este cartão?')) return;
    const { error } = await supabase.from('accounts').delete().eq('id', cartao.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      fetchCartoes();
    }
  }

  // Editar cartão (abrir modal)
  function handleEditCartao(cartao) {
    setEditCartao(cartao);
    setEditOpen(true);
  }

  // Salvar edição
  async function handleSaveCartao(cartaoEditado) {
    const { error } = await supabase.from('accounts').update({ name: cartaoEditado.name, type: cartaoEditado.type, saldoInicial: cartaoEditado.saldoInicial ?? cartaoEditado.saldo_inicial }).eq('id', cartaoEditado.id);
    setEditOpen(false);
    setEditCartao(null);
    if (error) {
      alert('Erro ao editar: ' + error.message);
    } else {
      fetchCartoes();
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">Cartões</h2>
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>Importar Fatura</Button>
      </div>
      <ImportarExtratoModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportLancamentos}
      />
      {loading ? (
        <p>Carregando...</p>
      ) : cartoes.length === 0 ? (
        <p>Nenhum cartão cadastrado.</p>
      ) : (
        cartoes.map((cartao) => {
          const saldoInicial = cartao.saldo_inicial || 0;
          const transacoesCartao = transacoes.filter(t => t.account_id === cartao.id);
          const saldoTransacoes = transacoesCartao.reduce((acc, t) => {
            if (t.tipo === 'receita') return acc + (t.valor || 0);
            if (t.tipo === 'despesa') return acc - (t.valor || 0);
            return acc;
          }, 0);
          const saldoTotal = saldoInicial + saldoTransacoes;
          return (
            <Card key={cartao.id} className="overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-all mb-4">
              <CardContent className="p-0">
                {/* Header com gradiente */}
                <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-base">{cartao.name}</h3>
                      <p className="text-xs text-muted-foreground">Cartão de crédito</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Saldo Total</p>
                      <p className={`text-lg font-bold ${saldoTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(saldoTotal)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métricas */}
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Saldo Inicial</p>
                      <p className="text-sm font-semibold">{formatCurrency(saldoInicial)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Receitas</p>
                      <p className="text-sm font-semibold text-green-500">
                        {formatCurrency(transacoesCartao.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + (t.valor || 0), 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Despesas</p>
                      <p className="text-sm font-semibold text-red-500">
                        {formatCurrency(Math.abs(transacoesCartao.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + (t.valor || 0), 0)))}
                      </p>
                    </div>
                  </div>

                  {/* Footer com botões */}
                  <div className="flex gap-2 justify-end pt-3 border-t border-border/50">
                    <Button variant="ghost" size="sm" onClick={() => handleEditCartao(cartao)} className="h-8 gap-2">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCartao(cartao)} className="h-8 gap-2 text-red-500 hover:text-red-600 hover:bg-red-500/10">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="hidden sm:inline">Excluir</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
      {/* Modal de edição de cartão: abre direto para o cartão clicado */}
      <EditCartaoModal
        cartao={editCartao}
        open={Boolean(editCartao) && editOpen}
        onClose={() => { setEditOpen(false); setEditCartao(null); }}
        onSave={handleSaveCartao}
      />
      <Button className="mt-4">Adicionar Cartão</Button>
    </div>
  );
}
