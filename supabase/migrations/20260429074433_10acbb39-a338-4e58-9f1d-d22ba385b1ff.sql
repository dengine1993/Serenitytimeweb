UPDATE public.app_config
SET value = (
  jsonb_set(
    (value::jsonb) #- '{products,premium_subscription_yearly}',
    '{updated_at}',
    to_jsonb(to_char(now(), 'YYYY-MM-DD'))
  )
)::text::jsonb
WHERE key = 'product_catalog';