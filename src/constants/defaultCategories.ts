export type DefaultCategoryType = 'receita' | 'despesa';

export interface DefaultCategory {
  nome: string;
  tipo: DefaultCategoryType;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { nome: 'Aluguel', tipo: 'receita' },
  { nome: 'Investimentos', tipo: 'receita' },
  { nome: 'Recompensas', tipo: 'receita' },
  { nome: 'Renda Extra', tipo: 'receita' },
  { nome: 'Salário', tipo: 'receita' },
  { nome: 'Transferência', tipo: 'receita' },
  { nome: 'Vendas', tipo: 'receita' },
  { nome: 'Academia', tipo: 'despesa' },
  { nome: 'Água', tipo: 'despesa' },
  { nome: 'Alimentação', tipo: 'despesa' },
  { nome: 'Aluguel', tipo: 'despesa' },
  { nome: 'Assinaturas', tipo: 'despesa' },
  { nome: 'Carro', tipo: 'despesa' },
  { nome: 'Celular', tipo: 'despesa' },
  { nome: 'Compras', tipo: 'despesa' },
  { nome: 'Condomínio', tipo: 'despesa' },
  { nome: 'Casa', tipo: 'despesa' },
  { nome: 'Dívida', tipo: 'despesa' },
  { nome: 'Educação', tipo: 'despesa' },
  { nome: 'Energia', tipo: 'despesa' },
  { nome: 'Farmácia', tipo: 'despesa' },
  { nome: 'Internet', tipo: 'despesa' },
  { nome: 'Investimento', tipo: 'despesa' },
  { nome: 'Lazer', tipo: 'despesa' },
  { nome: 'Necessidades', tipo: 'despesa' },
  { nome: 'Salão / Barbearia', tipo: 'despesa' },
  { nome: 'Saúde', tipo: 'despesa' },
  { nome: 'Transporte', tipo: 'despesa' },
  { nome: 'Transferência', tipo: 'despesa' },
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

export const isDefaultCategory = (category: {
  nome?: string | null;
  tipo?: string | null;
}) => defaultCategoryKeys.has(getDefaultCategoryKey(category));
