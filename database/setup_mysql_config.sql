-- =====================================================
-- MySQL Configuration Setup (Run as ROOT user)
-- This enables stored procedure/trigger creation
-- =====================================================

-- Enable function/procedure creation without SUPER privilege
SET GLOBAL log_bin_trust_function_creators = 1;

-- Verify the setting
SELECT @@GLOBAL.log_bin_trust_function_creators;
