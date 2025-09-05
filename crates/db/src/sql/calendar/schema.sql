CREATE TABLE IF NOT EXISTS calendars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL, -- ISO 8601 string
    updated_at TEXT NOT NULL  -- ISO 8601 string
);
