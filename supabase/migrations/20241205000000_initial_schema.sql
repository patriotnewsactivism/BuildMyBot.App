-- ============================================================================
-- BuildMyBot.app - Initial Migration
-- Created: 2024-12-05
-- ============================================================================
-- This migration creates the initial database schema for BuildMyBot.app
-- Run with: supabase db push
-- ============================================================================

-- Include schema
\i '../schema.sql'

-- Include RLS policies
\i '../rls_policies.sql'
