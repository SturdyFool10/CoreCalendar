-- ===========================================
-- Delete user by username from authentication table
-- For use with rusqlite in Rust
-- ===========================================

DELETE FROM authentication
WHERE username = ?1;
