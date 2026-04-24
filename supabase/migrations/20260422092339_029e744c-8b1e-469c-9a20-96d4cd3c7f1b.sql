-- Rename is_grok to is_jiva on post_comments
ALTER TABLE public.post_comments RENAME COLUMN is_grok TO is_jiva;