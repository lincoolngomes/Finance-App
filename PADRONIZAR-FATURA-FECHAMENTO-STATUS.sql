-- Padroniza status e referência de fatura para transações de cartão
-- Execute no Supabase SQL Editor

ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS status VARCHAR(30);
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS fatura_mes INTEGER;
ALTER TABLE public.transacoes ADD COLUMN IF NOT EXISTS fatura_ano INTEGER;

CREATE OR REPLACE FUNCTION public.definir_status_e_fatura_transacao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_data DATE := COALESCE(NEW.data::date, CURRENT_DATE);
  v_hoje DATE := CURRENT_DATE;
  v_dia_fechamento INTEGER := 1;
  v_dia_vencimento INTEGER := 10;
  v_add_months INTEGER := 0;
  v_compra_dia INTEGER := EXTRACT(DAY FROM v_data);
  v_vencimento DATE;
BEGIN
  -- Compra no cartão de crédito
  IF NEW.cartao_id IS NOT NULL THEN
    -- Prioriza tabela cartoes
    SELECT COALESCE(c.dia_fechamento, 1), COALESCE(c.dia_vencimento, 10)
      INTO v_dia_fechamento, v_dia_vencimento
      FROM public.cartoes c
     WHERE c.id = NEW.cartao_id
     LIMIT 1;

    -- Fallback legado (accounts)
    IF NOT FOUND THEN
      SELECT COALESCE(NULLIF(a.dia_fechamento, '')::INTEGER, 1),
             COALESCE(NULLIF(a.dia_vencimento, '')::INTEGER, 10)
        INTO v_dia_fechamento, v_dia_vencimento
        FROM public.accounts a
       WHERE a.id = NEW.cartao_id
       LIMIT 1;
    END IF;

    -- Mês de referência = mês de vencimento da fatura
    -- Regra alinhada ao app web (GerenciarFaturasModal):
    -- se fechamento >= vencimento: compra até fechamento cai no mês+1, após fechamento mês+2
    -- se fechamento <  vencimento: compra até fechamento cai no mês+0, após fechamento mês+1
    IF v_dia_fechamento >= v_dia_vencimento THEN
      v_add_months := CASE WHEN v_compra_dia <= v_dia_fechamento THEN 1 ELSE 2 END;
    ELSE
      v_add_months := CASE WHEN v_compra_dia <= v_dia_fechamento THEN 0 ELSE 1 END;
    END IF;

    v_vencimento := (DATE_TRUNC('month', v_data)::date + (v_add_months || ' month')::interval)::date;

    NEW.fatura_mes := EXTRACT(MONTH FROM v_vencimento)::INTEGER;
    NEW.fatura_ano := EXTRACT(YEAR FROM v_vencimento)::INTEGER;

    -- Cartão nasce em aberto por padrão
    IF NEW.pago IS NULL THEN
      NEW.pago := FALSE;
    END IF;

    IF COALESCE(NEW.status, '') = '' THEN
      NEW.status := CASE WHEN NEW.pago THEN 'pago' ELSE 'pendente_fatura' END;
    END IF;

  ELSE
    -- Transação de conta
    NEW.fatura_mes := NULL;
    NEW.fatura_ano := NULL;

    IF NEW.pago IS NULL THEN
      NEW.pago := (v_data <= v_hoje);
    END IF;

    IF COALESCE(NEW.status, '') = '' THEN
      NEW.status := CASE WHEN NEW.pago THEN 'pago' ELSE 'pendente' END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transacoes_status_fatura ON public.transacoes;

CREATE TRIGGER trg_transacoes_status_fatura
BEFORE INSERT OR UPDATE OF data, cartao_id, pago, status
ON public.transacoes
FOR EACH ROW
EXECUTE FUNCTION public.definir_status_e_fatura_transacao();

-- Correção retroativa do legado
UPDATE public.transacoes
SET status = CASE
  WHEN cartao_id IS NOT NULL AND COALESCE(pago, FALSE) = FALSE THEN 'pendente_fatura'
  WHEN COALESCE(pago, FALSE) = TRUE THEN 'pago'
  ELSE 'pendente'
END
WHERE status IS NULL OR status = '';
