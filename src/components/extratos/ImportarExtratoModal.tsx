import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

// Função utilitária para normalizar strings (remove acentos, espaços extras, caixa baixa)
function normalizar(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function categorizar(descricao: string, regrasTexto: string, tipo: string = ''): string {
  if (!descricao) return '';
  const descNorm = normalizar(descricao);
  const regras = (regrasTexto || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && l.includes('='));
  let melhorCategoria = '';
  let melhorTamanhoTermo = -1;
  for (const regra of regras) {
    const idx = regra.indexOf('=');
    if (idx <= 0 || idx >= regra.length - 1) continue;
    const termo = regra.slice(0, idx).trim();
    const categoria = regra.slice(idx + 1).trim();
    if (!termo || !categoria) continue;
    const termoNormalizado = normalizar(termo);
    if (termoNormalizado.length < 2) continue;
    if (descNorm.includes(termoNormalizado)) {
      const catNorm = categoria.trim();
      if (termoNormalizado.length > melhorTamanhoTermo) {
        melhorTamanhoTermo = termoNormalizado.length;
        melhorCategoria = catNorm.charAt(0).toUpperCase() + catNorm.slice(1);
      }
    }
  }
  return melhorCategoria;
}

interface Lancamento {
  uid: string;
  quando: string;
  estabelecimento: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria: string;
  categoriaManual?: boolean;
}

interface ImportarExtratoModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (lancamentos: Lancamento[], contaId: string, regrasTexto: string) => Promise<any>;
  contas: any[];
}

export function ImportarExtratoModal({ open, onClose, onImport, contas }: ImportarExtratoModalProps) {
  const { user } = useAuth();

  // Estados principais do modal de importação
  const [step, setStep] = useState(1);
  const [regrasTexto, setRegrasTexto] = useState(`# ===== DESPESAS =====\n\n# Academia\nsmart fit = Academia\nbluefit = Academia\nselfit = Academia\nbodytech = Academia\njust fit = Academia\ngympass = Academia\nacademia = Academia\n\n# Água\nsabesp = Água\nsanepar = Água\ncopasa = Água\ncaesb = Água\ncasan = Água\ndmae = Água\nembasa = Água\nsaae = Água\n\n# Alimentação\nifood = Alimentação\nubereats = Alimentação\nrestaurante = Alimentação\nlanchonete = Alimentação\npadaria = Alimentação\npizzaria = Alimentação\nhamburgueria = Alimentação\nhabibs = Alimentação\noutback = Alimentação\nmcdonalds = Alimentação\nburger king = Alimentação\nbk = Alimentação\ngiraffas = Alimentação\nsubway = Alimentação\nspoleto = Alimentação\n\n# Aluguel\naluguel = Aluguel\nlocacao residencial = Aluguel\nimobiliaria = Aluguel\nquinto andar = Aluguel\nquintoandar = Aluguel\n\n# Aplicação Investimento\naplicacao cdb = Aplicação Investimento\naplicacao cdb cofrinhos = Aplicação Investimento\naplicacao cdb di = Aplicação Investimento\ncof aplicacao cdb = Aplicação Investimento\ndi aplicacao cdb = Aplicação Investimento\npix transf avenue = Aplicação Investimento\naporte = Aplicação Investimento\nenvio corretora = Aplicação Investimento\ncompra tesouro = Aplicação Investimento\ncompra fundos = Aplicação Investimento\n\n# Assinaturas\nseguro cartao = Assinaturas\nnetflix = Assinaturas\nspotify = Assinaturas\nprime video = Assinaturas\ndisney = Assinaturas\ngloboplay = Assinaturas\nmax = Assinaturas\nhbo = Assinaturas\nyoutube premium = Assinaturas\napple tv = Assinaturas\napple music = Assinaturas\nicloud = Assinaturas\ngoogle one = Assinaturas\nmicrosoft 365 = Assinaturas\nadobe = Assinaturas\nchatgpt = Assinaturas\nnotion = Assinaturas\nonepassword = Assinaturas\ndeezer = Assinaturas\nparamount = Assinaturas\ncanva = Assinaturas\n\n# Carro\nipva = Carro\nlicenciamento = Carro\npag licenciamento de vei = Carro\necovias = Carro\nsem parar = Carro\nrscss ecovias = Carro\nposto = Carro\ngasolina = Carro\netanol = Carro\ndiesel = Carro\nestacionamento = Carro\nmanutencao veiculo = Carro\n\n# Celular\nvivo recarga = Celular\nclaro recarga = Celular\ntim recarga = Celular\noi recarga = Celular\nvivo pos = Celular\nclaro pos = Celular\ntim pos = Celular\noi pos = Celular\nvivo controle = Celular\nclaro controle = Celular\ntim controle = Celular\nrecarga celular = Celular\n\n# Compras\nmercado livre = Compras\nmagalu = Compras\namericanas = Compras\nsubmarino = Compras\ncasas bahia = Compras\nshopee = Compras\namazon = Compras\nkabum = Compras\nfast shop = Compras\ncentauro = Compras\nkalunga = Compras\nshein = Compras\naliexpress = Compras\npaypal = Compras\npagseguro = Compras\nstone = Compras\nsumup = Compras\ngetnet = Compras\ncielo = Compras\nrede = Compras\nsafetopay = Compras\npay shopp = Compras\nreceita fed = Compras\nint pre-pago = Compras\npix qrs = Compras\npix whats = Compras\nmagazine lu = Compras\nnetshoes = Compras\n\n# Educação\nescola = Educação\nfaculdade = Educação\nuniversidade = Educação\ncurso = Educação\nead = Educação\nalura = Educação\nrocketseat = Educação\nudemy = Educação\ncoursera = Educação\nsenai = Educação\netec = Educação\npix transf thamire = Educação\n\n# Energia\nenel = Energia\nlight = Energia\ncemig = Energia\ncopel = Energia\nequatorial = Energia\nrge = Energia\ncelesc = Energia\ncpfl = Energia\nenergisa = Energia\n\n# Farmácia\ndrogaraia = Farmácia\ndroga raia = Farmácia\ndrogasil = Farmácia\npacheco = Farmácia\ndrogaria sao paulo = Farmácia\npanvel = Farmácia\nnissei = Farmácia\naraujo = Farmácia\nfarmaconde = Farmácia\nfarmacia = Farmácia\n\n# Fatura do Cartão\nint mc black = Fatura do Cartão\nint itau black = Fatura do Cartão\npix qrs mercado pag = Fatura do Cartão\npix qrs portoseg = Fatura do Cartão\nportoseg sa = Fatura do Cartão\npagamento fatura = Fatura do Cartão\nfatura cartao = Fatura do Cartão\n\n# Internet\nvivo fibra = Internet\nclaro net = Internet\ntim live = Internet\noi fibra = Internet\ngvt = Internet\nalgar = Internet\nbrisanet = Internet\ndesktop = Internet\nvogel = Internet\nprovedor = Internet\ninternet = Internet\n\n# Lazer\ncinema = Lazer\ncinemark = Lazer\ncinepolis = Lazer\nteatro = Lazer\nshow = Lazer\ningresso = Lazer\nparque = Lazer\nmuseu = Lazer\nthermas = Lazer\nhotel = Lazer\nbooking = Lazer\ndecolar = Lazer\nairbnb = Lazer\nresort = Lazer\nsympla = Lazer\ningresso.com = Lazer\n\n# Mercado\ncarrefour = Mercado\nextra = Mercado\npao de acucar = Mercado\nassai = Mercado\natacadao = Mercado\ndia = Mercado\nsonda = Mercado\ntenda = Mercado\nbig = Mercado\noba = Mercado\nhortifruti = Mercado\nsupermerc = Mercado\nsuper mercado = Mercado\n\n# Moradia\ncondominio = Moradia\niptu = Moradia\nmanutencao residencial = Moradia\nleroy merlin = Moradia\ntelha norte = Moradia\ntok stok = Moradia\ncamicado = Moradia\nmobly = Moradia\n\n# Necessidades\nsaque banco24h = Necessidades\nsaque din atm = Necessidades\natm banco24h = Necessidades\nloterica = Necessidades\ncaixa eletronico = Necessidades\n\n# Pet\npetz = Pet\ncobasi = Pet\npetlove = Pet\npet shop = Pet\nseres = Pet\nvet = Pet\nclinica veterinaria = Pet\ndrogavet = Pet\n\n# Salão/Barbearia\nbarbearia = Salão\nsalao = Salão\ncabeleireiro = Salão\nesmalteria = Salão\nmanicure = Salão\nbarber = Salão\npix transf sergio = Salão\n\n# Saúde\nhospital = Saúde\nclinica = Saúde\nlaboratorio = Saúde\nexame = Saúde\nvacina = Saúde\ndasa = Saúde\nfleury = Saúde\nsabin = Saúde\neinstein = Saúde\nsirio = Saúde\nunimed = Saúde\namil = Saúde\nhapvida = Saúde\nprevent = Saúde\npix transf tania = Saúde\n\n# Transferência (Despesa)\npix transf lincoln = Transferência\npix transf conta itau = Transferência\nted transf conta = Transferência\ndoc transferencia = Transferência\ntransferencia entre contas = Transferência\npix transf minha conta = Transferência\n\n# Uber\nuber = Uber\n99 app = Uber\n99pop = Uber\ncabify = Uber\nindriver = Uber\n\n# Vestuário\nrenner = Vestuário\nriachuelo = Vestuário\ncea = Vestuário\nc&a = Vestuário\nzara = Vestuário\nhering = Vestuário\nmarisa = Vestuário\nyoucom = Vestuário\nnetshoes = Vestuário\ndafiti = Vestuário\n\n# ===== RECEITAS =====\n\n# Aluguel Recebido\naluguel recebido = Aluguel\nrepasse aluguel = Aluguel\ninquilino = Aluguel\nairbnb repasse = Aluguel\n\n# Benefícios/Ajuda\npgto itau itau-k = Benefícios\nsispag fund saude itau = Benefícios\nbeneficio = Benefícios\nreembolso = Benefícios\najuda = Benefícios\n\n# Investimentos\ndividendos = Investimentos\nproventos = Investimentos\njcp = Investimentos\naluguel de acoes = Investimentos\nrendimento fundos = Investimentos\nrendimento fii = Investimentos\nprovento fii = Investimentos\n\n# Juros Investimentos\ncor juros rf = Juros Investimentos\njuros cdb = Juros Investimentos\njuros = Juros Investimentos\nrend pago aplic aut mais = Juros Investimentos\n\n# Recompensas\ncashback = Recompensas\nrecompensa = Recompensas\nbonus = Recompensas\nted 104.0000caixa econ f = Recompensas\nmeliuz = Recompensas\name digital = Recompensas\n\n# Renda Extra\nfreela = Renda Extra\nfreelancer = Renda Extra\nconsultoria = Renda Extra\naula = Renda Extra\nbico = Renda Extra\nrevenda = Renda Extra\ncomissao = Renda Extra\npix cliente = Renda Extra\npagamento servico = Renda Extra\n\n# Resgate Investimentos\nresgate cdb = Resgate Investimentos\nresgate cdb di = Resgate Investimentos\nresgate cdb cofrinhos = Resgate Investimentos\ndi resgate cdb = Resgate Investimentos\ncor tes direto - venda = Resgate Investimentos\ncor amortizacao - rf = Resgate Investimentos\ncor irrf = Resgate Investimentos\nresgate fundo = Resgate Investimentos\nvenda tesouro = Resgate Investimentos\n\n# Salário\nfolha pagamento mensal = Salário\nfolha de ferias = Salário\n13. salario = Salário\nholerite = Salário\npagamento salario = Salário\nproventos folha = Salário\n\n# Transferência (Receita)\npix transf lincoln = Transferência\npix transf conta itau = Transferência\nted transf conta = Transferência\ndoc transferencia = Transferência\ntransferencia entre contas = Transferência\npix transf minha conta = Transferência\n\n# Vendas\nmercado pago receb = Vendas\npagseguro receb = Vendas\nstone receb = Vendas\ngetnet receb = Vendas\nsumup receb = Vendas\nifood repasse = Vendas\nshopee repasse = Vendas\nshopify payout = Vendas\nvenda = Vendas\npagamento cliente = Vendas`);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [parseError, setParseError] = useState("");
  
  const getPrimeiraContaBancariaId = (contasArr: any[]) => {
    if (!contasArr || contasArr.length === 0) return '';
    const contaBank = contasArr.find(c => (c.tipo || '').toLowerCase() === 'bank');
    return contaBank ? contaBank.id : '';
  };
  
  const [contaSelecionada, setContaSelecionada] = useState(getPrimeiraContaBancariaId(contas));
  const [categorias, setCategorias] = useState<any[]>([]);
  
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
    { nome: 'Carro', tipo: 'despesa' },
    { nome: 'Celular', tipo: 'despesa' },
    { nome: 'Compras', tipo: 'despesa' },
    { nome: 'Condomínio', tipo: 'despesa' },
    { nome: 'Casa', tipo: 'despesa' },
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
      let { data: existentes, error } = await supabase
        .from('categorias')
        .select('id, nome, tipo, user_id, tags, created_at')
        .eq('user_id', user.id);
      if (error) existentes = [];
      const faltantes = categoriasPadrao.filter(catPadrao =>
        !existentes?.some(cat => cat.nome === catPadrao.nome && cat.tipo === catPadrao.tipo)
      );
      if (faltantes.length > 0) {
        await supabase
          .from('categorias')
          .insert(faltantes.map(cat => ({ ...cat, user_id: user.id })));
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

  // Atualiza categorias automaticamente ao editar regrasTexto
  useEffect(() => {
    if (step === 2 && lancamentos.length > 0) {
      setLancamentos(lancs => lancs.map(l => {
        const categoriaRegra = categorizar(l.estabelecimento, regrasTexto, l.tipo);
        if (categoriaRegra) {
          return {
            ...l,
            categoria: categoriaRegra,
          };
        }
        if (l.categoriaManual) return l;
        return {
          ...l,
          categoria: ''
        };
      }));
    }
  }, [regrasTexto, step]);

  // Carregar regras do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('regrasTexto');
    if (saved) setRegrasTexto(saved);
  }, []);

  // Salvar regras no localStorage
  useEffect(() => {
    localStorage.setItem('regrasTexto', regrasTexto);
  }, [regrasTexto]);

  useEffect(() => {
    if (open) {
      setContaSelecionada(getPrimeiraContaBancariaId(contas));
    }
  }, [contas, open]);

  const [editandoValor, setEditandoValor] = useState<Record<string, boolean>>({});
  const [editandoData, setEditandoData] = useState<Record<string, boolean>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [loading, setLoading] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [importFeedback, setImportFeedback] = useState<any>(null);

  function formatarValorBR(valor: number): string {
    return (typeof valor === 'number') ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
  }

  function formatarDataBR(dataStr: string): string {
    if (!dataStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataStr)) {
      const [ano, mes, dia] = dataStr.split('-');
      return `${dia}/${mes}/${ano}`;
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) {
      return dataStr;
    }
    const d = new Date(dataStr);
    if (!isNaN(d.getTime())) {
      const dia = String(d.getDate()).padStart(2, '0');
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const ano = d.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
    return dataStr;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvFile(e.target.files?.[0] || null);
    setParseError("");
  };

  const handleParse = () => {
    setParseError("");
    if (!csvFile) return;
    setLoading(true);
    Papa.parse(csvFile, {
      header: false,
      delimiter: ";",
      skipEmptyLines: true,
      complete: (results: any) => {
        setLoading(false);
        function gerarUid() {
          return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        }
        const parsed = results.data
          .filter((row: any[]) => Array.isArray(row) && row.length >= 2 && row[0] && row[1])
          .map((row: any[]) => {
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
        if (parsed.length === 0) {
          setParseError("Nenhum lançamento encontrado no arquivo CSV.");
          return;
        }
        setLancamentos(parsed);
        setStep(2);
      },
      error: (err: any) => {
        setLoading(false);
        setParseError("Erro ao ler o arquivo CSV: " + err.message);
      }
    });
  };

  const handleEditLancamento = (lancamento: Lancamento, campo: string, valor: any) => {
    setLancamentos(lancamentos => {
      const novos = [...lancamentos];
      const idx = novos.findIndex(l => l.uid === lancamento.uid);
      if (idx !== -1) {
        novos[idx] = { ...novos[idx], [campo]: valor };
        if (campo === 'categoria') {
          novos[idx].categoriaManual = true;
        }
      }
      return novos;
    });
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortedLancamentos = () => {
    if (!sortConfig.key) {
      return [...lancamentos].sort((a, b) => {
        const da = new Date(a.quando);
        const db = new Date(b.quando);
        return db.getTime() - da.getTime();
      });
    }
    return [...lancamentos].sort((a, b) => {
      if (a[sortConfig.key as keyof Lancamento] < b[sortConfig.key as keyof Lancamento]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key as keyof Lancamento] > b[sortConfig.key as keyof Lancamento]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const renderSortIndicator = (columnKey: string) => {
    if (sortConfig.key !== columnKey) return ' ';
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const handleImportar = async () => {
    const pendentesCategoria = lancamentos.filter((l) => !String(l.categoria || '').trim());
    if (pendentesCategoria.length > 0) {
      setImportFeedback({
        success: false,
        message: `${pendentesCategoria.length} lançamento(s) sem categoria. Preencha antes de importar.`,
      });
      return;
    }
    setLoading(true);
    try {
      const result = await onImport(lancamentos, contaSelecionada, regrasTexto);
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
    } catch (e: any) {
      setImportFeedback({
        success: false,
        message: `Erro ao importar: ${e.message || e}`
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={(e) => e.currentTarget === e.target && onClose()}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col relative z-50">
        <div className="overflow-y-auto flex-1 p-8">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Importar Extrato/CSV</h2>
                <p className="text-sm text-slate-400 mt-1">Carregue seus lançamentos com inteligência de categorização</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

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
                          <option key={conta.id} value={conta.id}>{conta.nome} ({conta.tipo})</option>
                        ))
                    ) : (
                      <option value="">Nenhuma conta cadastrada</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">Arquivo CSV</label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="w-full px-4 py-4 rounded-xl border-2 border-dashed border-slate-600 hover:border-slate-500 bg-slate-800/30 text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-blue-600 file:text-white hover:file:from-blue-600 hover:file:to-blue-700 cursor-pointer transition"
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

              {parseError && (
                <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium flex items-start gap-3">
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
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-700 hover:to-blue-600 transition flex items-center gap-2 disabled:opacity-50"
                  onClick={handleParse}
                  disabled={!csvFile || !contaSelecionada || loading}
                >
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
                />
              </div>

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
                              onChange={e => handleEditLancamento(l, 'tipo', e.target.value as 'receita' | 'despesa')}
                            >
                              <option value="">Selecione</option>
                              <option value="receita">receita</option>
                              <option value="despesa">despesa</option>
                            </select>
                          </td>
                          <td className="px-1 py-2">
                            <input
                              type="text"
                              className={`w-full px-1 py-1 rounded-lg bg-slate-700/30 border text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition ${
                                !String(l.categoria || '').trim() ? 'border-red-500/70' : 'border-slate-600/50'
                              }`}
                              value={l.categoria && l.categoria.trim() !== '' ? l.categoria : ''}
                              placeholder="Preencha categoria"
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
        </div>

        <div className="sticky bottom-0 border-t border-slate-700 bg-gradient-to-br from-slate-900 to-slate-950 p-6 flex gap-3 justify-between">
          {step === 2 && (
            <>
              <button
                className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/50 transition font-medium"
                onClick={() => setStep(1)}
              >
                Voltar
              </button>
              <button
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold transition disabled:opacity-50"
                onClick={handleImportar}
                disabled={lancamentos.length === 0 || loading}
              >
                {loading ? 'Importando...' : 'Importar'}
              </button>
            </>
          )}
        </div>

        {importFeedback && (
          <div className={`border-t border-slate-700 p-4 rounded-b-2xl text-sm ${
            importFeedback.success
              ? 'bg-gradient-to-r from-green-900/50 to-green-900/30 text-green-300 border-t-green-700'
              : 'bg-gradient-to-r from-red-900/50 to-red-900/30 text-red-300 border-t-red-700'
          }`}>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{importFeedback.message}</p>
              <button
                className="underline text-xs text-slate-300 hover:text-slate-100 transition ml-4"
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
