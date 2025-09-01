-- ===========================================
-- Insert a new user into the authentication table
-- For use with rusqlite in Rust
-- ===========================================

INSERT INTO authentication (username, password_hash, salt, email)
VALUES (?1, ?2, ?3, ?4);
