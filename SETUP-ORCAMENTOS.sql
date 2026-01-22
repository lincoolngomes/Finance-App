-- Criar tabela de orçamento por categoria
CREATE TABLE IF NOT EXISTS orcamento_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  valor_planejado DECIMAL(15, 2) NOT NULL DEFAULT 0,
  mes INTEGER NOT NULL CHECK (mes >= 0 AND mes <= 11),
  ano INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, categoria_id, mes, ano)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_orcamento_categorias_user_id ON orcamento_categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_categorias_mes_ano ON orcamento_categorias(mes, ano);

-- RLS (Row Level Security)
ALTER TABLE orcamento_categorias ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver apenas seus próprios orçamentos
CREATE POLICY "Usuários podem ver seus orçamentos"
  ON orcamento_categorias
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuários podem inserir seus próprios orçamentos
CREATE POLICY "Usuários podem criar seus orçamentos"
  ON orcamento_categorias
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem atualizar seus próprios orçamentos
CREATE POLICY "Usuários podem atualizar seus orçamentos"
  ON orcamento_categorias
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuários podem deletar seus próprios orçamentos
CREATE POLICY "Usuários podem deletar seus orçamentos"
  ON orcamento_categorias
  FOR DELETE
  USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_orcamento_categorias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_orcamento_categorias_updated_at
  BEFORE UPDATE ON orcamento_categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_orcamento_categorias_updated_at();
