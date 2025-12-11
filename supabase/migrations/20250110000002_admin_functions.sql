-- PERF-001 FIX: Server-side admin statistics functions
-- Avoids fetching all users to calculate MRR
-- Migration: 20250110000002_admin_functions

-- Plan prices lookup (matches constants.ts PLANS)
CREATE OR REPLACE FUNCTION get_plan_price(plan_name TEXT)
RETURNS NUMERIC AS $$
BEGIN
    RETURN CASE plan_name
        WHEN 'FREE' THEN 0
        WHEN 'STARTER' THEN 29
        WHEN 'PROFESSIONAL' THEN 99
        WHEN 'EXECUTIVE' THEN 199
        WHEN 'ENTERPRISE' THEN 399
        ELSE 0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate total MRR (Monthly Recurring Revenue)
CREATE OR REPLACE FUNCTION calculate_mrr()
RETURNS NUMERIC AS $$
BEGIN
    RETURN COALESCE((
        SELECT SUM(get_plan_price(plan::TEXT))
        FROM profiles
        WHERE status = 'Active' OR status IS NULL
    ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get admin dashboard stats in one query
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS TABLE (
    total_mrr NUMERIC,
    total_users BIGINT,
    active_users BIGINT,
    suspended_users BIGINT,
    partner_count BIGINT,
    pending_partners BIGINT,
    total_bots BIGINT,
    active_bots BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        calculate_mrr() AS total_mrr,
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE p.status = 'Active' OR p.status IS NULL) AS active_users,
        COUNT(*) FILTER (WHERE p.status = 'Suspended') AS suspended_users,
        COUNT(*) FILTER (WHERE p.role = 'RESELLER') AS partner_count,
        COUNT(*) FILTER (WHERE p.role = 'RESELLER' AND p.status = 'Pending') AS pending_partners,
        (SELECT COUNT(*) FROM bots) AS total_bots,
        (SELECT COUNT(*) FROM bots WHERE active = true) AS active_bots
    FROM profiles p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get paginated users for admin (avoids loading all at once)
CREATE OR REPLACE FUNCTION get_admin_users(
    p_page INT DEFAULT 1,
    p_page_size INT DEFAULT 50,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    name TEXT,
    company_name TEXT,
    plan TEXT,
    role TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    mrr NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.email,
        p.name,
        p.company_name,
        p.plan::TEXT,
        p.role::TEXT,
        p.status::TEXT,
        p.created_at,
        get_plan_price(p.plan::TEXT) AS mrr
    FROM profiles p
    WHERE (p_search IS NULL OR
           p.email ILIKE '%' || p_search || '%' OR
           p.name ILIKE '%' || p_search || '%' OR
           p.company_name ILIKE '%' || p_search || '%')
    ORDER BY p.created_at DESC
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions (only admins should call these via Edge Functions)
GRANT EXECUTE ON FUNCTION calculate_mrr() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users(INT, INT, TEXT) TO authenticated;
