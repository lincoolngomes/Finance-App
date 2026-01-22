import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CategorySelector } from './CategorySelector'
import { BankSelector, CardSelector } from '../accounts/BankAndCardSelector'
import { DatePicker } from '@/components/ui/date-picker'
import { parseValorBR, formatarValorBR } from '@/utils/currency'
import { parse, format } from 'date-fns'

interface TransactionFormData {
  quando: string
  estabelecimento: string
  valor: number
  detalhes: string
  tipo: string
  category_id: string
  metodo: string
  status: string
  account_id: string
  fatura_id: string
}

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: TransactionFormData
  onFormDataChange: (data: TransactionFormData) => void
  onSubmit: (e: React.FormEvent) => void
  isEditing: boolean
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
  isEditing
}: TransactionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Edite os dados da transação' : 'Preencha os dados para adicionar uma nova transação'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quando">Data</Label>
            <DatePicker
              date={formData.quando ? parse(formData.quando, 'yyyy-MM-dd', new Date()) : undefined}
              onDateChange={(date) => onFormDataChange({ 
                ...formData, 
                quando: date ? format(date, 'yyyy-MM-dd') : '' 
              })}
              placeholder="Selecione a data da transação"
            />
          </div>
          <div>
            <Label htmlFor="estabelecimento">Estabelecimento</Label>
            <Input
              id="estabelecimento"
              value={formData.estabelecimento}
              onChange={e => onFormDataChange({ ...formData, estabelecimento: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="valor">Valor</Label>
            <Input
              id="valor"
              type="text"
              value={typeof formData.valor === 'number' ? formData.valor.toFixed(2).replace('.', ',') : formData.valor}
              onChange={e => {
                const formatted = formatarValorBR(e.target.value)
                const numValue = parseValorBR(formatted)
                onFormDataChange({ ...formData, valor: numValue })
              }}
              required
            />
          </div>
          <div>
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={formData.tipo} onValueChange={value => onFormDataChange({ ...formData, tipo: value })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="metodo">Método</Label>
            <Select value={formData.metodo} onValueChange={value => onFormDataChange({ ...formData, metodo: value })}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="debito">Débito</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="category_id">Categoria</Label>
            <CategorySelector
              value={formData.category_id}
              onValueChange={value => onFormDataChange({ ...formData, category_id: value })}
              placeholder="Selecione a categoria"
              allValue=""
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="account_id">Conta</Label>
            <BankSelector
              value={formData.account_id}
              onValueChange={value => onFormDataChange({ ...formData, account_id: value })}
              placeholder="Selecione a conta (opcional)"
            />
          </div>
          {formData.metodo === 'cartao_credito' && (
            <div>
              <Label htmlFor="card_account_id">Cartão</Label>
              <CardSelector
                value={formData.account_id}
                onValueChange={value => onFormDataChange({ ...formData, account_id: value })}
                placeholder="Selecione o cartão (opcional)"
              />
            </div>
          )}
          <div>
            <Label htmlFor="detalhes">Detalhes</Label>
            <Textarea
              id="detalhes"
              value={formData.detalhes}
              onChange={e => onFormDataChange({ ...formData, detalhes: e.target.value })}
              className="min-h-[60px] text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {isEditing ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
