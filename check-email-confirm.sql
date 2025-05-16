-- Check if email confirmation is required
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.config 
      WHERE name = 'mailer.autoconfirm' AND value = 'true'
    ) THEN 'Email confirmation is DISABLED (autoconfirm is ON)'
    WHEN EXISTS (
      SELECT 1 FROM auth.config 
      WHERE name = 'mailer.autoconfirm' AND value = 'false'
    ) THEN 'Email confirmation is ENABLED (autoconfirm is OFF)'
    WHEN EXISTS (
      SELECT 1 FROM auth.config 
      WHERE confirm_email_template_id IS NOT NULL
    ) THEN 'Email confirmation is ENABLED (template is set)'
    ELSE 'Could not determine email confirmation status'
  END AS "Email Confirmation Status";

-- If you need to disable email confirmation, uncomment and run these:
/*
UPDATE auth.config
SET confirm_email_template_id = NULL
WHERE confirm_email_template_id IS NOT NULL;

INSERT INTO auth.config (name, value)
VALUES ('mailer.autoconfirm', 'true')
ON CONFLICT (name) DO UPDATE SET value = 'true';
*/

-- To verify an existing user's email manually, uncomment and run this:
/*
-- Replace 'user@example.com' with the actual user's email
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com'
  AND email_confirmed_at IS NULL;
*/ 