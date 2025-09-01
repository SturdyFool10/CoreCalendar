-- ===========================================
-- Update User Email in Authentication Table
-- For use with rusqlite in Rust
-- ===========================================

UPDATE authentication
SET email = ?2,
    updated_at = CURRENT_TIMESTAMP
WHERE username = ?1;
