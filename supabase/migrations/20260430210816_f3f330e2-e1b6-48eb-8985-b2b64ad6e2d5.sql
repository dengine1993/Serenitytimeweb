CREATE OR REPLACE FUNCTION public.enqueue_mood_entry_for_jiva()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_text text;
  v_mood_ru text;
  v_emotions_ru text;
  v_score text;
BEGIN
  IF NEW.note IS NULL OR length(trim(NEW.note)) < 50 THEN
    RETURN NEW;
  END IF;

  v_mood_ru := CASE NEW.mood
    WHEN 'joy' THEN 'радость'
    WHEN 'calm' THEN 'спокойствие'
    WHEN 'neutral' THEN 'нейтральное'
    WHEN 'anxiety' THEN 'тревога'
    WHEN 'sadness' THEN 'грусть'
    WHEN 'anger' THEN 'злость'
    WHEN 'fatigue' THEN 'усталость'
    WHEN 'fear' THEN 'страх'
    ELSE COALESCE(NEW.mood, '—')
  END;

  v_score := CASE
    WHEN NEW.mood_score IS NULL THEN ''
    ELSE ' (' || NEW.mood_score::text || '/10)'
  END;

  v_emotions_ru := CASE
    WHEN NEW.emotions IS NULL OR array_length(NEW.emotions, 1) IS NULL THEN ''
    ELSE ', эмоции: ' || array_to_string(
      ARRAY(
        SELECT CASE e
          WHEN 'joy' THEN 'радость'
          WHEN 'calm' THEN 'спокойствие'
          WHEN 'anxiety' THEN 'тревога'
          WHEN 'sadness' THEN 'грусть'
          WHEN 'anger' THEN 'злость'
          WHEN 'fatigue' THEN 'усталость'
          WHEN 'fear' THEN 'страх'
          WHEN 'guilt' THEN 'вина'
          WHEN 'shame' THEN 'стыд'
          WHEN 'loneliness' THEN 'одиночество'
          WHEN 'hope' THEN 'надежда'
          WHEN 'love' THEN 'любовь'
          WHEN 'gratitude' THEN 'благодарность'
          WHEN 'irritation' THEN 'раздражение'
          WHEN 'apathy' THEN 'апатия'
          WHEN 'excitement' THEN 'воодушевление'
          WHEN 'pride' THEN 'гордость'
          ELSE e
        END
        FROM unnest(NEW.emotions) AS e
      ),
      ', '
    )
  END;

  v_text := format(
    'Дневник настроения %s: настроение — %s%s%s. Заметка: %s',
    NEW.entry_date,
    v_mood_ru,
    v_score,
    v_emotions_ru,
    NEW.note
  );

  INSERT INTO public.jiva_ingest_queue (user_id, source_type, source_id, content)
  VALUES (NEW.user_id, 'diary', NEW.id, v_text);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'enqueue_mood_entry_for_jiva failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;