-- Fix function search_path vulnerability
CREATE OR REPLACE FUNCTION public.get_date_immutable(ts timestamp with time zone)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
 SET search_path TO 'public'
AS $function$
  SELECT (ts AT TIME ZONE 'UTC')::date;
$function$;