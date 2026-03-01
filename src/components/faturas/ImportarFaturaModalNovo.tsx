import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { toast } from '@/hooks/use-toast';
import { ImportCategoryCombobox, type ImportCategoryOption } from '@/components/importers/ImportCategoryCombobox';
import { normalizar, categorizar, REGRAS_PADRAO } from '@/utils/categorizacao';
import { formatCurrency } from '@/utils/currency';
import { isDefaultCategory } from '@/constants/defaultCategories';

interface Transacao {
  uid: string;
  quando: string;
  estabelecimento: string;
  valor: number;
  tipo?: string;
  categoria: string;
  categoriaManual?: boolean;
  parcela_atual?: number;
  total_parcelas?: number;
}

interface ImportarFaturaModalNovoProps {
  open: boolean;
  onClose: () => void;
  onImport: (
    transacoes: Transacao[],
    cartaoId: string,
    regrasTexto: string,
    mesReferencia?: string,
    anoReferencia?: string,
    options?: { criarParcelasFuturas?: boolean }
  ) => Promise<any>;
  cartoes: any[];
  initialCardId?: string;
}

interface ResumoPDFImportacao {
  lancamentosAtuais: number | null;
  saldoFinanciado: number | null;
  totalDestaFatura: number | null;
  pagamentoEfetuado: number | null;
}

export function ImportarFaturaModalNovo({ open, onClose, onImport, cartoes, initialCardId }: ImportarFaturaModalNovoProps) {
  const DRAFT_KEY = 'importar-fatura-modal-novo:draft:v1';
  const REGRAS_STORAGE_KEY = 'regrasImportacaoCategorias';
  const CATEGORIA_PAGAMENTO_FATURA = 'Pagamento de Fatura';
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);

  // Estados principais
  const [step, setStep] = useState(1);
  const [regrasTexto, setRegrasTexto] = useState(REGRAS_PADRAO);
  const [regrasHydrated, setRegrasHydrated] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [parseError, setParseError] = useState("");
  const [cartaoSelecionado, setCartaoSelecionado] = useState(initialCardId || cartoes?.[0]?.id || '');
  const [mesReferencia, setMesReferencia] = useState('');
  const [anoReferencia, setAnoReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [importFeedback, setImportFeedback] = useState<any>(null);
  const [resumoPdf, setResumoPdf] = useState<ResumoPDFImportacao | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [editandoData, setEditandoData] = useState<{ [key: string]: boolean }>({});
  const [editandoValor, setEditandoValor] = useState<{ [key: string]: boolean }>({});
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [criarParcelasFuturas, setCriarParcelasFuturas] = useState(true);
  const [modoImportacao, setModoImportacao] = useState<'ambas' | 'somente_parceladas' | 'somente_nao_parceladas'>('ambas');
  const [draftRestored, setDraftRestored] = useState(false);
  const [categoriasDespesa, setCategoriasDespesa] = useState<string[]>([
    'Alimentação', 'Transporte', 'Compras', 'Assinaturas', 'Saúde', 'Combustível', 'Lazer', 'Academia', 'Vestuário',
    'Educação', 'Serviços', 'Utilidades'
  ]);
  const [categoriasReceita, setCategoriasReceita] = useState<string[]>([CATEGORIA_PAGAMENTO_FATURA]);

  const normalizarListaCategorias = (lista: ImportCategoryOption[]) => {
    const map = new Map<string, ImportCategoryOption>();
    for (const item of lista || []) {
      const nome = String(item?.value || '').trim();
      if (!nome) continue;
      const key = `${normalizar(item?.tipo || '')}::${normalizar(nome)}`;
      if (!map.has(key)) map.set(key, item);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.label || a.value).localeCompare(b.label || b.value, 'pt-BR', { sensitivity: 'base' })
    );
  };

  const extrairCategoriasDasRegras = (texto: string) => {
    const categorias = String(texto || '')
      .split('\n')
      .map((linha) => linha.trim())
      .filter((linha) => linha && !linha.startsWith('#') && linha.includes('='))
      .map((linha) => {
        const idx = linha.indexOf('=');
        return idx >= 0 ? linha.slice(idx + 1).trim() : '';
      })
      .filter(Boolean);
    return normalizarListaCategorias(categorias);
  };

  const categoriasDespesaDropdown = useMemo(
    () =>
      normalizarListaCategorias(
        categoriasDespesa.map((nome) => ({
          value: nome,
          label: nome,
          tipo: 'despesa',
          isDefault: isDefaultCategory({ nome, tipo: 'despesa' }),
        }))
      ),
    [categoriasDespesa]
  );
  const categoriasReceitaDropdown = useMemo(
    () =>
      normalizarListaCategorias(
        [CATEGORIA_PAGAMENTO_FATURA, ...categoriasReceita].map((nome) => ({
          value: nome,
          label: nome,
          tipo: 'receita',
          isDefault: isDefaultCategory({ nome, tipo: 'receita' }),
        }))
      ),
    [categoriasReceita]
  );

  const getDefaultFaturaVencimento = (cartao: any, referencia = new Date()) => {
    const diaFechamento = Math.max(1, Number(cartao?.dia_fechamento || 1));
    const diaVencimento = Math.max(1, Number(cartao?.dia_vencimento || 1));

    // Procura o primeiro mês de vencimento cuja data de fechamento ainda não passou.
    for (let offset = 0; offset <= 24; offset++) {
      const dueDate = new Date(referencia.getFullYear(), referencia.getMonth() + offset, diaVencimento);
      const fechamentoDate = diaFechamento >= diaVencimento
        ? new Date(dueDate.getFullYear(), dueDate.getMonth() - 1, diaFechamento)
        : new Date(dueDate.getFullYear(), dueDate.getMonth(), diaFechamento);

      const hoje = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
      const fechamentoSemHora = new Date(fechamentoDate.getFullYear(), fechamentoDate.getMonth(), fechamentoDate.getDate());
      if (hoje <= fechamentoSemHora) {
        return {
          mes: String(dueDate.getMonth() + 1).padStart(2, '0'),
          ano: String(dueDate.getFullYear()),
        };
      }
    }

    return {
      mes: String(referencia.getMonth() + 1).padStart(2, '0'),
      ano: String(referencia.getFullYear()),
    };
  };

  const cartaoAtual = (cartoes || []).find((c: any) => c.id === cartaoSelecionado);
  const diaVencimentoCartao = Number(cartaoAtual?.dia_vencimento || 1);
  const mesNum = Number(mesReferencia || 1);
  const anoNum = Number(anoReferencia || new Date().getFullYear());
  const dataVencimentoPreview = new Date(anoNum, Math.max(0, mesNum - 1), Math.max(1, diaVencimentoCartao));
  const dataVencimentoLabel = dataVencimentoPreview.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  useEffect(() => {
    if (!open) return;
    const saved = localStorage.getItem(REGRAS_STORAGE_KEY) || localStorage.getItem('regrasFatura');
    setRegrasTexto(saved || REGRAS_PADRAO);
    setRegrasHydrated(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setDraftRestored(true);
        return;
      }
      const draft = JSON.parse(raw);
      if (!draft || (draft.userId && draft.userId !== user?.id)) {
        setDraftRestored(true);
        return;
      }

      if (draft.cartaoSelecionado) setCartaoSelecionado(draft.cartaoSelecionado);
      if (draft.mesReferencia) setMesReferencia(draft.mesReferencia);
      if (draft.anoReferencia) setAnoReferencia(draft.anoReferencia);
      if (typeof draft.step === 'number') setStep(draft.step);
      if (Array.isArray(draft.transacoes)) setTransacoes(draft.transacoes);
      if (typeof draft.criarParcelasFuturas === 'boolean') setCriarParcelasFuturas(draft.criarParcelasFuturas);
      if (draft.modoImportacao === 'ambas' || draft.modoImportacao === 'somente_parceladas' || draft.modoImportacao === 'somente_nao_parceladas') {
        setModoImportacao(draft.modoImportacao);
      }
      if (typeof draft.sortBy === 'string') setSortBy(draft.sortBy);
      if (draft.sortOrder === 'asc' || draft.sortOrder === 'desc') setSortOrder(draft.sortOrder);
    } catch {
      // ignora draft inválido
    } finally {
      setDraftRestored(true);
    }
  }, [open, user?.id]);

  // Atualizar cartão selecionado quando os cartões carregam
  useEffect(() => {
    if (!open) return;
    if (initialCardId) {
      setCartaoSelecionado(initialCardId);
    } else if (cartoes && cartoes.length > 0 && !cartaoSelecionado) {
      setCartaoSelecionado(cartoes[0].id);
    }
  }, [open, cartoes, initialCardId, cartaoSelecionado]);

  // Definir mês/ano padrão com base na referência atual e fechamento do cartão selecionado
  useEffect(() => {
    if (!open || !cartoes?.length || !cartaoSelecionado) return;
    if (!draftRestored) return;
    if (mesReferencia && anoReferencia) return;
    const cartao = cartoes.find((c: any) => c.id === cartaoSelecionado);
    if (!cartao) return;
    const ref = getDefaultFaturaVencimento(cartao, new Date());
    setMesReferencia(ref.mes);
    setAnoReferencia(ref.ano);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cartaoSelecionado, cartoes, draftRestored, mesReferencia, anoReferencia]);

  // Salvar regras no localStorage
  useEffect(() => {
    if (!open || !regrasHydrated) return;
    localStorage.setItem(REGRAS_STORAGE_KEY, regrasTexto);
  }, [open, regrasHydrated, regrasTexto]);

  useEffect(() => {
    if (!open || !user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('categorias')
        .select('nome, tipo')
        .eq('user_id', user.id);

      if (!data || data.length === 0) return;

      const despesas = data
        .filter((c: any) => !c?.tipo || c.tipo === 'despesa')
        .map((c: any) => (c.nome || '').trim())
        .filter(Boolean);

      const receitas = data
        .filter((c: any) => c?.tipo === 'receita')
        .map((c: any) => (c.nome || '').trim())
        .filter(Boolean);

      if (despesas.length > 0) setCategoriasDespesa(normalizarListaCategorias(despesas));
      setCategoriasReceita(normalizarListaCategorias([CATEGORIA_PAGAMENTO_FATURA, ...receitas]));
    })();
  }, [open, user?.id]);

  useEffect(() => {
    if (!open || !draftRestored) return;
      const draft = {
        userId: user?.id || null,
        step,
        transacoes,
        cartaoSelecionado,
      mesReferencia,
      anoReferencia,
      sortBy,
      sortOrder,
      criarParcelasFuturas,
      modoImportacao,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    open,
    draftRestored,
    user?.id,
    step,
    transacoes,
    cartaoSelecionado,
    mesReferencia,
    anoReferencia,
    sortBy,
    sortOrder,
    criarParcelasFuturas,
    modoImportacao,
  ]);

  // Atualizar categorias ao editar regras ou quando needsRecategorization é true
  // Recategorizar transações quando as regras mudarem OU quando entrar no step 2
  useEffect(() => {
    if (step !== 2 || transacoes.length === 0 || !regrasHydrated) return;
    
    console.log('[DEBUG] Recategorizando transações com regras:', regrasTexto.substring(0, 100));
    
    setTransacoes(trans => trans.map(t => {
      if (t.tipo === 'pagamento' || t.tipo === 'estorno') {
        return {
          ...t,
          categoria: CATEGORIA_PAGAMENTO_FATURA,
        };
      }
      // Só recategoriza se não foi definido manualmente
      if (t.categoriaManual) return t;
      
      const categoriaRegra = categorizar(t.estabelecimento, regrasTexto);
      console.log(`[DEBUG] "${t.estabelecimento}" => "${categoriaRegra}"`);
      return {
        ...t,
        categoria: categoriaRegra || '',
      };
    }));
  }, [regrasTexto, step, regrasHydrated]);

  const detectarTipoArquivo = (file: File): 'csv' | 'pdf' | null => {
    const nome = (file?.name || '').toLowerCase();
    if (nome.endsWith('.csv')) return 'csv';
    if (nome.endsWith('.pdf')) return 'pdf';
    return null;
  };

  const extrairReferenciaDoNomeArquivo = (nomeArquivo: string): { mes: string; ano: string } | null => {
    const nome = String(nomeArquivo || '').toLowerCase();

    // Ex.: fatura-20260201.csv / fatura_2026-02-01.csv
    let m = nome.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
    if (m) {
      const ano = m[1];
      const mes = m[2];
      const mesNum = Number(mes);
      if (mesNum >= 1 && mesNum <= 12) return { mes, ano };
    }

    // Ex.: fatura-01-02-2026.csv (dd-mm-yyyy)
    m = nome.match(/(\d{2})[-_](\d{2})[-_](\d{4})/);
    if (m) {
      const mes = m[2];
      const ano = m[3];
      const mesNum = Number(mes);
      if (mesNum >= 1 && mesNum <= 12) return { mes, ano };
    }

    return null;
  };

  const parseValorMonetario = (value: unknown): number => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

    const texto = String(value || '').trim();
    if (!texto) return 0;

    let cleanValue = texto.replace(/[R$\s]/g, '');
    if (cleanValue.includes('.') && cleanValue.includes(',')) {
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else if (cleanValue.includes(',')) {
      cleanValue = cleanValue.replace(',', '.');
    }
    cleanValue = cleanValue.replace(/[^0-9.-]/g, '');
    return Number.parseFloat(cleanValue) || 0;
  };

  const classificarTipoLancamento = (descricao: string, valorRaw: number): 'despesa' | 'pagamento' | 'estorno' => {
    const descricaoNorm = normalizar(descricao || '');
    const ehPagamento = /(pagamento|pag fatura|pagto|pgto)/.test(descricaoNorm);
    const ehEstorno = /(estorno|credito|devolv|reembols|chargeback)/.test(descricaoNorm);

    if (valorRaw < 0) {
      return ehPagamento ? 'pagamento' : 'estorno';
    }
    if (ehPagamento) return 'pagamento';
    if (ehEstorno) return 'estorno';
    return 'despesa';
  };

  const extrairParcelaDaDescricao = (
    descricaoOriginal: string
  ): { descricao: string; parcela_atual?: number; total_parcelas?: number } => {
    const descricao = (descricaoOriginal || '').replace(/\s+/g, ' ').trim();
    if (!descricao) return { descricao: '' };

    // Ex.: "MERCADOLIVRE ... Parcela 9 de 18" -> "MERCADOLIVRE ... 9/18"
    const matchParcelaTexto = descricao.match(/^(.*?)(?:\s+Parcela\s+(\d{1,2})\s+de\s+(\d{1,2}))\s*$/i);
    if (matchParcelaTexto) {
      const atual = Number.parseInt(matchParcelaTexto[2], 10);
      const total = Number.parseInt(matchParcelaTexto[3], 10);
      if (Number.isFinite(atual) && Number.isFinite(total) && total > 1 && atual >= 1 && atual <= total) {
        const base = (matchParcelaTexto[1] || '').trim();
        return {
          descricao: `${base} ${atual}/${total}`.trim(),
          parcela_atual: atual,
          total_parcelas: total,
        };
      }
    }

    const matchParcelaPadrao = descricao.match(/^(.*?)(\d{1,2})\s*\/\s*(\d{1,2})\s*$/);
    if (matchParcelaPadrao) {
      const atual = Number.parseInt(matchParcelaPadrao[2], 10);
      const total = Number.parseInt(matchParcelaPadrao[3], 10);
      if (Number.isFinite(atual) && Number.isFinite(total) && total > 1 && atual >= 1 && atual <= total) {
        const base = (matchParcelaPadrao[1] || '').trim();
        return {
          descricao: `${base} ${atual}/${total}`.trim(),
          parcela_atual: atual,
          total_parcelas: total,
        };
      }
    }

    return { descricao };
  };

  const extrairReferenciaFaturaPDF = (texto: string, linhas: string[]): { mes: number; ano: number } | null => {
    const parseDataCompleta = (valor: string): { mes: number; ano: number } | null => {
      const m = valor.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return null;
      const mes = Number.parseInt(m[2], 10);
      const ano = Number.parseInt(m[3], 10);
      if (!Number.isFinite(mes) || !Number.isFinite(ano) || mes < 1 || mes > 12 || ano < 1900) return null;
      return { mes, ano };
    };

    const matchDireto = texto.match(/(?:Esta fatura vence em|Vence em|Vencimento:?)[\s\r\n]*?(\d{2}\/\d{2}\/\d{4})/i);
    if (matchDireto?.[1]) {
      const ref = parseDataCompleta(matchDireto[1]);
      if (ref) return ref;
    }

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      const matchInline = linha.match(/Vencimento:\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (matchInline?.[1]) {
        const ref = parseDataCompleta(matchInline[1]);
        if (ref) return ref;
      }

      if (/Esta fatura vence em|Vence em/i.test(linha)) {
        const prox = linhas[i + 1] || '';
        const matchProx = prox.match(/^(\d{2}\/\d{2}\/\d{4})$/);
        if (matchProx?.[1]) {
          const ref = parseDataCompleta(matchProx[1]);
          if (ref) return ref;
        }
      }
    }

    return null;
  };

  const completarAnoDaData = (dataTexto: string, referencia: { mes: number; ano: number }): string => {
    const valor = (dataTexto || '').trim();
    const match = valor.match(/^(\d{2})\/(\d{2})(?:\/(\d{2,4}))?$/);
    if (!match) return valor;

    const dia = Number.parseInt(match[1], 10);
    const mes = Number.parseInt(match[2], 10);
    if (!Number.isFinite(dia) || !Number.isFinite(mes) || mes < 1 || mes > 12 || dia < 1 || dia > 31) return valor;

    let ano = referencia.ano;
    if (match[3]) {
      const anoInformado = Number.parseInt(match[3], 10);
      ano = anoInformado < 100 ? 2000 + anoInformado : anoInformado;
    } else if (mes > referencia.mes) {
      ano = referencia.ano - 1;
    }

    return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
  };

  const criarTransacaoNormalizada = (
    quando: string,
    estabelecimentoOriginal: string,
    valorRaw: number,
    index: number
  ): Transacao | null => {
    const { descricao, parcela_atual, total_parcelas } = extrairParcelaDaDescricao(estabelecimentoOriginal);
    const valor = Math.abs(valorRaw);
    if (!descricao || valor <= 0) return null;

    const tipo = classificarTipoLancamento(descricao, valorRaw);
    // Não categorizar aqui - o useEffect vai aplicar as regras após o parse
    // Isso garante que as regras do localStorage sejam usadas corretamente
    return {
      uid: `${quando}-${descricao}-${valor}-${index}`,
      quando,
      estabelecimento: descricao,
      valor,
      tipo,
      categoria: (tipo === 'pagamento' || tipo === 'estorno')
        ? CATEGORIA_PAGAMENTO_FATURA
        : '',
      parcela_atual,
      total_parcelas,
    };
  };

  const descricaoPareceResumoFatura = (descricao: string): boolean => {
    const d = normalizar(descricao || '');
    if (!d) return true;

    // Linhas de resumo/cabeçalho da fatura que não devem virar transação.
    return [
      'resumo da fatura',
      'total desta fatura',
      'total da sua fatura',
      'total da fatura anterior',
      'lancamentos atuais',
      'saldo financiado',
      'limite total de credito',
      'pagamento minimo',
      'parcelas fixas',
      'total a pagar',
      'com vencimento em',
      'previsao prox fechamento',
      'previsao prox',
      'postagem',
      'titular',
      'recibo do pagador',
      'banco itau',
      'personnalite',
      'lancamentos no cartao',
      'lancamentos: compras e saques',
      'lancamentos internacionais',
      'total lancamentos inter',
      'dolar de conversao',
      'valor em r$',
      'vkrpof',
      'pc - 00',
    ].some((trecho) => d.includes(trecho));
  };

  const VALOR_BR_REGEX = /-?\s*\d{1,3}(?:\.\d{3})*,\d{2}/g;
  const REGEX_LINHA_TRANSACAO_PDF = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/g;

  const normalizarLinhaParaParsePDF = (linha: string): string => {
    return String(linha || '')
      .replace(/\s+/g, ' ')
      .trim()
      // OCR/PDF costuma colar "texto23/01" sem espaço.
      .replace(/([A-Za-zÀ-ÿ])(\d{2}\/\d{2}(?:\/\d{2,4})?)/g, '$1 $2')
      .replace(/(\d{2}\/\d{2}(?:\/\d{2,4})?)([A-Za-zÀ-ÿ])/g, '$1 $2');
  };

  const extrairCandidatosPDFItaulayout = (
    pages: Array<{ text?: string }>
  ): Array<{ quando: string; estabelecimento: string; valorRaw: number }> => {
    const paginaPareceLancamentos = (texto: string) => {
      const t = normalizar(texto || '');
      return t.includes('lancamentos: compras e saques') || t.includes('lancamentos internacionais');
    };

    const pagesLancamentos = (pages || []).filter((p) => paginaPareceLancamentos(String(p?.text || '')));
    const fontes = pagesLancamentos.length > 0 ? pagesLancamentos : (pages || []);
    const candidatos: Array<{ quando: string; estabelecimento: string; valorRaw: number }> = [];

    for (const page of fontes) {
      const textoPagina = String(page?.text || '');
      if (!textoPagina) continue;
      let ultimoQuandoConhecido = '';

      const linhasPagina = textoPagina.split(/\r?\n/);
      for (const rawLinha of linhasPagina) {
        const linha = normalizarLinhaParaParsePDF(rawLinha);
        if (!linha) continue;

        // Cada linha pode conter 1 ou mais lançamentos (colunas esquerda/direita).
        const regexLinha = new RegExp(REGEX_LINHA_TRANSACAO_PDF);
        let m: RegExpExecArray | null = regexLinha.exec(linha);
        while (m) {
          const quando = String(m[1] || '').trim();
          const estabelecimento = String(m[2] || '')
            .replace(/\s+/g, ' ')
            .replace(/[-–—]+$/, '')
            .trim();
          const valorRaw = parseValorMonetario(m[3]);
          const descComecaComValor = /^\d{1,3}(?:\.\d{3})*,\d{2}\b/.test(estabelecimento);

          const descValida = estabelecimento
            && /[A-Za-zÀ-ÿ]/.test(estabelecimento)
            && !descComecaComValor
            && !descricaoPareceResumoFatura(estabelecimento);

          if (quando && descValida && Number.isFinite(valorRaw) && valorRaw !== 0) {
            candidatos.push({ quando, estabelecimento, valorRaw });
            ultimoQuandoConhecido = quando;
          }

          m = regexLinha.exec(linha);
        }

        // Ex.: "Repasse de IOF em R$ 2,00" geralmente vem sem data explícita.
        // Atribuímos à última data conhecida da seção para não perder valor.
        const matchRepasseIof = linha.match(/repasse de iof em r\$?\s*(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/i);
        if (matchRepasseIof?.[1] && ultimoQuandoConhecido) {
          const valorRaw = parseValorMonetario(matchRepasseIof[1]);
          if (Number.isFinite(valorRaw) && valorRaw !== 0) {
            candidatos.push({
              quando: ultimoQuandoConhecido,
              estabelecimento: 'Repasse de IOF',
              valorRaw,
            });
          }
        }
      }
    }

    return candidatos;
  };

  const extrairPagamentoEfetuadoDoResumoPDF = (
    textoCompleto: string
  ): Array<{ quando: string; estabelecimento: string; valorRaw: number }> => {
    const itens: Array<{ quando: string; estabelecimento: string; valorRaw: number }> = [];
    const regexPagamento = /pagamento efetuado em\s+(\d{2}\/\d{2}\/\d{4})\s*-\s*(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/gi;

    let m: RegExpExecArray | null = regexPagamento.exec(String(textoCompleto || ''));
    while (m) {
      const quando = String(m[1] || '').trim();
      const valorRaw = -Math.abs(parseValorMonetario(m[2]));
      if (quando && Number.isFinite(valorRaw) && valorRaw !== 0) {
        itens.push({
          quando,
          estabelecimento: 'PAGAMENTO EFETUADO',
          valorRaw,
        });
      }
      m = regexPagamento.exec(String(textoCompleto || ''));
    }

    return itens;
  };

  const extrairResumoFinanceiroPDF = (textoCompleto: string): ResumoPDFImportacao | null => {
    const texto = String(textoCompleto || '');
    const capturar = (regex: RegExp): number | null => {
      const m = texto.match(regex);
      if (!m?.[1]) return null;
      const v = Math.abs(parseValorMonetario(m[1]));
      return Number.isFinite(v) ? v : null;
    };

    const lancamentosAtuais = capturar(/lancamentos atuais\s+(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const saldoFinanciado = capturar(/saldo financiado\s*-\s*(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const totalDestaFaturaEncontrado = capturar(/total desta fatura\s+(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/i);
    const pagamentoEfetuado = capturar(/pagamento efetuado em\s+\d{2}\/\d{2}\/\d{4}\s*-\s*(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/i);

    const totalDestaFaturaCalculado =
      totalDestaFaturaEncontrado
      ?? ((lancamentosAtuais != null && saldoFinanciado != null)
        ? Math.max(0, lancamentosAtuais - saldoFinanciado)
        : null);

    if (
      lancamentosAtuais == null
      && saldoFinanciado == null
      && totalDestaFaturaCalculado == null
      && pagamentoEfetuado == null
    ) {
      return null;
    }

    return {
      lancamentosAtuais,
      saldoFinanciado,
      totalDestaFatura: totalDestaFaturaCalculado,
      pagamentoEfetuado,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError("");
    setResumoPdf(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!detectarTipoArquivo(file)) {
        setParseError("Apenas arquivos CSV ou PDF são aceitos");
        return;
      }

      // Evita importações parciais por filtro antigo salvo em draft
      setModoImportacao('ambas');

      // Se o nome do arquivo traz a data de vencimento, usa como referência da fatura
      const refArquivo = extrairReferenciaDoNomeArquivo(file.name);
      if (refArquivo) {
        setMesReferencia(refArquivo.mes);
        setAnoReferencia(refArquivo.ano);
      }

      setCsvFile(file);
    }
  };

  const handleParse = () => {
    if (!csvFile) {
      setParseError("Selecione um arquivo");
      return;
    }

    setParseError('');
    const tipoArquivo = detectarTipoArquivo(csvFile);
    if (!tipoArquivo) {
      setParseError('Formato inválido. Use CSV ou PDF');
      return;
    }

    if (tipoArquivo === 'csv') {
      const getCsvValue = (row: Record<string, unknown>, aliases: string[]): string => {
        const aliasSet = new Set(aliases.map((a) => normalizar(a)));

        for (const [rawKey, rawValue] of Object.entries(row || {})) {
          const keyNorm = normalizar(String(rawKey || '').replace(/^\uFEFF/, ''));
          if (!aliasSet.has(keyNorm)) continue;
          if (rawValue === null || rawValue === undefined) continue;
          const value = String(rawValue).trim();
          if (value) return value;
        }

        return '';
      };

      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => String(header || '').replace(/^\uFEFF/, '').trim(),
        complete: (results: any) => {
          const dados: Transacao[] = results.data
            .map((row: any, index: number) => {
              const quando = getCsvValue(row, ['data', 'date', 'quando']);
              const estabelecimento = getCsvValue(row, [
                'descricao',
                'description',
                'lançamento',
                'lancamento',
                'estabelecimento',
                'historico',
                'histórico',
              ]);

              const valorStr = getCsvValue(row, ['valor', 'amount']) || '0';
              const valorRaw = parseValorMonetario(valorStr);
              return criarTransacaoNormalizada(quando, estabelecimento, valorRaw, index);
            })
            .filter((t: Transacao | null): t is Transacao => t !== null);

          setTransacoes(dados);
          setResumoPdf(null);
          setStep(2);
          setSortBy('');
          setSortOrder('asc');
        },
        error: (error: any) => {
          setParseError(`Erro ao processar CSV: ${error.message}`);
        }
      });
      return;
    }

    (async () => {
      try {
        const { PDFParse } = await import('pdf-parse');
        PDFParse.setWorker(pdfWorkerUrl);
        const arrayBuffer = await csvFile.arrayBuffer();
        const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });

        let texto = '';
        let textResult: any = null;
        try {
          textResult = await parser.getText();
          texto = textResult?.text || '';
        } finally {
          await parser.destroy().catch(() => undefined);
        }

        const linhas = texto
          .split(/\r?\n/)
          .map((linha: string) => linha.replace(/\s+/g, ' ').trim())
          .filter(Boolean);

        const referenciaArquivo = extrairReferenciaFaturaPDF(texto, linhas);
        const fallbackMes = Number.parseInt(mesReferencia || String(new Date().getMonth() + 1), 10);
        const fallbackAno = Number.parseInt(anoReferencia || String(new Date().getFullYear()), 10);
        const referencia = referenciaArquivo || {
          mes: Number.isFinite(fallbackMes) ? Math.min(12, Math.max(1, fallbackMes)) : (new Date().getMonth() + 1),
          ano: Number.isFinite(fallbackAno) ? fallbackAno : new Date().getFullYear(),
        };

        const pages = Array.isArray(textResult?.pages) ? textResult.pages : [];
        const candidatosEstruturados = extrairCandidatosPDFItaulayout(pages);
        const pagamentosResumo = extrairPagamentoEfetuadoDoResumoPDF(texto);
        const candidatos = [...candidatosEstruturados, ...pagamentosResumo];
        const resumoExtraido = extrairResumoFinanceiroPDF(texto);

        // Fallback para outros layouts de PDF.
        if (candidatos.length === 0) {
          const textoLinear = linhas
            .join('\n')
            .replace(/([A-Za-zÀ-ÿ0-9])(\d{2}\/\d{2}(?:\/\d{2,4})?)/g, '$1 $2')
            .replace(/(\d{2}\/\d{2}(?:\/\d{2,4})?)([A-Za-zÀ-ÿ])/g, '$1 $2');

          const regexFallback = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+(.+?)\s+(?:R\$\s*)?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/gims;
          let matchFallback: RegExpExecArray | null = regexFallback.exec(textoLinear);
          while (matchFallback) {
            const quando = String(matchFallback[1] || '').trim();
            const estabelecimento = String(matchFallback[2] || '').replace(/\s+/g, ' ').trim();
            const valorRaw = parseValorMonetario(matchFallback[3]);
            if (quando && estabelecimento && !descricaoPareceResumoFatura(estabelecimento)) {
              candidatos.push({ quando, estabelecimento, valorRaw });
            }
            matchFallback = regexFallback.exec(textoLinear);
          }
        }

        const dados: Transacao[] = candidatos
          .map((item, index) => {
            if (!item.estabelecimento || descricaoPareceResumoFatura(item.estabelecimento)) return null;

            const quando = completarAnoDaData(item.quando, referencia);
            return criarTransacaoNormalizada(quando, item.estabelecimento, item.valorRaw, index);
          })
          .filter((t: Transacao | null): t is Transacao => t !== null);

        if (dados.length === 0) {
          setParseError('Nenhuma transação foi identificada no PDF. Verifique se o layout está no padrão de fatura.');
          return;
        }

        setTransacoes(dados);
        setResumoPdf(resumoExtraido);
        setStep(2);
        setSortBy('');
        setSortOrder('asc');
      } catch (error: any) {
        setResumoPdf(null);
        setParseError(`Erro ao processar PDF: ${error?.message || 'não foi possível ler o arquivo'}`);
      }
    })();
  };

  const formatarDataBR = (data: string) => {
    if (!data) return '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) return data;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const [ano, mes, dia] = data.split('-');
      return `${dia}/${mes}/${ano}`;
    }
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

  const handleAddNovaCategoria = async (t: Transacao, suggestedName?: string) => {
    const nomeInicial = String(suggestedName || '').trim();
    const nome = nomeInicial || window.prompt('Digite o nome da nova categoria:', nomeInicial);
    if (!nome || !String(nome).trim()) return;
    const nomeLimpo = String(nome).trim();
    const tipoCategoria =
      t.tipo === 'pagamento' || t.tipo === 'estorno' || t.tipo === 'receita'
        ? 'receita'
        : 'despesa';

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

    if (t.tipo === 'pagamento' || t.tipo === 'estorno') {
      setCategoriasReceita(prev => Array.from(new Set([nomeLimpo, ...prev])));
    } else {
      setCategoriasDespesa(prev => Array.from(new Set([nomeLimpo, ...prev])));
    }
    handleEditLancamento(t, 'categoria', nomeLimpo);
  };

  const handleCategoriaChange = (t: Transacao, value: string) => {
    handleEditLancamento(t, 'categoria', value);
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
    const isParcelada = (t: Transacao) => {
      if (t.total_parcelas && Number(t.total_parcelas) > 1) return true;
      return /(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.test((t.estabelecimento || '').trim());
    };
    const transacoesSelecionadas = transacoes.filter(t => {
      if (modoImportacao === 'somente_parceladas') return isParcelada(t);
      if (modoImportacao === 'somente_nao_parceladas') return !isParcelada(t);
      return true;
    });

    if (!cartaoSelecionado) {
      toast({
        title: 'Erro',
        description: 'Selecione um cartão',
        variant: 'destructive'
      });
      return;
    }

    if (transacoesSelecionadas.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhuma transação atende ao filtro de importação selecionado',
        variant: 'destructive'
      });
      return;
    }

    const pendentesCategoria = transacoesSelecionadas.filter((t) => {
      if (t.tipo === 'pagamento' || t.tipo === 'estorno') return false;
      return !String(t.categoria || '').trim();
    });
    if (pendentesCategoria.length > 0) {
      toast({
        title: 'Categoria pendente',
        description: `${pendentesCategoria.length} lançamento(s) sem categoria. Preencha antes de importar.`,
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onImport(
        transacoesSelecionadas,
        cartaoSelecionado,
        regrasTexto,
        mesReferencia,
        anoReferencia,
        { criarParcelasFuturas }
      );
      setImportFeedback(result || {
        success: true,
        message: `Importação realizada com sucesso! ${transacoesSelecionadas.length} transações importadas.`
      });
      
      setTimeout(() => {
        clearDraft();
        hardResetAndClose();
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

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
  };

  const hardResetAndClose = () => {
    setStep(1);
    setTransacoes([]);
    setCsvFile(null);
    setParseError("");
    setImportFeedback(null);
    setResumoPdf(null);
    setSortBy('');
    setSortOrder('asc');
    setCriarParcelasFuturas(true);
    setModoImportacao('ambas');
    const cartao = (cartoes || []).find((c: any) => c.id === cartaoSelecionado) || (cartoes || [])[0];
    if (cartao) {
      const ref = getDefaultFaturaVencimento(cartao, new Date());
      setMesReferencia(ref.mes);
      setAnoReferencia(ref.ano);
    } else {
      setMesReferencia(String(new Date().getMonth() + 1).padStart(2, '0'));
      setAnoReferencia(String(new Date().getFullYear()));
    }
    onClose();
  };

  const closeModalKeepingDraft = () => {
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md" onClick={(e) => e.currentTarget === e.target && closeModalKeepingDraft()}>
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
              onClick={closeModalKeepingDraft}
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

                <p className="text-xs text-slate-400 -mt-1">
                  Mês = vencimento da fatura ({dataVencimentoLabel}, dia {Math.max(1, diaVencimentoCartao)}).
                </p>

                <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/30">
                  <p className="text-sm font-semibold text-slate-200 mb-2">Filtro de importação</p>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-100 hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition"
                    value={modoImportacao}
                    onChange={(e) => setModoImportacao(e.target.value as 'ambas' | 'somente_parceladas' | 'somente_nao_parceladas')}
                  >
                    <option value="ambas">Tudo (parceladas + não parceladas)</option>
                    <option value="somente_parceladas">Somente compras parceladas (ex: 3/12)</option>
                    <option value="somente_nao_parceladas">Somente compras não parceladas (à vista)</option>
                  </select>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Isso filtra o que será salvo no sistema.
                  </p>
                </div>

                {modoImportacao !== 'somente_nao_parceladas' && (
                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/30">
                    <p className="text-sm font-semibold text-slate-200 mb-2">Compras parceladas</p>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={criarParcelasFuturas}
                        onChange={(e) => setCriarParcelasFuturas(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 text-primary focus:ring-primary/20"
                      />
                      Gerar lançamentos das próximas parcelas automaticamente
                    </label>
                    <p className="text-xs text-slate-400 mt-1.5">
                      Marcado: uma compra 3/12 gera também 4/12 até 12/12. Desmarcado: importa só o que veio no arquivo.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-200 mb-3">Arquivo da fatura (CSV ou PDF)</label>
                  <input
                    type="file"
                    accept=".csv,.pdf"
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
                  onClick={closeModalKeepingDraft}
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
                  const lancamentosAtuaisCalculado = totalDespesas - totalEstornos;
                  const lancamentosAtuaisExibicao = resumoPdf?.lancamentosAtuais ?? lancamentosAtuaisCalculado;
                  const totalFaturaExibicao = resumoPdf?.totalDestaFatura ?? lancamentosAtuaisCalculado;
                  const saldoFinanciadoExibicao = resumoPdf?.saldoFinanciado ?? null;
                  const pagamentoAnteriorExibicao = resumoPdf?.pagamentoEfetuado ?? totalPagamentos;
                  const mostraPagamentoAnterior = pagamentoAnteriorExibicao > 0;
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
                        <p className="text-sm text-blue-400 font-medium">
                          {resumoPdf?.totalDestaFatura != null ? 'Total da Fatura' : 'Valor da Fatura'}
                        </p>
                        <p className="text-lg font-bold text-blue-100 mt-1">{formatCurrency(totalFaturaExibicao)}</p>
                        <p className="text-xs text-blue-300/70 mt-0.5">
                          Lançamentos atuais: {formatCurrency(lancamentosAtuaisExibicao)}
                        </p>
                        {saldoFinanciadoExibicao != null && saldoFinanciadoExibicao > 0 && (
                          <p className="text-xs text-amber-300/80 mt-0.5">
                            - {formatCurrency(saldoFinanciadoExibicao)} saldo financiado
                          </p>
                        )}
                        {totalEstornos > 0 && <p className="text-xs text-green-400/70 mt-0.5">- {formatCurrency(totalEstornos)} estornos</p>}
                      </div>
                      {mostraPagamentoAnterior ? (
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                          <p className="text-sm text-green-400 font-medium">Pgto Fatura Anterior</p>
                          <p className="text-lg font-bold text-green-300 mt-1">{formatCurrency(pagamentoAnteriorExibicao)}</p>
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
                <p className="text-xs text-slate-400 mt-2">
                  Se houver saldo financiado da fatura anterior no banco, o "Total desta fatura" pode diferir deste valor importado.
                </p>
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
                            {(() => {
                              const categoriasDaLinha = (t.tipo === 'pagamento' || t.tipo === 'estorno')
                                ? categoriasReceitaDropdown
                                : categoriasDespesaDropdown;
                              const categoriaAtual = String(t.categoria || '');
                              const valueAtual = categoriasDaLinha.some((option) => normalizar(option.value) === normalizar(categoriaAtual))
                                ? categoriaAtual
                                : '';
                              return (
                            <ImportCategoryCombobox
                              value={valueAtual}
                              options={categoriasDaLinha}
                              placeholder="Selecione categoria..."
                              invalid={t.tipo !== 'pagamento' && t.tipo !== 'estorno' && !valueAtual}
                              onValueChange={(value) => handleCategoriaChange(t, value)}
                              onCreateCategory={(suggestedName) => handleAddNovaCategoria(t, suggestedName)}
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
