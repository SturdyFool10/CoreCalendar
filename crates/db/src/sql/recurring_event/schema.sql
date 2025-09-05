CREATE TABLE IF NOT EXISTS recurring_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calendar_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TEXT NOT NULL,      -- ISO 8601 string
    end_time TEXT NOT NULL,        -- ISO 8601 string
    recurrence_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    recurrence_interval INTEGER NOT NULL DEFAULT 1, -- every N days/weeks/etc
    recurrence_count INTEGER,      -- NULL = infinite
    recurrence_duration TEXT,      -- human readable, e.g. "1h 30m"
    created_at TEXT NOT NULL,      -- ISO 8601 string
    updated_at TEXT NOT NULL,      -- ISO 8601 string
    FOREIGN KEY (calendar_id) REFERENCES calendars(id) ON DELETE CASCADE
);
