import * as React from 'react';
import { Check, ChevronDown, PlusCircle } from 'lucide-react';
import { Button } from '/src/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '/src/components/ui/dialog';
import { Input } from '/src/components/ui/input';
import { normalizar } from '/src/utils/categorizacao';
import { cn } from '/src/lib/utils';

export interface ImportCategoryOption {
  value: string;
  label?: string;
  tipo?: string | null;
  isDefault?: boolean;
}

interface ImportCategoryComboboxProps {
  value: string;
  options: Array<string | ImportCategoryOption>;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onCreateCategory?: (suggestedName?: string) => void;
}

export function ImportCategoryCombobox({
  value,
  options,
  placeholder = 'Selecione categoria...',
  invalid = false,
  disabled = false,
  onValueChange,
  onCreateCategory,
}: ImportCategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const normalizeOption = React.useCallback(
    (option: string | ImportCategoryOption): ImportCategoryOption | null => {
      if (typeof option === 'string') {
        const nome = String(option || '').trim();
        if (!nome) return null;
        return { value: nome, label: nome, isDefault: false, tipo: null };
      }

      const nome = String(option?.value || option?.label || '').trim();
      if (!nome) return null;

      return {
        value: nome,
        label: String(option?.label || nome).trim() || nome,
        isDefault: Boolean(option?.isDefault),
        tipo: option?.tipo ?? null,
      };
    },
    []
  );

  const mergedOptions = React.useMemo(() => {
    const map = new Map<string, ImportCategoryOption>();
    const source = options;

    for (const rawOption of source) {
      const option = normalizeOption(rawOption);
      if (!option) continue;

      const key = `${normalizar(option.tipo || '')}::${normalizar(option.value)}`;
      const existente = map.get(key);

      if (!existente) {
        map.set(key, option);
        continue;
      }

      if (option.isDefault && !existente.isDefault) {
        map.set(key, option);
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      (a.label || a.value).localeCompare(b.label || b.value, 'pt-BR', { sensitivity: 'base' })
    );
  }, [normalizeOption, options, value]);

  const filteredOptions = React.useMemo(() => {
    const termo = normalizar(query);
    if (!termo) return mergedOptions;
    return mergedOptions.filter((option) => normalizar(option.label || option.value).includes(termo));
  }, [mergedOptions, query]);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setQuery('');
  };

  const handleCreate = () => {
    if (!onCreateCategory) return;
    const suggestedName = String(query || value || '').trim();
    onCreateCategory(suggestedName);
    setOpen(false);
    setQuery('');
  };

  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'h-9 w-full justify-between rounded-lg border bg-slate-800/50 px-3 text-left text-sm font-normal text-slate-100 shadow-none transition',
          'hover:bg-slate-800/80 hover:border-slate-500/70 focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-0',
          invalid ? 'border-red-500/70' : 'border-slate-600/50'
        )}
      >
        <span className={cn('truncate', !value && 'text-slate-400')}>{value || placeholder}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md border-slate-800 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Selecionar categoria</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar categoria..."
              className="border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
            />

            <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/70">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-sm text-slate-400">Nenhuma categoria encontrada.</div>
              ) : (
                <div className="p-2">
                  {filteredOptions.map((option) => {
                    const selected = normalizar(value) === normalizar(option.value);
                    return (
                      <button
                        key={`${normalizar(option.value)}::${option.tipo || 'all'}`}
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition',
                          selected
                            ? 'bg-blue-500/15 text-white'
                            : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                        )}
                      >
                        <Check className={cn('h-4 w-4 text-blue-400', selected ? 'opacity-100' : 'opacity-0')} />
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{option.label || option.value}</span>
                          {option.isDefault && (
                            <span className="shrink-0 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                              padrão
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {value ? `Categoria atual: ${value}` : 'Nenhuma categoria selecionada'}
              </div>
              {onCreateCategory && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreate}
                  className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Nova categoria
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
