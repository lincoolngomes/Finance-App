export type DefaultCategoryType = 'receita' | 'despesa';

export interface DefaultCategory {
  nome: string;
  tipo: DefaultCategoryType;
}

export const DEFAULT_INCOME_CATEGORIES: DefaultCategory[] = [
  { nome: 'Aluguel', tipo: 'receita' },
  { nome: 'Benefícios', tipo: 'receita' },
  { nome: 'Investimentos', tipo: 'receita' },
  { nome: 'Recompensas', tipo: 'receita' },
  { nome: 'Reembolsos', tipo: 'receita' },
  { nome: 'Renda Extra', tipo: 'receita' },
  { nome: 'Rendimentos', tipo: 'receita' },
  { nome: 'Salário', tipo: 'receita' },
  { nome: 'Transferência', tipo: 'receita' },
  { nome: 'Vendas', tipo: 'receita' },
];

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  { nome: 'Academia', tipo: 'despesa' },
  { nome: 'Água', tipo: 'despesa' },
  { nome: 'Alimentação', tipo: 'despesa' },
  { nome: 'Aluguel', tipo: 'despesa' },
  { nome: 'Assinaturas', tipo: 'despesa' },
  { nome: 'Carro', tipo: 'despesa' },
  { nome: 'Celular', tipo: 'despesa' },
  { nome: 'Combustível', tipo: 'despesa' },
  { nome: 'Compras', tipo: 'despesa' },
  { nome: 'Condomínio', tipo: 'despesa' },
  { nome: 'Casa', tipo: 'despesa' },
  { nome: 'Dívida', tipo: 'despesa' },
  { nome: 'Educação', tipo: 'despesa' },
  { nome: 'Energia', tipo: 'despesa' },
  { nome: 'Farmácia', tipo: 'despesa' },
  { nome: 'Impostos e Taxas', tipo: 'despesa' },
  { nome: 'Internet', tipo: 'despesa' },
  { nome: 'Investimento', tipo: 'despesa' },
  { nome: 'Lazer', tipo: 'despesa' },
  { nome: 'Moradia', tipo: 'despesa' },
  { nome: 'Necessidades', tipo: 'despesa' },
  { nome: 'Pagamento de Fatura', tipo: 'despesa' },
  { nome: 'Salão / Barbearia', tipo: 'despesa' },
  { nome: 'Saúde', tipo: 'despesa' },
  { nome: 'Seguros', tipo: 'despesa' },
  { nome: 'Serviços', tipo: 'despesa' },
  { nome: 'Transporte', tipo: 'despesa' },
  { nome: 'Transferência', tipo: 'despesa' },
  { nome: 'Utilidades', tipo: 'despesa' },
  { nome: 'Vestuário', tipo: 'despesa' },
];

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  ...DEFAULT_INCOME_CATEGORIES,
  ...DEFAULT_EXPENSE_CATEGORIES,
];

const normalizeText = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const getDefaultCategoryKey = (category: {
  nome?: string | null;
  tipo?: string | null;
}) => `${normalizeText(category.tipo || '')}::${normalizeText(category.nome || '')}`;

const defaultCategoryKeys = new Set(DEFAULT_CATEGORIES.map(getDefaultCategoryKey));
const defaultCategoryTypesByName = DEFAULT_CATEGORIES.reduce((acc, category) => {
  const key = normalizeText(category.nome || '');
  const current = acc.get(key) || new Set<DefaultCategoryType>();
  current.add(category.tipo);
  acc.set(key, current);
  return acc;
}, new Map<string, Set<DefaultCategoryType>>());

export const isDefaultCategory = (category: {
  nome?: string | null;
  tipo?: string | null;
}) => defaultCategoryKeys.has(getDefaultCategoryKey(category));

export const normalizeCategoryType = (tipo?: string | null): DefaultCategoryType | null => {
  const normalized = normalizeText(tipo || '');
  if (normalized === 'receita') return 'receita';
  if (normalized === 'despesa') return 'despesa';
  return null;
};

export const getDefaultCategoryTypeByName = (nome?: string | null): DefaultCategoryType | null => {
  const key = normalizeText(nome || '');
  if (!key) return null;
  const types = defaultCategoryTypesByName.get(key);
  if (!types || types.size !== 1) return null;
  return Array.from(types)[0] || null;
};

export const resolveCategoryType = (category: {
  nome?: string | null;
  tipo?: string | null;
}): DefaultCategoryType | null => {
  const defaultType = getDefaultCategoryTypeByName(category.nome);
  if (defaultType) return defaultType;
  return normalizeCategoryType(category.tipo);
};
