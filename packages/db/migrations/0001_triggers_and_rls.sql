-- Hand-written: triggers and row-level security that Drizzle can't express.
-- New tables added in later migrations must get the same treatment (updated_at trigger, RLS,
-- revoked Data API access, and the audit trigger when they hold money, results or student records).

-- 1. Keep updated_at honest on every UPDATE, whoever makes it.
CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'schools', 'users', 'academic_years', 'terms', 'levels', 'classes', 'subjects',
    'class_subjects', 'students', 'student_medical_notes', 'guardians', 'student_guardians',
    'staff', 'user_roles', 'staff_assignments', 'enrolments'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t
    );
  END LOOP;
END;
$$;
--> statement-breakpoint

-- 2. Audit trail (Golden rule 9). The API sets app.user_id and app.device_id per transaction
--    with set_config(..., true). SECURITY DEFINER so the API's role needs no rights on audit_log.
CREATE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old := to_jsonb(OLD);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_new := to_jsonb(NEW);
  END IF;

  -- An UPDATE that changes nothing but updated_at isn't worth a history entry.
  IF TG_OP = 'UPDATE' AND (v_old - 'updated_at') = (v_new - 'updated_at') THEN
    RETURN NULL;
  END IF;

  v_row := coalesce(v_new, v_old);
  INSERT INTO audit_log (
    school_id, table_name, row_id, operation, old_data, new_data, actor_user_id, device_id
  ) VALUES (
    (v_row ->> 'school_id')::uuid,
    TG_TABLE_NAME,
    (v_row ->> 'id')::uuid,
    TG_OP,
    v_old,
    v_new,
    nullif(current_setting('app.user_id', true), '')::uuid,
    nullif(current_setting('app.device_id', true), '')::uuid
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students', 'student_medical_notes', 'guardians', 'student_guardians', 'enrolments',
    'classes', 'staff', 'staff_assignments', 'users', 'user_roles'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_row_change AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_row_change()',
      t
    );
  END LOOP;
END;
$$;
--> statement-breakpoint

-- 3. audit_log is append-only. Only the dev seed may switch this off (inside its own transaction).
CREATE FUNCTION reject_audit_log_change() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$;
--> statement-breakpoint

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION reject_audit_log_change();
--> statement-breakpoint

CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION reject_audit_log_change();
--> statement-breakpoint

-- 4. Golden rule 3: devices never touch tables directly. RLS with no policies means Supabase's
--    Data API (anon / authenticated roles) sees and changes nothing. Our API connects as the
--    table owner, which RLS doesn't apply to. The role checks let this run on plain Postgres too.
DO $$
DECLARE
  t text;
  r text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'schools', 'users', 'academic_years', 'terms', 'levels', 'classes', 'subjects',
    'class_subjects', 'students', 'student_medical_notes', 'guardians', 'student_guardians',
    'staff', 'user_roles', 'staff_assignments', 'enrolments', 'audit_log'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
        EXECUTE format('REVOKE ALL ON TABLE %I FROM %I', t, r);
      END IF;
    END LOOP;
  END LOOP;

  -- Trigger functions fire whoever runs the statement; nobody needs to call them directly.
  REVOKE EXECUTE ON FUNCTION set_updated_at(), audit_row_change(), reject_audit_log_change()
    FROM PUBLIC;

  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON SEQUENCE audit_log_id_seq FROM %I', r);
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION set_updated_at(), audit_row_change(), reject_audit_log_change() FROM %I',
        r
      );
    END IF;
  END LOOP;
END;
$$;
