
import React, { useEffect, useState } from 'react';
import { supabase } from '/src/lib/supabase';
import { useAuth } from '/src/hooks/useAuth';
import { Button } from '/src/components/ui/button';
import { Input } from '/src/components/ui/input';
import { Dialog, DialogContent } from '/src/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '/src/components/ui/select';
import { GerenciarFaturasModal } from '/src/components/faturas/GerenciarFaturasModal';
import { ImportarFaturaModalNovo } from '/src/components/faturas/ImportarFaturaModalNovo';
import { HistoricoImportacoesModal } from '/src/components/faturas/HistoricoImportacoesModal';
import { formatCurrency, formatarValorBR, parseValorBR } from '/src/utils/currency';
import { categorizar } from '/src/utils/categorizacao';
import { calcularMesFatura, enrichCardTransactions, extractImportedInvoiceReference, parseToDateUTC } from '/src/utils/dateParser';
import { useToast } from '/src/hooks/use-toast';

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

const NOMES_MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getFaturaKey(mes: number, ano: number) {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

function getFaturaLabel(mes: number, ano: number) {
  return `${NOMES_MESES_ABREV[mes - 1] || '--'}/${String(ano).slice(-2)}`;
}

function getFaturaOrdem(mes: number, ano: number) {
  return ano * 100 + mes;
}

function shiftFaturaReferencia(mes: number, ano: number, offset: number) {
  const totalMeses = (ano * 12) + (mes - 1) + offset;
  const novoAno = Math.floor(totalMeses / 12);
  const novoMes = (totalMeses % 12) + 1;
  return { mes: novoMes, ano: novoAno };
}

function getParcelaInfo(transacao: {
  descricao?: string | null
  observacao?: string | null
  parcela_atual?: number | null
  total_parcelas?: number | null
}) {
  const atual = Number(transacao?.parcela_atual);
  const total = Number(transacao?.total_parcelas);

  if (Number.isFinite(atual) && Number.isFinite(total) && total > 1 && atual >= 1 && atual <= total) {
    return { atual, total };
  }

  const textos = [transacao?.descricao, transacao?.observacao]
    .map((texto) => String(texto || '').trim())
    .filter(Boolean);

  const patterns = [
    /parcela\s+(\d{1,2})\s+de\s+(\d{1,2})/i,
    /(?:^|[\s(])parcela\s*(\d{1,2})\s*\/\s*(\d{1,2})\)?\s*$/i,
    /(\d{1,2})\s*\/\s*(\d{1,2})\s*\)?\s*$/,
  ];

  for (const texto of textos) {
    for (const pattern of patterns) {
      const match = texto.match(pattern);
      if (!match) continue;
      const atualDetectado = Number(match[1]);
      const totalDetectado = Number(match[2]);
      if (
        Number.isFinite(atualDetectado) &&
        Number.isFinite(totalDetectado) &&
        totalDetectado > 1 &&
        atualDetectado >= 1 &&
        atualDetectado <= totalDetectado
      ) {
        return { atual: atualDetectado, total: totalDetectado };
      }
    }
  }

  return null;
}

function getReferenciaFaturaTransacao(
  transacao: {
    cartao_id?: string | null
    fatura_mes?: number | null
    fatura_ano?: number | null
    data?: string | null
    created_at?: string | null
    observacao?: string | null
  },
  diaFechamento: number,
  diaVencimento?: number | null
) {
  const referenciaObservacao = extractImportedInvoiceReference(transacao?.observacao);
  if (referenciaObservacao) {
    return referenciaObservacao;
  }

  const mes = Number(transacao?.fatura_mes);
  const ano = Number(transacao?.fatura_ano);

  if (Number.isFinite(mes) && Number.isFinite(ano) && mes >= 1 && mes <= 12 && ano > 0) {
    return { mes, ano };
  }

  const dt = parseToDateUTC(transacao?.data || transacao?.created_at);
  if (!dt) return null;

  return calcularMesFatura(dt, diaFechamento, diaVencimento);
}

function calcularDatasFaturaResumo(
  diaFechamento: number,
  diaVencimento: number,
  mes: number,
  ano: number,
) {
  const dataVencimento = new Date(Date.UTC(ano, mes - 1, diaVencimento));
  const dataFechamento = diaFechamento >= diaVencimento
    ? new Date(Date.UTC(ano, mes - 2, diaFechamento))
    : new Date(Date.UTC(ano, mes - 1, diaFechamento));

  const dataFechamentoAnterior = new Date(
    Date.UTC(
      dataFechamento.getUTCFullYear(),
      dataFechamento.getUTCMonth() - 1,
      diaFechamento,
    ),
  );

  return {
    inicioPeriodo: dataFechamentoAnterior,
    fimPeriodo: dataFechamento,
    vencimento: dataVencimento,
  };
}

function transacaoPertenceReferenciaResumo(
  transacao: {
    observacao?: string | null
    fatura_mes?: number | null
    fatura_ano?: number | null
    data?: string | null
    created_at?: string | null
  },
  diaFechamento: number,
  diaVencimento: number,
  mes: number,
  ano: number,
) {
  const referenciaObservacao = extractImportedInvoiceReference(transacao?.observacao);
  if (referenciaObservacao) {
    return referenciaObservacao.mes === mes && referenciaObservacao.ano === ano;
  }

  const faturaMes = Number(transacao?.fatura_mes);
  const faturaAno = Number(transacao?.fatura_ano);
  if (Number.isFinite(faturaMes) && Number.isFinite(faturaAno) && faturaMes >= 1 && faturaMes <= 12 && faturaAno > 0) {
    return faturaMes === mes && faturaAno === ano;
  }

  const dt = parseToDateUTC(transacao?.data || transacao?.created_at);
  if (!dt) return false;

  const { inicioPeriodo, fimPeriodo } = calcularDatasFaturaResumo(diaFechamento, diaVencimento, mes, ano);
  const timestamp = dt.getTime();
  return timestamp >= inicioPeriodo.getTime() && timestamp <= fimPeriodo.getTime();
}

function normalizeDateInput(value?: string | null) {
  const dt = parseToDateUTC(value);
  if (!dt) return '';
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}



export default function Cartoes({ isModal = false }) {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [projecoesAbertas, setProjecoesAbertas] = useState<Record<string, boolean>>({});
  const [cartaoDetalhesAberto, setCartaoDetalhesAberto] = useState<string | null>(null);
  const [referenciasSelecionadas, setReferenciasSelecionadas] = useState<Record<string, string>>({});
  const [editingLancamentoId, setEditingLancamentoId] = useState<number | string | null>(null);
  const [editLancamentoForm, setEditLancamentoForm] = useState({ descricao: '', data: '', valor: '' });
  const [savingLancamento, setSavingLancamento] = useState(false);
  const [deletingLancamentoId, setDeletingLancamentoId] = useState<number | string | null>(null);
  const [deleteCartaoOpen, setDeleteCartaoOpen] = useState(false);
  const [deleteCartaoLoading, setDeleteCartaoLoading] = useState(false);
  const [deleteCartaoTarget, setDeleteCartaoTarget] = useState<any | null>(null);
  const [deleteCartaoTransacoesCount, setDeleteCartaoTransacoesCount] = useState(0);

  function handleOpenCartaoDetalhes(cardId: string, defaultKey?: string) {
    setCartaoDetalhesAberto(cardId);
    if (!defaultKey) return;
    setReferenciasSelecionadas((prev) => ({
      ...prev,
      [cardId]: defaultKey,
    }));
  }

  function resetEdicaoLancamento() {
    setEditingLancamentoId(null);
    setEditLancamentoForm({ descricao: '', data: '', valor: '' });
  }

  function startEditLancamento(transacao: any) {
    setEditingLancamentoId(transacao.id);
    setEditLancamentoForm({
      descricao: String(transacao.descricao || '').trim(),
      data: normalizeDateInput(transacao.data || transacao.created_at),
      valor: formatarValorBR(String(Math.abs(Number(transacao.valor) || 0))),
    });
  }

  async function saveLancamentoEdit(transacao: any) {
    if (!user?.id || editingLancamentoId === null) return;

    setSavingLancamento(true);
    try {
      const valorNormalizado = Math.abs(parseValorBR(editLancamentoForm.valor || '0') || 0);
      const payload = {
        descricao: editLancamentoForm.descricao
          ? String(editLancamentoForm.descricao).trim().toLocaleUpperCase('pt-BR')
          : null,
        data: editLancamentoForm.data || null,
        valor: valorNormalizado,
      };

      const { error } = await supabase
        .from('transacoes')
        .update(payload)
        .eq('id', transacao.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Transação atualizada com sucesso!' });
      resetEdicaoLancamento();
      await fetchCartoes();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar transação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSavingLancamento(false);
    }
  }

  async function deleteLancamento(id: number | string) {
    if (!user?.id) return;
    if (!window.confirm('Excluir esta transação?')) return;

    setDeletingLancamentoId(id);
    try {
      const { error } = await supabase
        .from('transacoes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Transação excluída com sucesso!' });
      if (editingLancamentoId === id) {
        resetEdicaoLancamento();
      }
      await fetchCartoes();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir transação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeletingLancamentoId(null);
    }
  }

  async function fetchTransacoesCartao(cartoesBase: any[] = cartoes) {
    if (!user?.id) return;

    const cardIds = Array.from(
      new Set(
        (cartoesBase || [])
          .map((cartao) => cartao?.id)
          .filter(Boolean)
      )
    );

    if (cardIds.length === 0) {
      setTransacoes([]);
      return;
    }

    const selectBase = 'id, valor, tipo, cartao_id, data, created_at, descricao, observacao, fatura_mes, fatura_ano, pago, categoria_id, categorias(id, nome)';
    const selectWithParcelas = `${selectBase}, parcela_atual, total_parcelas`;

    let { data: transData, error: transError } = await supabase
      .from('transacoes')
      .select(selectWithParcelas)
      .in('cartao_id', cardIds);

    const schemaSemParcelas =
      transError?.code === '42703' ||
      transError?.code === 'PGRST204' ||
      /parcela_atual|total_parcelas|does not exist/i.test(String(transError?.message || ''));

    if (schemaSemParcelas) {
      console.warn('⚠️ Schema sem colunas de parcela em Cartões. Recarregando sem parcela_atual/total_parcelas.');
      const retry = await supabase
        .from('transacoes')
        .select(selectBase)
        .in('cartao_id', cardIds);

      transData = retry.data;
      transError = retry.error;
    }

    console.log('📊 Transações carregadas:', transData?.length, 'Erro:', transError)
    if (!transError && transData) {
      const transacoesEnriquecidas = [...transData];
      enrichCardTransactions(transacoesEnriquecidas, cartoesBase);
      setTransacoes(transacoesEnriquecidas);
    } else {
      console.error('❌ Erro ao buscar transações:', transError)
      setTransacoes([]);
    }
  }

  async function fetchCartoes() {
    setLoading(true);
    const [cartResult, accResult] = await Promise.all([
      supabase
        .from('cartoes')
        .select('*')
        .eq('user_id', user?.id),
      supabase
        .from('accounts')
        .select('id, nome, banco')
        .eq('user_id', user?.id),
    ]);

    const { data, error } = cartResult;
    const { data: accounts, error: accountsError } = accResult;
    
    console.log('📋 Cartões carregados:', data)
    console.log('❌ Erro:', error)
    if (accountsError) {
      console.warn('⚠️ Erro ao buscar contas para enriquecer cartões:', accountsError);
    }
    
    if (!error && data) {
      const accMap = new Map((accounts || []).map((account: any) => [account.id, account]));
      // Mapear campos para manter compatibilidade com o componente
      const cartoesFormatados = data.map(c => ({
        ...c,
        name: c.nome, // alias para compatibilidade
        banco: c.banco || accMap.get(c.linked_account_id)?.nome || accMap.get(c.linked_account_id)?.banco || null,
      }));
      console.log('✅ Cartões:', cartoesFormatados)
      setCartoes(cartoesFormatados);
      await fetchTransacoesCartao(cartoesFormatados);
    }
    setLoading(false);
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
        <div className="grid gap-6 lg:grid-cols-2">
          {cartoes.map((cartao) => {
            const transacoesCartao = transacoes.filter(t => t.cartao_id === cartao.id);
            const isPagamentoFatura = (descricao: string) => {
              if (!descricao) return false;
              const d = descricao.toUpperCase();
              return d.includes('PAGAMENTO') || d.includes('PAG FATURA') || d.includes('PGTO');
            };

            const agora = new Date();
            const diaHoje = agora.getDate();
            const diaFechamento = Number(cartao.dia_fechamento || 1);
            const diaVencimento = Number(cartao.dia_vencimento || 1);
            const baseMes = agora.getMonth() + 1;
            const baseAno = agora.getFullYear();
            const proximaFaturaMes = diaHoje <= diaVencimento ? baseMes : (baseMes === 12 ? 1 : baseMes + 1);
            const proximaFaturaAno = diaHoje <= diaVencimento ? baseAno : (baseMes === 12 ? baseAno + 1 : baseAno);
            const proximaFaturaOrdem = getFaturaOrdem(proximaFaturaMes, proximaFaturaAno);

            const transacoesCartaoComReferencia = transacoesCartao
              .filter((transacao) => !isPagamentoFatura(transacao.descricao))
              .map((transacao) => {
                const referencia = getReferenciaFaturaTransacao(transacao, diaFechamento, diaVencimento);
                if (!referencia) return null;

                return {
                  transacao,
                  referencia,
                  ordem: getFaturaOrdem(referencia.mes, referencia.ano),
                };
              })
              .filter(Boolean);

            const transacoesCartaoPendentes = transacoesCartaoComReferencia
              .filter((item) => item.transacao.pago !== true)
              .map((item) => item.transacao);

            const transacoesCartaoProjetadas = transacoesCartaoComReferencia
              .filter((item) => item.ordem >= proximaFaturaOrdem);

            const totalDespesasAbertas = transacoesCartaoPendentes
              .filter(t => t.tipo === 'despesa')
              .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0);
            const totalEstornosAbertos = transacoesCartaoPendentes
              .filter(t => t.tipo === 'receita' && !isPagamentoFatura(t.descricao))
              .reduce((acc, t) => acc + Math.abs(Number(t.valor) || 0), 0);
            const limiteUsado = Math.max(0, totalDespesasAbertas - totalEstornosAbertos);

            const createFaturaBucket = (mes: number, ano: number, ordem: number) => ({
              key: getFaturaKey(mes, ano),
              label: getFaturaLabel(mes, ano),
              mes,
              ano,
              ordem,
              despesas: 0,
              estornos: 0,
              totalLiquido: 0,
              comprasCount: 0,
              parceladasCount: 0,
              avulsasCount: 0,
              totalParcelado: 0,
              totalAvulso: 0,
              itensCount: 0,
            });

            const faturasTodasMap = new Map<string, {
              key: string
              label: string
              mes: number
              ano: number
              ordem: number
              despesas: number
              estornos: number
              totalLiquido: number
              comprasCount: number
              parceladasCount: number
              avulsasCount: number
              totalParcelado: number
              totalAvulso: number
              itensCount: number
            }>();

            const referenciasCandidatasMap = new Map<string, { mes: number; ano: number; ordem: number }>();

            transacoesCartaoComReferencia.forEach(({ referencia, ordem }) => {
              const key = getFaturaKey(referencia.mes, referencia.ano);
              if (!referenciasCandidatasMap.has(key)) {
                referenciasCandidatasMap.set(key, { mes: referencia.mes, ano: referencia.ano, ordem });
              }
            });

            for (let offset = -1; offset <= 6; offset += 1) {
              const referenciaInfo = shiftFaturaReferencia(proximaFaturaMes, proximaFaturaAno, offset);
              const key = getFaturaKey(referenciaInfo.mes, referenciaInfo.ano);
              if (!referenciasCandidatasMap.has(key)) {
                referenciasCandidatasMap.set(key, {
                  mes: referenciaInfo.mes,
                  ano: referenciaInfo.ano,
                  ordem: getFaturaOrdem(referenciaInfo.mes, referenciaInfo.ano),
                });
              }
            }

            referenciasCandidatasMap.forEach(({ mes, ano, ordem }, key) => {
              const bucket = createFaturaBucket(mes, ano, ordem);

              transacoesCartao
                .filter((transacao) => !isPagamentoFatura(transacao.descricao))
                .forEach((transacao) => {
                  if (!transacaoPertenceReferenciaResumo(transacao, diaFechamento, diaVencimento, mes, ano)) {
                    return;
                  }

                  const parcelaInfo = getParcelaInfo(transacao);
                  const valorAbs = Math.abs(Number(transacao.valor) || 0);

                  bucket.itensCount += 1;

                  if (transacao.tipo === 'receita') {
                    bucket.estornos += valorAbs;
                  } else {
                    bucket.despesas += valorAbs;
                    bucket.comprasCount += 1;
                    if (parcelaInfo) {
                      bucket.parceladasCount += 1;
                      bucket.totalParcelado += valorAbs;
                    } else {
                      bucket.avulsasCount += 1;
                      bucket.totalAvulso += valorAbs;
                    }
                  }
                });

              bucket.totalLiquido = Math.max(0, bucket.despesas - bucket.estornos);
              if (bucket.itensCount > 0 || ordem >= proximaFaturaOrdem) {
                faturasTodasMap.set(key, bucket);
              }
            });

            const faturasTodas = Array.from(faturasTodasMap.values()).sort((a, b) => a.ordem - b.ordem);
            const faturasProjetadas = faturasTodas.filter((fatura) => fatura.ordem >= proximaFaturaOrdem);
            const ultimaFaturaComMovimento = [...faturasTodas]
              .filter((fatura) => fatura.totalLiquido > 0)
              .sort((a, b) => b.ordem - a.ordem)[0] || null;
            const resumoFallback = {
              key: getFaturaKey(proximaFaturaMes, proximaFaturaAno),
              label: getFaturaLabel(proximaFaturaMes, proximaFaturaAno),
              mes: proximaFaturaMes,
              ano: proximaFaturaAno,
              ordem: proximaFaturaOrdem,
              despesas: 0,
              estornos: 0,
              totalLiquido: 0,
              comprasCount: 0,
              parceladasCount: 0,
              avulsasCount: 0,
              totalParcelado: 0,
              totalAvulso: 0,
              itensCount: 0,
            };
            const resumoEmFoco = faturasProjetadas[0] || ultimaFaturaComMovimento || resumoFallback;
            const exibindoHistorico = faturasProjetadas.length === 0 && Boolean(ultimaFaturaComMovimento);
            const faturasParaResumo = faturasProjetadas.length > 0 ? faturasProjetadas : faturasTodas.filter((fatura) => fatura.totalLiquido > 0);
            const totalFaturasProjetadas = faturasParaResumo.reduce((acc, fatura) => acc + fatura.totalLiquido, 0);
            const totalParceladoProjetado = faturasParaResumo.reduce((acc, fatura) => acc + fatura.totalParcelado, 0);
            const maiorFaturaProjetada = faturasParaResumo.reduce((acc, fatura) => Math.max(acc, fatura.totalLiquido), 0);
            const limite = Number(cartao.limite || 0);
            const limiteDisponivel = Math.max(0, limite - limiteUsado);
            const percentualUsado = limite > 0 ? Math.min(100, (limiteUsado / limite) * 100) : 0;
            const projecaoAberta = projecoesAbertas[cartao.id] ?? false;
            const quantidadeMesesBase = projecaoAberta ? 6 : 4;
            const timelineFuturo = Array.from({ length: quantidadeMesesBase }, (_, index) => {
              const zeroBasedMonth = (proximaFaturaMes - 1) + index;
              const ano = proximaFaturaAno + Math.floor(zeroBasedMonth / 12);
              const mes = (zeroBasedMonth % 12) + 1;
              const key = getFaturaKey(mes, ano);

              return (
                faturasProjetadas.find((fatura) => fatura.key === key) || {
                  ...createFaturaBucket(mes, ano, getFaturaOrdem(mes, ano)),
                }
              );
            });
            const timelineHistorico = [...faturasTodas]
              .filter((fatura) => fatura.totalLiquido > 0)
              .sort((a, b) => b.ordem - a.ordem)
              .slice(0, quantidadeMesesBase)
              .sort((a, b) => a.ordem - b.ordem);
            const timelineFaturas = faturasProjetadas.length > 0
              ? timelineFuturo
              : (timelineHistorico.length > 0 ? timelineHistorico : timelineFuturo);
            const referenciasDisponiveisMap = new Map<string, typeof resumoFallback>();
            [...faturasTodas, ...timelineFuturo].forEach((fatura) => {
              referenciasDisponiveisMap.set(fatura.key, fatura);
            });
            if (!referenciasDisponiveisMap.has(resumoFallback.key)) {
              referenciasDisponiveisMap.set(resumoFallback.key, resumoFallback);
            }
            const referenciaSelecionadaState = referenciasSelecionadas[cartao.id];
            const [anoState, mesState] = String(referenciaSelecionadaState || `${resumoEmFoco.ano}-${String(resumoEmFoco.mes).padStart(2, '0')}`)
              .split('-')
              .map(Number);
            if (Number.isFinite(anoState) && Number.isFinite(mesState)) {
              const keyAtual = getFaturaKey(mesState, anoState);
              if (!referenciasDisponiveisMap.has(keyAtual)) {
                referenciasDisponiveisMap.set(
                  keyAtual,
                  createFaturaBucket(mesState, anoState, getFaturaOrdem(mesState, anoState))
                );
              }

              const anteriorState = shiftFaturaReferencia(mesState, anoState, -1);
              const keyAnterior = getFaturaKey(anteriorState.mes, anteriorState.ano);
              if (!referenciasDisponiveisMap.has(keyAnterior)) {
                referenciasDisponiveisMap.set(
                  keyAnterior,
                  createFaturaBucket(anteriorState.mes, anteriorState.ano, getFaturaOrdem(anteriorState.mes, anteriorState.ano))
                );
              }
            }
            const referenciasDisponiveis = Array.from(referenciasDisponiveisMap.values())
              .sort((a, b) => b.ordem - a.ordem);
            const referenciaSelecionadaKey = referenciasSelecionadas[cartao.id];
            const referenciaSelecionada = referenciasDisponiveis.find((fatura) => fatura.key === referenciaSelecionadaKey)
              || referenciasDisponiveis.find((fatura) => fatura.key === resumoEmFoco.key)
              || resumoEmFoco;
            const referenciaSelecionadaEhFutura = referenciaSelecionada.ordem >= proximaFaturaOrdem;
            const indiceReferenciaSelecionada = referenciasDisponiveis.findIndex((fatura) => fatura.key === referenciaSelecionada.key);
            const referenciaMaisNova = indiceReferenciaSelecionada > 0 ? referenciasDisponiveis[indiceReferenciaSelecionada - 1] : null;
            const referenciaMaisAntiga =
              indiceReferenciaSelecionada >= 0 && indiceReferenciaSelecionada < referenciasDisponiveis.length - 1
                ? referenciasDisponiveis[indiceReferenciaSelecionada + 1]
                : null;
            const previewFaturas = timelineFaturas.slice(0, 4);
            const linhasProjecaoBase = projecaoAberta ? timelineFaturas : previewFaturas;
            const linhasProjecaoMap = new Map(linhasProjecaoBase.map((fatura) => [fatura.key, fatura]));
            linhasProjecaoMap.set(referenciaSelecionada.key, referenciaSelecionada);
            const linhasProjecao = Array.from(linhasProjecaoMap.values()).sort((a, b) => a.ordem - b.ordem);
            const podeExpandirProjecao = timelineFaturas.length > previewFaturas.length;
            const corCartao = cartao.cor || '#2563eb';
            const statusProjecao = faturasProjetadas.length > 0
              ? `${faturasProjetadas.length} faturas futuras com valor`
              : ultimaFaturaComMovimento
                ? 'Mostrando últimas faturas'
                : 'Sem compras futuras';
            const mostrarDetalhes = cartaoDetalhesAberto === cartao.id;
            const lancamentosCartaoCount = transacoesCartao.filter((transacao) => !isPagamentoFatura(transacao.descricao)).length;
            const lancamentosReferenciaSelecionada = transacoesCartao
              .filter((transacao) => !isPagamentoFatura(transacao.descricao))
              .filter((transacao) =>
                transacaoPertenceReferenciaResumo(
                  transacao,
                  diaFechamento,
                  diaVencimento,
                  referenciaSelecionada.mes,
                  referenciaSelecionada.ano,
                ),
              )
              .sort((a, b) => {
                const dataA = parseToDateUTC(a.data || a.created_at)?.getTime() ?? 0;
                const dataB = parseToDateUTC(b.data || b.created_at)?.getTime() ?? 0;
                return dataB - dataA;
              });
            const contaVinculadaLabel = cartao.banco || 'Conta vinculada não informada';
            const totalDespesasReferencia = lancamentosReferenciaSelecionada
              .filter((transacao) => transacao.tipo === 'despesa')
              .reduce((acc, transacao) => acc + Math.abs(Number(transacao.valor) || 0), 0);
            const categoriasMap = new Map<string, { nome: string; total: number; quantidade: number }>();

            lancamentosReferenciaSelecionada.forEach((transacao) => {
              if (transacao.tipo !== 'despesa') return;

              const nomeCategoria = transacao.categorias?.nome || 'Sem categoria';
              const valorAbs = Math.abs(Number(transacao.valor) || 0);
              const categoriaAtual = categoriasMap.get(nomeCategoria) || { nome: nomeCategoria, total: 0, quantidade: 0 };
              categoriaAtual.total += valorAbs;
              categoriaAtual.quantidade += 1;
              categoriasMap.set(nomeCategoria, categoriaAtual);
            });

            const categoriasMaisGasto = Array.from(categoriasMap.values())
              .sort((a, b) => b.total - a.total)
              .slice(0, 6);
            const referenciaAnteriorInfo = shiftFaturaReferencia(referenciaSelecionada.mes, referenciaSelecionada.ano, -1);
            const referenciaAnterior = referenciasDisponiveisMap.get(getFaturaKey(referenciaAnteriorInfo.mes, referenciaAnteriorInfo.ano))
              || createFaturaBucket(
                referenciaAnteriorInfo.mes,
                referenciaAnteriorInfo.ano,
                getFaturaOrdem(referenciaAnteriorInfo.mes, referenciaAnteriorInfo.ano)
              );
            const quantidadeResumoMensal = projecaoAberta ? 6 : 4;
            const linhasResumoMensalMap = new Map<string, typeof resumoFallback>();
            linhasResumoMensalMap.set(referenciaAnterior.key, referenciaAnterior);
            for (let index = 0; index < quantidadeResumoMensal; index += 1) {
              const referenciaInfo = shiftFaturaReferencia(referenciaSelecionada.mes, referenciaSelecionada.ano, index);
              const key = getFaturaKey(referenciaInfo.mes, referenciaInfo.ano);
              const bucket = referenciasDisponiveisMap.get(key)
                || createFaturaBucket(
                  referenciaInfo.mes,
                  referenciaInfo.ano,
                  getFaturaOrdem(referenciaInfo.mes, referenciaInfo.ano)
                );
              linhasResumoMensalMap.set(bucket.key, bucket);
            }
            const linhasResumoMensal = Array.from(linhasResumoMensalMap.values()).sort((a, b) => a.ordem - b.ordem);
            const categoriaPrincipal = categoriasMaisGasto[0] || null;
            const ticketMedioReferencia = referenciaSelecionada.comprasCount > 0
              ? referenciaSelecionada.totalLiquido / referenciaSelecionada.comprasCount
              : 0;
            const percentualParceladoReferencia = referenciaSelecionada.totalLiquido > 0
              ? (referenciaSelecionada.totalParcelado / referenciaSelecionada.totalLiquido) * 100
              : 0;
            const variacaoVsAnterior = referenciaAnterior.totalLiquido > 0
              ? ((referenciaSelecionada.totalLiquido - referenciaAnterior.totalLiquido) / referenciaAnterior.totalLiquido) * 100
              : null;
            const deltaVsAnterior = referenciaSelecionada.totalLiquido - referenciaAnterior.totalLiquido;

            return (
              <div key={cartao.id} className="group relative overflow-hidden rounded-[28px] border border-slate-800/80 bg-slate-950/80 p-4 shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-1 hover:border-slate-700">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
                <div className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full opacity-80" style={{ background: `linear-gradient(180deg, ${corCartao}, ${adjustColor(corCartao, -25)})` }} />

                <div className="space-y-4 pl-2">
                  <button
                    type="button"
                    onClick={() => handleOpenCartaoDetalhes(cartao.id, resumoEmFoco.key)}
                    className="block w-full text-left"
                  >
                    <div
                      className="relative w-full overflow-hidden rounded-[26px] border border-white/12 p-6 text-white shadow-lg shadow-black/20 transition-transform duration-200 group-hover:scale-[1.01]"
                      style={{
                        background: `linear-gradient(145deg, ${corCartao} 0%, ${adjustColor(corCartao, -12)} 55%, #081226 100%)`,
                      }}
                    >
                      <div className="absolute -right-12 -top-14 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                      <div className="absolute left-8 top-16 h-24 w-24 rounded-full bg-black/10 blur-2xl" />
                      <div className="relative z-10 flex min-h-[245px] flex-col justify-between gap-8">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/65">Cartão de crédito</p>
                            <p className="mt-3 text-[1.9rem] font-semibold leading-tight">{cartao.name || 'Sem nome'}</p>
                            <p className="mt-3 text-sm text-white/70">Fecha dia {cartao.dia_fechamento || '--'} • Vence dia {cartao.dia_vencimento || '--'}</p>
                          </div>
                          <div className="h-12 w-16 rounded-2xl bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 shadow-md" />
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-white/65">Conta vinculada</p>
                          <p className="mt-2 text-base font-medium text-white/90">{contaVinculadaLabel}</p>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm text-white/70">
                          <span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]">
                            {resumoEmFoco.label}
                          </span>
                          <span className="truncate">{lancamentosCartaoCount} lançamentos</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenCartaoDetalhes(cartao.id, resumoEmFoco.key)}
                      className="h-10 rounded-xl bg-cyan-600 px-4 text-white hover:bg-cyan-700"
                    >
                      Resumo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenFaturas(cartao.id)}
                      className="h-10 rounded-xl border-slate-700 bg-slate-900 px-4 text-slate-100 hover:bg-slate-800"
                    >
                      Faturas
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleEditCartao(cartao)}
                      className="h-10 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700"
                    >
                      Editar
                    </Button>
                  </div>
                </div>

                <Dialog
                  open={mostrarDetalhes}
                  onOpenChange={(open) => {
                    if (!open) {
                      setCartaoDetalhesAberto(null);
                      resetEdicaoLancamento();
                    }
                  }}
                >
                  <DialogContent className="flex max-w-6xl flex-col overflow-hidden border-slate-700/70 bg-slate-950/95 p-0 text-slate-100 backdrop-blur-xl sm:max-h-[88vh]">
                    <div className="border-b border-slate-800 px-6 py-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Resumo do cartão</p>
                          <h3 className="mt-2 text-2xl font-semibold text-slate-50">{cartao.name || 'Sem nome'}</h3>
                          <p className="mt-2 text-sm text-slate-400">
                            Fecha dia {cartao.dia_fechamento || '--'} • Vence dia {cartao.dia_vencimento || '--'} • {contaVinculadaLabel}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                            {referenciaSelecionadaEhFutura ? 'Projeção futura' : 'Fatura fechada'}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!referenciaMaisAntiga}
                            onClick={() => referenciaMaisAntiga && setReferenciasSelecionadas((prev) => ({ ...prev, [cartao.id]: referenciaMaisAntiga.key }))}
                            className="h-9 rounded-xl border-slate-700 bg-slate-900 px-3 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                          >
                            Mes anterior
                          </Button>
                          <Select
                            value={referenciaSelecionada.key}
                            onValueChange={(value) => setReferenciasSelecionadas((prev) => ({ ...prev, [cartao.id]: value }))}
                          >
                            <SelectTrigger className="h-9 w-[180px] rounded-xl border-slate-700 bg-slate-900 text-slate-100">
                              <SelectValue placeholder="Selecione a referencia" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-700 bg-slate-950 text-slate-100">
                              {referenciasDisponiveis.map((fatura) => (
                                <SelectItem key={`${cartao.id}-${fatura.key}-option`} value={fatura.key}>
                                  {fatura.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!referenciaMaisNova}
                            onClick={() => referenciaMaisNova && setReferenciasSelecionadas((prev) => ({ ...prev, [cartao.id]: referenciaMaisNova.key }))}
                            className="h-9 rounded-xl border-slate-700 bg-slate-900 px-3 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                          >
                            Mes seguinte
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Fatura em foco</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-50">{formatCurrency(referenciaSelecionada.totalLiquido)}</p>
                          <p className="mt-1 text-xs text-slate-500">{referenciaSelecionada.label} • {referenciaSelecionada.comprasCount} compras</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Limite disponível</p>
                          <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatCurrency(limiteDisponivel)}</p>
                          <p className="mt-1 text-xs text-slate-500">de {formatCurrency(limite)} totais</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Limite total</p>
                          <p className="mt-2 text-2xl font-semibold text-slate-50">{formatCurrency(limite)}</p>
                          <p className="mt-1 text-xs text-slate-500">{percentualUsado.toFixed(0)}% comprometido</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Parcelado futuro</p>
                          <p className="mt-2 text-2xl font-semibold text-cyan-300">{formatCurrency(totalParceladoProjetado)}</p>
                          <p className="mt-1 text-xs text-slate-500">{statusProjecao}</p>
                        </div>
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/80">
                          <div className="border-b border-slate-800 px-4 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Faturas do cartão</p>
                                <h4 className="mt-1 text-xl font-semibold text-slate-100">Linha do tempo das faturas</h4>
                                <p className="mt-1 text-sm text-slate-400">Mostrando o mês anterior, a referência em foco e os próximos meses.</p>
                              </div>
                              {podeExpandirProjecao && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setProjecoesAbertas(prev => ({ ...prev, [cartao.id]: !prev[cartao.id] }))}
                                  className="h-9 rounded-xl border-slate-700 bg-slate-950 px-4 text-slate-200 hover:bg-slate-900"
                                >
                                  {projecaoAberta ? 'Ver menos' : 'Ver mais'}
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="px-4 py-4">
                            <div className="space-y-3">
                              {linhasResumoMensal.map((fatura) => (
                                <button
                                  type="button"
                                  key={`${cartao.id}-${fatura.key}-row`}
                                  onClick={() => setReferenciasSelecionadas((prev) => ({ ...prev, [cartao.id]: fatura.key }))}
                                  className={`w-full rounded-2xl border p-4 text-left transition-colors hover:bg-slate-900/90 ${fatura.key === referenciaSelecionada.key ? 'border-cyan-500/50 bg-slate-900 ring-1 ring-cyan-500/30' : 'border-slate-800 bg-slate-950/70'}`}
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-lg font-semibold text-slate-100">{fatura.label}</p>
                                        {fatura.key === referenciaSelecionada.key ? (
                                          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
                                            Em foco
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-2 text-sm text-slate-400">
                                        {fatura.comprasCount} compras • Parcelado {formatCurrency(fatura.totalParcelado)} • Avulso {formatCurrency(fatura.totalAvulso)}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        {fatura.totalLiquido === 0 ? 'Sem movimento nesta referência' : `Estornos: ${formatCurrency(fatura.estornos)}`}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Total da fatura</p>
                                      <p className="mt-2 text-2xl font-semibold text-slate-50">{formatCurrency(fatura.totalLiquido)}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex h-fit flex-col rounded-2xl border border-slate-800 bg-slate-900/80 xl:sticky xl:top-0">
                          <div className="border-b border-slate-800 px-4 py-4">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Leitura rápida</p>
                              <h4 className="mt-1 text-lg font-semibold text-slate-100">Resumo geral do cartão</h4>
                              <p className="mt-1 text-sm text-slate-400">Visão consolidada para entender o comportamento deste cartão.</p>
                            </div>
                          </div>

                          <div className="p-4">
                            <div className="space-y-3">
                              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Resumo da referência em foco</p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <div>
                                    <p className="text-xs text-slate-500">Total</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-100">{formatCurrency(referenciaSelecionada.totalLiquido)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Compras</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-100">{referenciaSelecionada.comprasCount}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Parcelado</p>
                                    <p className="mt-1 text-lg font-semibold text-cyan-300">{formatCurrency(referenciaSelecionada.totalParcelado)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500">Avulso</p>
                                    <p className="mt-1 text-lg font-semibold text-violet-300">{formatCurrency(referenciaSelecionada.totalAvulso)}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Leitura da referência</p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                                    <p className="text-xs text-slate-500">Fatura anterior</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-100">
                                      {formatCurrency(referenciaAnterior.totalLiquido)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">{referenciaAnterior.label}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                                    <p className="text-xs text-slate-500">Variação vs anterior</p>
                                    <p className={`mt-1 text-lg font-semibold ${
                                      deltaVsAnterior > 0
                                        ? 'text-rose-300'
                                        : deltaVsAnterior < 0
                                          ? 'text-emerald-300'
                                          : 'text-slate-100'
                                    }`}>
                                      {deltaVsAnterior >= 0 ? '+' : '-'}{formatCurrency(Math.abs(deltaVsAnterior))}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {variacaoVsAnterior == null
                                        ? 'Sem base anterior para comparar'
                                        : `${Math.abs(variacaoVsAnterior).toFixed(0)}% ${variacaoVsAnterior >= 0 ? 'acima' : 'abaixo'}`}
                                    </p>
                                  </div>
                                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                                    <p className="text-xs text-slate-500">Ticket médio</p>
                                    <p className="mt-1 text-lg font-semibold text-slate-100">
                                      {formatCurrency(ticketMedioReferencia)}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">{referenciaSelecionada.comprasCount} compras na referência</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                                    <p className="text-xs text-slate-500">Peso do parcelado</p>
                                    <p className="mt-1 text-lg font-semibold text-cyan-300">
                                      {percentualParceladoReferencia.toFixed(0)}%
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {formatCurrency(referenciaSelecionada.totalParcelado)} de {formatCurrency(referenciaSelecionada.totalLiquido)}
                                    </p>
                                  </div>
                                  <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 sm:col-span-2">
                                    <p className="text-xs text-slate-500">Categoria principal</p>
                                    {categoriaPrincipal ? (
                                      <>
                                        <div className="mt-1 flex items-center justify-between gap-3">
                                          <p className="text-lg font-semibold text-slate-100">{categoriaPrincipal.nome}</p>
                                          <p className="text-sm font-semibold text-slate-100">{formatCurrency(categoriaPrincipal.total)}</p>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                          {categoriaPrincipal.quantidade} lançamentos • {totalDespesasReferencia > 0 ? ((categoriaPrincipal.total / totalDespesasReferencia) * 100).toFixed(0) : '0'}% do gasto da referência
                                        </p>
                                      </>
                                    ) : (
                                      <p className="mt-1 text-sm text-slate-400">Sem categoria dominante nesta referência.</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/80">
                        <div className="border-b border-slate-800 px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Categorias com mais gasto</p>
                              <h4 className="mt-1 text-xl font-semibold text-slate-100">Ranking da referência {referenciaSelecionada.label}</h4>
                              <p className="mt-1 text-sm text-slate-400">Distribuição dos gastos por categoria somente deste mês de fatura.</p>
                            </div>
                            {categoriaPrincipal ? (
                              <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-right">
                                <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/80">Categoria líder</p>
                                <p className="mt-1 text-lg font-semibold text-cyan-100">{categoriaPrincipal.nome}</p>
                                <p className="text-sm text-cyan-200/80">{formatCurrency(categoriaPrincipal.total)}</p>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="p-4">
                          {categoriasMaisGasto.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
                              Ainda não há gastos categorizados em {referenciaSelecionada.label}.
                            </div>
                          ) : (
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {categoriasMaisGasto.map((categoria) => {
                                const percentualCategoria = totalDespesasReferencia > 0
                                  ? (categoria.total / totalDespesasReferencia) * 100
                                  : 0;

                                return (
                                  <div
                                    key={`${cartao.id}-${categoria.nome}`}
                                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p className="truncate text-lg font-semibold text-slate-100">{categoria.nome}</p>
                                        <p className="mt-1 text-xs text-slate-500">{categoria.quantidade} lançamentos</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-slate-100">{formatCurrency(categoria.total)}</p>
                                        <p className="text-xs text-slate-500">{percentualCategoria.toFixed(0)}% do gasto</p>
                                      </div>
                                    </div>
                                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                                      <div
                                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                                        style={{ width: `${Math.min(100, percentualCategoria)}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
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
