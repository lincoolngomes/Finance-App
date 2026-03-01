
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GerenciarFaturasModal } from '@/components/faturas/GerenciarFaturasModal';
import { ImportarFaturaModalNovo } from '@/components/faturas/ImportarFaturaModalNovo';
import { HistoricoImportacoesModal } from '@/components/faturas/HistoricoImportacoesModal';
import { formatCurrency, formatarValorBR, parseValorBR } from '@/utils/currency';
import { categorizar } from '@/utils/categorizacao';
import { Card, CardContent } from '@/components/ui/card';

// Modal simplificado para importar extrato (antigo - manter para compatibilidade)
function ImportarExtratoModal({ open, onClose, onImport }) {
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

function EditCartaoModal({ cartao, open, onClose, onSave, onDelete }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    limite: 0,
    dia_fechamento: '',
    dia_vencimento: '',
    cor: '#3b82f6',
    linked_account_id: null,
  });
  const [contas, setContas] = useState<any[]>([]);

  useEffect(() => {
    if (cartao) {
      setFormData({
        name: cartao.name || cartao.nome || '',
        limite: cartao.limite || 0,
        dia_fechamento: cartao.dia_fechamento ? String(cartao.dia_fechamento) : '',
        dia_vencimento: cartao.dia_vencimento ? String(cartao.dia_vencimento) : '',
        cor: cartao.cor || '#3b82f6',
        linked_account_id: cartao.linked_account_id || null,
      });
    } else if (open) {
      // Reset para novo cartão
      setFormData({
        name: '',
        limite: 0,
        dia_fechamento: '',
        dia_vencimento: '',
        cor: '#3b82f6',
        linked_account_id: null,
      });
    }
  }, [cartao, open]);

  useEffect(() => {
    if (open) {
      fetchContasVincular();
    }
  }, [open]);

  const fetchContasVincular = async () => {
    const { data } = await supabase
      .from('accounts')
      .select('id, nome, tipo')
      .eq('user_id', user?.id)
      .order('nome');
    
    if (data) setContas(data.map(c => ({ ...c, name: c.nome || c.name || '', type: c.tipo || c.type || '' })));
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      ...(cartao || {}),
      ...formData,
      tipo: 'credito',
    });
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 gap-0 border-slate-700/50 bg-slate-900/95 backdrop-blur-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header fixo */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-700/50 shrink-0">
          <h2 className="text-lg font-semibold">{cartao ? 'Editar Cartão' : 'Novo Cartão'}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure os detalhes do seu cartão de crédito</p>
        </div>

        {/* Conteúdo com scroll */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Preview do Cartão - compacto */}
          <div className="p-4 rounded-xl text-white relative overflow-hidden shadow-lg"
            style={{ background: `linear-gradient(135deg, ${formData.cor} 0%, ${adjustColor(formData.cor, 30)} 100%)` }}>
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-semibold opacity-80 uppercase tracking-wider">Cartão de Crédito</p>
                  <h3 className="text-base font-bold mt-1">{formData.name || 'Seu Cartão'}</h3>
                </div>
                <div className="text-2xl font-bold opacity-60">◆</div>
              </div>
              
              <div className="mb-4">
                <p className="text-[10px] opacity-80 mb-0.5">Limite Disponível</p>
                <p className="text-lg font-bold">{formatCurrency(formData.limite)}</p>
              </div>
              
              <div className="flex items-center justify-between text-[11px]">
                <div>
                  <p className="opacity-80">Fechamento</p>
                  <p className="font-semibold">{formData.dia_fechamento || '-'}</p>
                </div>
                <div>
                  <p className="opacity-80">Vencimento</p>
                  <p className="font-semibold">{formData.dia_vencimento || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="opacity-80">Conta</p>
                  <p className="font-semibold">
                    {formData.linked_account_id 
                      ? (contas.find(c => c.id === formData.linked_account_id)?.name || 'Vinculada')
                      : 'Sem vínculo'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formulário */}
          {/* Nome do Cartão */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nome do Cartão</label>
            <Input
              placeholder="Ex: Black Itaú, Platinum, etc"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="bg-slate-800/50 border-slate-700/50 h-9"
            />
          </div>

          {/* Conta Vinculada */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">🔗 Conta Vinculada</label>
            <Select 
              value={formData.linked_account_id || 'none'} 
              onValueChange={(value) => handleChange('linked_account_id', value === 'none' ? null : value)}
            >
              <SelectTrigger className="bg-slate-800/50 border-slate-700/50 h-9">
                <SelectValue placeholder="Sem vinculação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Sem vinculação</span>
                </SelectItem>
                {contas.map(conta => (
                  <SelectItem key={conta.id} value={conta.id}>
                    {conta.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Ao pagar a fatura, o valor será debitado automaticamente desta conta
            </p>
          </div>

          {/* Limite */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Limite (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="text"
                placeholder="15000,00"
                value={formData.limite ? formData.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  const numValue = value ? parseFloat(value) / 100 : 0;
                  handleChange('limite', numValue);
                }}
                className="bg-slate-800/50 border-slate-700/50 h-9 pl-9"
              />
            </div>
          </div>

          {/* Fechamento + Vencimento lado a lado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dia Fechamento</label>
              <Select value={formData.dia_fechamento} onValueChange={(value) => handleChange('dia_fechamento', value)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700/50 h-9">
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dia Vencimento</label>
              <Select value={formData.dia_vencimento} onValueChange={(value) => handleChange('dia_vencimento', value)}>
                <SelectTrigger className="bg-slate-800/50 border-slate-700/50 h-9">
                  <SelectValue placeholder="Dia" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cor do Cartão */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cor do Cartão</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.cor}
                onChange={(e) => handleChange('cor', e.target.value)}
                className="w-10 h-9 rounded cursor-pointer border border-slate-700/50"
              />
              <div className="flex-1">
                <Input
                  placeholder="#3b82f6"
                  value={formData.cor}
                  onChange={(e) => handleChange('cor', e.target.value)}
                  className="bg-slate-800/50 border-slate-700/50 h-9 font-mono text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer fixo */}
        <div className="flex items-center px-6 py-3 border-t border-slate-700/50 shrink-0 bg-slate-900/50">
          {cartao && onDelete && (
            <Button 
              variant="ghost" 
              onClick={async () => {
                const ok = await onDelete(cartao);
                if (ok) onClose();
              }} 
              className="h-9 text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5 text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Excluir Cartão
            </Button>
          )}
          <div className="flex-1" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="h-9 text-sm">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 h-9 text-sm">
              Salvar Cartão
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper para ajustar cores
function adjustColor(color: string, percent: number) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}



export default function Cartoes({ isModal = false }) {
  const { user } = useAuth();
  const [importOpen, setImportOpen] = useState(false);
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editCartao, setEditCartao] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [transacoes, setTransacoes] = useState([]);
  const [faturasOpen, setFaturasOpen] = useState(false);
  const [cartaoSelecionado, setCartaoSelecionado] = useState<string | null>(null);
  const [importarFaturaOpen, setImportarFaturaOpen] = useState(false);
  const [cartaoParaImportar, setCartaoParaImportar] = useState<string | undefined>(undefined);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [parcelamentosAbertos, setParcelamentosAbertos] = useState<Record<string, boolean>>({});
  const [deleteCartaoOpen, setDeleteCartaoOpen] = useState(false);
  const [deleteCartaoLoading, setDeleteCartaoLoading] = useState(false);
  const [deleteCartaoTarget, setDeleteCartaoTarget] = useState<any | null>(null);
  const [deleteCartaoTransacoesCount, setDeleteCartaoTransacoesCount] = useState(0);

  async function fetchTransacoesCartao() {
    if (!user?.id) return;

    const { data: transData, error: transError } = await supabase
      .from('transacoes')
      .select('id, valor, tipo, cartao_id, data, descricao, fatura_mes, fatura_ano, pago')
      .eq('user_id', user?.id);

    console.log('📊 Transações carregadas:', transData?.length, 'Erro:', transError)
    if (!transError && transData) {
      setTransacoes(transData);
    } else {
      console.error('❌ Erro ao buscar transações:', transError)
      setTransacoes([]);
    }
  }

  async function fetchCartoes() {
    setLoading(true);
    const { data, error } = await supabase
      .from('cartoes')
      .select('*')
      .eq('user_id', user?.id);
    
    console.log('📋 Cartões carregados:', data)
    console.log('❌ Erro:', error)
    
    if (!error && data) {
      // Mapear campos para manter compatibilidade com o componente
      const cartoesFormatados = data.map(c => ({
        ...c,
        name: c.nome, // alias para compatibilidade
      }));
      console.log('✅ Cartões:', cartoesFormatados)
      setCartoes(cartoesFormatados);
    }
    setLoading(false);
    await fetchTransacoesCartao();
  }

  useEffect(() => {
    if (user) {
      fetchCartoes();
    }
  }, [user]);

  // Importação de fatura
  async function handleImportLancamentos(lancs) {
    // Se houver apenas um cartão, já associa automaticamente
    const cartaoId = cartoes.length === 1 ? cartoes[0].id : undefined;
    const toInsert = lancs.map(l => ({
      data: l.quando,
      descricao: l.estabelecimento,
      valor: l.valor,
      tipo: l.tipo || 'despesa',
      cartao_id: cartaoId,
      user_id: user?.id,
      pago: false,
    }));
    const { error } = await supabase.from('transacoes').insert(toInsert);
    if (error) {
      alert('Erro ao importar: ' + error.message);
    } else {
      fetchCartoes();
      alert('Importação realizada com sucesso!');
    }
  }

  // Importar fatura do cartão
  async function handleImportFatura(
    transacoes,
    cartaoId,
    regrasTexto,
    mesReferencia?: string,
    anoReferencia?: string,
    options?: { criarParcelasFuturas?: boolean }
  ) {
    console.log('📥 handleImportFatura chamado com:', { mesReferencia, anoReferencia, transacoesCount: transacoes?.length })
    
    // Salvar regras no localStorage é feito no componente
    const CATEGORIA_PAGAMENTO_FATURA = 'Pagamento de Fatura';
    const refFatura = mesReferencia && anoReferencia ? `${mesReferencia}/${anoReferencia}` : null;
    const faturaMes = mesReferencia ? parseInt(mesReferencia) : null;
    const faturaAno = anoReferencia ? parseInt(anoReferencia) : null;
    
    console.log('📥 faturaMes:', faturaMes, 'faturaAno:', faturaAno)
    
    const criarParcelasFuturas = options?.criarParcelasFuturas ?? true;
    let totalParcelasFuturasCriadas = 0;
    const faltandoCategoria = (transacoes || []).filter((t: any) => {
      const tipoTransacao = (t?.tipo === 'pagamento' || t?.tipo === 'estorno') ? 'receita' : 'despesa';
      if (tipoTransacao !== 'despesa') return false;
      const categoriaRegra = categorizar(String(t?.estabelecimento || ''), regrasTexto || '');
      const categoriaAtual = String(t?.categoria || '').trim();
      return !categoriaRegra && !categoriaAtual;
    });

    if (faltandoCategoria.length > 0) {
      return {
        success: false,
        message: `Existem ${faltandoCategoria.length} lançamento(s) sem categoria. Preencha antes de importar.`,
      };
    }

    let suportaCamposParcela = true;
    const toIsoDate = (date: Date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const parseDataParaBanco = (value: unknown): { dateObj: Date; isoDate: string } | null => {
      const texto = String(value || '').trim();
      if (!texto) {
        return null;
      }

      // Formato BR: dd/mm/yyyy ou dd/mm/yy (com ano opcional)
      const br = texto.match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?$/);
      if (br) {
        const dia = parseInt(br[1], 10);
        const mes = parseInt(br[2], 10);
        let ano = faturaAno || new Date().getFullYear();
        if (br[3]) {
          const parsedYear = parseInt(br[3], 10);
          ano = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
        }

        const parsed = new Date(Date.UTC(ano, mes - 1, dia));
        if (
          !Number.isNaN(parsed.getTime()) &&
          parsed.getUTCDate() === dia &&
          parsed.getUTCMonth() === (mes - 1)
        ) {
          return { dateObj: parsed, isoDate: toIsoDate(parsed) };
        }
      }

      // Formato ISO data: yyyy-mm-dd
      const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (iso) {
        const ano = parseInt(iso[1], 10);
        const mes = parseInt(iso[2], 10);
        const dia = parseInt(iso[3], 10);
        const parsed = new Date(Date.UTC(ano, mes - 1, dia));
        if (
          !Number.isNaN(parsed.getTime()) &&
          parsed.getUTCDate() === dia &&
          parsed.getUTCMonth() === (mes - 1)
        ) {
          return { dateObj: parsed, isoDate: toIsoDate(parsed) };
        }
      }

      // Fallback: tenta parser nativo
      const parsedNative = new Date(texto);
      if (!Number.isNaN(parsedNative.getTime())) {
        const normalized = new Date(Date.UTC(
          parsedNative.getUTCFullYear(),
          parsedNative.getUTCMonth(),
          parsedNative.getUTCDate()
        ));
        return { dateObj: normalized, isoDate: toIsoDate(normalized) };
      }

      return null;
    };

    // Buscar/criar categorias para associar categoria_id
    const categoriaCache: Record<string, string> = {};
    async function getOrCreateCategoriaId(nomeCategoria: string, tipoCategoria: 'despesa' | 'receita'): Promise<string | null> {
      if (!nomeCategoria || nomeCategoria.trim() === '') return null;
      const nome = nomeCategoria.trim();
      const cacheKey = `${tipoCategoria}:${nome.toLowerCase()}`;
      if (categoriaCache[cacheKey]) return categoriaCache[cacheKey];
      // Buscar existente
      const { data: existingRows } = await supabase
        .from('categorias')
        .select('id, nome')
        .eq('user_id', user?.id)
        .eq('tipo', tipoCategoria)
        .ilike('nome', nome);

      const existing =
        (existingRows || []).find(
          (c) => String(c.nome || '').trim().toLowerCase() === nome.toLowerCase()
        ) || existingRows?.[0];

      if (existing?.id) {
        categoriaCache[cacheKey] = existing.id;
        return existing.id;
      }
      // Criar nova
      const { data: created } = await supabase
        .from('categorias')
        .insert({ user_id: user?.id, nome, tipo: tipoCategoria })
        .select('id')
        .maybeSingle();
      if (created?.id) {
        categoriaCache[cacheKey] = created.id;
        return created.id;
      }
      return null;
    }

    const toInsert = [];

    const parseParcela = (t: any) => {
      if (t.parcela_atual && t.total_parcelas) {
        return {
          atual: Number(t.parcela_atual),
          total: Number(t.total_parcelas),
        };
      }
      const desc = (t.estabelecimento || '').trim();
      const match = desc.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*$/);
      if (!match) return null;
      const atual = parseInt(match[1], 10);
      const total = parseInt(match[2], 10);
      if (Number.isNaN(atual) || Number.isNaN(total) || total <= 1 || atual < 1 || atual > total) return null;
      return { atual, total };
    };

    const updateDescricaoParcela = (descricao: string, parcelaAtual: number, totalParcelas: number) => {
      const base = (descricao || '').trim();
      if (/(\d{1,2})\s*\/\s*(\d{1,2})\s*$/.test(base)) {
        return base.replace(/(\d{1,2})\s*\/\s*(\d{1,2})\s*$/, `${parcelaAtual}/${totalParcelas}`);
      }
      return `${base} ${parcelaAtual}/${totalParcelas}`.trim();
    };
    const datasInvalidas: string[] = [];
    for (const t of transacoes) {
      const parcelaInfo = parseParcela(t);
      const tipoTransacao = (t.tipo === 'pagamento' || t.tipo === 'estorno') ? 'receita' : 'despesa';
      const tipoCategoria = tipoTransacao === 'despesa' ? 'despesa' : 'receita';
      const categoriaPorRegra = (t.tipo === 'pagamento' || t.tipo === 'estorno')
        ? CATEGORIA_PAGAMENTO_FATURA
        : categorizar(t.estabelecimento || '', regrasTexto || '');
      const nomeCategoriaFinal = (categoriaPorRegra || String(t.categoria || '').trim()).trim();
      const categoriaId = await getOrCreateCategoriaId(nomeCategoriaFinal, tipoCategoria);
      const parsedData = parseDataParaBanco(t.quando);
      if (!parsedData) {
        datasInvalidas.push(String(t.estabelecimento || t.quando || 'Lançamento sem descrição'));
        continue;
      }
      const { dateObj: baseData, isoDate: baseDataIso } = parsedData;

      toInsert.push({
        data: baseDataIso,
        descricao: t.estabelecimento,
        valor: t.valor,
        tipo: tipoTransacao,
        cartao_id: cartaoId,
        user_id: user?.id,
        pago: false,
        ...(categoriaId ? { categoria_id: categoriaId } : {}),
        ...(refFatura ? { observacao: `Fatura ${refFatura}` } : {}),
        ...(suportaCamposParcela && parcelaInfo ? { parcela_atual: parcelaInfo.atual, total_parcelas: parcelaInfo.total } : {}),
        // Sempre usar o mês/ano de referência selecionado pelo usuário
        fatura_mes: faturaMes ?? (baseData.getUTCMonth() + 1),
        fatura_ano: faturaAno ?? baseData.getUTCFullYear(),
      });

      if (
        criarParcelasFuturas &&
        tipoTransacao === 'despesa' &&
        parcelaInfo &&
        parcelaInfo.total > parcelaInfo.atual
      ) {
        const baseMes = faturaMes ?? (baseData.getUTCMonth() + 1);
        const baseAno = faturaAno ?? baseData.getUTCFullYear();
        const parcelasRestantes = parcelaInfo.total - parcelaInfo.atual;

        for (let offset = 1; offset <= parcelasRestantes; offset++) {
          const proxParcela = parcelaInfo.atual + offset;
          const dataFutura = new Date(Date.UTC(baseAno, baseMes - 1 + offset, 1));
          const faturaMesFutura = dataFutura.getUTCMonth() + 1;
          const faturaAnoFutura = dataFutura.getUTCFullYear();

          toInsert.push({
            data: toIsoDate(dataFutura),
            descricao: updateDescricaoParcela(t.estabelecimento, proxParcela, parcelaInfo.total),
            valor: t.valor,
            tipo: 'despesa',
            cartao_id: cartaoId,
            user_id: user?.id,
            pago: false,
            ...(categoriaId ? { categoria_id: categoriaId } : {}),
            observacao: `Parcela ${proxParcela}/${parcelaInfo.total}`,
            ...(suportaCamposParcela ? { parcela_atual: proxParcela, total_parcelas: parcelaInfo.total } : {}),
            fatura_mes: faturaMesFutura,
            fatura_ano: faturaAnoFutura,
          });
          totalParcelasFuturasCriadas += 1;
        }
      }
    }

    if (datasInvalidas.length > 0) {
      return {
        success: false,
        message: `${datasInvalidas.length} lançamento(s) com data inválida. Ex.: ${datasInvalidas.slice(0, 3).join(', ')}. Revise a coluna de data no CSV.`,
      };
    }

    const payloadSemCamposParcela = toInsert.map((item) => {
      const { parcela_atual, total_parcelas, ...rest } = item as any;
      return rest;
    });

    const payloadFinal = suportaCamposParcela ? toInsert : payloadSemCamposParcela;

    console.log('📦 Inserindo transações:', JSON.stringify(payloadFinal[0], null, 2));
    console.log('📦 Total a inserir:', payloadFinal.length);

    let { error } = await supabase.from('transacoes').insert(payloadFinal);

    // Fallback de compatibilidade:
    // se ambiente não suportar colunas de parcela, reenvia sem os campos.
    if (error?.code === 'PGRST204' && suportaCamposParcela) {
      console.warn('⚠️ Schema sem colunas de parcela. Reenviando importação sem parcela_atual/total_parcelas.');
      const retry = await supabase.from('transacoes').insert(payloadSemCamposParcela);
      error = retry.error;
      if (!error) {
        suportaCamposParcela = false;
      }
    }

    if (error) {
      console.error('❌ Erro ao inserir transações:', error);
      console.error('❌ Detalhes:', JSON.stringify(error, null, 2));
      return {
        success: false,
        message: `Erro ao importar: ${error.message} (code: ${error.code}, details: ${error.details})`
      };
    }

    let totalRecategorizadas = 0;
    const { data: transacoesCartaoExistentes } = await supabase
      .from('transacoes')
      .select('id, descricao, tipo, categoria_id')
      .eq('user_id', user?.id)
      .not('cartao_id', 'is', null);

    if (Array.isArray(transacoesCartaoExistentes) && transacoesCartaoExistentes.length > 0) {
      const atualizacoes: Array<{ id: string; categoria_id: string }> = [];
      for (const row of transacoesCartaoExistentes) {
        const descricao = String(row?.descricao || '').trim();
        if (!descricao) continue;
        const categoriaPorRegra = categorizar(descricao, regrasTexto || '');
        if (!categoriaPorRegra) continue;
        const tipoCategoria = row?.tipo === 'receita' ? 'receita' : 'despesa';
        const categoriaId = await getOrCreateCategoriaId(categoriaPorRegra, tipoCategoria);
        if (categoriaId && categoriaId !== row?.categoria_id) {
          atualizacoes.push({ id: row.id, categoria_id: categoriaId });
        }
      }

      for (const updateRow of atualizacoes) {
        const { error: updateError } = await supabase
          .from('transacoes')
          .update({ categoria_id: updateRow.categoria_id })
          .eq('id', updateRow.id)
          .eq('user_id', user?.id);
        if (!updateError) totalRecategorizadas += 1;
      }
    }

    fetchCartoes();
    return {
      success: true,
      message: `Importação realizada com sucesso! ${transacoes.length} transações importadas${totalParcelasFuturasCriadas > 0 ? ` e ${totalParcelasFuturasCriadas} parcelas futuras criadas` : ''}${totalRecategorizadas > 0 ? `. ${totalRecategorizadas} transações recategorizadas pelas regras` : ''}.`
    };
  }

  // Excluir cartão
  async function handleDeleteCartao(cartao) {
    const qtdTransacoesVinculadas = transacoes.filter(t => t.cartao_id === cartao.id).length;
    setDeleteCartaoTarget(cartao);
    setDeleteCartaoTransacoesCount(qtdTransacoesVinculadas);
    setDeleteCartaoOpen(true);
    return true;
  }

  async function confirmDeleteCartao(excluirTransacoesVinculadas: boolean) {
    if (!deleteCartaoTarget) return;
    setDeleteCartaoLoading(true);

    if (excluirTransacoesVinculadas) {
      const { error: deleteTransacoesError } = await supabase
        .from('transacoes')
        .delete()
        .eq('user_id', user?.id)
        .eq('cartao_id', deleteCartaoTarget.id);

      if (deleteTransacoesError) {
        alert('Erro ao excluir transações vinculadas: ' + deleteTransacoesError.message);
        setDeleteCartaoLoading(false);
        return;
      }
    }

    const { error } = await supabase.from('cartoes').delete().eq('id', deleteCartaoTarget.id);
    if (error) {
      alert('Erro ao excluir: ' + error.message);
      setDeleteCartaoLoading(false);
      return;
    } else {
      setDeleteCartaoOpen(false);
      setDeleteCartaoTarget(null);
      setDeleteCartaoTransacoesCount(0);
      fetchCartoes();
    }
    setDeleteCartaoLoading(false);
  }

  // Editar cartão (abrir modal)
  function handleEditCartao(cartao) {
    setEditCartao(cartao);
    setEditOpen(true);
  }

  function handleOpenFaturas(cartaoId: string) {
    setCartaoSelecionado(cartaoId);
    setFaturasOpen(true);
  }

  // Salvar edição
  async function handleSaveCartao(cartaoEditado) {
    // Converter strings vazias para null (campos INTEGER no banco)
    const diaFechamento = cartaoEditado.dia_fechamento ? parseInt(cartaoEditado.dia_fechamento) || null : null;
    const diaVencimento = cartaoEditado.dia_vencimento ? parseInt(cartaoEditado.dia_vencimento) || null : null;
    const limite = cartaoEditado.limite ? Number(cartaoEditado.limite) || 0 : 0;

    if (cartaoEditado.id) {
      // Edição de cartão existente
      const { error } = await supabase.from('cartoes').update({ 
        nome: cartaoEditado.name,
        banco: cartaoEditado.banco,
        limite,
        dia_fechamento: diaFechamento,
        dia_vencimento: diaVencimento,
        cor: cartaoEditado.cor,
        linked_account_id: cartaoEditado.linked_account_id,
      }).eq('id', cartaoEditado.id);
      setEditOpen(false);
      setEditCartao(null);
      if (error) {
        alert('Erro ao editar: ' + error.message);
      } else {
        fetchCartoes();
      }
    } else {
      // Novo cartão
      const { error } = await supabase.from('cartoes').insert({
        user_id: user?.id,
        nome: cartaoEditado.name,
        banco: cartaoEditado.banco,
        limite,
        dia_fechamento: diaFechamento,
        dia_vencimento: diaVencimento,
        cor: cartaoEditado.cor,
        linked_account_id: cartaoEditado.linked_account_id,
      });
      setEditOpen(false);
      setEditCartao(null);
      if (error) {
        alert('Erro ao criar cartão: ' + error.message);
      } else {
        fetchCartoes();
      }
    }
  }

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-900/70 via-slate-900/50 to-slate-900/30 p-5 md:p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Cartões de Crédito</h2>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seus cartões, faturas e limite em tempo real</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline"
            className="h-9 text-sm rounded-lg px-4 font-semibold gap-2 border-slate-700/70 bg-slate-900/50 hover:bg-slate-800/70" 
            onClick={() => setHistoricoOpen(true)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Histórico
          </Button>
          <Button 
            variant="outline"
            className="h-9 text-sm rounded-lg px-4 font-semibold gap-2 border-slate-700/70 bg-slate-900/50 hover:bg-slate-800/70" 
            onClick={() => setImportarFaturaOpen(true)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Importar Fatura
          </Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700 h-9 text-sm rounded-lg px-4 font-semibold gap-2 shadow-lg shadow-blue-900/30" 
            onClick={() => {
              setEditCartao(null);
              setEditOpen(true);
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Cartão
          </Button>
        </div>
      </div>
      </div>

      {loading ? (
        <p className="text-center py-12 text-muted-foreground">Carregando cartões...</p>
      ) : cartoes.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-lg">
          <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <p className="text-muted-foreground">Nenhum cartão cadastrado ainda</p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => {
            setEditCartao(null);
            setEditOpen(true);
          }}>
            Adicionar Primeiro Cartão
          </Button>
        </div>
      ) : (
        <div className={isModal ? "space-y-6" : "grid grid-cols-1 min-[1450px]:grid-cols-2 gap-6"}>
          {cartoes.map((cartao) => {
            const transacoesCartao = transacoes.filter(t => t.cartao_id === cartao.id);
            
            // Helper para detectar pagamento de fatura
            const isPagamentoFatura = (descricao: string) => {
              if (!descricao) return false;
              const d = descricao.toUpperCase();
              return d.includes('PAGAMENTO') || d.includes('PAG FATURA') || d.includes('PGTO');
            };

            // Próxima fatura com base no vencimento do cartão e na data atual
            const agora = new Date();
            const diaHoje = agora.getDate();
            const diaVencimento = Number(cartao.dia_vencimento || 1);
            const baseMes = agora.getMonth() + 1;
            const baseAno = agora.getFullYear();
            const proximaFaturaMes = diaHoje <= diaVencimento ? baseMes : (baseMes === 12 ? 1 : baseMes + 1);
            const proximaFaturaAno = diaHoje <= diaVencimento ? baseAno : (baseMes === 12 ? baseAno + 1 : baseAno);
            const isDaProximaFatura = (t: any) => t.fatura_mes === proximaFaturaMes && t.fatura_ano === proximaFaturaAno;
            
            // Calcular saldo em aberto da PRÓXIMA fatura (apenas transações NÃO pagas)
            const totalDespesasProximaFatura = transacoesCartao
              .filter(t => t.tipo === 'despesa' && t.pago !== true && isDaProximaFatura(t))
              .reduce((acc, t) => acc + Math.abs(t.valor || 0), 0);
            // Estornos = receitas que NÃO são pagamento de fatura e NÃO pagas (na próxima fatura)
            const totalEstornosProximaFatura = transacoesCartao
              .filter(t => t.tipo === 'receita' && !isPagamentoFatura(t.descricao) && t.pago !== true && isDaProximaFatura(t))
              .reduce((acc, t) => acc + Math.abs(t.valor || 0), 0);
            
            // Saldo em aberto = despesas não pagas - estornos não pagos (somente próxima fatura)
            const faturaAberta = Math.max(0, totalDespesasProximaFatura - totalEstornosProximaFatura);
            const qtdDespesasProximaFatura = transacoesCartao.filter(t => t.tipo === 'despesa' && t.pago !== true && isDaProximaFatura(t)).length;

            // Limite usado deve considerar TODO o saldo em aberto do cartão (não só próxima fatura)
            const totalDespesasAbertas = transacoesCartao
              .filter(t => t.tipo === 'despesa' && t.pago !== true)
              .reduce((acc, t) => acc + Math.abs(t.valor || 0), 0);
            const totalEstornosAbertos = transacoesCartao
              .filter(t => t.tipo === 'receita' && !isPagamentoFatura(t.descricao) && t.pago !== true)
              .reduce((acc, t) => acc + Math.abs(t.valor || 0), 0);
            const limiteUsado = Math.max(0, totalDespesasAbertas - totalEstornosAbertos);
            
            // Disponível = limite total - limite usado
            const limite = cartao.limite || 0;
            const limiteDisponivel = Math.max(0, limite - limiteUsado);
            const percentualUsado = limite > 0 ? Math.min(100, (limiteUsado / limite) * 100) : 0;
            
            return (
              <div key={cartao.id} className="relative overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-b from-slate-900/90 via-[#07122d] to-[#050b1c] p-5 md:p-6 shadow-xl shadow-black/25">
                <div className="pointer-events-none absolute -top-20 right-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 left-8 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />

                <div className="relative z-10 mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Cartão de crédito</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-100">{cartao.name || 'Sem nome'}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Fecha dia {cartao.dia_fechamento || '--'} • Vence dia {cartao.dia_vencimento || '--'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenFaturas(cartao.id)}
                      className="h-8 border-slate-600/70 bg-slate-800/60 hover:bg-slate-700/70 text-slate-100"
                    >
                      Faturas
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditCartao(cartao)}
                      className="h-8 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Editar
                    </Button>
                  </div>
                </div>

                <div className="relative z-10 flex flex-wrap gap-4">
                  <div
                    className="relative min-w-[300px] flex-1 basis-[340px] overflow-hidden rounded-2xl border border-white/15 p-5 text-white cursor-pointer min-h-[220px]"
                    style={{
                      background: `linear-gradient(135deg, ${cartao.cor || '#2563eb'} 0%, ${adjustColor(cartao.cor || '#2563eb', -20)} 100%)`,
                    }}
                    onClick={() => handleOpenFaturas(cartao.id)}
                  >
                    <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="h-8 w-10 rounded-md bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 shadow-lg" />
                        <span className="text-xs uppercase tracking-widest text-white/80">crédito</span>
                      </div>
                      <p className="text-base font-mono tracking-[0.28em] text-white/90">•••• •••• •••• ••••</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-wider text-white/70">Disponível</p>
                          <p className="font-semibold leading-tight [overflow-wrap:anywhere]">{formatCurrency(limiteDisponivel)}</p>
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-[11px] uppercase tracking-wider text-white/70">Limite</p>
                          <p className="font-semibold leading-tight [overflow-wrap:anywhere]">{formatCurrency(limite)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-[280px] flex-1 basis-[320px]">
                    <div className="flex flex-wrap gap-3">
                      <div className="min-w-[190px] flex-1 rounded-xl border border-red-500/35 bg-red-500/10 p-3.5 overflow-hidden">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wider text-red-300">Saldo em aberto</p>
                          <p className="text-xs text-slate-400">{qtdDespesasProximaFatura} despesas</p>
                        </div>
                        <p className="mt-1 text-[clamp(1.8rem,1.35vw,2.2rem)] font-bold text-red-400 leading-tight tracking-tight whitespace-nowrap">{formatCurrency(faturaAberta)}</p>
                        <p className="text-[11px] text-slate-400">Próxima fatura</p>
                      </div>

                      <div className="min-w-[190px] flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 overflow-hidden">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Disponível</p>
                        <p className="mt-1 text-[clamp(1.8rem,1.35vw,2.2rem)] font-bold text-emerald-300 leading-tight tracking-tight whitespace-nowrap">{formatCurrency(limiteDisponivel)}</p>
                        <p className="text-[11px] text-slate-400">Limite total - limite usado</p>
                      </div>

                      <div className="w-full min-w-0 rounded-xl border border-slate-700/70 bg-slate-900/70 p-3.5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Limite usado</p>
                        <p className="text-xs font-bold text-slate-300">{percentualUsado.toFixed(0)}%</p>
                      </div>
                      <div className="mb-2 h-2.5 w-full rounded-full bg-slate-700/60">
                        <div
                          className={`h-2.5 rounded-full transition-all ${percentualUsado > 80 ? 'bg-red-500' : percentualUsado > 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: `${percentualUsado}%` }}
                        />
                      </div>
                      <p className="text-sm font-semibold text-slate-200 [overflow-wrap:anywhere]">
                        {formatCurrency(limiteUsado)} <span className="text-xs font-normal text-slate-500">de {formatCurrency(limite)}</span>
                      </p>
                    </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 mt-3">
                  {(() => {
                    // Detecta parcelas pelo padrão XX/XX na descrição (ex: "Netflix 3/12")
                    const parcelaRegex = /(\d{1,2})\/(\d{1,2})\s*$/;
                    const transacoesParceladas = transacoesCartao.filter(t => {
                      const desc = (t.descricao || '').trim();
                      return parcelaRegex.test(desc);
                    });
                    
                    if (transacoesParceladas.length === 0) return null;
                    
                    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    const gruposPorFatura = new Map<string, { label: string; ordem: number; transacoes: any[] }>();
                    
                    transacoesParceladas.forEach(t => {
                      const mes = Number(t.fatura_mes || 0);
                      const ano = Number(t.fatura_ano || 0);
                      const temFatura = mes >= 1 && mes <= 12 && ano > 0;
                      const key = temFatura ? `${ano}-${mes}` : 'sem-fatura';
                      const label = temFatura ? `${nomesMeses[mes - 1]}/${String(ano).slice(-2)}` : 'Sem referência de fatura';
                      const ordem = temFatura ? (ano * 100 + mes) : 999999;
                      
                      const existing = gruposPorFatura.get(key);
                      if (existing) {
                        existing.transacoes.push(t);
                      } else {
                        gruposPorFatura.set(key, { label, ordem, transacoes: [t] });
                      }
                    });
                    
                    const faturasOrdenadas = Array.from(gruposPorFatura.values()).sort((a, b) => a.ordem - b.ordem);
                    const totalParcelado = transacoesParceladas.reduce((acc, t) => acc + Math.abs(t.valor || 0), 0);
                    const isOpen = parcelamentosAbertos[cartao.id] || false;
                    
                    return (
                      <div className="mt-1">
                        <button
                          onClick={() => setParcelamentosAbertos(prev => ({ ...prev, [cartao.id]: !prev[cartao.id] }))}
                          className="w-full p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="text-sm text-blue-300 font-semibold">Ver Parcelamentos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-semibold">{faturasOrdenadas.length} {faturasOrdenadas.length === 1 ? 'fatura' : 'faturas'}</span>
                            <svg className={`w-3.5 h-3.5 text-blue-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        
                        {isOpen && (
                          <div className="mt-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 animate-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-slate-500">{transacoesParceladas.length} parcelas ativas</p>
                              <p className="text-sm font-bold text-blue-400">{formatCurrency(totalParcelado)}</p>
                            </div>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                              {faturasOrdenadas.map((fatura, i) => {
                                const gruposParcelados = new Map<string, { descricao: string, totalParcelas: number, parcelaAtual: number, valorParcela: number }>();
                                fatura.transacoes.forEach((t) => {
                                  const desc = (t.descricao || '').trim();
                                  const match = desc.match(parcelaRegex);
                                  const parcelaAtual = match ? parseInt(match[1]) : 1;
                                  const totalParcelas = match ? parseInt(match[2]) : 1;
                                  const descBase = desc.replace(/\s*\d{1,2}\/\d{1,2}\s*$/, '').trim();
                                  const existing = gruposParcelados.get(descBase);
                                  if (existing) {
                                    if (parcelaAtual > existing.parcelaAtual) existing.parcelaAtual = parcelaAtual;
                                  } else {
                                    gruposParcelados.set(descBase, {
                                      descricao: descBase,
                                      totalParcelas,
                                      parcelaAtual,
                                      valorParcela: Math.abs(t.valor || 0),
                                    });
                                  }
                                });
                                const comprasFatura = Array.from(gruposParcelados.values());
                                const subtotalFatura = fatura.transacoes.reduce((acc, t) => acc + Math.abs(t.valor || 0), 0);

                                return (
                                  <div key={`${fatura.label}-${i}`} className="rounded-md border border-slate-700/40 bg-slate-900/30 p-2">
                                    <div className="mb-1.5 flex items-center justify-between">
                                      <p className="text-xs font-semibold text-blue-300">{fatura.label}</p>
                                      <p className="text-xs font-semibold text-slate-300">{formatCurrency(subtotalFatura)}</p>
                                    </div>
                                    <div className="space-y-1">
                                      {comprasFatura.map((g, idx) => (
                                        <div key={`${g.descricao}-${idx}`} className="flex items-center justify-between text-xs py-1 border-b border-slate-700/30 last:border-0">
                                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                            <span className="text-blue-400/70">•</span>
                                            <span className="text-slate-400 truncate">{g.descricao || 'Compra parcelada'}</span>
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                            <span className="text-blue-300 font-mono text-[10px] bg-blue-500/15 px-1.5 py-0.5 rounded">{g.parcelaAtual}/{g.totalParcelas}</span>
                                            <span className="text-slate-300 font-semibold">{formatCurrency(g.valorParcela)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de edição */}
      <EditCartaoModal
        cartao={editCartao}
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditCartao(null); }}
        onSave={handleSaveCartao}
        onDelete={handleDeleteCartao}
      />

      <Dialog open={deleteCartaoOpen} onOpenChange={(open) => {
        if (deleteCartaoLoading) return;
        setDeleteCartaoOpen(open);
        if (!open) {
          setDeleteCartaoTarget(null);
          setDeleteCartaoTransacoesCount(0);
        }
      }}>
        <DialogContent className="max-w-md border-slate-700/50 bg-slate-900/95">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Excluir cartão</h3>
              <p className="text-sm text-slate-400 mt-1">
                Cartão: <span className="text-slate-200 font-medium">{deleteCartaoTarget?.nome || deleteCartaoTarget?.name || 'Sem nome'}</span>
              </p>
              <p className="text-sm text-slate-400">
                Transações vinculadas: <span className="text-slate-200 font-medium">{deleteCartaoTransacoesCount}</span>
              </p>
            </div>

            <div className="p-3 rounded-lg border border-slate-700 bg-slate-800/40 text-xs text-slate-400">
              Escolha como deseja prosseguir:
            </div>

            <div className="space-y-2">
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteCartaoLoading}
                onClick={() => confirmDeleteCartao(true)}
              >
                Excluir cartão + transações vinculadas
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={deleteCartaoLoading}
                onClick={() => confirmDeleteCartao(false)}
              >
                Excluir somente o cartão
              </Button>
              <Button
                variant="ghost"
                className="w-full text-slate-300"
                disabled={deleteCartaoLoading}
                onClick={() => setDeleteCartaoOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Faturas */}
      <GerenciarFaturasModal 
        open={faturasOpen} 
        onClose={() => { setFaturasOpen(false); setCartaoSelecionado(null); fetchTransacoesCartao(); }}
        onDataChange={fetchTransacoesCartao}
        initialCardId={cartaoSelecionado}
        onImportClick={(cardId) => {
          setCartaoParaImportar(cardId);
          setFaturasOpen(false); // Fechar faturas antes de abrir importação
          setTimeout(() => setImportarFaturaOpen(true), 200);
        }}
      />

      {/* Modal de Importar Fatura */}
      <ImportarFaturaModalNovo
        open={importarFaturaOpen}
        onClose={() => {
          const voltarParaFatura = !!cartaoParaImportar;
          const cardId = cartaoParaImportar;
          setImportarFaturaOpen(false);
          setCartaoParaImportar(undefined);
          fetchCartoes();
          // Reabrir modal de faturas com o cartão selecionado
          if (voltarParaFatura && cardId) {
            setCartaoSelecionado(cardId);
            setTimeout(() => setFaturasOpen(true), 200);
          }
        }}
        onImport={handleImportFatura}
        cartoes={cartoes}
        initialCardId={cartaoParaImportar}
      />

      {/* Modal de Histórico de Importações */}
      <HistoricoImportacoesModal
        open={historicoOpen}
        onClose={() => setHistoricoOpen(false)}
      />

      {/* Modal de Importar Extrato (antigo) */}
      <ImportarExtratoModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImportLancamentos}
      />
    </div>
  );
}
