  // Função utilitária para normalizar strings (remove acentos, espaços extras, caixa baixa)
  function normalizar(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function categorizar(descricao, regrasTexto) {
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
    return '';
  }
import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
// Modal de importação de extrato bancário


function ImportarExtratoModal({ open, onClose, onImport, contas }) {
    // Estado local para controlar edição de valor por linha
    const [valorEditando, setValorEditando] = useState({});
  // Estados principais do modal de importação
  const [step, setStep] = useState(1);
  const [regrasTexto, setRegrasTexto] = useState(`# ===== DESPESAS =====\n\n# Academia\nsmart fit = Academia\nbluefit = Academia\nselfit = Academia\nbodytech = Academia\njust fit = Academia\ngympass = Academia\nacademia = Academia\n\n# Água\nsabesp = Água\nsanepar = Água\ncopasa = Água\ncaesb = Água\ncasan = Água\ndmae = Água\nembasa = Água\nsaae = Água\n\n# Alimentação\nifood = Alimentação\nubereats = Alimentação\nrestaurante = Alimentação\nlanchonete = Alimentação\npadaria = Alimentação\npizzaria = Alimentação\nhamburgueria = Alimentação\nhabibs = Alimentação\noutback = Alimentação\nmcdonalds = Alimentação\nburger king = Alimentação\nbk = Alimentação\ngiraffas = Alimentação\nsubway = Alimentação\nspoleto = Alimentação\n\n# Aluguel\naluguel = Aluguel\nlocacao residencial = Aluguel\nimobiliaria = Aluguel\nquinto andar = Aluguel\nquintoandar = Aluguel\n\n# Aplicação Investimento\naplicacao cdb = Aplicação Investimento\naplicacao cdb cofrinhos = Aplicação Investimento\naplicacao cdb di = Aplicação Investimento\ncof aplicacao cdb = Aplicação Investimento\ndi aplicacao cdb = Aplicação Investimento\npix transf avenue = Aplicação Investimento\naporte = Aplicação Investimento\nenvio corretora = Aplicação Investimento\ncompra tesouro = Aplicação Investimento\ncompra fundos = Aplicação Investimento\n\n# Assinaturas\nseguro cartao = Assinaturas\nnetflix = Assinaturas\nspotify = Assinaturas\nprime video = Assinaturas\ndisney = Assinaturas\ngloboplay = Assinaturas\nmax = Assinaturas\nhbo = Assinaturas\nyoutube premium = Assinaturas\napple tv = Assinaturas\napple music = Assinaturas\nicloud = Assinaturas\ngoogle one = Assinaturas\nmicrosoft 365 = Assinaturas\nadobe = Assinaturas\nchatgpt = Assinaturas\nnotion = Assinaturas\nonepassword = Assinaturas\ndeezer = Assinaturas\nparamount = Assinaturas\ncanva = Assinaturas\n\n# Carro\nipva = Carro\nlicenciamento = Carro\npag licenciamento de vei = Carro\necovias = Carro\nsem parar = Carro\nrscss ecovias = Carro\nposto = Carro\ngasolina = Carro\netanol = Carro\ndiesel = Carro\nestacionamento = Carro\nmanutencao veiculo = Carro\n\n# Celular\nvivo recarga = Celular\nclaro recarga = Celular\ntim recarga = Celular\noi recarga = Celular\nvivo pos = Celular\nclaro pos = Celular\ntim pos = Celular\noi pos = Celular\nvivo controle = Celular\nclaro controle = Celular\ntim controle = Celular\nrecarga celular = Celular\n\n# Compras\nmercado livre = Compras\nmagalu = Compras\namericanas = Compras\nsubmarino = Compras\ncasas bahia = Compras\nshopee = Compras\namazon = Compras\nkabum = Compras\nfast shop = Compras\ncentauro = Compras\nkalunga = Compras\nshein = Compras\naliexpress = Compras\npaypal = Compras\npagseguro = Compras\nstone = Compras\nsumup = Compras\ngetnet = Compras\ncielo = Compras\nrede = Compras\nsafetopay = Compras\npay shopp = Compras\nreceita fed = Compras\nint pre-pago = Compras\npix qrs = Compras\npix whats = Compras\nmagazine lu = Compras\nnetshoes = Compras\n\n# Educação\nescola = Educação\nfaculdade = Educação\nuniversidade = Educação\ncurso = Educação\nead = Educação\nalura = Educação\nrocketseat = Educação\nudemy = Educação\ncoursera = Educação\nsenai = Educação\netec = Educação\npix transf thamire = Educação\n\n# Energia\nenel = Energia\nlight = Energia\ncemig = Energia\ncopel = Energia\nequatorial = Energia\nrge = Energia\ncelesc = Energia\ncpfl = Energia\nenergisa = Energia\n\n# Farmácia\ndrogaraia = Farmácia\ndroga raia = Farmácia\ndrogasil = Farmácia\npacheco = Farmácia\ndrogaria sao paulo = Farmácia\npanvel = Farmácia\nnissei = Farmácia\naraujo = Farmácia\nfarmaconde = Farmácia\nfarmacia = Farmácia\n\n# Fatura do Cartão\nint mc black = Fatura do Cartão\nint itau black = Fatura do Cartão\npix qrs mercado pag = Fatura do Cartão\npix qrs portoseg = Fatura do Cartão\nportoseg sa = Fatura do Cartão\npagamento fatura = Fatura do Cartão\nfatura cartao = Fatura do Cartão\n\n# Internet\nvivo fibra = Internet\nclaro net = Internet\ntim live = Internet\noi fibra = Internet\ngvt = Internet\nalgar = Internet\nbrisanet = Internet\ndesktop = Internet\nvogel = Internet\nprovedor = Internet\ninternet = Internet\n\n# Lazer\ncinema = Lazer\ncinemark = Lazer\ncinepolis = Lazer\nteatro = Lazer\nshow = Lazer\ningresso = Lazer\nparque = Lazer\nmuseu = Lazer\nthermas = Lazer\nhotel = Lazer\nbooking = Lazer\ndecolar = Lazer\nairbnb = Lazer\nresort = Lazer\nsympla = Lazer\ningresso.com = Lazer\n\n# Mercado\ncarrefour = Mercado\nextra = Mercado\npao de acucar = Mercado\nassai = Mercado\natacadao = Mercado\ndia = Mercado\nsonda = Mercado\ntenda = Mercado\nbig = Mercado\noba = Mercado\nhortifruti = Mercado\nsupermerc = Mercado\nsuper mercado = Mercado\n\n# Moradia\ncondominio = Moradia\niptu = Moradia\nmanutencao residencial = Moradia\nleroy merlin = Moradia\ntelha norte = Moradia\ntok stok = Moradia\ncamicado = Moradia\nmobly = Moradia\n\n# Necessidades\nsaque banco24h = Necessidades\nsaque din atm = Necessidades\natm banco24h = Necessidades\nloterica = Necessidades\ncaixa eletronico = Necessidades\n\n# Pet\npetz = Pet\ncobasi = Pet\npetlove = Pet\npet shop = Pet\nseres = Pet\nvet = Pet\nclinica veterinaria = Pet\ndrogavet = Pet\n\n# Salão/Barbearia\nbarbearia = Salão\nsalao = Salão\ncabeleireiro = Salão\nesmalteria = Salão\nmanicure = Salão\nbarber = Salão\npix transf sergio = Salão\n\n# Saúde\nhospital = Saúde\nclinica = Saúde\nlaboratorio = Saúde\nexame = Saúde\nvacina = Saúde\ndasa = Saúde\nfleury = Saúde\nsabin = Saúde\neinstein = Saúde\nsirio = Saúde\nunimed = Saúde\namil = Saúde\nhapvida = Saúde\nprevent = Saúde\npix transf tania = Saúde\n\n# Transferência (Despesa)\npix transf lincoln = Transferência\npix transf conta itau = Transferência\nted transf conta = Transferência\ndoc transferencia = Transferência\ntransferencia entre contas = Transferência\npix transf minha conta = Transferência\n\n# Uber\nuber = Uber\n99 app = Uber\n99pop = Uber\ncabify = Uber\nindriver = Uber\n\n# Vestuário\nrenner = Vestuário\nriachuelo = Vestuário\ncea = Vestuário\nc&a = Vestuário\nzara = Vestuário\nhering = Vestuário\nmarisa = Vestuário\nyoucom = Vestuário\nnetshoes = Vestuário\ndafiti = Vestuário\n\n# ===== RECEITAS =====\n\n# Aluguel Recebido\naluguel recebido = Aluguel\nrepasse aluguel = Aluguel\ninquilino = Aluguel\nairbnb repasse = Aluguel\n\n# Benefícios/Ajuda\npgto itau itau-k = Benefícios\nsispag fund saude itau = Benefícios\nbeneficio = Benefícios\nreembolso = Benefícios\najuda = Benefícios\n\n# Investimentos\ndividendos = Investimentos\nproventos = Investimentos\njcp = Investimentos\naluguel de acoes = Investimentos\nrendimento fundos = Investimentos\nrendimento fii = Investimentos\nprovento fii = Investimentos\n\n# Juros Investimentos\ncor juros rf = Juros Investimentos\njuros cdb = Juros Investimentos\njuros = Juros Investimentos\nrend pago aplic aut mais = Juros Investimentos\n\n# Recompensas\ncashback = Recompensas\nrecompensa = Recompensas\nbonus = Recompensas\nted 104.0000caixa econ f = Recompensas\nmeliuz = Recompensas\name digital = Recompensas\n\n# Renda Extra\nfreela = Renda Extra\nfreelancer = Renda Extra\nconsultoria = Renda Extra\naula = Renda Extra\nbico = Renda Extra\nrevenda = Renda Extra\ncomissao = Renda Extra\npix cliente = Renda Extra\npagamento servico = Renda Extra\n\n# Resgate Investimentos\nresgate cdb = Resgate Investimentos\nresgate cdb di = Resgate Investimentos\nresgate cdb cofrinhos = Resgate Investimentos\ndi resgate cdb = Resgate Investimentos\ncor tes direto - venda = Resgate Investimentos\ncor amortizacao - rf = Resgate Investimentos\ncor irrf = Resgate Investimentos\nresgate fundo = Resgate Investimentos\nvenda tesouro = Resgate Investimentos\n\n# Salário\nfolha pagamento mensal = Salário\nfolha de ferias = Salário\n13. salario = Salário\nholerite = Salário\npagamento salario = Salário\nproventos folha = Salário\n\n# Transferência (Receita)\npix transf lincoln = Transferência\npix transf conta itau = Transferência\nted transf conta = Transferência\ndoc transferencia = Transferência\ntransferencia entre contas = Transferência\npix transf minha conta = Transferência\n\n# Vendas\nmercado pago receb = Vendas\npagseguro receb = Vendas\nstone receb = Vendas\ngetnet receb = Vendas\nsumup receb = Vendas\nifood repasse = Vendas\nshopee repasse = Vendas\nshopify payout = Vendas\nvenda = Vendas\npagamento cliente = Vendas`);
  const [csvFile, setCsvFile] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [parseError, setParseError] = useState("");
  const [contaSelecionada, setContaSelecionada] = useState(contas?.[0]?.id || '');

  // Atualiza categorias automaticamente ao editar regrasTexto, mas só para lançamentos que não foram editados manualmente
  React.useEffect(() => {
    if (step === 2 && lancamentos.length > 0) {
      setLancamentos(lancs => lancs.map(l => {
        // Se a categoria foi editada manualmente, não sobrescreve
        if (l.categoriaManual) return l;
        return {
          ...l,
          categoria: categorizar(l.estabelecimento, regrasTexto) || ''
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
  React.useEffect(() => {
    if (contas && contas.length > 0) {
      setContaSelecionada(contas[0].id);
    } else {
      setContaSelecionada('');
    }
  }, [contas]);

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
            return {
              uid: gerarUid(),
              quando: dataOriginal,
              estabelecimento: descricao,
              valor: (row[2] || '').replace('.', '').replace(',', '.'),
              tipo: Number((row[2] || '').replace('.', '').replace(',', '.')) < 0 ? 'despesa' : 'receita',
              categoria: categorizar(descricao, regrasTexto),
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
    if (!sortConfig.key) return lancamentos;
    return [...lancamentos].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-card border rounded-lg shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative z-50">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent transition-colors"
          title="Fechar"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-lg bg-blue-500/10">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Importar Extrato/CSV</h2>
            <p className="text-sm text-muted-foreground">Selecione a conta e o arquivo para importar</p>
          </div>
        </div>
        
        {step === 1 && (
          <>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Selecione a conta para importar</label>
                <select
                  className="w-full p-3 rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  value={contaSelecionada}
                  onChange={e => setContaSelecionada(e.target.value)}
                >
                  {(contas && Array.isArray(contas) && contas.length > 0) ? (
                    contas.map((conta) => (
                      <option key={conta.id} value={conta.id}>{conta.name} ({conta.type})</option>
                    ))
                  ) : (
                    <option value="">Nenhuma conta cadastrada</option>
                  )}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Arquivo CSV</label>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    className="w-full p-3 rounded-lg border bg-background text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer transition"
                  />
                </div>
                {csvFile && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {csvFile.name}
                  </p>
                )}
              </div>
            </div>
            
            {parseError && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                {parseError}
              </div>
            )}
            
            <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
              <button
                className="px-4 py-2 rounded-lg border hover:bg-accent transition"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className={`px-6 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition flex items-center gap-2 ${(!csvFile || !contaSelecionada || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleParse}
                disabled={!csvFile || !contaSelecionada || loading}
              >
                {loading ? <span className="loader border-2 border-t-2 border-blue-700 rounded-full w-4 h-4 animate-spin"></span> : null}
                Próximo
              </button>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="mb-2">
              <label className="block text-xs font-bold mb-1 text-zinc-200">Regras de categorização (edite ou cole suas regras):</label>
              <textarea
                className="w-full p-2 rounded bg-black text-yellow-200 text-xs font-mono mb-2"
                style={{ minHeight: 180, maxHeight: 300, height: 220, overflow: 'auto' }}
                value={regrasTexto}
                onChange={e => setRegrasTexto(e.target.value)}
              />
            </div>
            <div className="overflow-x-auto max-h-[50vh] mb-2">
              <table className="min-w-full text-xs border-separate border-spacing-0 rounded-lg shadow-lg" style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#18181b' }}>
                <thead className="sticky top-0">
                  <tr>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 100, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('quando')}>Data</th>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 180, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('estabelecimento')}>Descrição</th>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 90, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('valor')}>Valor</th>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 80, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('tipo')}>Tipo</th>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 120, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('categoria')}>Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-zinc-400 py-4">Nenhum lançamento encontrado no arquivo CSV.</td></tr>
                  ) : (
                    getSortedLancamentos().map((l, idx) => (
                      <tr key={l.uid} className={idx % 2 === 0 ? 'bg-zinc-900/70' : 'bg-zinc-800/70'} style={{ transition: 'background 0.2s' }}>
                        <td className="p-1 border-b border-zinc-800">
                          <input
                            type="text" placeholder="DD/MM/AAAA"
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-text select-text"
                            value={l.quando}
                            onChange={e => handleEditLancamento(l, 'quando', e.target.value)}
                            style={!l.quando || l.quando === '' ? emptyCellStyle : filledCellStyle}
                          />
                        </td>
                        <td className="p-1 border-b border-zinc-800">
                          <input
                            type="text"
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-text select-text"
                            value={l.estabelecimento}
                            onChange={e => handleEditLancamento(l, 'estabelecimento', e.target.value)}
                            style={!l.estabelecimento || l.estabelecimento === '' ? emptyCellStyle : filledCellStyle}
                          />
                        </td>
                        <td className="p-1 border-b border-zinc-800">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-text select-text"
                            value={
                              valorEditando[l.uid] !== undefined
                                ? valorEditando[l.uid]
                                : (l.valor ? (Number(l.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '0,00')
                            }
                            onFocus={e => {
                              setValorEditando(v => ({ ...v, [l.uid]: l.valor ? l.valor.toString().replace('.', ',') : '' }));
                            }}
                            onChange={e => {
                              const raw = e.target.value.replace(/[^\d,]/g, '');
                              setValorEditando(v => ({ ...v, [l.uid]: raw }));
                            }}
                            onBlur={e => {
                              const raw = valorEditando[l.uid] ?? '';
                              const num = parseValorBR(raw);
                              handleEditLancamento(l, 'valor', num);
                              setValorEditando(v => ({ ...v, [l.uid]: num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }));
                            }}
                            style={l.valor === undefined || l.valor === '' ? emptyCellStyle : filledCellStyle}
                          />
                        </td>
                        <td className="p-1 border-b border-zinc-800">
                          <select
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-pointer"
                            value={l.tipo}
                            onChange={e => handleEditLancamento(l, 'tipo', e.target.value)}
                            style={!l.tipo || l.tipo === '' ? emptyCellStyle : filledCellStyle}
                          >
                            <option value="">Selecione</option>
                            <option value="receita">receita</option>
                            <option value="despesa">despesa</option>
                          </select>
                        </td>
                        <td className="p-1 border-b border-zinc-800">
                          <input
                            type="text"
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-text select-text"
                            value={l.categoria && l.categoria.trim() !== '' ? l.categoria : ''}
                            placeholder="Outros"
                            onChange={e => handleEditLancamento(l, 'categoria', e.target.value)}
                            style={!l.categoria || l.categoria.trim() === '' ? noCategoryStyle : filledCellStyle}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                className="px-4 py-2 rounded border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition"
                onClick={() => setStep(1)}
              >
                Voltar
              </button>
              <button
                className={`px-4 py-2 rounded bg-blue-500 text-white font-bold hover:bg-blue-400 transition ${lancamentos.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            <div className="overflow-x-auto max-h-[50vh] mb-2">
              <table className="min-w-full text-xs border-separate border-spacing-0 rounded-lg shadow-lg" style={{ borderCollapse: 'separate', borderSpacing: 0, background: '#18181b' }}>
                <thead className="sticky top-0">
                  <tr>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 100, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('quando')}>Data</th>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 180, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('estabelecimento')}>Descrição</th>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 90, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('valor')}>Valor</th>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 80, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('tipo')}>Tipo</th>
                    <th className="p-2 text-blue-300 bg-zinc-900 border-b border-zinc-800 text-left " style={{ minWidth: 120, fontWeight: 700, fontSize: 13, letterSpacing: 1 }} onClick={() => handleSort('categoria')}>Categoria</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentos.length === 0 ? (
                    <tr><td colSpan={5} className="text-center text-zinc-400 py-4">Nenhum lançamento encontrado no arquivo CSV.</td></tr>
                  ) : (
                    getSortedLancamentos().map((l, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-zinc-900/70' : 'bg-zinc-800/70'} style={{ transition: 'background 0.2s' }}>
                        <td className="p-1 border-b border-zinc-800">
                          <input
                            type="text" placeholder="DD/MM/AAAA"
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-text select-text"
                            value={l.quando}
                            onChange={e => handleEditLancamento(l, 'quando', e.target.value)}
                            style={!l.quando || l.quando === '' ? emptyCellStyle : filledCellStyle}
                          />
                        </td>
                        <td className="p-1 border-b border-zinc-800">
                          <input
                            type="text"
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-text select-text"
                            value={l.estabelecimento}
                            onChange={e => handleEditLancamento(l, 'estabelecimento', e.target.value)}
                            style={!l.estabelecimento || l.estabelecimento === '' ? emptyCellStyle : filledCellStyle}
                          />
                        </td>
                        <td className="p-1 border-b border-zinc-800">
                          <input
                            type="text"
                            inputMode="decimal"
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-text select-text"
                            value={formatarValorBR(l.valor?.toString() ?? '')}
                            onChange={e => {
                              const formatted = formatarValorBR(e.target.value);
                              handleEditLancamento(l, 'valor', parseValorBR(formatted));
                            }}
                            style={l.valor === undefined || l.valor === '' ? emptyCellStyle : filledCellStyle}
                          />
                        </td>
                        <td className="p-1 border-b border-zinc-800">
                          <select
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-pointer"
                            value={l.tipo}
                            onChange={e => handleEditLancamento(l, 'tipo', e.target.value)}
                            style={!l.tipo || l.tipo === '' ? emptyCellStyle : filledCellStyle}
                          >
                            <option value="">Selecione</option>
                            <option value="receita">receita</option>
                            <option value="despesa">despesa</option>
                          </select>
                        </td>
                        <td className="p-1 border-b border-zinc-800">
                          <input
                            type="text"
                            className="w-full px-2 py-1 rounded bg-zinc-950 focus:bg-blue-50 focus:text-blue-900 border border-zinc-800 focus:border-blue-400 outline-none transition text-sm text-blue-100 cursor-text select-text"
                            value={l.categoria && l.categoria.trim() !== '' ? l.categoria : ''}
                            placeholder="Outros"
                            onChange={e => handleEditLancamento(l, 'categoria', e.target.value)}
                            style={!l.categoria || l.categoria.trim() === '' ? noCategoryStyle : filledCellStyle}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                className="px-4 py-2 rounded border border-zinc-600 text-zinc-300 hover:bg-zinc-800 transition"
                onClick={() => setStep(2)}
              >
                Voltar
              </button>
              <button
                className={`px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-500 transition flex items-center gap-2 ${(lancamentos.length === 0 || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleImportar}
                disabled={lancamentos.length === 0 || loading}
              >
                {loading ? (
                  <>
                    <span className="loader border-2 border-t-2 border-white rounded-full w-4 h-4 animate-spin"></span>
                    Importando...
                  </>
                ) : (
                  'Finalizar Importação'
                )}
              </button>
            </div>
          </>
        )}
        {/* Feedback de importação */}
        {importFeedback && (
          <div className={`mb-4 p-3 rounded text-sm font-bold ${importFeedback.success ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {importFeedback.message}
            <button className="ml-4 underline text-xs text-blue-200" onClick={() => setImportFeedback(null)}>Fechar</button>
          </div>
        )}
      </div>
    </div>
  );
}
// ================= COMPONENTE PRINCIPAL DA PÁGINA =================

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { formatCurrency, parseValorBR, formatarValorBR } from "../utils/currency";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";

// Stub temporário para evitar erro de compilação
function EditContaModal({ conta, open, onClose, onSave }: { conta: any, open: boolean, onClose: () => void, onSave: (contaEditada: any) => Promise<void> }) {
  const [form, setForm] = useState({
    name: conta?.name || '',
    type: conta?.type || '',
    saldoInicial: conta?.saldo_inicial ?? conta?.saldoInicial ?? 0,
  });
  React.useEffect(() => {
    setForm({
      name: conta?.name || '',
      type: conta?.type || '',
      saldoInicial: conta?.saldo_inicial ?? conta?.saldoInicial ?? 0,
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
              value={form.name} 
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
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
              value={form.type} 
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
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
              value={form.saldoInicial} 
              onChange={e => setForm(f => ({ ...f, saldoInicial: e.target.value }))} 
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
            onClick={() => onSave({ ...conta, ...form })}
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
      .select('id, valor, tipo, account_id')
      .eq('userid', user.id);
    if (!transError && transData) {
      setTransacoes(transData);
    } else {
      setTransacoes([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchContas();
  }, []);

  // Excluir conta
  async function handleDeleteConta(conta) {
    if (!window.confirm('Tem certeza que deseja excluir esta conta?')) return;
    const { error } = await supabase.from('accounts').delete().eq('id', conta.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
    } else {
      fetchContas();
    }
  }

  // Editar conta (abrir modal)
  function handleEditConta(conta) {
    setEditConta(conta);
    setEditOpen(true);
  }

  // Salvar edição
  async function handleSaveConta(contaEditada) {
    const { error } = await supabase.from('accounts').update({ name: contaEditada.name, type: contaEditada.type, saldoInicial: contaEditada.saldoInicial ?? contaEditada.saldo_inicial }).eq('id', contaEditada.id);
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
          .eq('userid', user.id)
          .ilike('nome', nomeCategoria)
          .maybeSingle();
        if (cat && cat.id) return cat.id;
        // Cria se não existir
        const { data: newCat, error: newCatErr } = await supabase
          .from('categorias')
          .insert({ userid: user.id, nome: nomeCategoria, tags: null })
          .select('id')
          .maybeSingle();
        if (newCat && newCat.id) return newCat.id;
        return null;
      }

      // Para cada lançamento, resolve o categoria_id
      const lancamentosComCategoriaId = [];
      // Busca/cria categoria 'Outros' uma vez
      const outrosCategoriaId = await getOrCreateCategoriaId('Outros');
      for (const l of lancamentos) {
        let categoryId = null;
        if (l.categoria && l.categoria.trim() !== '') {
          categoryId = await getOrCreateCategoriaId(l.categoria.trim());
        } else {
          categoryId = outrosCategoriaId;
        }
        lancamentosComCategoriaId.push({
          quando: l.quando,
          estabelecimento: l.estabelecimento,
          valor: Number(l.valor),
          tipo: l.tipo,
          category_id: categoryId,
          account_id: contaId,
          userid: user.id,
          detalhes: '',
        });
      }

      // Insere em lote
      const { data, error } = await supabase.from('transacoes').insert(lancamentosComCategoriaId).select();
      if (error) {
        return { success: false, message: 'Erro ao importar: ' + error.message };
      }
      fetchContas();
      // Resumo detalhado
      const conta = contas.find(c => c.id === contaId);
      const exemplos = (data || []).slice(0, 3).map(l => `${l.quando} - ${l.estabelecimento} - ${formatCurrency(l.valor)} - ${l.categoria_id || ''}`).join('\n');
      return {
        success: true,
        message: `Importação realizada com sucesso!\nConta: ${conta ? conta.name : contaId}\nLançamentos importados: ${(data || []).length}\nExemplos:\n${exemplos}`
      };
    } catch (e) {
      return { success: false, message: `Erro ao importar: ${e.message || e}` };
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">Contas Bancárias</h2>
        <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>Importar Extrato</Button>
      </div>
      {error && (
        <div className="text-red-500 mb-2">Erro: {error.message || String(error)}</div>
      )}
      {loading ? (
          <p>Carregando contas...</p>
      ) : contas.length === 0 ? (
        <p>Nenhuma conta cadastrada.</p>
      ) : (
        contas
          .filter(conta => {
            // Ignora qualquer conta cujo type contenha 'cartao' ou 'cartão' (case insensitive, sem acento)
            if (!conta.type) return true;
            const tipo = (conta.type || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
            return !tipo.includes('cartao');
          })
          .map((conta) => {
            // Saldo inicial (compatível com saldo_inicial e saldoInicial)
            const saldoInicial =
              (typeof conta.saldo_inicial !== 'undefined' && conta.saldo_inicial !== null)
                ? Number(conta.saldo_inicial)
                : (typeof conta.saldoInicial !== 'undefined' && conta.saldoInicial !== null ? Number(conta.saldoInicial) : 0);

            // Filtra apenas transações da conta exibida
            const transacoesConta = transacoes.filter(t => t.account_id === conta.id);
            // Soma receitas e despesas APENAS dessas transações
            // Receitas: soma apenas valores positivos
            const receitas = transacoesConta.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0);
            // Despesas: soma valores absolutos (despesas são salvas como positivas no banco)
            const despesas = transacoesConta.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0);
            // Saldo: saldo inicial + receitas - despesas
            const saldoTotal = saldoInicial + receitas - despesas;
            return (
              <Card key={conta.id} className="mb-4 overflow-hidden border-l-4 border-l-primary hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  {/* Header da Conta */}
                  <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 border-b border-border/50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{conta.name}</h3>
                          <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary/50">{conta.type}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Saldo Atual</p>
                        <p className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(saldoTotal)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detalhes da Conta */}
                  <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Saldo Inicial</p>
                        <p className="font-semibold">{formatCurrency(saldoInicial)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Receitas</p>
                        <p className="font-semibold text-green-500">+{formatCurrency(receitas)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Despesas</p>
                        <p className="font-semibold text-red-500">-{formatCurrency(despesas)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Transações</p>
                        <p className="font-semibold">{transacoesConta.length}</p>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-2 justify-end">
                      <button 
                        className="px-4 py-2 rounded-lg border border-border hover:bg-secondary/50 transition text-sm font-medium flex items-center gap-2" 
                        onClick={() => handleEditConta(conta)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button 
                        className="px-4 py-2 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 transition text-sm font-medium flex items-center gap-2" 
                        onClick={() => handleDeleteConta(conta)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Excluir
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
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
      <Button className="mt-4">Adicionar Conta</Button>
    </div>
  );
}
