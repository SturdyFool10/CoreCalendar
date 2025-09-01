-- ===========================================
-- Update User Password in Authentication Table
-- For use with rusqlite in Rust
-- ===========================================

UPDATE authentication
SET password_hash = ?2,
    updated_at = CURRENT_TIMESTAMP
WHERE username = ?1;
