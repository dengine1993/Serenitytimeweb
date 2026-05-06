-- C1: Unify canceled_at column
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='cancelled_at') THEN
    -- Ensure canceled_at exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='subscriptions' AND column_name='canceled_at') THEN
      ALTER TABLE public.subscriptions ADD COLUMN canceled_at TIMESTAMPTZ;
    END IF;
    -- Migrate data
    UPDATE public.subscriptions
      SET canceled_at = COALESCE(canceled_at, cancelled_at)
      WHERE cancelled_at IS NOT NULL;
    -- Drop duplicate column
    ALTER TABLE public.subscriptions DROP COLUMN cancelled_at;
  ELSE
    -- Just make sure canceled_at exists
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
  END IF;
END $$;

-- M6: Lock down subscriptions table — only edge functions (service role) can mutate
DROP POLICY IF EXISTS "Users can update own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON public.subscriptions;
-- SELECT policy stays (users can view their own)
