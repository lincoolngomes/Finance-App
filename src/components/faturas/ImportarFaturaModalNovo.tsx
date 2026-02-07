import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { toast } from '@/hooks/use-toast';

// Função utilitária para normalizar strings
function normalizar(str: string): string {
  return (str || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function categorizar(descricao: string, regrasTexto: string): string {
  if (!descricao) return 'Compras';
  const descNorm = normalizar(descricao);
  const regras = regrasTexto.split('\n').filter(l => l.includes('=')).map(l => l.trim());
  for (const regra of regras) {
    const [termo, categoria] = regra.split('=').map(s => s.trim());
    if (descNorm.includes(normalizar(termo))) {
      const catNorm = categoria.trim();
      return catNorm.charAt(0).toUpperCase() + catNorm.slice(1);
    }
  }
  return 'Compras';
}

interface Transacao {
  uid: string;
  quando: string;
  estabelecimento: string;
  valor: number;
  categoria: string;
  categoriaManual?: boolean;
}

interface ImportarFaturaModalNovoProps {
  open: boolean;
  onClose: () => void;
  onImport: (transacoes: Transacao[], cartaoId: string, regrasTexto: string) => Promise<any>;
  cartoes: any[];
}

export function ImportarFaturaModalNovo({ open, onClose, onImport, cartoes }: ImportarFaturaModalNovoProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  // Estados principais
  const [step, setStep] = useState(1);
  const [regrasTexto, setRegrasTexto] = useState(`# ===== CATEGORIAS DE CARTÃO =====\n\n# Alimentação\nifood = Alimentação\nubereats = Alimentação\nrestaurante = Alimentação\nlanchonete = Alimentação\npadaria = Alimentação\npizzaria = Alimentação\nhamburgueria = Alimentação\nhabibs = Alimentação\noutback = Alimentação\nmcdonalds = Alimentação\nburger king = Alimentação\nbk = Alimentação\ngiraffas = Alimentação\nsubway = Alimentação\nspoleto = Alimentação\nsupermercado = Alimentação\ncarrefour = Alimentação\npao de acucar = Alimentação\nassai = Alimentação\n\n# Transporte\nuber = Transporte\n99 app = Transporte\n99pop = Transporte\ncabify = Transporte\nindriver = Transporte\ntaxi = Transporte\n\n# Compras\nmercado livre = Compras\nmagalu = Compras\namericanas = Compras\nsubmarino = Compras\ncasas bahia = Compras\nshopee = Compras\namazon = Compras\nkabum = Compras\nfast shop = Compras\ncentauro = Compras\nkalunga = Compras\nshein = Compras\naliexpress = Compras\npaypal = Compras\npagseguro = Compras\nstone = Compras\nsumup = Compras\ngetnet = Compras\ncielo = Compras\nrede = Compras\n\n# Assinaturas\nnetflix = Assinaturas\nspotify = Assinaturas\nprime video = Assinaturas\ndisney = Assinaturas\ngloboplay = Assinaturas\nmax = Assinaturas\nhbo = Assinaturas\nyoutube premium = Assinaturas\napple tv = Assinaturas\napple music = Assinaturas\nicloud = Assinaturas\ngoogle one = Assinaturas\nmicrosoft 365 = Assinaturas\nadobe = Assinaturas\nchatgpt = Assinaturas\nnotion = Assinaturas\nonepassword = Assinaturas\ndeezer = Assinaturas\nparamount = Assinaturas\ncanva = Assinaturas\n\n# Saúde\nhospital = Saúde\nclinica = Saúde\nlaboratorio = Saúde\nexame = Saúde\nvacina = Saúde\ndasa = Saúde\nfleury = Saúde\nsabin = Saúde\neinstein = Saúde\nsirio = Saúde\nunimed = Saúde\namil = Saúde\nhapvida = Saúde\nprevent = Saúde\nfarmacia = Saúde\ndrogaraia = Saúde\ndroga raia = Saúde\ndrogasil = Saúde\npacheco = Saúde\n\n# Combustível\nposto = Combustível\ngasolina = Combustível\netanol = Combustível\ndiesel = Combustível\nipiranga = Combustível\nshell = Combustível\nbr = Combustível\n\n# Lazer\ncinema = Lazer\ncinemark = Lazer\ncinepolis = Lazer\nteatro = Lazer\nshow = Lazer\ningresso = Lazer\nparque = Lazer\nmuseu = Lazer\nthermas = Lazer\nhotel = Lazer\nbooking = Lazer\ndecolar = Lazer\nairbnb = Lazer\nresort = Lazer\nsympla = Lazer\n\n# Academia\nsmart fit = Academia\nbluefit = Academia\nselfit = Academia\nbodytech = Academia\njust fit = Academia\ngympass = Academia\nacademia = Academia\nfitness = Academia\n\n# Vestuário\nrenner = Vestuário\nriachuelo = Vestuário\ncea = Vestuário\nc&a = Vestuário\nzara = Vestuário\nhering = Vestuário\nmarisa = Vestuário\nyoucom = Vestuário\nnetshoes = Vestuário\ndafiti = Vestuário\nlojas leroy = Vestuário\n\n# Educação\nescola = Educação\nfaculdade = Educação\nuniversidade = Educação\ncurso = Educação\nead = Educação\nalura = Educação\nrocketseat = Educação\nudemy = Educação\ncoursera = Educação\nsenai = Educação\netec = Educação\n\n# Serviços\nmanicure = Serviços\nbarbearia = Serviços\nsalao = Serviços\ncabeleireiro = Serviços\nesmalteria = Serviços\nbarber = Serviços\n\n# Utilidades\nluz = Utilidades\nenergia = Utilidades\nenel = Utilidades\nlight = Utilidades\ncemig = Utilidades\ncopel = Utilidades\nequatorial = Utilidades\nrge = Utilidades\ncelesc = Utilidades\ncpfl = Utilidades\nenergisa = Utilidades\naguasaneos = Utilidades\nsabesp = Utilidades\nsanepar = Utilidades\ncopasa = Utilidades\ncaesb = Utilidades\ninternet = Utilidades\nvivo = Utilidades\nclaro = Utilidades\ntim = Utilidades\noi = Utilidades\ntelephone = Utilidades\ncelular = Utilidades`);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [parseError, setParseError] = useState("");
  const [cartaoSelecionado, setCartaoSelecionado] = useState(cartoes?.[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [importFeedback, setImportFeedback] = useState<any>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [editandoData, setEditandoData] = useState<{ [key: string]: boolean }>({});
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Carregar regras do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('regrasFatura');
    if (saved) setRegrasTexto(saved);
  }, []);

  // Salvar regras no localStorage
  useEffect(() => {
    localStorage.setItem('regrasFatura', regrasTexto);
  }, [regrasTexto]);

  // Atualizar categorias ao editar regras
  useEffect(() => {
    if (step === 2 && transacoes.length > 0) {
      setTransacoes(trans => trans.map(t => {
        if (t.categoriaManual) return t;
        return {
          ...t,
          categoria: categorizar(t.estabelecimento, regrasTexto)
        };
      }));
    }
  }, [regrasTexto, step]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError("");
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(csv)$/i)) {
        setParseError("Apenas arquivos CSV são aceitos");
        return;
      }
      setCsvFile(file);
    }
  };

  const handleParse = () => {
    if (!csvFile) {
      setParseError("Selecione um arquivo");
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const dados: Transacao[] = results.data
          .map((row: any, index: number) => {
            // Detectar colunas flexivelmente
            const quando = row.data || row.Data || row.date || row.Date || row.quando || '';
            const estabelecimento = (
              row.descricao || row.Descricao ||
              row.description || row.Description ||
              row.lançamento || row.Lançamento ||
              row.estabelecimento || row.Estabelecimento ||
              row.historico || row.Histórico ||
              ''
            ).trim();
            
            const valorStr = row.valor || row.Valor || row.amount || row.Amount || '0';
            let valor = 0;
            if (typeof valorStr === 'string') {
              let cleanValue = valorStr.replace(/[R$\s]/g, '');
              if (cleanValue.includes('.') && cleanValue.includes(',')) {
                cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
              } else if (cleanValue.includes(',')) {
                cleanValue = cleanValue.replace(',', '.');
              }
              valor = Math.abs(parseFloat(cleanValue) || 0);
            } else {
              valor = Math.abs(Number(valorStr) || 0);
            }

            return {
              uid: `${quando}-${estabelecimento}-${valor}-${index}`,
              quando,
              estabelecimento,
              valor,
              categoria: categorizar(estabelecimento, regrasTexto)
            };
          })
          .filter(t => t.estabelecimento && t.valor > 0);

        // Remover duplicados
        const unicos: Transacao[] = [];
        for (const t of dados) {
          const isDup = unicos.some(u =>
            u.quando === t.quando &&
            normalizar(u.estabelecimento) === normalizar(t.estabelecimento) &&
            Math.abs(u.valor - t.valor) < 0.01
          );
          if (!isDup) {
            unicos.push(t);
          }
        }

        setTransacoes(unicos);
        setStep(2);
        setSortBy('');
        setSortOrder('asc');
      },
      error: (error: any) => {
        setParseError(`Erro ao processar CSV: ${error.message}`);
      }
    });
  };

  const formatarDataBR = (data: string) => {
    if (!data) return '';
    if (data.includes('/')) return data;
    try {
      const d = new Date(data);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return data;
    }
  };

  const handleEditLancamento = (t: Transacao, field: string, value: string) => {
    setTransacoes(trans => trans.map(l => {
      if (l.uid === t.uid) {
        const updated = { ...l, [field]: value };
        if (field === 'categoria') {
          updated.categoriaManual = true;
        }
        return updated;
      }
      return l;
    }));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortedLancamentos = () => {
    if (!sortBy) return transacoes;
    const sorted = [...transacoes].sort((a, b) => {
      let aVal = a[sortBy as keyof Transacao];
      let bVal = b[sortBy as keyof Transacao];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  };

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  const handleRemoveTransaction = (uid: string) => {
    setTransacoes(trans => trans.filter(t => t.uid !== uid));
  };

  const handleImport = async () => {
    if (!cartaoSelecionado) {
      toast({
        title: 'Erro',
        description: 'Selecione um cartão',
        variant: 'destructive'
      });
      return;
    }

    if (transacoes.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhuma transação para importar',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onImport(transacoes, cartaoSelecionado, regrasTexto);
      setImportFeedback(result || {
        success: true,
        message: `Importação realizada com sucesso! ${transacoes.length} transações importadas.`
      });
      
      setTimeout(() => {
        resetModal();
      }, 1500);
    } catch (e: any) {
      setImportFeedback({
        success: false,
        message: `Erro ao importar: ${e.message || e}`
      });
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setTransacoes([]);
    setCsvFile(null);
    setParseError("");
    setImportFeedback(null);
    setSortBy('');
    setSortOrder('asc');
    onClose();
  };

  if (!open) return null;

  const categoriasList = [
    'Alimentação', 'Transporte', 'Compras', 'Assinaturas',
    'Saúde', 'Combustível', 'Lazer', 'Academia', 'Vestuário',
    'Educação', 'Serviços', 'Utilidades'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={(e) => e.currentTarget === e.target && resetModal()}>
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
                <h2 className="text-2xl font-bold text-white">Importar Fatura do Cartão</h2>
                <p className="text-sm text-slate-400 mt-1">Carregue suas transações com inteligência de categorização</p>
              </div>
            </div>
            <button
              onClick={resetModal}
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
                  <label className="block text-sm font-semibold text-slate-200 mb-3">Selecione o cartão para importar</label>
                  <select
                    className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-100 hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                    value={cartaoSelecionado}
                    onChange={e => setCartaoSelecionado(e.target.value)}
                  >
                    {(cartoes && Array.isArray(cartoes) && cartoes.length > 0) ? (
                      cartoes.map((cartao) => (
                        <option key={cartao.id} value={cartao.id}>{cartao.nome}</option>
                      ))
                    ) : (
                      <option value="">Nenhum cartão cadastrado</option>
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
                  onClick={resetModal}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-700 hover:to-blue-600 transition flex items-center gap-2 disabled:opacity-50"
                  onClick={handleParse}
                  disabled={!csvFile || !cartaoSelecionado || loading}
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

              <div className="mb-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <p className="text-sm text-blue-400 font-medium">Total de transações</p>
                    <p className="text-3xl font-bold text-blue-100 mt-1">{transacoes.length}</p>
                  </div>
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <p className="text-sm text-green-400 font-medium">Válidas</p>
                    <p className="text-3xl font-bold text-green-100 mt-1">{transacoes.length}</p>
                  </div>
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <p className="text-sm text-amber-400 font-medium">Duplicatas</p>
                    <p className="text-3xl font-bold text-amber-100 mt-1">0</p>
                  </div>
                </div>
              </div>

              <div className="mb-24">
                <h3 className="text-sm font-semibold mb-4 text-slate-200">Prévia das transações</h3>
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
                        <th className="px-1 py-2 text-left font-semibold text-slate-300 w-44 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('categoria')}>Categoria{renderSortIndicator('categoria')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {getSortedLancamentos().map((t, idx) => (
                        <tr key={t.uid} className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition ${idx % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
                          <td className="px-1 py-2">
                            <input
                              type="text"
                              placeholder="DD/MM/YYYY"
                              className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                              value={editandoData[t.uid] ? t.quando : formatarDataBR(t.quando)}
                              onFocus={() => setEditandoData(ed => ({ ...ed, [t.uid]: true }))}
                              onBlur={e => { setEditandoData(ed => ({ ...ed, [t.uid]: false })); handleEditLancamento(t, 'quando', e.target.value); }}
                              onChange={e => handleEditLancamento(t, 'quando', e.target.value)}
                            />
                          </td>
                          <td className="px-1 py-2">
                            <input
                              type="text"
                              className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                              value={t.estabelecimento}
                              onChange={e => handleEditLancamento(t, 'estabelecimento', e.target.value)}
                            />
                          </td>
                          <td className="px-1 py-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                              value={t.valor}
                              onChange={e => handleEditLancamento(t, 'valor', e.target.value)}
                            />
                          </td>
                          <td className="px-1 py-2">
                            <select
                              className="w-full px-1 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-slate-100 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                              value={t.categoria}
                              onChange={e => handleEditLancamento(t, 'categoria', e.target.value)}
                            >
                              {categoriasList.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t border-slate-800">
                <button
                  className="px-6 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800/50 transition font-medium"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Voltar
                </button>
                <button
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold hover:from-blue-700 hover:to-blue-600 transition flex items-center gap-2 disabled:opacity-50"
                  onClick={handleImport}
                  disabled={loading || transacoes.length === 0}
                >
                  {loading ? 'Importando...' : 'Importar'}
                </button>
              </div>
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
