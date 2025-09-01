-- ===========================================
-- Select salt by username from authentication table
-- For use with rusqlite in Rust
-- ===========================================

SELECT salt
FROM authentication
WHERE username = ?1;
