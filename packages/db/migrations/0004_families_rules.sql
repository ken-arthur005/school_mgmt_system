-- Hand-written: the standard treatment for the new `families` table (see 0001_triggers_and_rls.sql):
-- updated_at, the audit trail (it holds student records) and no Data API access.

CREATE TRIGGER set_updated_at BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

CREATE TRIGGER audit_row_change AFTER INSERT OR UPDATE OR DELETE ON families
  FOR EACH ROW EXECUTE FUNCTION audit_row_change();
--> statement-breakpoint

DO $$
DECLARE
  r text;
BEGIN
  ALTER TABLE families ENABLE ROW LEVEL SECURITY;
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON TABLE families FROM %I', r);
    END IF;
  END LOOP;
END;
$$;
