-- Drop the broken auto-comment trigger that uses non-existent extensions.http_post()
DROP TRIGGER IF EXISTS on_post_created_auto_comment ON posts;

-- Drop the associated function
DROP FUNCTION IF EXISTS trigger_auto_comment_on_post();