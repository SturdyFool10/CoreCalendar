CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calendar_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,   -- ISO 8601 string
    end_time TEXT NOT NULL,     -- ISO 8601 string
    created_at TEXT NOT NULL,   -- ISO 8601 string
    updated_at TEXT NOT NULL,   -- ISO 8601 string
    FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE
);
