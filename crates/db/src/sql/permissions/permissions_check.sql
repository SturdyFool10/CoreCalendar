-- permissions_check.sql
-- Checks if a user has a specific permission.
-- Returns 1 row if the user has the permission, 0 rows otherwise.

SELECT 1
FROM user_permissions
WHERE user_id = ?1
  AND permission = ?2
LIMIT 1;
