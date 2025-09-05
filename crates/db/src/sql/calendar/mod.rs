/// SQL constants for calendar-related queries and schema.
/// These are embedded at compile time using `include_str!` for easy editing and single binary output.

pub const CALENDAR_SCHEMA: &str = include_str!("schema.sql");
pub const CALENDAR_PERMISSIONS_SCHEMA: &str = include_str!("permissions_schema.sql");

// You can add more constants here for calendar-specific queries as needed, e.g.:
// pub const CALENDAR_INSERT: &str = include_str!("insert.sql");
// pub const CALENDAR_SELECT_BY_NAME: &str = include_str!("select_by_name.sql");
