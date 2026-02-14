  // Função utilitária para normalizar strings (remove acentos, espaços extras, caixa baixa)
  function normalizar(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function categorizar(descricao, regrasTexto, tipo = '') {
    if (!descricao) return '';
    const descNorm = normalizar(descricao);
    const regras = regrasTexto.split('\n').filter(l => l.includes('=')).map(l => l.trim());
    for (const regra of regras) {
      const [termo, categoria] = regra.split('=').map(s => s.trim());
      if (descNorm.includes(normalizar(termo))) {
        const catNorm = categoria.trim();
        return catNorm.charAt(0).toUpperCase() + catNorm.slice(1);
      }
    }
    // Se não encontrou categoria pela regra, retorna a padrão de acordo com o tipo
    if (tipo === 'receita') return 'Renda Extra';
    if (tipo === 'despesa') return 'Compras';
    return '';
  }
import React, { useEffect, useState } from 'react';
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import Papa from 'papaparse';
// Modal de importação de extrato bancário


function ImportarExtratoModal({ open, onClose, onImport, contas }) {
    // Funções utilitárias para formatação
    function formatarValorBR(valor) {
      return (typeof valor === 'number') ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
    }
    function formatarDataBR(dataStr) {
      if (!dataStr) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
        const [ano, mes, dia] = dataStr.split('-');
        return `${dia}/${mes}/${ano}`;
      }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
        return dataStr;
      }
      const d = new Date(dataStr);
      if (!isNaN(d)) {
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const ano = d.getFullYear();
        return `${dia}/${mes}/${ano}`;
      }
      return dataStr;
    }
  const { user } = useAuth();
    // Estado local para controlar edição de valor por linha
    const [valorEditando, setValorEditando] = useState({});
  // Estados principais do modal de importação
  const [step, setStep] = useState(1);
  const [regrasTexto, setRegrasTexto] = useState(`# ===== DESPESAS =====\n\n# Academia\nsmart fit = Academia\nbluefit = Academia\nselfit = Academia\nbodytech = Academia\njust fit = Academia\ngympass = Academia\nacademia = Academia\n\n# Água\nsabesp = Água\nsanepar = Água\ncopasa = Água\ncaesb = Água\ncasan = Água\ndmae = Água\nembasa = Água\nsaae = Água\n\n# Alimentação\nifood = Alimentação\nubereats = Alimentação\nrestaurante = Alimentação\nlanchonete = Alimentação\npadaria = Alimentação\npizzaria = Alimentação\nhamburgueria = Alimentação\nhabibs = Alimentação\noutback = Alimentação\nmcdonalds = Alimentação\nburger king = Alimentação\nbk = Alimentação\ngiraffas = Alimentação\nsubway = Alimentação\nspoleto = Alimentação\n\n# Aluguel\naluguel = Aluguel\nlocacao residencial = Aluguel\nimobiliaria = Aluguel\nquinto andar = Aluguel\nquintoandar = Aluguel\n\n# Aplicação Investimento\naplicacao cdb = Aplicação Investimento\naplicacao cdb cofrinhos = Aplicação Investimento\naplicacao cdb di = Aplicação Investimento\ncof aplicacao cdb = Aplicação Investimento\ndi aplicacao cdb = Aplicação Investimento\npix transf avenue = Aplicação Investimento\naporte = Aplicação Investimento\nenvio corretora = Aplicação Investimento\ncompra tesouro = Aplicação Investimento\ncompra fundos = Aplicação Investimento\n\n# Assinaturas\nseguro cartao = Assinaturas\nnetflix = Assinaturas\nspotify = Assinaturas\nprime video = Assinaturas\ndisney = Assinaturas\ngloboplay = Assinaturas\nmax = Assinaturas\nhbo = Assinaturas\nyoutube premium = Assinaturas\napple tv = Assinaturas\napple music = Assinaturas\nicloud = Assinaturas\ngoogle one = Assinaturas\nmicrosoft 365 = Assinaturas\nadobe = Assinaturas\nchatgpt = Assinaturas\nnotion = Assinaturas\nonepassword = Assinaturas\ndeezer = Assinaturas\nparamount = Assinaturas\ncanva = Assinaturas\n\n# Carro\nipva = Carro\nlicenciamento = Carro\npag licenciamento de vei = Carro\necovias = Carro\nsem parar = Carro\nrscss ecovias = Carro\nposto = Carro\ngasolina = Carro\netanol = Carro\ndiesel = Carro\nestacionamento = Carro\nmanutencao veiculo = Carro\n\n# Celular\nvivo recarga = Celular\nclaro recarga = Celular\ntim recarga = Celular\noi recarga = Celular\nvivo pos = Celular\nclaro pos = Celular\ntim pos = Celular\noi pos = Celular\nvivo controle = Celular\nclaro controle = Celular\ntim controle = Celular\nrecarga celular = Celular\n\n# Compras\nmercado livre = Compras\nmagalu = Compras\namericanas = Compras\nsubmarino = Compras\ncasas bahia = Compras\nshopee = Compras\namazon = Compras\nkabum = Compras\nfast shop = Compras\ncentauro = Compras\nkalunga = Compras\nshein = Compras\naliexpress = Compras\npaypal = Compras\npagseguro = Compras\nstone = Compras\nsumup = Compras\ngetnet = Compras\ncielo = Compras\nrede = Compras\nsafetopay = Compras\npay shopp = Compras\nreceita fed = Compras\nint pre-pago = Compras\npix qrs = Compras\npix whats = Compras\nmagazine lu = Compras\nnetshoes = Compras\n\n# Educação\nescola = Educação\nfaculdade = Educação\nuniversidade = Educação\ncurso = Educação\nead = Educação\nalura = Educação\nrocketseat = Educação\nudemy = Educação\ncoursera = Educação\nsenai = Educação\netec = Educação\npix transf thamire = Educação\n\n# Energia\nenel = Energia\nlight = Energia\ncemig = Energia\ncopel = Energia\nequatorial = Energia\nrge = Energia\ncelesc = Energia\ncpfl = Energia\nenergisa = Energia\n\n# Farmácia\ndrogaraia = Farmácia\ndroga raia = Farmácia\ndrogasil = Farmácia\npacheco = Farmácia\ndrogaria sao paulo = Farmácia\npanvel = Farmácia\nnissei = Farmácia\naraujo = Farmácia\nfarmaconde = Farmácia\nfarmacia = Farmácia\n\n# Fatura do Cartão\nint mc black = Fatura do Cartão\nint itau black = Fatura do Cartão\npix qrs mercado pag = Fatura do Cartão\npix qrs portoseg = Fatura do Cartão\nportoseg sa = Fatura do Cartão\npagamento fatura = Fatura do Cartão\nfatura cartao = Fatura do Cartão\n\n# Internet\nvivo fibra = Internet\nclaro net = Internet\ntim live = Internet\noi fibra = Internet\ngvt = Internet\nalgar = Internet\nbrisanet = Internet\ndesktop = Internet\nvogel = Internet\nprovedor = Internet\ninternet = Internet\n\n# Lazer\ncinema = Lazer\ncinemark = Lazer\ncinepolis = Lazer\nteatro = Lazer\nshow = Lazer\ningresso = Lazer\nparque = Lazer\nmuseu = Lazer\nthermas = Lazer\nhotel = Lazer\nbooking = Lazer\ndecolar = Lazer\nairbnb = Lazer\nresort = Lazer\nsympla = Lazer\ningresso.com = Lazer\n\n# Mercado\ncarrefour = Mercado\nextra = Mercado\npao de acucar = Mercado\nassai = Mercado\natacadao = Mercado\ndia = Mercado\nsonda = Mercado\ntenda = Mercado\nbig = Mercado\noba = Mercado\nhortifruti = Mercado\nsupermerc = Mercado\nsuper mercado = Mercado\n\n# Moradia\ncondominio = Moradia\niptu = Moradia\nmanutencao residencial = Moradia\nleroy merlin = Moradia\ntelha norte = Moradia\ntok stok = Moradia\ncamicado = Moradia\nmobly = Moradia\n\n# Necessidades\nsaque banco24h = Necessidades\nsaque din atm = Necessidades\natm banco24h = Necessidades\nloterica = Necessidades\ncaixa eletronico = Necessidades\n\n# Pet\npetz = Pet\ncobasi = Pet\npetlove = Pet\npet shop = Pet\nseres = Pet\nvet = Pet\nclinica veterinaria = Pet\ndrogavet = Pet\n\n# Salão/Barbearia\nbarbearia = Salão\nsalao = Salão\ncabeleireiro = Salão\nesmalteria = Salão\nmanicure = Salão\nbarber = Salão\npix transf sergio = Salão\n\n# Saúde\nhospital = Saúde\nclinica = Saúde\nlaboratorio = Saúde\nexame = Saúde\nvacina = Saúde\ndasa = Saúde\nfleury = Saúde\nsabin = Saúde\neinstein = Saúde\nsirio = Saúde\nunimed = Saúde\namil = Saúde\nhapvida = Saúde\nprevent = Saúde\npix transf tania = Saúde\n\n# Transferência (Despesa)\npix transf lincoln = Transferência\npix transf conta itau = Transferência\nted transf conta = Transferência\ndoc transferencia = Transferência\ntransferencia entre contas = Transferência\npix transf minha conta = Transferência\n\n# Uber\nuber = Uber\n99 app = Uber\n99pop = Uber\ncabify = Uber\nindriver = Uber\n\n# Vestuário\nrenner = Vestuário\nriachuelo = Vestuário\ncea = Vestuário\nc&a = Vestuário\nzara = Vestuário\nhering = Vestuário\nmarisa = Vestuário\nyoucom = Vestuário\nnetshoes = Vestuário\ndafiti = Vestuário\n\n# ===== RECEITAS =====\n\n# Aluguel Recebido\naluguel recebido = Aluguel\nrepasse aluguel = Aluguel\ninquilino = Aluguel\nairbnb repasse = Aluguel\n\n# Benefícios/Ajuda\npgto itau itau-k = Benefícios\nsispag fund saude itau = Benefícios\nbeneficio = Benefícios\nreembolso = Benefícios\najuda = Benefícios\n\n# Investimentos\ndividendos = Investimentos\nproventos = Investimentos\njcp = Investimentos\naluguel de acoes = Investimentos\nrendimento fundos = Investimentos\nrendimento fii = Investimentos\nprovento fii = Investimentos\n\n# Juros Investimentos\ncor juros rf = Juros Investimentos\njuros cdb = Juros Investimentos\njuros = Juros Investimentos\nrend pago aplic aut mais = Juros Investimentos\n\n# Recompensas\ncashback = Recompensas\nrecompensa = Recompensas\nbonus = Recompensas\nted 104.0000caixa econ f = Recompensas\nmeliuz = Recompensas\name digital = Recompensas\n\n# Renda Extra\nfreela = Renda Extra\nfreelancer = Renda Extra\nconsultoria = Renda Extra\naula = Renda Extra\nbico = Renda Extra\nrevenda = Renda Extra\ncomissao = Renda Extra\npix cliente = Renda Extra\npagamento servico = Renda Extra\n\n# Resgate Investimentos\nresgate cdb = Resgate Investimentos\nresgate cdb di = Resgate Investimentos\nresgate cdb cofrinhos = Resgate Investimentos\ndi resgate cdb = Resgate Investimentos\ncor tes direto - venda = Resgate Investimentos\ncor amortizacao - rf = Resgate Investimentos\ncor irrf = Resgate Investimentos\nresgate fundo = Resgate Investimentos\nvenda tesouro = Resgate Investimentos\n\n# Salário\nfolha pagamento mensal = Salário\nfolha de ferias = Salário\n13. salario = Salário\nholerite = Salário\npagamento salario = Salário\nproventos folha = Salário\n\n# Transferência (Receita)\npix transf lincoln = Transferência\npix transf conta itau = Transferência\nted transf conta = Transferência\ndoc transferencia = Transferência\ntransferencia entre contas = Transferência\npix transf minha conta = Transferência\n\n# Vendas\nmercado pago receb = Vendas\npagseguro receb = Vendas\nstone receb = Vendas\ngetnet receb = Vendas\nsumup receb = Vendas\nifood repasse = Vendas\nshopee repasse = Vendas\nshopify payout = Vendas\nvenda = Vendas\npagamento cliente = Vendas`);
  const [csvFile, setCsvFile] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [parseError, setParseError] = useState("");
  // Sempre inicializa com a primeira conta bancária
  const getPrimeiraContaBancariaId = (contasArr) => {
    if (!contasArr || contasArr.length === 0) return '';
    const contaBank = contasArr.find(c => (c.tipo || '').toLowerCase() === 'bank');
    return contaBank ? contaBank.id : '';
  };
  const [contaSelecionada, setContaSelecionada] = useState(getPrimeiraContaBancariaId(contas));

  // Categorias do usuário
  const [categorias, setCategorias] = useState([]);
  // Removido: const { user } = typeof window !== 'undefined' && window.useAuth ? window.useAuth() : {};

  // Categorias padrão para cada tipo
  const categoriasPadrao = [
    { nome: 'Aluguel', tipo: 'receita' },
    { nome: 'Investimentos', tipo: 'receita' },
    { nome: 'Recompensas', tipo: 'receita' },
    { nome: 'Renda Extra', tipo: 'receita' },
    { nome: 'Salário', tipo: 'receita' },
    { nome: 'Transferência', tipo: 'receita' },
    { nome: 'Vendas', tipo: 'receita' },
    { nome: 'Academia', tipo: 'despesa' },
    { nome: 'Água', tipo: 'despesa' },
    { nome: 'Alimentação', tipo: 'despesa' },
    { nome: 'Aluguel', tipo: 'despesa' },
    { nome: 'Assinaturas', tipo: 'despesa' },
    { nome: 'Carro Fin.', tipo: 'despesa' },
    { nome: 'Celular', tipo: 'despesa' },
    { nome: 'Compras', tipo: 'despesa' },
    { nome: 'Condomínio', tipo: 'despesa' },
    { nome: 'Diarista', tipo: 'despesa' },
    { nome: 'Dívida', tipo: 'despesa' },
    { nome: 'Educação', tipo: 'despesa' },
    { nome: 'Energia', tipo: 'despesa' },
    { nome: 'Farmácia', tipo: 'despesa' },
    { nome: 'Internet', tipo: 'despesa' },
    { nome: 'Investimento', tipo: 'despesa' },
    { nome: 'Lazer', tipo: 'despesa' },
    { nome: 'Necessidades', tipo: 'despesa' },
    { nome: 'Salão / Barbearia', tipo: 'despesa' },
    { nome: 'Saúde', tipo: 'despesa' },
    { nome: 'Transporte', tipo: 'despesa' },
    { nome: 'Transferência', tipo: 'despesa' },
  ];

  // Buscar/criar categorias do usuário ao abrir modal
  useEffect(() => {
    async function fetchOrCreateCategorias() {
      if (!user || !user.id) return;
      // Busca todas as categorias do usuário
      let { data: existentes, error } = await supabase
        .from('categorias')
        .select('id, nome, tipo, user_id, tags, created_at')
        .eq('user_id', user.id);
      if (error) existentes = [];
      // Descobre quais categorias padrão faltam
      const faltantes = categoriasPadrao.filter(catPadrao =>
        !existentes?.some(cat => cat.nome === catPadrao.nome && cat.tipo === catPadrao.tipo)
      );
      // Cria apenas as faltantes
      if (faltantes.length > 0) {
        await supabase
          .from('categorias')
          .insert(faltantes.map(cat => ({ ...cat, user_id: user.id })));
        // Recarrega após inserir
        let { data: atualizadas } = await supabase
          .from('categorias')
          .select('id, nome, tipo, user_id, tags, created_at')
          .eq('user_id', user.id);
        setCategorias(atualizadas || []);
      } else {
        setCategorias(existentes || []);
      }
    }
    if (open) fetchOrCreateCategorias();
  }, [open, user]);

  // Atualiza categorias automaticamente ao editar regrasTexto, mas só para lançamentos que não foram editados manualmente
  React.useEffect(() => {
    if (step === 2 && lancamentos.length > 0) {
      setLancamentos(lancs => lancs.map(l => {
        // Se a categoria foi editada manualmente, não sobrescreve
        if (l.categoriaManual) return l;
        return {
          ...l,
          categoria: categorizar(l.estabelecimento, regrasTexto, l.tipo)
        };
      }));
    }
    // eslint-disable-next-line
  }, [regrasTexto]);

  // Carregar regras do localStorage ao iniciar
  React.useEffect(() => {
    const saved = localStorage.getItem('regrasTexto');
    if (saved) setRegrasTexto(saved);
  }, []);

  // Salvar regras no localStorage sempre que mudar
  React.useEffect(() => {
    localStorage.setItem('regrasTexto', regrasTexto);
  }, [regrasTexto]);

  // Atualiza contaSelecionada sempre que contas mudar
  // Sempre que abrir o modal, ou mudar o array de contas, garanta que a conta selecionada é uma conta bancária
  React.useEffect(() => {
    if (open) {
      setContaSelecionada(getPrimeiraContaBancariaId(contas));
    }
  }, [contas, open]);

  // Sempre que avançar para a etapa 1 (início), garanta que a conta selecionada é uma conta bancária
  React.useEffect(() => {
    if (step === 1) {
      setContaSelecionada(getPrimeiraContaBancariaId(contas));
    }
  }, [step]);

  // Carregar regras do localStorage ao iniciar
  React.useEffect(() => {
    const saved = localStorage.getItem('regrasTexto');
    if (saved) setRegrasTexto(saved);
  }, []);

  // Salvar regras no localStorage sempre que mudar
  React.useEffect(() => {
    localStorage.setItem('regrasTexto', regrasTexto);
  }, [regrasTexto]);

  // ...existing code...
    // Estados globais para edição de valor/data
    const [editandoValor, setEditandoValor] = useState({}); // { uid: boolean }
    const [editandoData, setEditandoData] = useState({}); // { uid: boolean }

  // Atualiza contaSelecionada sempre que contas mudar
  React.useEffect(() => {
    if (contas && contas.length > 0) {
      setContaSelecionada(contas[0].id);
    } else {
      setContaSelecionada('');
    }
  }, [contas]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [loading, setLoading] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollableRef = React.useRef(null);

  // Estilos para células vazias/preenchidas
  const emptyCellStyle = { backgroundColor: '#fffbe3', color: '#a37a00', fontWeight: 700 };
  const filledCellStyle = { backgroundColor: '#fff', color: '#183153', fontWeight: 500 };
  const noCategoryStyle = { backgroundColor: '#ffe3e3', color: '#a30000', fontWeight: 700 };

  // Função para parsear CSV
  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
    setParseError("");
  };
  // Função para processar regras de categorização

  const handleParse = () => {
    setParseError("");
    if (!csvFile) return;
    setLoading(true);
    Papa.parse(csvFile, {
      header: false,
      delimiter: ";",
      skipEmptyLines: true,
      complete: (results) => {
        setLoading(false);
        console.log('CSV Raw Data:', results.data);
        // Se não tem cabeçalho, mapear manualmente: [data, descricao, valor]
        // Função para gerar uid simples
        function gerarUid() {
          return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        }
        const parsed = results.data
          .filter(row => Array.isArray(row) && row.length >= 2 && row[0] && row[1])
          .map((row) => {
            const descricao = row[1] || '';
            const dataOriginal = row[0] || '';
            const valor = Number((row[2] || '').replace('.', '').replace(',', '.'));
            const tipo = valor < 0 ? 'despesa' : 'receita';
            return {
              uid: gerarUid(),
              quando: dataOriginal,
              estabelecimento: descricao,
              valor: valor,
              tipo: tipo,
              categoria: categorizar(descricao, regrasTexto, tipo),
            };
          });
        console.log('Lançamentos parseados:', parsed);
        if (parsed.length === 0) {
          setParseError("Nenhum lançamento encontrado no arquivo CSV.");
          return;
        }
        setLancamentos(parsed);
        setStep(2);
      },
      error: (err) => {
        setLoading(false);
        setParseError("Erro ao ler o arquivo CSV: " + err.message);
      }
    });
  };

  // Função para editar lançamentos
  const handleEditLancamento = (lancamento, campo, valor) => {
    setLancamentos(lancamentos => {
      const novos = [...lancamentos];
      const idx = novos.findIndex(l => l.uid === lancamento.uid);
      if (idx !== -1) {
        novos[idx] = { ...novos[idx], [campo]: valor };
        // Se o campo editado for categoria, marca como manual
        if (campo === 'categoria') {
          novos[idx].categoriaManual = true;
        }
      }
      return novos;
    });
  };

  // Função para ordenar
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };
  const getSortedLancamentos = () => {
    // Ordenação padrão: mais novo para mais antigo
    if (!sortConfig.key) {
      return [...lancamentos].sort((a, b) => {
        const da = new Date(a.data || a.quando);
        const db = new Date(b.data || b.quando);
        return db - da;
      });
    }
    return [...lancamentos].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Função auxiliar para renderizar o indicador de sort no header
  const renderSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) return ' ';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  // Função para importar
  // Estado para feedback de importação
  const [importFeedback, setImportFeedback] = useState(null);

  const handleImportar = async () => {
    console.log('Iniciando importação...', { lancamentos: lancamentos.length, contaId: contaSelecionada });
    setLoading(true);
    try {
      const result = await onImport(lancamentos, contaSelecionada, regrasTexto);
      console.log('Resultado da importação:', result);
      if (result && typeof result === 'object' && ('success' in result)) {
        setImportFeedback(result);
      } else {
        setImportFeedback({
          success: true,
          message: `Importação realizada com sucesso! ${lancamentos.length} lançamentos importados.`
        });
      }
      setStep(1);
      setLancamentos([]);
      setCsvFile(null);
    } catch (e) {
      console.error('Erro ao importar:', e);
      setImportFeedback({
        success: false,
        message: `Erro ao importar: ${e.message || e}`
      });
    } finally {
      setLoading(false);
    }
    // Modal não fecha automaticamente, mostra feedback
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative z-50">
        {/* Conteúdo scrollável */}
        <div className="overflow-y-auto flex-1 p-8">
        {/* Header com Close */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Importar Extrato</h2>
              <p className="text-sm text-slate-400 mt-1">Carregue seus lançamentos com inteligência de categorização</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
            title="Fechar"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${step >= s ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-slate-800'}`}></div>
          ))}
        </div>
        
        {step === 1 && (
          <>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">Selecione a conta para importar</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-100 hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                  value={contaSelecionada}
                  onChange={e => setContaSelecionada(e.target.value)}
                >
                  {(contas && Array.isArray(contas) && contas.length > 0) ? (
                    contas.filter(conta => (conta.tipo || '').toLowerCase() === 'bank')
                      .map((conta) => (
                        <option key={conta.id} value={conta.id}>{conta.nome}</option>
                      ))
                  ) : (
                    <option value="">Nenhuma conta cadastrada</option>
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-3">Arquivo CSV</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    className="w-full px-4 py-4 rounded-xl border-2 border-dashed border-slate-600 hover:border-slate-500 bg-slate-800/30 text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-blue-600 file:text-white hover:file:from-blue-600 hover:file:to-blue-700 cursor-pointer transition duration-200"
                  />
                </div>
                {csvFile && (
                  <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-2 text-green-400">
                    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{csvFile.name}</span>
                  </div>
                )}
              </div>
            </div>
            
            {parseError && (
              <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium flex items-start gap-3">
                <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {parseError}
              </div>
            )}
            
            <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-slate-800">
              <button
                className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/50 transition font-medium"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className={`px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-700 hover:to-blue-600 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleParse}
                disabled={!csvFile || !contaSelecionada || loading}
              >
                {loading && <span className="loader border-2 border-t-2 border-white rounded-full w-4 h-4 animate-spin"></span>}
                Próximo
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-3 text-slate-200">Regras de categorização</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-100 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                style={{ minHeight: 140, maxHeight: 220, overflow: 'auto' }}
                value={regrasTexto}
                onChange={e => setRegrasTexto(e.target.value)}
                placeholder="# Regras de categorização..."
              />
            </div>

            {/* Tabela com melhor visual */}
            <div className="mb-24">
              <h3 className="text-sm font-semibold mb-4 text-slate-200">Prévia dos lançamentos</h3>
              <div 
                className="overflow-y-auto border border-slate-700/50 rounded-xl shadow-lg" 
                style={{ maxHeight: '450px' }}
                ref={scrollableRef}
                onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)}
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-b border-slate-700/50">
                      <th className="px-1 py-2 text-left font-semibold text-slate-300 w-32 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('quando')}>Data{renderSortIndicator('quando')}</th>
                      <th className="px-1 py-2 text-left font-semibold text-slate-300 flex-1 min-w-80 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('estabelecimento')}>Descrição{renderSortIndicator('estabelecimento')}</th>
                      <th className="px-1 py-2 text-left font-semibold text-slate-300 w-32 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('valor')}>Valor{renderSortIndicator('valor')}</th>
                      <th className="px-1 py-2 text-left font-semibold text-slate-300 w-28 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('tipo')}>Tipo{renderSortIndicator('tipo')}</th>
                      <th className="px-1 py-2 text-left font-semibold text-slate-300 w-44 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('categoria')}>Categoria{renderSortIndicator('categoria')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {getSortedLancamentos().map((l, idx) => (
                      <tr key={idx} className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition ${idx % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
                        <td className="px-1 py-2">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                            value={editandoData[l.uid] ? l.quando : formatarDataBR(l.quando)}
                            onFocus={() => setEditandoData(ed => ({ ...ed, [l.uid]: true }))}
                            onBlur={e => { setEditandoData(ed => ({ ...ed, [l.uid]: false })); handleEditLancamento(l, 'quando', e.target.value); }}
                            onChange={e => handleEditLancamento(l, 'quando', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-2">
                          <input
                            type="text"
                            className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                            value={l.estabelecimento}
                            onChange={e => handleEditLancamento(l, 'estabelecimento', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                            value={editandoValor[l.uid] ? l.valor : formatarValorBR(l.valor)}
                            onFocus={() => setEditandoValor(ev => ({ ...ev, [l.uid]: true }))}
                            onBlur={e => { setEditandoValor(ev => ({ ...ev, [l.uid]: false })); handleEditLancamento(l, 'valor', e.target.value); }}
                            onChange={e => handleEditLancamento(l, 'valor', e.target.value)}
                          />
                        </td>
                        <td className="px-1 py-2">
                          <select
                            className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition cursor-pointer"
                            value={l.tipo}
                            onChange={e => handleEditLancamento(l, 'tipo', e.target.value)}
                          >
                            <option value="">Selecione</option>
                            <option value="receita">receita</option>
                            <option value="despesa">despesa</option>
                          </select>
                        </td>
                        <td className="px-1 py-2">
                          <input
                            type="text"
                            className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                            value={l.categoria && l.categoria.trim() !== '' ? l.categoria : ''}
                            placeholder="Categoria"
                            onChange={e => handleEditLancamento(l, 'categoria', e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h3 className="text-sm font-semibold mb-4 text-slate-200">Validação final dos lançamentos</h3>
            <div 
              className="overflow-y-auto border border-slate-700/50 rounded-xl shadow-lg" 
              style={{ maxHeight: '450px' }}
              ref={scrollableRef}
              onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)}
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0">
                  <tr className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-b border-slate-700/50">
                    <th className="px-1 py-2 text-left font-semibold text-slate-300 w-32 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('quando')}>Data{renderSortIndicator('quando')}</th>
                    <th className="px-1 py-2 text-left font-semibold text-slate-300 flex-1 min-w-80 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('estabelecimento')}>Descrição{renderSortIndicator('estabelecimento')}</th>
                    <th className="px-1 py-2 text-left font-semibold text-slate-300 w-32 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('valor')}>Valor{renderSortIndicator('valor')}</th>
                    <th className="px-1 py-2 text-left font-semibold text-slate-300 w-28 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('tipo')}>Tipo{renderSortIndicator('tipo')}</th>
                    <th className="px-1 py-2 text-left font-semibold text-slate-300 w-44 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('categoria')}>Categoria{renderSortIndicator('categoria')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {lancamentos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-500 text-sm">
                        Nenhum lançamento para validar.
                      </td>
                    </tr>
                  ) : (
                    getSortedLancamentos().map((l, idx) => (
                      <tr key={idx} className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition ${idx % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
                        <td className="px-1 py-2">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                            value={editandoData[l.uid] ? l.quando : formatarDataBR(l.quando)}
          onFocus={() => setEditandoData(ed => ({ ...ed, [l.uid]: true }))}
          onBlur={e => { setEditandoData(ed => ({ ...ed, [l.uid]: false })); handleEditLancamento(l, 'quando', e.target.value); }}
          onChange={e => handleEditLancamento(l, 'quando', e.target.value)}
        />
      </td>
      <td className="px-1 py-2">
        <input
          type="text"
          className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
          value={l.estabelecimento}
          onChange={e => handleEditLancamento(l, 'estabelecimento', e.target.value)}
        />
      </td>
      <td className="px-1 py-2">
        <input
          type="text"
          inputMode="decimal"
          className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
          value={editandoValor[l.uid] ? l.valor : formatarValorBR(l.valor)}
          onFocus={() => setEditandoValor(ev => ({ ...ev, [l.uid]: true }))}
          onBlur={e => { setEditandoValor(ev => ({ ...ev, [l.uid]: false })); handleEditLancamento(l, 'valor', e.target.value); }}
          onChange={e => handleEditLancamento(l, 'valor', e.target.value)}
        />
      </td>
      <td className="px-1 py-2">
        <select
          className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition cursor-pointer"
          value={l.tipo}
          onChange={e => handleEditLancamento(l, 'tipo', e.target.value)}
        >
          <option value="">Selecione</option>
          <option value="receita">receita</option>
          <option value="despesa">despesa</option>
        </select>
      </td>
      <td className="px-1 py-2">
        <input
          type="text"
          className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
          value={l.categoria && l.categoria.trim() !== '' ? l.categoria : ''}
          placeholder="Categoria"
          onChange={e => handleEditLancamento(l, 'categoria', e.target.value)}
        />
      </td>
    </tr>
  ))
)}
                </tbody>
              </table>
            </div>
          </>
        )}
        </div>
        {/* Footer sticky com botões */}
        <div className="sticky bottom-0 border-t border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-6 flex gap-3 justify-between">
          {step === 2 && (
            <>
              <button
                className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/50 transition font-medium"
                onClick={() => {
                  const container = scrollableRef.current;
                  if (container) {
                    if (scrollPosition > 0) {
                      container.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                    }
                  }
                }}
                title={scrollPosition > 0 ? "Voltar ao topo" : "Ir para o final"}
              >
                {scrollPosition > 0 ? '↑ Topo' : '↓ Final'}
              </button>
              <div className="flex gap-3">
                <button
                  className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/50 transition font-medium"
                  onClick={() => setStep(1)}
                >
                  Voltar
                </button>
                <button
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setStep(3)}
                  disabled={lancamentos.length === 0}
                >
                  Validar Lançamentos
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <button
                className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/50 transition font-medium"
                onClick={() => {
                  const container = scrollableRef.current;
                  if (container) {
                    if (scrollPosition > 0) {
                      container.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
                    }
                  }
                }}
                title={scrollPosition > 0 ? "Voltar ao topo" : "Ir para o final"}
              >
                {scrollPosition > 0 ? '↑ Topo' : '↓ Final'}
              </button>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/50 transition font-medium"
                  onClick={() => setStep(2)}
                >
                  Voltar
                </button>
                <button
                  className={`px-6 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold transition flex items-center gap-2 ${(lancamentos.length === 0 || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={handleImportar}
                  disabled={lancamentos.length === 0 || loading}
                >
                  {loading && <span className="loader border-2 border-t-2 border-white rounded-full w-4 h-4 animate-spin"></span>}
                  {loading ? 'Importando...' : 'Importar'}
                </button>
              </div>
            </>
          )}
        </div>
        {/* Feedback de importação */}
        {importFeedback && (
          <div className={`border-t border-slate-700 p-4 rounded-b-2xl text-sm ${
            importFeedback.success 
              ? 'bg-gradient-to-r from-green-900/50 to-green-900/30 text-green-300 border-t-green-700' 
              : 'bg-gradient-to-r from-red-900/50 to-red-900/30 text-red-300 border-t-red-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{importFeedback.message}</p>
                {importFeedback.success && (
                  <p className="text-xs opacity-90 mt-1">
                    {importFeedback.count} lançamentos adicionados à conta <span className="font-semibold">{importFeedback.accountName}</span>
                  </p>
                )}
              </div>
              <button 
                className="underline text-xs text-slate-300 hover:text-slate-100 transition ml-4 flex-shrink-0" 
                onClick={() => setImportFeedback(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// ================= COMPONENTE PRINCIPAL DA PÁGINA =================

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { formatCurrency, parseValorBR, formatarValorBR } from "../utils/currency";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

// Stub temporário para evitar erro de compilação
function EditContaModal({ conta, open, onClose, onSave }: { conta: any, open: boolean, onClose: () => void, onSave: (contaEditada: any) => Promise<void> }) {
  const [form, setForm] = useState({
    nome: conta?.nome || '',
    tipo: conta?.tipo || '',
    saldo_inicial: conta?.saldo_inicial ?? 0,
  });
  React.useEffect(() => {
    setForm({
      nome: conta?.nome || '',
      tipo: conta?.tipo || '',
      saldo_inicial: conta?.saldo_inicial ?? 0,
    });
  }, [conta]);
  if (!open || !conta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold">Editar Conta</h2>
              <p className="text-sm text-muted-foreground">Atualize as informações da sua conta bancária</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Nome da Conta
            </label>
            <input 
              className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
              placeholder="Ex: Conta Corrente, Poupança..."
              value={form.nome} 
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Tipo de Conta
            </label>
            <select 
              className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
              value={form.tipo} 
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
            >
              <option value="Conta Corrente">Conta Corrente</option>
              <option value="Poupança">Poupança</option>
              <option value="Conta Salário">Conta Salário</option>
              <option value="Conta Digital">Conta Digital</option>
              <option value="Conta Investimento">Conta Investimento</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Saldo Inicial
            </label>
            <input 
              type="number" 
              step="0.01"
              className="w-full px-4 py-3 rounded-lg bg-secondary/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none" 
              placeholder="0.00"
              value={form.saldo_inicial} 
              onChange={e => setForm(f => ({ ...f, saldo_inicial: e.target.value }))} 
            />
            <p className="text-xs text-muted-foreground">Digite o saldo atual da conta</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-secondary/30 p-6 flex gap-3 justify-end border-t border-border">
          <button 
            className="px-6 py-2.5 rounded-lg border border-border hover:bg-secondary/50 transition-all font-medium" 
            onClick={onClose}
          >
            Cancelar
          </button>
          <button 
            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all shadow-lg shadow-primary/20" 
            onClick={() => onSave(conta?.id ? { ...conta, ...form, id: conta.id } : { ...form })}
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ContasPage() {
  const [contas, setContas] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editConta, setEditConta] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteContaOpen, setDeleteContaOpen] = useState(false);
  const [deleteContaLoading, setDeleteContaLoading] = useState(false);
  const [deleteContaTarget, setDeleteContaTarget] = useState<any | null>(null);
  const [deleteContaTransacoesCount, setDeleteContaTransacoesCount] = useState(0);
  const { user } = useAuth();

  async function fetchContas() {
    setLoading(true);
    if (!user || !user.id) {
      setContas([]);
      setTransacoes([]);
      setLoading(false);
      return;
    }
    // Buscar apenas contas do usuário logado
    const { data, error } = await supabase.from('accounts').select('*').eq('user_id', user.id);
    setContas(data || []);
    setError(error);
    // Busca transações do usuário
    const { data: transData, error: transError } = await supabase
      .from('transacoes')
      .select('*')
      .eq('user_id', user.id);

    if (!transError && transData) {
      const transComStatusDerivado = (transData || []).map((t: any) => ({
        ...t,
        status_derivado: t.status || (t.pago ? 'pago' : (t.cartao_id ? 'pendente_fatura' : 'pendente')),
      }));
      setTransacoes(transComStatusDerivado);
    } else {
      setTransacoes([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user?.id) {
      fetchContas();
    }
  }, [user?.id]);

  // Excluir conta
  async function handleDeleteConta(conta) {
    const qtdTransacoesVinculadas = transacoes.filter(t => t.conta_id === conta.id || t.account_id === conta.id).length;
    setDeleteContaTarget(conta);
    setDeleteContaTransacoesCount(qtdTransacoesVinculadas);
    setDeleteContaOpen(true);
  }

  async function confirmDeleteConta(excluirTransacoesVinculadas: boolean) {
    if (!deleteContaTarget) return;
    setDeleteContaLoading(true);

    if (excluirTransacoesVinculadas) {
      const { error: deleteTransacoesError } = await supabase
        .from('transacoes')
        .delete()
        .eq('user_id', user?.id)
        .eq('conta_id', deleteContaTarget.id);

      if (deleteTransacoesError) {
        // Fallback para schemas legados com account_id
        const { error: deleteTransacoesLegadoError } = await supabase
          .from('transacoes')
          .delete()
          .eq('user_id', user?.id)
          .eq('account_id', deleteContaTarget.id);

        if (deleteTransacoesLegadoError) {
          alert('Erro ao excluir transações vinculadas: ' + deleteTransacoesLegadoError.message);
          setDeleteContaLoading(false);
          return;
        }
      }
    }

    const { error } = await supabase.from('accounts').delete().eq('id', deleteContaTarget.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      setDeleteContaLoading(false);
    } else {
      setDeleteContaOpen(false);
      setDeleteContaTarget(null);
      setDeleteContaTransacoesCount(0);
      fetchContas();
      setDeleteContaLoading(false);
    }
  }

  // Editar conta (abrir modal)
  function handleEditConta(conta) {
    setEditConta(conta);
    setEditOpen(true);
  }

  // Salvar edição
  async function handleSaveConta(contaEditada) {
    if (!contaEditada.id) {
      // Nova conta: insert
      const { error } = await supabase.from('accounts').insert({
        nome: contaEditada.nome,
        tipo: 'bank', // Força o campo correto do banco
        saldo_inicial: contaEditada.saldo_inicial ?? 0,
        user_id: user.id
      });
      setEditOpen(false);
      setEditConta(null);
      if (error) {
        alert('Erro ao criar conta: ' + error.message);
      } else {
        fetchContas();
      }
      return;
    }
    // Edição de conta existente
    const { error } = await supabase.from('accounts').update({
      nome: contaEditada.nome,
      tipo: 'bank', // Força o campo correto do banco
      saldo_inicial: contaEditada.saldo_inicial ?? 0
    }).eq('id', contaEditada.id);
    setEditOpen(false);
    setEditConta(null);
    if (error) {
      alert('Erro ao editar: ' + error.message);
    } else {
      fetchContas();
    }
  }

  // Importação de lançamentos: insere no Supabase e retorna feedback detalhado
  async function handleImportLancamentos(lancamentos, contaId, regras) {
    if (!user || !user.id) {
      return { success: false, message: 'Usuário não autenticado.' };
    }
    try {
      // Função auxiliar para buscar ou criar categoria
      async function getOrCreateCategoriaId(nomeCategoria) {
        if (!nomeCategoria) return null;
        // Busca categoria do usuário
        const { data: cat, error: catErr } = await supabase
          .from('categorias')
          .select('id')
          .eq('user_id', user.id)
          .ilike('nome', nomeCategoria)
          .maybeSingle();
        if (cat && cat.id) return cat.id;
        // Cria se não existir
        const { data: newCat, error: newCatErr } = await supabase
          .from('categorias')
          .insert({ user_id: user.id, nome: nomeCategoria })
          .select('id')
          .maybeSingle();
        if (newCat && newCat.id) return newCat.id;
        return null;
      }

      // Para cada lançamento, resolve o categoria_id
      const lancamentosComCategoriaId = [];
      // Busca/cria categorias padrão
      const outrosCategoriaId = await getOrCreateCategoriaId('Outros');
      const rendaExtraCategoriaId = await getOrCreateCategoriaId('Renda Extra');
      const comprasCategoriaId = await getOrCreateCategoriaId('Compras');
      
      // Função para determinar status baseado na data
      const determinarStatus = (dataStr) => {
        try {
          const hoje = new Date();
          hoje.setHours(0, 0, 0, 0);
          
          let data;
          // Se for string em formato yyyy-mm-dd
          if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
            data = new Date(dataStr + 'T00:00:00');
          } else {
            data = new Date(dataStr);
          }
          
          data.setHours(0, 0, 0, 0);
          
          // Se data > hoje → pendente, senão pago
          return data > hoje ? 'pendente' : 'pago';
        } catch {
          return 'pago'; // Padrão é pago se der erro
        }
      };
      
      // Valida se a conta selecionada é realmente bancária
      console.log('contas:', contas);
      console.log('contaId:', contaId);
      const contaSelecionadaObj = contas.find(c => c.id === contaId);
      console.log('contaSelecionadaObj:', contaSelecionadaObj);
      if (!contaSelecionadaObj || (contaSelecionadaObj.tipo || '').toLowerCase() !== 'bank') {
        return { success: false, message: 'Selecione uma conta bancária válida para importar.' };
      }

      for (const l of lancamentos) {
        let categoriaId = null;
        let nomeCategoria = l.categoria && l.categoria.trim() !== '' ? l.categoria.trim() : (l.tipo === 'receita' ? 'Renda Extra' : l.tipo === 'despesa' ? 'Compras' : 'Outros');
        // Busca categoria do usuário pelo nome e tipo
        const { data: cat, error: catErr } = await supabase
          .from('categorias')
          .select('id')
          .eq('user_id', user.id)
          .ilike('nome', nomeCategoria)
          .maybeSingle();
        if (cat && cat.id) {
          categoriaId = cat.id;
        } else {
          // Cria se não existir
          const { data: newCat, error: newCatErr } = await supabase
            .from('categorias')
            .insert({ user_id: user.id, nome: nomeCategoria, tipo: l.tipo })
            .select('id')
            .maybeSingle();
          if (newCat && newCat.id) categoriaId = newCat.id;
        }
        // Conversão de campos do CSV para o schema do banco
        function parseDataBRtoISO(dataBR) {
          if (!dataBR) return null;
          const [dia, mes, ano] = dataBR.split('/');
          return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        }
        function parseValorBR(valorStr) {
          if (valorStr === undefined || valorStr === null) return 0;
          let str = String(valorStr).replace(/[^0-9.,-]/g, '');
          if (str.includes(',')) {
            str = str.replace(/\./g, '').replace(',', '.');
          }
          return parseFloat(str);
        }
        const valorNum = parseValorBR(l.valor);
        const tipo = valorNum >= 0 ? 'receita' : 'despesa';
        lancamentosComCategoriaId.push({
          user_id: user.id,
          conta_id: contaId,
          account_id: contaId,
          categoria_id: categoriaId,
          descricao: l.estabelecimento || l.descricao || '',
          valor: valorNum,
          tipo,
          data: parseDataBRtoISO(l.quando || l.data),
          pago: true,
          observacao: '',
        });
      }

      // Ordena lançamentos do mais novo para o mais antigo
      lancamentosComCategoriaId.sort((a, b) => new Date(b.data) - new Date(a.data));
      // Ordena prévia e validação final também
      if (Array.isArray(lancamentos)) {
        lancamentos.sort((a, b) => new Date(b.data || b.quando) - new Date(a.data || a.quando));
      }
      // Insere em lote
      const { data, error } = await supabase.from('transacoes').insert(lancamentosComCategoriaId).select();
      if (error) {
        return { success: false, message: 'Erro ao importar: ' + error.message };
      }
      fetchContas();
      // Resumo simples e limpo
      const conta = contas.find(c => c.id === contaId);
      return {
        success: true,
        count: (data || []).length,
        accountName: conta ? conta.nome : contaId,
        message: `✓ Importação realizada com sucesso!`
      };
    } catch (e) {
      return { success: false, message: `Erro ao importar: ${e.message || e}` };
    }
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900/70 via-slate-900/50 to-slate-900/30 p-5 md:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold text-slate-100">Contas Bancárias</h2>
            <p className="text-sm text-slate-400 mt-1">Acompanhe o saldo consolidado das suas contas</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              className="h-9 text-sm rounded-lg px-4 font-semibold border-slate-700/70 bg-slate-900/50 hover:bg-slate-800/70"
              onClick={() => setImportOpen(true)}
            >
              Importar Extrato
            </Button>
            <Button
              className="h-9 text-sm rounded-lg px-4 font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/30"
              onClick={() => { setEditConta({ nome: '', tipo: '', saldo_inicial: 0 }); setEditOpen(true); }}
            >
              Adicionar Conta
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          Erro: {error.message || String(error)}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">Carregando contas...</div>
      ) : contas.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">Nenhuma conta cadastrada.</div>
      ) : (
        <div className="space-y-4">
          {contas
            .filter(conta => (conta.tipo || '').toLowerCase() === 'bank')
            .map((conta) => {
              const parseValorSeguro = (raw: any) => {
                if (typeof raw === 'number') return raw;
                if (raw === null || raw === undefined) return 0;
                const s = String(raw).trim();
                if (!s) return 0;
                // Aceita formatos: 1234.56, 1.234,56, -R$ 130,00
                if (s.includes(',')) {
                  const normalized = s.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
                  const n = parseFloat(normalized);
                  return isNaN(n) ? 0 : n;
                }
                const n = parseFloat(s.replace(/[^\d.-]/g, ''));
                return isNaN(n) ? 0 : n;
              };

              const saldoInicial = Number(conta.saldo_inicial ?? conta.saldoInicial ?? conta.saldo ?? 0) || 0;
              const transacoesConta = transacoes.filter(
                t =>
                  (t.conta_id === conta.id ||
                    t.account_id === conta.id ||
                    t.accountId === conta.id) &&
                  !t.cartao_id
              );
              const movimentacaoAplicada = transacoesConta.reduce((acc, t) => {
                const valorNum = parseValorSeguro(t.valor);
                const tipo = (t.tipo || '').toLowerCase();

                // Mesmo critério da tela de Transações: saldo inicial + receitas - despesas.
                if (valorNum < 0) return acc + valorNum;
                if (tipo === 'despesa') return acc - Math.abs(valorNum);
                if (tipo === 'receita') return acc + Math.abs(valorNum);
                return acc + valorNum;
              }, 0);
              const saldoTotal = saldoInicial + movimentacaoAplicada;

              return (
                <Card key={conta.id} className="overflow-hidden border border-slate-800/80 bg-gradient-to-b from-slate-900/70 to-slate-900/40 hover:border-slate-700/80 transition-colors">
                  <CardContent className="p-0">
                    <div className="px-5 py-4 border-b border-slate-800/80 bg-gradient-to-r from-blue-500/10 to-transparent">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="font-bold text-xl text-slate-100">{conta.nome}</h3>
                            <p className="text-xs text-slate-400 mt-1">
                              Saldo inicial: <span className="text-slate-300">{formatCurrency(saldoInicial)}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Saldo Atual</p>
                          <p className={`text-3xl font-bold ${saldoTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(saldoTotal)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button
                          variant="outline"
                          className="h-9 border-slate-700/70 bg-slate-900/40 hover:bg-slate-800/70"
                          onClick={() => handleEditConta(conta)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          className="h-9 border-red-500/40 text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDeleteConta(conta)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
      {/* Modal só aparece se editConta estiver definido */}
      {/* Modal de edição de conta: abre direto para a conta clicada */}
      <EditContaModal
        conta={editConta}
        open={Boolean(editConta) && editOpen}
        onClose={() => { setEditOpen(false); setEditConta(null); }}
        onSave={handleSaveConta}
      />
      <ImportarExtratoModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportLancamentos}
        contas={contas}
      />
      <Dialog open={deleteContaOpen} onOpenChange={(open) => {
        if (deleteContaLoading) return;
        setDeleteContaOpen(open);
        if (!open) {
          setDeleteContaTarget(null);
          setDeleteContaTransacoesCount(0);
        }
      }}>
        <DialogContent className="max-w-md border-slate-700/50 bg-slate-900/95">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Excluir conta</h3>
              <p className="text-sm text-slate-400 mt-1">
                Conta: <span className="text-slate-200 font-medium">{deleteContaTarget?.nome || 'Sem nome'}</span>
              </p>
              <p className="text-sm text-slate-400">
                Transações vinculadas: <span className="text-slate-200 font-medium">{deleteContaTransacoesCount}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteContaLoading}
                onClick={() => confirmDeleteConta(true)}
              >
                Excluir conta + transações vinculadas
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={deleteContaLoading}
                onClick={() => confirmDeleteConta(false)}
              >
                Excluir somente a conta
              </Button>
              <Button
                variant="ghost"
                className="w-full text-slate-300"
                disabled={deleteContaLoading}
                onClick={() => setDeleteContaOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
