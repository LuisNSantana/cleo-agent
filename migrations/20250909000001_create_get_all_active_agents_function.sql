CREATE OR REPLACE FUNCTION get_all_active_agents(p_user_id UUID)
RETURNS SETOF agents AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM agents
  WHERE
    is_active = TRUE AND (
      predefined = TRUE OR user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
