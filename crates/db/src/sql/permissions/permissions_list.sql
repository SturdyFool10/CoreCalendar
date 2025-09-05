-- List all permissions for a given user ID
SELECT permission
FROM user_permissions
WHERE user_id = ?;
