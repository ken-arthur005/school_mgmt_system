-- Hand-written: every audited change must say who made it (decided in Sprint 2).
-- Before this, a change made without app.user_id was logged with no actor. Now the database
-- refuses it. The API sets app.user_id per transaction (withActor); seeds and background jobs
-- use the school's System user.

CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_actor uuid;
BEGIN
  v_actor := nullif(current_setting('app.user_id', true), '')::uuid;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'audit: app.user_id is not set, so this change to % has no actor', TG_TABLE_NAME
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'Run the change inside withActor(...) so the audit log knows who made it.';
  END IF;

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
    v_actor,
    nullif(current_setting('app.device_id', true), '')::uuid
  );
  RETURN NULL;
END;
$$;
