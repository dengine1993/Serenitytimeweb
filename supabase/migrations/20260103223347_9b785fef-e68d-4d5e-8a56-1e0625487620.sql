-- Защита от race condition: один пост в день на пользователя
-- Используем immutable функцию get_date_immutable которая уже есть в БД
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_user_daily 
ON public.posts (user_id, get_date_immutable(created_at));