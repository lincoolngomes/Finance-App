-- Tabela principal de investimentos
CREATE TABLE IF NOT EXISTS investimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'acao', 'renda_fixa', 'cripto', 'fii', 'etf', 'fundo', 'previdencia'
  codigo VARCHAR(50) NOT NULL, -- Ticker/código do ativo (ex: PETR4, BTC, CDB-2025, etc)
  nome VARCHAR(200) NOT NULL,
  instituicao VARCHAR(200),
  quantidade DECIMAL(18, 8) NOT NULL DEFAULT 0,
  preco_medio DECIMAL(18, 2) NOT NULL DEFAULT 0,
  valor_total DECIMAL(18, 2) GENERATED ALWAYS AS (quantidade * preco_medio) STORED,
  data_primeira_compra TIMESTAMP WITH TIME ZONE,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de transações de investimentos (compras e vendas)
CREATE TABLE IF NOT EXISTS transacoes_investimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investimento_id UUID NOT NULL REFERENCES investimentos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_transacao VARCHAR(20) NOT NULL, -- 'compra', 'venda'
  quantidade DECIMAL(18, 8) NOT NULL,
  preco_unitario DECIMAL(18, 2) NOT NULL,
  valor_total DECIMAL(18, 2) NOT NULL,
  taxa DECIMAL(18, 2) DEFAULT 0,
  data_transacao TIMESTAMP WITH TIME ZONE NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cotações históricas (para manter histórico e usar em períodos passados)
CREATE TABLE IF NOT EXISTS cotacoes_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(20) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  preco DECIMAL(18, 2) NOT NULL,
  data_cotacao DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(codigo, data_cotacao)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_investimentos_user_id ON investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_investimentos_tipo ON investimentos(tipo);
CREATE INDEX IF NOT EXISTS idx_transacoes_investimento_id ON transacoes_investimentos(investimento_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_user_id ON transacoes_investimentos(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON transacoes_investimentos(data_transacao);
CREATE INDEX IF NOT EXISTS idx_cotacoes_codigo_data ON cotacoes_historico(codigo, data_cotacao);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_investimentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_investimentos_updated_at_trigger
BEFORE UPDATE ON investimentos
FOR EACH ROW
EXECUTE FUNCTION update_investimentos_updated_at();

-- RLS Policies
ALTER TABLE investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacoes_investimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes_historico ENABLE ROW LEVEL SECURITY;

-- Policies para investimentos
CREATE POLICY "Usuários podem ver seus próprios investimentos"
  ON investimentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios investimentos"
  ON investimentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios investimentos"
  ON investimentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios investimentos"
  ON investimentos FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para transações
CREATE POLICY "Usuários podem ver suas próprias transações"
  ON transacoes_investimentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias transações"
  ON transacoes_investimentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias transações"
  ON transacoes_investimentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias transações"
  ON transacoes_investimentos FOR DELETE
  USING (auth.uid() = user_id);

-- Policies para cotações (todos podem ler, mas só inserir via função)
CREATE POLICY "Todos podem ler cotações históricas"
  ON cotacoes_historico FOR SELECT
  TO authenticated
  USING (true);

-- Função para atualizar preço médio após transação
CREATE OR REPLACE FUNCTION atualizar_preco_medio_investimento()
RETURNS TRIGGER AS $$
DECLARE
  v_quantidade_atual DECIMAL(18, 8);
  v_preco_medio_atual DECIMAL(18, 2);
  v_nova_quantidade DECIMAL(18, 8);
  v_novo_preco_medio DECIMAL(18, 2);
BEGIN
  -- Busca dados atuais do investimento
  SELECT quantidade, preco_medio 
  INTO v_quantidade_atual, v_preco_medio_atual
  FROM investimentos 
  WHERE id = NEW.investimento_id;

  IF NEW.tipo_transacao = 'compra' THEN
    -- Calcula novo preço médio ponderado
    v_nova_quantidade := v_quantidade_atual + NEW.quantidade;
    v_novo_preco_medio := ((v_quantidade_atual * v_preco_medio_atual) + (NEW.quantidade * NEW.preco_unitario)) / v_nova_quantidade;
    
    UPDATE investimentos 
    SET 
      quantidade = v_nova_quantidade,
      preco_medio = v_novo_preco_medio,
      data_primeira_compra = COALESCE(data_primeira_compra, NEW.data_transacao),
      updated_at = NOW()
    WHERE id = NEW.investimento_id;
    
  ELSIF NEW.tipo_transacao = 'venda' THEN
    -- Apenas reduz quantidade, mantém preço médio
    v_nova_quantidade := v_quantidade_atual - NEW.quantidade;
    
    UPDATE investimentos 
    SET 
      quantidade = v_nova_quantidade,
      ativo = CASE WHEN v_nova_quantidade <= 0 THEN false ELSE ativo END,
      updated_at = NOW()
    WHERE id = NEW.investimento_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_preco_medio
AFTER INSERT ON transacoes_investimentos
FOR EACH ROW
EXECUTE FUNCTION atualizar_preco_medio_investimento();
