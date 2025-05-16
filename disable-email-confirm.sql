-- Disable email confirmation for testing/development
UPDATE auth.config
SET confirm_email_template_id = NULL
WHERE confirm_email_template_id IS NOT NULL;
 
-- Alternative method if above doesn't work
INSERT INTO auth.config (name, value)
VALUES ('mailer.autoconfirm', 'true')
ON CONFLICT (name) DO UPDATE SET value = 'true'; 