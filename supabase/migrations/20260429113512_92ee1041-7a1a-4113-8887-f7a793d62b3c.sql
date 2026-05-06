-- ============================================================
-- 1. PERSONA: глобальный анонимный псевдоним
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anon_alias text,
  ADD COLUMN IF NOT EXISTS anon_emoji text,
  ADD COLUMN IF NOT EXISTS anon_color text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_anon_alias_unique
  ON public.profiles (anon_alias)
  WHERE anon_alias IS NOT NULL;

-- Генератор псевдонима. Словари — в коде функции (детерминированный random + retry).
CREATE OR REPLACE FUNCTION public.generate_anon_persona(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjectives text[] := ARRAY[
    'Лунный','Тихий','Светлый','Северный','Тёплый','Морской','Лесной','Горный',
    'Звёздный','Утренний','Вечерний','Снежный','Облачный','Спокойный','Янтарный',
    'Песчаный','Мягкий','Дальний','Близкий','Ясный','Туманный','Хрустальный',
    'Бархатный','Шёлковый','Серебряный','Золотой','Изумрудный','Сапфировый',
    'Жемчужный','Перламутровый','Васильковый','Мятный','Лимонный','Коралловый'
  ];
  v_nouns text[] := ARRAY[
    'Кит','Лис','Олень','Сокол','Журавль','Дельфин','Барс','Волк','Заяц','Енот',
    'Медведь','Тигр','Рысь','Сова','Орёл','Цапля','Феникс','Дракон','Единорог',
    'Пегас','Лебедь','Воробей','Ласточка','Стриж','Снегирь','Иволга','Колибри',
    'Мотылёк','Светлячок','Жук','Стрекоза','Бабочка','Краб','Морж','Тюлень'
  ];
  v_emojis text[] := ARRAY[
    '🌙','🦊','🦌','🦅','🐬','🐺','🐰','🦝','🐻','🐯','🦉','🐧','🦢','🐝',
    '🦋','🐞','🌟','✨','🌊','🌿','🍃','🌸','🌺','🌻','🌼','🌷','🪷','🍀'
  ];
  v_colors text[] := ARRAY[
    '#7C9EB2','#C9B79C','#A89BCC','#9CC5A1','#E8B4A0','#F0D9B5','#B5C4D9',
    '#D4A5A5','#A8C5BB','#C8A8D8','#E5C7A5','#9DB4B0','#B89BC4','#D8B5A0'
  ];
  v_alias text;
  v_attempts int := 0;
  v_seed bigint;
BEGIN
  -- Если уже есть persona — выходим.
  IF EXISTS (SELECT 1 FROM profiles WHERE user_id = p_user_id AND anon_alias IS NOT NULL) THEN
    RETURN;
  END IF;

  -- Детерминированный seed из user_id для эмодзи/цвета (стабильно).
  v_seed := ('x' || substr(md5(p_user_id::text), 1, 8))::bit(32)::bigint;

  -- Имя ищем уникальное (до 50 попыток).
  LOOP
    v_attempts := v_attempts + 1;
    v_alias := v_adjectives[1 + (floor(random() * array_length(v_adjectives, 1)))::int]
            || ' '
            || v_nouns[1 + (floor(random() * array_length(v_nouns, 1)))::int]
            || ' #'
            || lpad((floor(random() * 1000))::int::text, 3, '0');

    BEGIN
      UPDATE profiles
      SET anon_alias = v_alias,
          anon_emoji = v_emojis[1 + (v_seed % array_length(v_emojis, 1))::int],
          anon_color = v_colors[1 + ((v_seed / 100) % array_length(v_colors, 1))::int],
          updated_at = now()
      WHERE user_id = p_user_id;
      EXIT; -- успех
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts > 50 THEN
        RAISE EXCEPTION 'Could not generate unique anon_alias after 50 attempts';
      END IF;
      -- следующая итерация
    END;
  END LOOP;
END;
$$;

-- Бэкфил для всех существующих юзеров.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE anon_alias IS NULL LOOP
    PERFORM public.generate_anon_persona(r.user_id);
  END LOOP;
END $$;

-- Триггер: при создании нового профиля сразу генерировать persona.
CREATE OR REPLACE FUNCTION public.trigger_generate_anon_persona()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.anon_alias IS NULL THEN
    PERFORM public.generate_anon_persona(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_generate_persona ON public.profiles;
CREATE TRIGGER profiles_generate_persona
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trigger_generate_anon_persona();

-- ============================================================
-- 2. MASK LIFTS: обоюдное раскрытие
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mask_lifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | declined
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT mask_lifts_status_check CHECK (status IN ('pending','accepted','declined')),
  CONSTRAINT mask_lifts_no_self CHECK (requester_id <> target_id)
);

-- Уникальность пары (любой порядок участников).
CREATE UNIQUE INDEX IF NOT EXISTS mask_lifts_pair_unique
  ON public.mask_lifts (LEAST(requester_id, target_id), GREATEST(requester_id, target_id));

CREATE INDEX IF NOT EXISTS mask_lifts_target_pending
  ON public.mask_lifts (target_id) WHERE status = 'pending';

ALTER TABLE public.mask_lifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view mask_lifts"
  ON public.mask_lifts FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = target_id);

CREATE POLICY "Users can request mask_lift"
  ON public.mask_lifts FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Target can respond to mask_lift"
  ON public.mask_lifts FOR UPDATE
  USING (auth.uid() = target_id)
  WITH CHECK (auth.uid() = target_id);

CREATE POLICY "Requester can cancel pending mask_lift"
  ON public.mask_lifts FOR DELETE
  USING (auth.uid() = requester_id AND status = 'pending');

-- Helper: открыты ли двое друг другу?
CREATE OR REPLACE FUNCTION public.is_revealed_to(p_viewer uuid, p_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_viewer IS NULL OR p_target IS NULL THEN false
      WHEN p_viewer = p_target THEN true
      ELSE EXISTS (
        SELECT 1 FROM public.mask_lifts
        WHERE status = 'accepted'
          AND ((requester_id = p_viewer AND target_id = p_target)
            OR (requester_id = p_target AND target_id = p_viewer))
      )
    END
$$;

-- Серверный аггрегатор: безопасно отдаёт идентичности нескольких юзеров с точки зрения зрителя.
CREATE OR REPLACE FUNCTION public.get_displayed_authors(
  p_viewer_id uuid,
  p_user_ids uuid[]
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  anon_alias text,
  anon_emoji text,
  anon_color text,
  is_revealed boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    CASE WHEN public.is_revealed_to(p_viewer_id, p.user_id)
         THEN p.display_name ELSE NULL END AS display_name,
    CASE WHEN public.is_revealed_to(p_viewer_id, p.user_id)
         THEN p.avatar_url ELSE NULL END AS avatar_url,
    p.anon_alias,
    p.anon_emoji,
    p.anon_color,
    public.is_revealed_to(p_viewer_id, p.user_id) AS is_revealed
  FROM public.profiles p
  WHERE p.user_id = ANY(p_user_ids);
$$;

-- ============================================================
-- 3. ЛИЧНЫЕ СООБЩЕНИЯ: режим анонимности
-- ============================================================

ALTER TABLE public.private_conversations
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS revealed_at timestamptz;

ALTER TABLE public.private_messages
  ADD COLUMN IF NOT EXISTS sender_revealed boolean NOT NULL DEFAULT false;

-- ============================================================
-- 4. КОММЕНТАРИИ К ПОСТАМ: анонимность
-- ============================================================

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;

-- ============================================================
-- 5. NOTIFICATIONS: тип для mask_lift (опционально, у вас type text — ок)
-- ============================================================
-- Ничего менять не нужно: notifications.type уже text.

-- ============================================================
-- 6. send_community_message: добавим параметр is_anonymous
-- ============================================================

CREATE OR REPLACE FUNCTION public.send_community_message(
  p_content text,
  p_media_url text DEFAULT NULL,
  p_media_type text DEFAULT NULL,
  p_reply_to_id uuid DEFAULT NULL,
  p_is_anonymous boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_message_at timestamptz;
  v_message_id uuid;
BEGIN
  SELECT created_at INTO v_last_message_at
  FROM community_messages
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_message_at IS NOT NULL AND
     v_last_message_at > NOW() - INTERVAL '2 seconds' THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait.';
  END IF;

  IF char_length(p_content) > 2000 THEN
    RAISE EXCEPTION 'Message too long. Max 2000 characters.';
  END IF;

  IF p_content IS NULL OR (char_length(TRIM(p_content)) = 0 AND p_media_url IS NULL) THEN
    RAISE EXCEPTION 'Message cannot be empty.';
  END IF;

  -- Если в community_messages нет колонки is_anonymous — добавим.
  -- (делаем тут как defensive: если уже есть, NOOP)
  PERFORM 1; -- placeholder

  INSERT INTO community_messages (user_id, content, media_url, media_type, reply_to_id, is_anonymous)
  VALUES (auth.uid(), TRIM(p_content), p_media_url, p_media_type, p_reply_to_id, p_is_anonymous)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- Колонка is_anonymous в community_messages (раз функция её пишет).
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;