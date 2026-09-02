import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '/src/hooks/useAuth';
import { supabase } from '/src/lib/supabase';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ImportCategoryCombobox, type ImportCategoryOption } from '/src/components/importers/ImportCategoryCombobox';
import { categorizar, normalizar, REGRAS_PADRAO } from '/src/utils/categorizacao';
import { DEFAULT_CATEGORIES, isDefaultCategory, resolveCategoryType } from '/src/constants/defaultCategories';

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
  const REGRAS_STORAGE_KEY = 'regrasImportacaoCategorias';
  const { user } = useAuth();

  // Estados principais do modal de importação
  const [step, setStep] = useState(1);
  const [regrasTexto, setRegrasTexto] = useState(REGRAS_PADRAO);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [selecoesLancamentos, setSelecoesLancamentos] = useState<Record<string, boolean>>({});
  const [parseError, setParseError] = useState("");
  const [regrasHydrated, setRegrasHydrated] = useState(false);
  const normalizarTipoConta = (conta: any) => normalizar(String(conta?.tipo || conta?.type || ''));
  const isContaImportavel = (conta: any) => {
    const tipo = normalizarTipoConta(conta);
    if (!tipo) return true;
    if (tipo.includes('credit') || tipo.includes('cartao') || tipo.includes('card')) return false;
    return true;
  };
  const getContasImportaveis = (contasArr: any[]) => {
    if (!Array.isArray(contasArr)) return [];
    const importaveis = contasArr.filter(isContaImportavel);
    return importaveis.length > 0 ? importaveis : contasArr;
  };
  const getPrimeiraContaBancariaId = (contasArr: any[]) => {
    const contasImportaveis = getContasImportaveis(contasArr);
    return contasImportaveis[0]?.id || '';
  };
  
  const [contaSelecionada, setContaSelecionada] = useState(getPrimeiraContaBancariaId(contas));
  const [categorias, setCategorias] = useState<any[]>([]);

  const normalizarListaCategorias = (lista: ImportCategoryOption[]) => {
    const map = new Map<string, ImportCategoryOption>();
    for (const item of lista || []) {
      const nome = String(item?.value || '').trim();
      if (!nome) continue;
      const key = `${normalizar(item?.tipo || '')}::${normalizar(nome)}`;
      if (!map.has(key)) {
        map.set(key, {
          value: nome,
          label: item?.label || nome,
          tipo: item?.tipo || null,
          isDefault: Boolean(item?.isDefault),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.label || a.value).localeCompare(b.label || b.value, 'pt-BR', { sensitivity: 'base' })
    );
  };

  const getTipoEfetivoCategoria = (categoria: { nome?: string | null; tipo?: string | null }) =>
    resolveCategoryType(categoria) || 'despesa';

  const sanitizarCategoriaPorTipo = (
    categoria: string,
    tipoLancamento: 'receita' | 'despesa'
  ) => {
    const nome = String(categoria || '').trim();
    if (!nome) return '';
    const tipoCategoria = resolveCategoryType({ nome, tipo: null });
    if (tipoCategoria && tipoCategoria !== tipoLancamento) return '';
    return nome;
  };

  const categoriasDespesaDropdown = useMemo(() => {
    const categoriasBanco: ImportCategoryOption[] = (categorias || [])
      .filter((c: any) => getTipoEfetivoCategoria({ nome: c?.nome, tipo: c?.tipo }) === 'despesa')
      .map((c: any) => ({
        value: String(c?.nome || '').trim(),
        label: String(c?.nome || '').trim(),
        tipo: 'despesa',
        isDefault: isDefaultCategory({ nome: c?.nome, tipo: 'despesa' }),
      }))
      .filter((c) => c.value);
    return normalizarListaCategorias(categoriasBanco);
  }, [categorias]);

  const categoriasReceitaDropdown = useMemo(() => {
    const categoriasBanco: ImportCategoryOption[] = (categorias || [])
      .filter((c: any) => getTipoEfetivoCategoria({ nome: c?.nome, tipo: c?.tipo }) === 'receita')
      .map((c: any) => ({
        value: String(c?.nome || '').trim(),
        label: String(c?.nome || '').trim(),
        tipo: 'receita',
        isDefault: isDefaultCategory({ nome: c?.nome, tipo: 'receita' }),
      }))
      .filter((c) => c.value);
    return normalizarListaCategorias(categoriasBanco);
  }, [categorias]);
  
  const categoriasPadrao = DEFAULT_CATEGORIES;

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
        !existentes?.some(cat =>
          normalizar(cat.nome) === normalizar(catPadrao.nome) &&
          normalizar(cat.tipo) === normalizar(catPadrao.tipo)
        )
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
            categoria: sanitizarCategoriaPorTipo(categoriaRegra, l.tipo),
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

  // Carregar regras salvas sempre que o modal abrir
  useEffect(() => {
    if (!open) return;
    const saved = localStorage.getItem(REGRAS_STORAGE_KEY) || localStorage.getItem('regrasFatura');
    setRegrasTexto(saved || REGRAS_PADRAO);
    setRegrasHydrated(true);
  }, [open]);

  // Salvar regras no localStorage
  useEffect(() => {
    if (!open || !regrasHydrated) return;
    localStorage.setItem(REGRAS_STORAGE_KEY, regrasTexto);
  }, [open, regrasHydrated, regrasTexto]);

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
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [importFeedback, setImportFeedback] = useState<any>(null);
  const [categoriaEmMassa, setCategoriaEmMassa] = useState('');

  const lancamentosSelecionados = useMemo(
    () => lancamentos.filter((l) => selecoesLancamentos[l.uid] !== false),
    [lancamentos, selecoesLancamentos]
  );
  const totalSelecionados = lancamentosSelecionados.length;
  const todosSelecionados = lancamentos.length > 0 && totalSelecionados === lancamentos.length;
  const algunsSelecionados = totalSelecionados > 0 && totalSelecionados < lancamentos.length;
  const pendentesCategoriaSelecionados = useMemo(
    () => lancamentosSelecionados.filter((l) => !String(l.categoria || '').trim()).length,
    [lancamentosSelecionados]
  );

  const tiposSelecionados = useMemo(
    () => new Set(lancamentosSelecionados.map((l) => l.tipo)),
    [lancamentosSelecionados]
  );
  const tipoUnicoSelecionado = tiposSelecionados.size === 1 ? Array.from(tiposSelecionados)[0] : null;
  const opcoesCategoriaEmMassa = tipoUnicoSelecionado === 'receita'
    ? categoriasReceitaDropdown
    : tipoUnicoSelecionado === 'despesa'
      ? categoriasDespesaDropdown
      : [];

  useEffect(() => {
    setCategoriaEmMassa('');
  }, [tipoUnicoSelecionado]);

  const handleAplicarCategoriaEmMassa = () => {
    if (!categoriaEmMassa || !tipoUnicoSelecionado) return;
    setLancamentos((prev) =>
      prev.map((l) =>
        selecoesLancamentos[l.uid] !== false
          ? { ...l, categoria: categoriaEmMassa, categoriaManual: true }
          : l
      )
    );
  };

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = algunsSelecionados;
    }
  }, [algunsSelecionados]);

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

  const handleFileDrop = (file: File | null | undefined) => {
    if (!file) return;
    setCsvFile(file);
    setParseError("");
  };

  const getFileExtension = (file: File) => {
    const nome = file.name || '';
    const ponto = nome.lastIndexOf('.');
    return ponto >= 0 ? nome.slice(ponto + 1).toLowerCase() : '';
  };

  function gerarUid() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  type LinhaExtrato = { quando: string; estabelecimento: string; valor: number };

  const finalizarLinhas = (linhas: LinhaExtrato[]) => {
    const parsed: Lancamento[] = linhas
      .filter((linha) => linha.estabelecimento && !Number.isNaN(linha.valor))
      .map((linha) => {
        const tipo: 'receita' | 'despesa' = linha.valor < 0 ? 'despesa' : 'receita';
        return {
          uid: gerarUid(),
          quando: linha.quando,
          estabelecimento: linha.estabelecimento,
          valor: linha.valor,
          tipo,
          categoria: sanitizarCategoriaPorTipo(categorizar(linha.estabelecimento, regrasTexto, tipo), tipo),
        };
      });

    if (parsed.length === 0) {
      setParseError("Nenhum lançamento encontrado no arquivo.");
      setSelecoesLancamentos({});
      return;
    }

    setLancamentos(parsed);
    setSelecoesLancamentos(
      Object.fromEntries(parsed.map((lancamento) => [lancamento.uid, true]))
    );
    setStep(2);
  };

  const parseValorBR = (valor: any) => {
    if (typeof valor === 'number') return valor;
    const texto = String(valor ?? '').trim().replace(/[^\d,.-]/g, '');
    if (!texto) return NaN;
    const temSeparadorDecimalVirgula = texto.includes(',');
    const normalizado = temSeparadorDecimalVirgula
      ? texto.replace(/\./g, '').replace(',', '.')
      : texto;
    return Number(normalizado);
  };

  const parseCsvRows = (file: File) => {
    Papa.parse(file, {
      header: false,
      delimiter: ";",
      skipEmptyLines: true,
      complete: (results: any) => {
        setLoading(false);
        const linhas: LinhaExtrato[] = (results.data as any[][])
          .filter((row) => Array.isArray(row) && row.length >= 2 && row[0] && row[1])
          .map((row) => ({
            quando: row[0] || '',
            estabelecimento: row[1] || '',
            valor: parseValorBR(row[2]),
          }));
        finalizarLinhas(linhas);
      },
      error: (err: any) => {
        setLoading(false);
        setParseError("Erro ao ler o arquivo CSV: " + err.message);
      }
    });
  };

  const normalizarDataCelulaXlsx = (valor: any) => {
    if (valor instanceof Date) {
      const ano = valor.getFullYear();
      const mes = String(valor.getMonth() + 1).padStart(2, '0');
      const dia = String(valor.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    }
    if (typeof valor === 'number') {
      const parsedDate = XLSX.SSF?.parse_date_code?.(valor);
      if (parsedDate) {
        const ano = String(parsedDate.y).padStart(4, '0');
        const mes = String(parsedDate.m).padStart(2, '0');
        const dia = String(parsedDate.d).padStart(2, '0');
        return `${ano}-${mes}-${dia}`;
      }
    }
    return String(valor ?? '').trim();
  };

  const parseXlsxRows = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

      const linhasCandidatas = rows.filter(
        (row) => Array.isArray(row) && row.length >= 2 && (row[0] || row[0] === 0) && row[1]
      );
      const primeiraLinhaEhCabecalho =
        linhasCandidatas.length > 0 && Number.isNaN(parseValorBR(linhasCandidatas[0][2]));
      const linhasDados = primeiraLinhaEhCabecalho ? linhasCandidatas.slice(1) : linhasCandidatas;

      const linhas: LinhaExtrato[] = linhasDados.map((row) => ({
        quando: normalizarDataCelulaXlsx(row[0]),
        estabelecimento: String(row[1] || '').trim(),
        valor: parseValorBR(row[2]),
      }));

      setLoading(false);
      finalizarLinhas(linhas);
    } catch (err: any) {
      setLoading(false);
      setParseError("Erro ao ler o arquivo XLSX: " + (err?.message || err));
    }
  };

  const parseOfxRows = async (file: File) => {
    try {
      const texto = await file.text();
      const blocos = texto.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];

      const extrairCampo = (bloco: string, tag: string) => {
        const match = bloco.match(new RegExp(`<${tag}>([^\\r\\n<]+)`, 'i'));
        return match ? match[1].trim() : '';
      };

      const linhas: LinhaExtrato[] = blocos.map((bloco) => {
        const dataBruta = extrairCampo(bloco, 'DTPOSTED');
        const ano = dataBruta.slice(0, 4);
        const mes = dataBruta.slice(4, 6);
        const dia = dataBruta.slice(6, 8);
        const quando = ano && mes && dia ? `${ano}-${mes}-${dia}` : '';
        const memo = extrairCampo(bloco, 'MEMO') || extrairCampo(bloco, 'NAME');
        return {
          quando,
          estabelecimento: memo,
          valor: Number(extrairCampo(bloco, 'TRNAMT')),
        };
      });

      setLoading(false);

      if (blocos.length === 0) {
        setParseError("Nenhuma transação (STMTTRN) encontrada no arquivo OFX.");
        return;
      }

      finalizarLinhas(linhas);
    } catch (err: any) {
      setLoading(false);
      setParseError("Erro ao ler o arquivo OFX: " + (err?.message || err));
    }
  };

  const handleParse = () => {
    setParseError("");
    if (!csvFile) return;
    setLoading(true);

    const extensao = getFileExtension(csvFile);
    if (extensao === 'ofx') {
      void parseOfxRows(csvFile);
    } else if (extensao === 'xlsx' || extensao === 'xls') {
      void parseXlsxRows(csvFile);
    } else {
      parseCsvRows(csvFile);
    }
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
        if (campo === 'tipo') {
          const novoTipo = valor as 'receita' | 'despesa';
          const categoriaAtual = String(novos[idx].categoria || '').trim();
          if (categoriaAtual && !sanitizarCategoriaPorTipo(categoriaAtual, novoTipo)) {
            novos[idx].categoria = '';
            novos[idx].categoriaManual = false;
          }
        }
      }
      return novos;
    });
  };

  const handleAddNovaCategoria = async (lancamento: Lancamento, suggestedName?: string) => {
    const nome = window.prompt('Digite o nome da nova categoria:', suggestedName || '');
    if (!nome || !nome.trim()) return;
    const nomeLimpo = nome.trim();
    const tipoCategoria = lancamento.tipo === 'receita' ? 'receita' : 'despesa';

    if (user?.id) {
      const { data: existente } = await supabase
        .from('categorias')
        .select('id, nome, tipo')
        .eq('user_id', user.id)
        .eq('tipo', tipoCategoria)
        .ilike('nome', nomeLimpo);

      const categoriaExistente = (existente || []).find(
        (c: any) => normalizar(String(c?.nome || '')) === normalizar(nomeLimpo)
      );

      if (!categoriaExistente) {
        await supabase.from('categorias').insert({
          user_id: user.id,
          nome: nomeLimpo,
          tipo: tipoCategoria,
        });
      }
    }

    setCategorias((prev) => {
      const existe = (prev || []).some(
        (c: any) =>
          normalizar(String(c?.nome || '')) === normalizar(nomeLimpo)
          && (c?.tipo || 'despesa') === tipoCategoria
      );
      if (existe) return prev;
      return [
        ...prev,
        { id: `local-${Date.now()}`, nome: nomeLimpo, tipo: tipoCategoria },
      ];
    });

    handleEditLancamento(lancamento, 'categoria', nomeLimpo);
  };

  const handleCategoriaChange = (lancamento: Lancamento, value: string) => {
    handleEditLancamento(lancamento, 'categoria', value);
  };

  const handleToggleLancamento = (uid: string, checked: boolean) => {
    setSelecoesLancamentos((prev) => ({
      ...prev,
      [uid]: checked,
    }));
  };

  const handleToggleTodosLancamentos = (checked: boolean) => {
    setSelecoesLancamentos(
      Object.fromEntries(lancamentos.map((lancamento) => [lancamento.uid, checked]))
    );
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
    if (totalSelecionados === 0) {
      setImportFeedback({
        success: false,
        message: 'Selecione ao menos um lançamento para importar.',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onImport(lancamentosSelecionados, contaSelecionada, regrasTexto);
      if (result && typeof result === 'object' && ('success' in result)) {
        setImportFeedback(result);
      } else {
        setImportFeedback({
          success: true,
          message: `Importação realizada com sucesso! ${lancamentosSelecionados.length} lançamentos importados.`
        });
      }
      setStep(1);
      setLancamentos([]);
      setSelecoesLancamentos({});
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
                <h2 className="text-2xl font-bold text-white">Importar extrato bancário</h2>
                <p className="text-sm text-slate-400 mt-1">Envie um arquivo CSV, OFX ou XLSX e categorizamos os lançamentos para você</p>
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

          <div className="mb-8">
            <div className="flex gap-2">
              {[1, 2].map(s => (
                <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${step >= s ? 'bg-gradient-to-r from-blue-500 to-blue-400' : 'bg-slate-800'}`}></div>
              ))}
            </div>
            <p className="mt-2 text-xs font-medium text-slate-400">
              Passo {step} de 2 — {step === 1 ? 'Enviar arquivo' : 'Revisar e confirmar lançamentos'}
            </p>
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
                      getContasImportaveis(contas).map((conta) => (
                        <option key={conta.id} value={conta.id}>
                          {conta.nome} {conta.tipo ? `(${conta.tipo})` : ''}
                        </option>
                      ))
                    ) : (
                      <option value="">Nenhuma conta cadastrada</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">
                    Extrato bancário
                    <span className="ml-2 font-normal text-slate-400">(CSV, OFX ou XLSX)</span>
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                    onDragLeave={() => setIsDraggingFile(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      handleFileDrop(e.dataTransfer.files?.[0]);
                    }}
                    className={`relative rounded-xl border-2 border-dashed transition ${
                      isDraggingFile ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
                    }`}
                  >
                    <input
                      type="file"
                      accept=".csv,.ofx,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="w-full px-4 py-4 text-slate-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-blue-600 file:text-white hover:file:from-blue-600 hover:file:to-blue-700 cursor-pointer"
                    />
                    <p className="pointer-events-none px-4 pb-3 text-xs text-slate-400">
                      Ou arraste o arquivo aqui
                    </p>
                  </div>
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
                <div className="mb-3 flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-200">Regras de categorização</label>
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 transition"
                    onClick={() => setRegrasTexto(REGRAS_PADRAO)}
                  >
                    Restaurar regras padrão
                  </button>
                </div>
                <textarea
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-100 text-sm font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                  style={{ minHeight: 140, maxHeight: 220, overflow: 'auto' }}
                  value={regrasTexto}
                  onChange={e => setRegrasTexto(e.target.value)}
                />
              </div>

              <div className="mb-24">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Prévia dos lançamentos</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {totalSelecionados} de {lancamentos.length} lançamento(s) selecionado(s) para importar
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-800/60 transition disabled:opacity-50"
                      onClick={() => handleToggleTodosLancamentos(true)}
                      disabled={todosSelecionados || lancamentos.length === 0}
                    >
                      Selecionar todos
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800/60 transition disabled:opacity-50"
                      onClick={() => handleToggleTodosLancamentos(false)}
                      disabled={totalSelecionados === 0}
                    >
                      Limpar seleção
                    </button>
                  </div>
                </div>

                {totalSelecionados > 0 && (
                  <div className="mb-4 flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-800/30 p-3 sm:flex-row sm:items-center">
                    <span className="text-xs font-medium text-slate-300 sm:whitespace-nowrap">
                      Categorizar em massa ({totalSelecionados} selecionado{totalSelecionados === 1 ? '' : 's'}):
                    </span>
                    {tipoUnicoSelecionado ? (
                      <>
                        <div className="sm:w-56">
                          <ImportCategoryCombobox
                            value={categoriaEmMassa}
                            options={opcoesCategoriaEmMassa}
                            onValueChange={setCategoriaEmMassa}
                          />
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white transition disabled:opacity-50"
                          onClick={handleAplicarCategoriaEmMassa}
                          disabled={!categoriaEmMassa}
                        >
                          Aplicar aos selecionados
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-amber-400">
                        Selecione lançamentos do mesmo tipo (só receitas ou só despesas) para categorizar em massa.
                      </span>
                    )}
                  </div>
                )}

                {pendentesCategoriaSelecionados > 0 && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    <span>
                      ⚠ {pendentesCategoriaSelecionados} lançamento(s) sem categoria selecionado(s) para importar.
                      Eles serão importados sem categoria — você pode categorizá-los depois, a qualquer momento.
                    </span>
                  </div>
                )}

                <div
                  className="overflow-y-auto border border-slate-700/50 rounded-xl shadow-lg"
                  style={{ maxHeight: '450px' }}
                  ref={scrollableRef}
                  onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)}
                >
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border-b border-slate-700/50">
                        <th className="px-2 py-2 text-center font-semibold text-slate-300 w-12">
                          <input
                            ref={selectAllRef}
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500/30"
                            checked={todosSelecionados}
                            onChange={(e) => handleToggleTodosLancamentos(e.target.checked)}
                            aria-label="Selecionar todos os lançamentos"
                          />
                        </th>
                        <th className="px-1 py-2 text-left font-semibold text-slate-300 w-32 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('quando')}>Data{renderSortIndicator('quando')}</th>
                        <th className="px-1 py-2 text-left font-semibold text-slate-300 flex-1 min-w-80 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('estabelecimento')}>Descrição{renderSortIndicator('estabelecimento')}</th>
                        <th className="px-1 py-2 text-left font-semibold text-slate-300 w-32 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('valor')}>Valor{renderSortIndicator('valor')}</th>
                        <th className="px-1 py-2 text-left font-semibold text-slate-300 w-28 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('tipo')}>Tipo{renderSortIndicator('tipo')}</th>
                        <th className="px-1 py-2 text-left font-semibold text-slate-300 w-44 cursor-pointer hover:bg-slate-700/50 transition" onClick={() => handleSort('categoria')}>Categoria{renderSortIndicator('categoria')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {getSortedLancamentos().map((l, idx) => (
                        <tr
                          key={idx}
                          className={`border-b border-slate-700/30 transition ${
                            selecoesLancamentos[l.uid] === false
                              ? 'opacity-60 bg-slate-950/40'
                              : `hover:bg-slate-800/40 ${idx % 2 === 0 ? 'bg-slate-900/20' : ''}`
                          }`}
                        >
                          <td className="px-2 py-2 text-center align-top">
                            <input
                              type="checkbox"
                              className="mt-2 h-4 w-4 rounded border-slate-500 bg-slate-800 text-blue-500 focus:ring-2 focus:ring-blue-500/30"
                              checked={selecoesLancamentos[l.uid] !== false}
                              onChange={(e) => handleToggleLancamento(l.uid, e.target.checked)}
                              aria-label={`Selecionar lançamento ${l.estabelecimento}`}
                            />
                          </td>
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
                              {(() => {
                                const opcoes = l.tipo === 'receita'
                                  ? categoriasReceitaDropdown
                                  : categoriasDespesaDropdown;
                                const categoriaAtual = String(l.categoria || '');
                                const valueAtual = opcoes.some((option) => normalizar(option.value) === normalizar(categoriaAtual))
                                  ? categoriaAtual
                                  : '';
                                return (
                                  <ImportCategoryCombobox
                                    value={valueAtual}
                                    options={opcoes}
                                    placeholder="Selecione categoria..."
                                    invalid={!String(valueAtual || '').trim()}
                                    onValueChange={(value) => handleCategoriaChange(l, value)}
                                    onCreateCategory={(suggestedName) => handleAddNovaCategoria(l, suggestedName)}
                                  />
                                );
                              })()}
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
                disabled={totalSelecionados === 0 || loading}
              >
                {loading ? 'Importando...' : `Importar (${totalSelecionados})`}
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
