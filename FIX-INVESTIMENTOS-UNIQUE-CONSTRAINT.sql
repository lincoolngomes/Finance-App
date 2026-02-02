-- Remove the unique constraint to allow multiple investments with same code
ALTER TABLE public.investimentos DROP CONSTRAINT IF EXISTS investimentos_user_id_tipo_codigo_key;

-- If you want to keep a unique constraint but for different fields, you can create a new one
-- For example, unique by (user_id, id) if needed, but the current setup allows duplicates by code
