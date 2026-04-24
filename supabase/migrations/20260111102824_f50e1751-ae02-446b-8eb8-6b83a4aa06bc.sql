-- 1. Исправить функцию is_premium() - проверять subscriptions как основной источник
CREATE OR REPLACE FUNCTION public.is_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Основной источник: активная подписка в subscriptions
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND s.plan = 'premium'
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
  OR EXISTS (
    -- Fallback: ручной грант через profiles.premium_until (для админов)
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = p_user_id
      AND p.premium_until IS NOT NULL
      AND p.premium_until > now()
  )
$$;

-- 2. Синхронизировать существующие данные: обновить profiles.plan для активных подписчиков
UPDATE profiles p
SET plan = 'premium'
FROM subscriptions s
WHERE p.user_id = s.user_id
  AND s.plan = 'premium'
  AND s.status = 'active'
  AND s.current_period_end > now()
  AND (p.plan IS NULL OR p.plan != 'premium');

-- 3. Создать функцию для автосинхронизации profiles.plan при изменении subscriptions
CREATE OR REPLACE FUNCTION public.sync_profile_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- При активации премиум подписки - обновить profiles.plan
  IF NEW.status = 'active' AND NEW.plan = 'premium' AND (NEW.current_period_end IS NULL OR NEW.current_period_end > now()) THEN
    UPDATE profiles SET plan = 'premium', updated_at = now() WHERE user_id = NEW.user_id;
  -- При деактивации/истечении - сбросить на free (если нет premium_until)
  ELSIF NEW.status != 'active' OR NEW.plan != 'premium' OR (NEW.current_period_end IS NOT NULL AND NEW.current_period_end <= now()) THEN
    UPDATE profiles 
    SET plan = 'free', updated_at = now() 
    WHERE user_id = NEW.user_id 
      AND (premium_until IS NULL OR premium_until <= now());
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Создать триггер для автосинхронизации
DROP TRIGGER IF EXISTS sync_subscription_to_profile ON subscriptions;
CREATE TRIGGER sync_subscription_to_profile
AFTER INSERT OR UPDATE ON subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_plan();