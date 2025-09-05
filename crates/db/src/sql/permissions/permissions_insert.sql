-- Insert a permission for a user.
-- If the user already has this permission, do nothing.
INSERT OR IGNORE INTO user_permissions (user_id, permission)
VALUES (?1, ?2);
