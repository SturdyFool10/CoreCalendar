-- ===========================================
-- Select user by username from authentication table
-- For use with rusqlite in Rust
-- ===========================================

SELECT id, username, password_hash, salt, email, created_at, updated_at
FROM authentication
WHERE username = ?1;
