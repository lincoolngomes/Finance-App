import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { toast } from '@/hooks/use-toast';
import { normalizar, categorizar, REGRAS_PADRAO } from '@/utils/categorizacao';
import { formatCurrency } from '@/utils/currency';

interface Transacao {
  uid: string;
  quando: string;
  estabelecimento: string;
  valor: number;
  tipo?: string;
  categoria: string;
  categoriaManual?: boolean;
}

interface ImportarFaturaModalNovoProps {
  open: boolean;
  onClose: () => void;
  onImport: (transacoes: Transacao[], cartaoId: string, regrasTexto: string, mesReferencia?: string, anoReferencia?: string) => Promise<any>;
  cartoes: any[];
  initialCardId?: string;
}

export function ImportarFaturaModalNovo({ open, onClose, onImport, cartoes, initialCardId }: ImportarFaturaModalNovoProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  // Estados principais
  const [step, setStep] = useState(1);
  const [regrasTexto, setRegrasTexto] = useState(REGRAS_PADRAO);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [parseError, setParseError] = useState("");
  const [cartaoSelecionado, setCartaoSelecionado] = useState(initialCardId || cartoes?.[0]?.id || '');
  const [mesReferencia, setMesReferencia] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [anoReferencia, setAnoReferencia] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);
  const [importFeedback, setImportFeedback] = useState<any>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [editandoData, setEditandoData] = useState<{ [key: string]: boolean }>({});
  const [editandoValor, setEditandoValor] = useState<{ [key: string]: boolean }>({});
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Carregar regras do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('regrasFatura');
    if (saved) setRegrasTexto(saved);
  }, []);

  // Atualizar cartão selecionado quando os cartões carregam
  useEffect(() => {
    if (initialCardId) {
      setCartaoSelecionado(initialCardId);
    } else if (cartoes && cartoes.length > 0 && !cartaoSelecionado) {
      setCartaoSelecionado(cartoes[0].id);
    }
  }, [cartoes]);

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
            let valorRaw = 0;
            if (typeof valorStr === 'string') {
              let cleanValue = valorStr.replace(/[R$\s]/g, '');
              if (cleanValue.includes('.') && cleanValue.includes(',')) {
                cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
              } else if (cleanValue.includes(',')) {
                cleanValue = cleanValue.replace(',', '.');
              }
              valorRaw = parseFloat(cleanValue) || 0;
            } else {
              valorRaw = Number(valorStr) || 0;
            }

            // Classificar tipo:
            // - Valores negativos grandes com "PAGAMENTO" = pagamento de fatura anterior
            // - Valores negativos pequenos = estorno/crédito
            // - Valores positivos = despesa
            let tipo = 'despesa';
            if (valorRaw < 0) {
              const descUpper = estabelecimento.toUpperCase();
              if (descUpper.includes('PAGAMENTO') || descUpper.includes('PAG FATURA') || descUpper.includes('PGTO')) {
                tipo = 'pagamento';
              } else {
                tipo = 'estorno';
              }
            }
            const valor = Math.abs(valorRaw);

            return {
              uid: `${quando}-${estabelecimento}-${valor}-${index}`,
              quando,
              estabelecimento,
              valor,
              tipo,
              categoria: categorizar(estabelecimento, regrasTexto)
            };
          })
          .filter(t => t.estabelecimento && t.valor > 0);

        setTransacoes(dados);
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
      const result = await onImport(transacoes, cartaoSelecionado, regrasTexto, mesReferencia, anoReferencia);
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
    setMesReferencia(String(new Date().getMonth() + 1).padStart(2, '0'));
    setAnoReferencia(String(new Date().getFullYear()));
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-3">Mês de vencimento</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-100 hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                      value={mesReferencia}
                      onChange={e => setMesReferencia(e.target.value)}
                    >
                      <option value="01">Janeiro</option>
                      <option value="02">Fevereiro</option>
                      <option value="03">Março</option>
                      <option value="04">Abril</option>
                      <option value="05">Maio</option>
                      <option value="06">Junho</option>
                      <option value="07">Julho</option>
                      <option value="08">Agosto</option>
                      <option value="09">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-3">Ano</label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-slate-800/50 text-slate-100 hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                      value={anoReferencia}
                      onChange={e => setAnoReferencia(e.target.value)}
                    >
                      {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
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
                {(() => {
                  const despesas = transacoes.filter(t => t.tipo === 'despesa');
                  const estornos = transacoes.filter(t => t.tipo === 'estorno');
                  const pagamentos = transacoes.filter(t => t.tipo === 'pagamento');
                  const totalDespesas = despesas.reduce((s, t) => s + t.valor, 0);
                  const totalEstornos = estornos.reduce((s, t) => s + t.valor, 0);
                  const totalPagamentos = pagamentos.reduce((s, t) => s + t.valor, 0);
                  const saldoFatura = totalDespesas - totalEstornos;
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="p-4 bg-slate-500/10 border border-slate-500/30 rounded-xl">
                        <p className="text-sm text-slate-400 font-medium">Transações</p>
                        <p className="text-2xl font-bold text-slate-100 mt-1">{transacoes.length}</p>
                      </div>
                      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <p className="text-sm text-red-400 font-medium">Despesas</p>
                        <p className="text-lg font-bold text-red-300 mt-1">{formatCurrency(totalDespesas)}</p>
                        <p className="text-xs text-red-400/70 mt-0.5">{despesas.length} itens</p>
                      </div>
                      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <p className="text-sm text-blue-400 font-medium">Saldo da Fatura</p>
                        <p className="text-lg font-bold text-blue-100 mt-1">{formatCurrency(saldoFatura)}</p>
                        {totalEstornos > 0 && <p className="text-xs text-green-400/70 mt-0.5">- {formatCurrency(totalEstornos)} estornos</p>}
                      </div>
                      {pagamentos.length > 0 ? (
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                          <p className="text-sm text-green-400 font-medium">Pgto Fatura Anterior</p>
                          <p className="text-lg font-bold text-green-300 mt-1">{formatCurrency(totalPagamentos)}</p>
                          <p className="text-xs text-green-400/70 mt-0.5">Não entra no total</p>
                        </div>
                      ) : (
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                          <p className="text-sm text-green-400 font-medium">Estornos</p>
                          <p className="text-lg font-bold text-green-300 mt-1">{formatCurrency(totalEstornos)}</p>
                          <p className="text-xs text-green-400/70 mt-0.5">{estornos.length} itens</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                        <th className="px-1 py-2 text-right font-semibold text-slate-300 w-36 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('valor')}>Valor{renderSortIndicator('valor')}</th>
                        <th className="px-1 py-2 text-left font-semibold text-slate-300 w-44 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('categoria')}>Categoria{renderSortIndicator('categoria')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {getSortedLancamentos().map((t, idx) => (
                        <tr key={t.uid} className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition ${t.tipo === 'pagamento' ? 'bg-purple-500/5' : t.tipo === 'estorno' ? 'bg-green-500/5' : idx % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
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
                          <td className="px-1 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {t.tipo === 'pagamento' && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 flex-shrink-0">PGTO</span>
                              )}
                              {t.tipo === 'estorno' && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex-shrink-0">ESTORNO</span>
                              )}
                              <input
                                type="text"
                                inputMode="decimal"
                                className={`w-28 px-2 py-1 rounded-lg bg-slate-700/30 border border-slate-600/50 text-sm text-right font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition ${
                                  t.tipo === 'pagamento' ? 'text-purple-400' : t.tipo === 'estorno' ? 'text-green-400' : 'text-red-400'
                                }`}
                                value={editandoValor[t.uid] ? t.valor : Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                onFocus={() => setEditandoValor(ev => ({ ...ev, [t.uid]: true }))}
                                onBlur={() => setEditandoValor(ev => ({ ...ev, [t.uid]: false }))}
                                onChange={e => handleEditLancamento(t, 'valor', e.target.value)}
                              />
                            </div>
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
