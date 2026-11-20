-- Migration 014: Supabase LCCB Google Auth Trigger
-- Enforces allowed institutional email domains on Supabase auth.users (@lccbonline.edu.ph, @lccbacolod.edu.ph)
-- Run in Supabase SQL Editor if standard postgres user lacks direct auth-schema superuser privileges.

CREATE OR REPLACE FUNCTION public.check_lccb_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email NOT LIKE '%@lccbonline.edu.ph' 
     AND NEW.email NOT LIKE '%@lccbacolod.edu.ph' THEN
    RAISE EXCEPTION 'Access denied: Only LCCB institutional accounts (@lccbonline.edu.ph or @lccbacolod.edu.ph) are permitted.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users before insert or update
DROP TRIGGER IF EXISTS enforce_lccb_email ON auth.users;
CREATE TRIGGER enforce_lccb_email
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lccb_email_domain();
