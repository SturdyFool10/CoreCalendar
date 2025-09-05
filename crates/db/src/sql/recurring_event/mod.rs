/// SQL constants for recurring_event-related queries and schema.
/// These are embedded at compile time using `include_str!` for easy editing and single binary output.

pub const SCHEMA: &str = include_str!("schema.sql");

// You can add more SQL constants here as you add more queries, for example:
// pub const INSERT: &str = include_str!("insert.sql");
// pub const SELECT_BY_ID: &str = include_str!("select_by_id.sql");
// pub const UPDATE: &str = include_str!("update.sql");
// pub const DELETE: &str = include_str!("delete.sql");
