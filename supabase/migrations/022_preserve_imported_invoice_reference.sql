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
  IF NEW.cartao_id IS NOT NULL THEN
    SELECT COALESCE(c.dia_fechamento, 1), COALESCE(c.dia_vencimento, 10)
      INTO v_dia_fechamento, v_dia_vencimento
      FROM public.cartoes c
     WHERE c.id = NEW.cartao_id
     LIMIT 1;

    IF NOT FOUND THEN
      SELECT COALESCE(NULLIF(a.dia_fechamento, '')::INTEGER, 1),
             COALESCE(NULLIF(a.dia_vencimento, '')::INTEGER, 10)
        INTO v_dia_fechamento, v_dia_vencimento
        FROM public.accounts a
       WHERE a.id = NEW.cartao_id
       LIMIT 1;
    END IF;

    IF NEW.fatura_mes IS NULL OR NEW.fatura_ano IS NULL THEN
      IF v_dia_fechamento >= v_dia_vencimento THEN
        v_add_months := CASE WHEN v_compra_dia <= v_dia_fechamento THEN 1 ELSE 2 END;
      ELSE
        v_add_months := CASE WHEN v_compra_dia <= v_dia_fechamento THEN 0 ELSE 1 END;
      END IF;

      v_vencimento := (DATE_TRUNC('month', v_data)::date + (v_add_months || ' month')::interval)::date;

      NEW.fatura_mes := EXTRACT(MONTH FROM v_vencimento)::INTEGER;
      NEW.fatura_ano := EXTRACT(YEAR FROM v_vencimento)::INTEGER;
    END IF;

    IF NEW.pago IS NULL THEN
      NEW.pago := FALSE;
    END IF;

    IF COALESCE(NEW.status, '') = '' THEN
      NEW.status := CASE WHEN NEW.pago THEN 'pago' ELSE 'pendente_fatura' END;
    END IF;
  ELSE
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

WITH refs AS (
  SELECT
    t.id,
    ((regexp_match(t.observacao, '^\s*Fatura\s+(\d{2})\/(\d{4})\s*$'))[1])::INTEGER AS ref_mes,
    ((regexp_match(t.observacao, '^\s*Fatura\s+(\d{2})\/(\d{4})\s*$'))[2])::INTEGER AS ref_ano
  FROM public.transacoes t
  WHERE t.cartao_id IS NOT NULL
    AND t.observacao ~* '^\s*Fatura\s+\d{2}\/\d{4}\s*$'
)
UPDATE public.transacoes AS t
SET
  fatura_mes = refs.ref_mes,
  fatura_ano = refs.ref_ano
FROM refs
WHERE t.id = refs.id
  AND (
    t.fatura_mes IS DISTINCT FROM refs.ref_mes
    OR t.fatura_ano IS DISTINCT FROM refs.ref_ano
  );
