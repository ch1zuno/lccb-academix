-- Migration 018: Enable Row Level Security (RLS) on all public tables and
-- revoke direct PostgREST access from Supabase anon/authenticated roles.
-- All application traffic goes through the Express API via pg (table owner).

BEGIN;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon;', r.tablename);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated;', r.tablename);
    END IF;
  END LOOP;
END $$;

COMMIT;
