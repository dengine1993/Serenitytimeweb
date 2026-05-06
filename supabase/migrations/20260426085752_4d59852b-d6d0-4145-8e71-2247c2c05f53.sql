CREATE OR REPLACE FUNCTION public.increment_navigator_practice(
  p_item_type text,
  p_item_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_navigator_progress (user_id, item_type, item_id, status, practice_count)
  VALUES (v_user_id, p_item_type, p_item_id, 'practiced', 1)
  ON CONFLICT (user_id, item_type, item_id)
  DO UPDATE SET
    practice_count = user_navigator_progress.practice_count + 1,
    status = 'practiced',
    updated_at = now()
  RETURNING practice_count INTO v_count;

  RETURN v_count;
END;
$$;