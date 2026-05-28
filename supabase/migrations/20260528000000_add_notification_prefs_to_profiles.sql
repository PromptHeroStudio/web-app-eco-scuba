-- Add JSONB notification preferences to profiles for persistent notification settings
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"email": true, "inapp": true, "deadlines": true}';

UPDATE public.profiles
SET notification_prefs = '{"email": true, "inapp": true, "deadlines": true}'
WHERE notification_prefs IS NULL;
