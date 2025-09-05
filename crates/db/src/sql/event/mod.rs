/// SQL constants for event-related queries and schema.
/// These are embedded at compile time using `include_str!` for easy editing and single binary output.

pub const EVENT_SCHEMA: &str = include_str!("schema.sql");
// Add more constants for event queries as you create them, e.g.:
// pub const EVENT_INSERT: &str = include_str!("insert.sql");
// pub const EVENT_SELECT_BY_ID: &str = include_str!("select_by_id.sql");
// pub const EVENT_UPDATE: &str = include_str!("update.sql");
// pub const EVENT_DELETE: &str = include_str!("delete.sql");
