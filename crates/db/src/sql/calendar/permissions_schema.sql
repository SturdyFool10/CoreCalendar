CREATE TABLE IF NOT EXISTS calendar_permissions (
    user_id INTEGER NOT NULL,
    calendar_id INTEGER NOT NULL,
    can_admin BOOLEAN NOT NULL DEFAULT 0,
    can_view BOOLEAN NOT NULL DEFAULT 0,
    can_read BOOLEAN NOT NULL DEFAULT 0,
    can_add_event BOOLEAN NOT NULL DEFAULT 0,
    can_modify_event BOOLEAN NOT NULL DEFAULT 0,
    can_add_recurring_event BOOLEAN NOT NULL DEFAULT 0,
    can_modify_recurring_event BOOLEAN NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, calendar_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE
);
