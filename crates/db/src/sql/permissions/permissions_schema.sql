-- Schema for user permissions management

CREATE TABLE IF NOT EXISTS permissions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_permissions (
    user_id         INTEGER NOT NULL,
    permission_id   INTEGER NOT NULL,
    granted_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, permission_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id
    ON user_permissions (user_id);

CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id
    ON user_permissions (permission_id);
