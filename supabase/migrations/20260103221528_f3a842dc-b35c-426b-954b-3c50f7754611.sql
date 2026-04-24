UPDATE app_config 
SET value = 'kvartirapizzavolk', updated_at = now() 
WHERE key = 'internal_function_secret';