-- ============================================================
-- MIGRATION: Enable Realtime on tenant_members
-- Needed so the client can subscribe to DELETE events and
-- immediately sign out removed invited users.
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER publication supabase_realtime ADD TABLE public.tenant_members;
