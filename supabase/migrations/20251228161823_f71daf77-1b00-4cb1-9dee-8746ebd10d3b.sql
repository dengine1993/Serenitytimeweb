-- Update admin profile for CEO
UPDATE profiles 
SET 
  is_admin = true,
  username = 'CEO',
  display_name = 'CEO',
  role = 'admin'
WHERE user_id = '066a5589-bb39-45c7-bb88-dba3289f7ede';