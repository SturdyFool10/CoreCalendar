CREATE TABLE IF NOT EXISTS user_global_permissions (
    user_id INTEGER PRIMARY KEY,
    is_global_admin BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
