ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS price_rub numeric;

COMMENT ON COLUMN public.subscriptions.price_rub IS 'Цена подписки в рублях (для MRR).';

CREATE OR REPLACE FUNCTION public.get_table_columns(p_table text)
RETURNS TABLE(column_name text, data_type text, is_nullable boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, information_schema
AS $$
  SELECT
    c.column_name::text,
    c.data_type::text,
    (c.is_nullable = 'YES')
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY c.ordinal_position;
$$;

REVOKE ALL ON FUNCTION public.get_table_columns(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_table_columns(text) TO authenticated;